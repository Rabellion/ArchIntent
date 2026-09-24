<?php

namespace App\Console\Commands;

use App\Services\OtpService;
use Illuminate\Console\Command;

class SmsTestCommand extends Command
{
    protected $signature = 'sms:test
                            {phone : E.164 or local number (e.g. +923253697546)}
                            {--message=ArchIntent test: SMS delivery is configured.}';

    protected $description = 'Send one SMS through the configured OTP_SMS_DRIVER (smsgate or twilio)';

    public function handle(OtpService $otpService): int
    {
        $driver = (string) config('otp.sms_driver');
        $this->line('SMS driver: '.$driver);

        if ($driver === 'none') {
            $this->error('No SMS driver configured.');
            $this->line('Set SMSGATE_USERNAME and SMSGATE_PASSWORD (from the SMS Gateway app\'s Cloud Server section),');
            $this->line('or TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM. Then: php artisan config:clear');

            return self::FAILURE;
        }

        $phone = (string) $this->argument('phone');
        $this->line('Normalized recipient: '.$otpService->normalizeToE164($phone));

        try {
            $otpService->sendSms($phone, (string) $this->option('message'));
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info("[OK] {$driver} accepted the message. Check the handset.");

        return self::SUCCESS;
    }
}
