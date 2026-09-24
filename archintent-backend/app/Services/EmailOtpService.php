<?php

namespace App\Services;

use App\Mail\OtpCodeMail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Mailtrap\MailtrapClient;
use Mailtrap\Mime\MailtrapEmail;
use Symfony\Component\Mime\Address;

class EmailOtpService
{
    /**
     * @return array{sent: bool, reason: string|null}
     *
     * Returns the reason alongside the outcome so the caller can tell the
     * user something actionable instead of a blanket "could not send".
     */
    public function deliver(string $toEmail, string $toName, string $otp): array
    {
        return config('otp.email_driver') === 'mailtrap'
            ? $this->deliverViaMailtrap($toEmail, $toName, $otp)
            : $this->deliverViaMailer($toEmail, $toName, $otp);
    }

    /**
     * Laravel's own mailer -- any SMTP server (Gmail, Brevo, ...) via MAIL_*.
     */
    private function deliverViaMailer(string $toEmail, string $toName, string $otp): array
    {
        // 'log' and 'array' accept the message and deliver nothing, which
        // would otherwise report success for mail nobody receives.
        if (in_array(config('mail.default'), ['log', 'array'], true)) {
            Log::warning('MAIL_MAILER is not a real transport — OTP not emailed', ['email' => $toEmail]);

            return [
                'sent' => (bool) config('app.debug'),
                'reason' => 'Email delivery is not configured on this server.',
            ];
        }

        try {
            Mail::to($toEmail, $toName)->send(new OtpCodeMail($toName, $otp));

            Log::info('OTP email sent', ['email' => $toEmail, 'mailer' => config('mail.default')]);

            return ['sent' => true, 'reason' => null];
        } catch (\Throwable $e) {
            Log::error('OTP email send failed', ['error' => $e->getMessage(), 'email' => $toEmail]);

            return ['sent' => false, 'reason' => $this->describeSmtpFailure($e->getMessage())];
        }
    }

    private function describeSmtpFailure(string $error): string
    {
        // Gmail: "535-5.7.8 Username and Password not accepted" -- wrong or
        // missing App Password.
        if (str_contains($error, '535') || stripos($error, 'authentication') !== false) {
            return 'Email delivery is not configured correctly on this server.';
        }

        // Gmail: "550 5.4.5 Daily user sending limit exceeded".
        if (str_contains($error, '5.4.5') || stripos($error, 'limit exceeded') !== false) {
            return 'This server has reached today\'s email limit. Please try again tomorrow.';
        }

        return 'Could not send the verification email. Please try again shortly.';
    }

    private function deliverViaMailtrap(string $toEmail, string $toName, string $otp): array
    {
        $token = config('services.mailtrap.api_token');

        if (!$token) {
            Log::warning('MAILTRAP_API_TOKEN not set — OTP not sent by email', ['email' => $toEmail]);

            return [
                'sent' => (bool) config('app.debug'),
                'reason' => 'Email delivery is not configured on this server.',
            ];
        }

        try {
            $htmlBody = view('emails.otp', ['userName' => $toName, 'otpCode' => $otp])->render();
            $textBody = view('emails.otp-text', ['userName' => $toName, 'otpCode' => $otp])->render();

            $fromEmail = (string) config('services.mailtrap.from_email', 'hello@demomailtrap.co');
            $fromName = (string) config('services.mailtrap.from_name', 'ArchIntent');

            $email = (new MailtrapEmail())
                ->from(new Address($fromEmail, $fromName))
                ->to(new Address($toEmail, $toName))
                ->subject('Your ArchIntent verification code')
                ->text($textBody)
                ->html($htmlBody)
                ->category('OTP');

            // Sandbox captures mail in a Mailtrap inbox for any recipient;
            // live sending on the demo domain only reaches the account owner.
            $isSandbox = config('services.mailtrap.mode') === 'sandbox';
            $inboxId = config('services.mailtrap.inbox_id');

            if ($isSandbox && !$inboxId) {
                Log::error('MAILTRAP_MODE=sandbox but MAILTRAP_INBOX_ID is not set');

                return [
                    'sent' => false,
                    'reason' => 'Email delivery is misconfigured on this server.',
                ];
            }

            MailtrapClient::initSendingEmails(
                apiKey: $token,
                isSandbox: $isSandbox,
                inboxId: $isSandbox ? (int) $inboxId : null,
            )->send($email);

            Log::info('OTP email sent via Mailtrap', [
                'email' => $toEmail,
                'mode' => $isSandbox ? 'sandbox' : 'send',
            ]);

            return ['sent' => true, 'reason' => null];
        } catch (\Throwable $e) {
            Log::error('Mailtrap OTP send failed', ['error' => $e->getMessage(), 'email' => $toEmail]);

            return [
                'sent' => false,
                'reason' => $this->describeMailtrapFailure($e->getMessage()),
            ];
        }
    }

    private function describeMailtrapFailure(string $error): string
    {
        if (stripos($error, 'demo domain') !== false
            || stripos($error, 'account owner') !== false) {
            return 'This server can currently only email the address that owns '
                .'its mail account. Ask the administrator to switch email providers.';
        }

        // Free tier rejects bursts with "Too many emails per second"; it
        // clears within a second, so the useful advice is to wait.
        if (stripos($error, 'too many') !== false) {
            return 'Too many verification emails at once. Please wait a few '
                .'seconds and request the code again.';
        }

        if (stripos($error, 'unauthor') !== false || stripos($error, '401') !== false) {
            return 'Email delivery is not configured correctly on this server.';
        }

        return 'Could not send the verification email. Please try again shortly.';
    }
}
