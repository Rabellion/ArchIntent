<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Free phone verification over WhatsApp, done in reverse: instead of
 * texting the user a code (which costs per message), the user sends
 * ArchIntent's WhatsApp number a one-time code. WhatsApp's webhook then
 * tells us the sender's number -- which WhatsApp itself verified -- and if
 * it matches the profile phone the code was issued for, it's verified.
 */
class WhatsAppVerificationService
{
    // No 0/O or 1/I/L, so the code survives being read off a screen.
    private const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    private const CODE_LENGTH = 8;

    private const CODE_KEY = 'wa_verify:code:';
    private const USER_KEY = 'wa_verify:user:';
    private const SEEN_KEY = 'wa_verify:seen:';

    private const REPLY_VERIFIED = '✅ Your phone number is now verified on ArchIntent. You can return to the app.';
    private const REPLY_INVALID = 'That verification code is invalid or has expired. Open your ArchIntent profile and tap "Verify with WhatsApp" to get a new one.';
    private const REPLY_HELP = 'To verify your phone number, open your ArchIntent profile and tap "Verify with WhatsApp".';

    public function __construct(private readonly OtpService $otp)
    {
    }

    public function isConfigured(): bool
    {
        return config('services.whatsapp.business_number') !== ''
            && filled(config('services.whatsapp.app_secret'))
            && filled(config('services.whatsapp.verify_token'));
    }

    /**
     * Issue a one-time code for this user and the wa.me link that sends it.
     * A new request invalidates any earlier unused code.
     *
     * @return array{code: string, message: string, wa_link: string, expires_in_seconds: int}
     */
    public function start(User $user): array
    {
        $ttl = (int) config('otp.ttl_seconds', 600);

        if ($previous = Cache::get(self::USER_KEY.$user->user_id)) {
            Cache::forget(self::CODE_KEY.$previous);
        }

        $code = $this->newCode();
        Cache::put(self::CODE_KEY.$code, $user->user_id, now()->addSeconds($ttl));
        Cache::put(self::USER_KEY.$user->user_id, $code, now()->addSeconds($ttl));

        $message = "VERIFY {$code}";

        return [
            'code' => $code,
            'message' => $message,
            'wa_link' => 'https://wa.me/'.config('services.whatsapp.business_number').'?text='.rawurlencode($message),
            'expires_in_seconds' => $ttl,
        ];
    }

    /**
     * Meta signs every webhook with the app secret over the raw body.
     */
    public function signatureIsValid(string $rawBody, ?string $header): bool
    {
        $secret = (string) config('services.whatsapp.app_secret');
        if ($secret === '' || !is_string($header) || !str_starts_with($header, 'sha256=')) {
            return false;
        }

        return hash_equals(hash_hmac('sha256', $rawBody, $secret), substr($header, 7));
    }

    public function verifyTokenMatches(?string $token): bool
    {
        $expected = (string) config('services.whatsapp.verify_token');

        return $expected !== '' && is_string($token) && hash_equals($expected, $token);
    }

    public function handleWebhook(array $payload): void
    {
        foreach ((array) data_get($payload, 'entry', []) as $entry) {
            foreach ((array) data_get($entry, 'changes', []) as $change) {
                if (data_get($change, 'field') !== 'messages') {
                    continue;
                }
                // Status updates for our own replies arrive here too, under
                // value.statuses; only value.messages are from users.
                foreach ((array) data_get($change, 'value.messages', []) as $message) {
                    $this->handleMessage((array) $message);
                }
            }
        }
    }

    private function handleMessage(array $message): void
    {
        $id = (string) ($message['id'] ?? '');
        $from = preg_replace('/\D+/', '', (string) ($message['from'] ?? ''));
        if ($id === '' || $from === '') {
            return;
        }

        // Meta retries a webhook for up to 36 hours if it doesn't get a
        // 200 quickly, so the same message can arrive more than once.
        if (!Cache::add(self::SEEN_KEY.$id, true, now()->addDays(2))) {
            return;
        }

        $body = ($message['type'] ?? null) === 'text' ? (string) data_get($message, 'text.body', '') : '';
        if (!preg_match('/VERIFY\s*([A-Z0-9]{'.self::CODE_LENGTH.'})/i', $body, $match)) {
            $this->reply($from, self::REPLY_HELP);

            return;
        }

        $code = strtoupper($match[1]);
        $userId = Cache::get(self::CODE_KEY.$code);
        $user = $userId ? $this->findUser((int) $userId) : null;

        if (!$user) {
            $this->reply($from, self::REPLY_INVALID);

            return;
        }

        $profilePhone = ltrim($this->otp->normalizeToE164((string) $user->phone_number), '+');
        if ($profilePhone === '' || !hash_equals($profilePhone, $from)) {
            Log::info('WhatsApp verification number mismatch', ['user_id' => $user->user_id]);
            // The code stays valid, so they can resend it from the right phone.
            $this->reply($from, 'This WhatsApp number doesn\'t match the phone number on your ArchIntent profile '
                .'(ending '.substr($profilePhone, -4).'). Send the code from that number, or update your profile first.');

            return;
        }

        $user->forceFill(['phone_verified_at' => now()])->save();
        Cache::forget(self::CODE_KEY.$code);
        Cache::forget(self::USER_KEY.$user->user_id);

        Log::info('Phone verified via WhatsApp', ['user_id' => $user->user_id]);
        $this->reply($from, self::REPLY_VERIFIED);
    }

    protected function findUser(int $id): ?User
    {
        return User::find($id);
    }

    /**
     * Best effort: a free-form reply inside the 24-hour window the user's
     * own message just opened. Never allowed to affect verification.
     */
    protected function reply(string $to, string $text): void
    {
        $token = config('services.whatsapp.access_token');
        $phoneNumberId = config('services.whatsapp.phone_number_id');
        if (!filled($token) || !filled($phoneNumberId)) {
            return;
        }

        try {
            $response = Http::withToken((string) $token)
                ->acceptJson()
                ->timeout(15)
                ->post('https://graph.facebook.com/'.config('services.whatsapp.graph_version').'/'.$phoneNumberId.'/messages', [
                    'messaging_product' => 'whatsapp',
                    'recipient_type' => 'individual',
                    'to' => $to,
                    'type' => 'text',
                    'text' => ['preview_url' => false, 'body' => $text],
                ]);

            if (!$response->successful()) {
                Log::warning('WhatsApp reply failed', ['status' => $response->status(), 'body' => $response->body()]);
            }
        } catch (\Throwable $e) {
            Log::warning('WhatsApp reply failed', ['error' => $e->getMessage()]);
        }
    }

    private function newCode(): string
    {
        $max = strlen(self::CODE_ALPHABET) - 1;
        $code = '';
        for ($i = 0; $i < self::CODE_LENGTH; $i++) {
            $code .= self::CODE_ALPHABET[random_int(0, $max)];
        }

        return $code;
    }
}
