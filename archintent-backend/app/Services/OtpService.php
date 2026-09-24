<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OtpService
{
    private const CACHE_PREFIX = 'phone_otp:user:';

    // Twilio: "The number is unverified. Trial accounts cannot send
    // messages to unverified numbers."
    private const TWILIO_TRIAL_UNVERIFIED = 21608;

    public function sendForUser(User $user): array
    {
        $phone = trim((string) ($user->phone_number ?? ''));
        if ($phone === '') {
            throw new \InvalidArgumentException('No phone number on file');
        }

        $length = (int) config('otp.length', 6);
        $code = str_pad((string) random_int(0, (10 ** $length) - 1), $length, '0', STR_PAD_LEFT);
        $ttl = (int) config('otp.ttl_seconds', 600);
        $exposeCode = (bool) config('otp.expose_code_in_response');

        if (config('otp.sms_driver') === 'none') {
            // Previously this logged and still reported success, so the UI
            // said "code sent" while nothing was sent. Only local QA with
            // the code exposed in the response may proceed without SMS.
            if (!$exposeCode) {
                throw new \RuntimeException('SMS delivery is not configured on this server.');
            }
            Log::info('Phone OTP not sent: no SMS driver configured (code exposed for QA)', [
                'user_id' => $user->user_id,
            ]);
        } else {
            $this->sendSms($phone, 'Your ArchIntent verification code is: '.$code);
        }

        // Stored only once the SMS was accepted, so a failed send can't
        // leave a code behind that the user was never told.
        Cache::put(self::CACHE_PREFIX.$user->user_id, password_hash($code, PASSWORD_BCRYPT), now()->addSeconds($ttl));

        $out = ['sent' => true, 'expires_in_seconds' => $ttl];
        if ($exposeCode) {
            $out['dev_code'] = $code;
        }

        return $out;
    }

    /**
     * Send one SMS through the configured driver (also used by artisan sms:test).
     */
    public function sendSms(string $phone, string $text): void
    {
        $to = $this->normalizeToE164($phone);

        match (config('otp.sms_driver')) {
            'openwa' => $this->sendViaOpenWa($to, $text),
            'smsgate' => $this->sendViaSmsGate($to, $text),
            'twilio' => $this->sendViaTwilio($to, $text),
            default => throw new \RuntimeException('SMS delivery is not configured on this server.'),
        };
    }

    public function normalizeToE164(string $phone): string
    {
        $phone = trim($phone);
        if ($phone === '') {
            return '';
        }

        if (str_starts_with($phone, '+')) {
            return '+'.preg_replace('/\D+/', '', substr($phone, 1));
        }

        $digits = preg_replace('/\D+/', '', $phone);
        if ($digits === '') {
            return $phone;
        }

        if (str_starts_with($digits, '92')) {
            return '+'.$digits;
        }

        if (str_starts_with($digits, '0') && strlen($digits) >= 10 && $digits[1] === '3') {
            return '+92'.substr($digits, 1);
        }

        return '+'.$digits;
    }

    public function verifyForUser(User $user, string $code): bool
    {
        $key = self::CACHE_PREFIX.$user->user_id;
        $hash = Cache::get($key);
        if (!$hash || !is_string($hash)) {
            return false;
        }

        if (!password_verify($code, $hash)) {
            return false;
        }

        Cache::forget($key);

        return true;
    }

    /**
     * open-wa's Easy API. "to" is E.164 (leading +); WhatsApp's own chat id
     * format has no +, so it is stripped here, not in normalizeToE164,
     * which every other driver still needs in +-form.
     */
    private function sendViaOpenWa(string $to, string $text): void
    {
        $baseUrl = (string) config('otp.openwa.base_url');
        $apiKey = (string) config('otp.openwa.api_key');
        if ($baseUrl === '' || $apiKey === '') {
            throw new \RuntimeException('SMS delivery is not configured on this server.');
        }

        $chatId = ltrim($to, '+').'@c.us';

        try {
            $response = Http::withHeaders(['X-API-Key' => $apiKey])
                ->acceptJson()
                ->timeout(30)
                ->post($baseUrl.'/api/sendText', ['to' => $chatId, 'content' => $text]);
        } catch (\Throwable $e) {
            Log::error('open-wa SMS send failed', ['error' => $e->getMessage()]);

            throw new \RuntimeException('Could not send the WhatsApp message right now. Please try again shortly.');
        }

        if (!$response->successful()) {
            $this->logFailure('open-wa', $response);

            throw new \RuntimeException(match (true) {
                $response->status() === 401 => 'SMS delivery is not configured correctly on this server.',
                // WhatsApp session logged out / needs re-linking (QR scan).
                $response->status() === 503 => 'WhatsApp verification is temporarily unavailable. Please try again later.',
                default => 'Could not send the WhatsApp message right now. Please try again shortly.',
            });
        }

        Log::info('open-wa accepted WhatsApp message', ['to_tail' => substr($to, -4)]);
    }

    private function sendViaSmsGate(string $to, string $text): void
    {
        $username = (string) config('otp.smsgate.username');
        $password = (string) config('otp.smsgate.password');
        if ($username === '' || $password === '') {
            throw new \RuntimeException('SMS delivery is not configured on this server.');
        }

        $response = Http::withBasicAuth($username, $password)
            ->acceptJson()
            ->timeout(30)
            ->post(config('otp.smsgate.base_url').'/message', [
                'textMessage' => ['text' => $text],
                'phoneNumbers' => [$to],
            ]);

        if (!$response->successful()) {
            $this->logFailure('SMS Gateway', $response);

            throw new \RuntimeException($response->status() === 401
                ? 'SMS delivery is not configured correctly on this server.'
                : 'Could not send the SMS right now. Please try again shortly.');
        }

        Log::info('SMS Gateway accepted SMS', ['to_tail' => substr($to, -4), 'id' => $response->json('id')]);
    }

    private function sendViaTwilio(string $to, string $text): void
    {
        $sid = (string) config('otp.twilio.account_sid');
        $token = (string) config('otp.twilio.auth_token');
        $from = (string) config('otp.twilio.from');
        if ($sid === '' || $token === '' || $from === '') {
            throw new \RuntimeException('SMS delivery is not configured on this server.');
        }

        $response = Http::withBasicAuth($sid, $token)
            ->asForm()
            ->timeout(30)
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
                'From' => $from,
                'To' => $to,
                'Body' => $text,
            ]);

        if (!$response->successful()) {
            $this->logFailure('Twilio', $response);

            throw new \RuntimeException((int) $response->json('code') === self::TWILIO_TRIAL_UNVERIFIED
                ? 'This server can currently only text its own verified number. Ask the administrator to switch SMS providers.'
                : 'Could not send the SMS right now. Please try again shortly.');
        }

        Log::info('Twilio accepted SMS', ['to_tail' => substr($to, -4)]);
    }

    private function logFailure(string $provider, Response $response): void
    {
        Log::error("{$provider} SMS send failed", [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);
    }
}
