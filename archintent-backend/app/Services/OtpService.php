<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OtpService
{
    private const CACHE_PREFIX = 'phone_otp:user:';

    public function sendForUser(User $user): array
    {
        $phone = trim((string) ($user->phone_number ?? ''));
        if ($phone === '') {
            throw new \InvalidArgumentException('No phone number on file');
        }

        $length = (int) config('otp.length', 6);
        $code = str_pad((string) random_int(0, (10 ** $length) - 1), $length, '0', STR_PAD_LEFT);

        $ttl = (int) config('otp.ttl_seconds', 600);
        Cache::put(self::CACHE_PREFIX . $user->user_id, password_hash($code, PASSWORD_BCRYPT), now()->addSeconds($ttl));

        $to = $this->normalizeToE164($phone);
        $sid = trim((string) (config('otp.twilio.account_sid') ?? ''));
        $token = trim((string) (config('otp.twilio.auth_token') ?? ''));
        $from = trim((string) (config('otp.twilio.from') ?? ''));

        if ($sid !== '' && $token !== '' && $from !== '') {
            $this->sendTwilioOtp($sid, $token, $from, $to, $code);
        } else {
            Log::info('Phone OTP (Twilio not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)', [
                'user_id' => $user->user_id,
                'phone_tail' => substr($phone, -4),
            ]);
        }

        $out = ['sent' => true, 'expires_in_seconds' => $ttl];
        if (config('otp.expose_code_in_response')) {
            $out['dev_code'] = $code;
        }

        return $out;
    }

    /**
     * Send a plain SMS (e.g. artisan sms:twilio-test). Requires Twilio env vars.
     */
    public function sendCustomSms(string $phone, string $messageText): void
    {
        $to = $this->normalizeToE164(trim($phone));
        $sid = trim((string) (config('otp.twilio.account_sid') ?? ''));
        $token = trim((string) (config('otp.twilio.auth_token') ?? ''));
        $from = trim((string) (config('otp.twilio.from') ?? ''));

        if ($sid === '' || $token === '' || $from === '') {
            throw new \RuntimeException(
                'Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM in archintent-backend/.env then run php artisan config:clear.'
            );
        }

        $this->sendTwilioRaw($sid, $token, $from, $to, $messageText);
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
        $key = self::CACHE_PREFIX . $user->user_id;
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

    private function sendTwilioOtp(string $sid, string $token, string $from, string $to, string $code): void
    {
        $body = 'Your ArchIntent verification code is: '.$code;
        $this->sendTwilioRaw($sid, $token, $from, $to, $body);
    }

    private function sendTwilioRaw(string $sid, string $token, string $from, string $to, string $body): void
    {
        $url = "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";

        $response = Http::withBasicAuth($sid, $token)
            ->asForm()
            ->timeout(30)
            ->post($url, [
                'From' => $from,
                'To' => $to,
                'Body' => $body,
            ]);

        if (!$response->successful()) {
            Log::error('Twilio SMS send failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \RuntimeException('SMS provider rejected the request: HTTP '.$response->status());
        }

        Log::info('Twilio SMS accepted', ['to_tail' => substr($to, -4)]);
    }
}
