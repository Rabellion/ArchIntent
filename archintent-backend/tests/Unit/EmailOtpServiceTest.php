<?php

namespace Tests\Unit;

use App\Mail\OtpCodeMail;
use App\Services\EmailOtpService;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailOtpServiceTest extends TestCase
{
    public function test_smtp_driver_sends_the_otp_mail_to_the_user(): void
    {
        config(['otp.email_driver' => 'mail', 'mail.default' => 'smtp']);
        Mail::fake();

        $result = app(EmailOtpService::class)->deliver('someone@gmail.com', 'Sara Malik', '482913');

        $this->assertSame(['sent' => true, 'reason' => null], $result);
        Mail::assertSent(OtpCodeMail::class, function (OtpCodeMail $mail) {
            return $mail->hasTo('someone@gmail.com')
                && $mail->otpCode === '482913'
                && $mail->userName === 'Sara Malik';
        });
    }

    public function test_the_rendered_email_contains_the_code(): void
    {
        $mail = new OtpCodeMail('Sara Malik', '482913');

        $mail->assertSeeInHtml('482913');
        $mail->assertSeeInText('482913');
        $mail->assertHasSubject('Your ArchIntent verification code');
    }

    public function test_log_mailer_in_production_is_reported_as_not_configured(): void
    {
        config(['otp.email_driver' => 'mail', 'mail.default' => 'log', 'app.debug' => false]);
        Mail::fake();

        $result = app(EmailOtpService::class)->deliver('someone@gmail.com', 'Sara', '482913');

        $this->assertFalse($result['sent']);
        $this->assertSame('Email delivery is not configured on this server.', $result['reason']);
        Mail::assertNothingSent();
    }

    public function test_gmail_bad_app_password_is_reported_as_misconfiguration(): void
    {
        config(['otp.email_driver' => 'mail', 'mail.default' => 'smtp']);
        Mail::shouldReceive('to->send')->andThrow(new \RuntimeException(
            'Failed to authenticate on SMTP server with username "x@gmail.com" using the following authenticators: "LOGIN", "PLAIN". '
            .'Authenticator "LOGIN" returned "Expected response code "235" but got code "535", with message "535-5.7.8 Username and Password not accepted."'
        ));

        $result = app(EmailOtpService::class)->deliver('someone@gmail.com', 'Sara', '482913');

        $this->assertFalse($result['sent']);
        $this->assertSame('Email delivery is not configured correctly on this server.', $result['reason']);
    }

    public function test_gmail_daily_limit_is_reported_as_such(): void
    {
        config(['otp.email_driver' => 'mail', 'mail.default' => 'smtp']);
        Mail::shouldReceive('to->send')->andThrow(new \RuntimeException(
            'Expected response code "250" but got code "550", with message "550 5.4.5 Daily user sending limit exceeded."'
        ));

        $result = app(EmailOtpService::class)->deliver('someone@gmail.com', 'Sara', '482913');

        $this->assertStringContainsString("today's email limit", $result['reason']);
    }
}
