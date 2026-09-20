<?php

namespace App\Console\Commands;

use App\Services\OtpService;
use Illuminate\Console\Command;

class SmsTwilioTestCommand extends Command
{
    protected $signature = 'sms:twilio-test
                            {phone : E.164 or local number (e.g. +923253697546)}
                            {--message=ArchIntent test: Twilio SMS is configured. Reply OK if you received this.}';

    protected $description = 'Send one SMS via Twilio (requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM in .env)';

    public function handle(OtpService $otpService): int
    {
        $phone = (string) $this->argument('phone');
        $text = (string) $this->option('message');

        $sid = trim((string) config('otp.twilio.account_sid'));
        $token = trim((string) config('otp.twilio.auth_token'));
        $from = trim((string) config('otp.twilio.from'));

        if ($sid === '' || $token === '' || $from === '') {
            $this->error('Twilio env vars are missing or empty.');
            $this->newLine();
            $this->line('Set in '.base_path('.env').':');
            $this->line('  TWILIO_ACCOUNT_SID=AC...');
            $this->line('  TWILIO_AUTH_TOKEN=...');
            $this->line('  TWILIO_FROM=+1... (your Twilio phone number or approved sender)');
            $this->line('Then: php artisan config:clear');

            return self::FAILURE;
        }

        $normalized = $otpService->normalizeToE164($phone);
        $this->line('Normalized recipient: '.$normalized);

        try {
            $otpService->sendCustomSms($phone, $text);
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info('[OK] Twilio accepted the message. Check the handset (and Twilio Console > Monitor > Logs > Messaging).');

        return self::SUCCESS;
    }
}
