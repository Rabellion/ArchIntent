<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OtpServiceSmsTest extends TestCase
{
    private function user(string $phone = '03253697546'): User
    {
        $user = new User(['phone_number' => $phone]);
        $user->user_id = 42;

        return $user;
    }

    private function useSmsGate(): void
    {
        config([
            'otp.sms_driver' => 'smsgate',
            'otp.smsgate.base_url' => 'https://api.sms-gate.app/3rdparty/v1',
            'otp.smsgate.username' => 'gw-user',
            'otp.smsgate.password' => 'gw-pass',
            'otp.expose_code_in_response' => false,
        ]);
    }

    public function test_smsgate_sends_the_code_to_the_e164_number_with_basic_auth(): void
    {
        $this->useSmsGate();
        Http::fake(['api.sms-gate.app/*' => Http::response(['id' => 'msg-1', 'state' => 'Pending'], 202)]);

        $result = app(OtpService::class)->sendForUser($this->user());

        $this->assertTrue($result['sent']);
        $this->assertArrayNotHasKey('dev_code', $result);
        Http::assertSent(function (Request $request) {
            return $request->url() === 'https://api.sms-gate.app/3rdparty/v1/message'
                && $request->hasHeader('Authorization', 'Basic '.base64_encode('gw-user:gw-pass'))
                && $request['phoneNumbers'] === ['+923253697546']
                && preg_match('/^Your ArchIntent verification code is: \d{6}$/', $request['textMessage']['text']) === 1;
        });
    }

    public function test_the_code_that_was_texted_is_the_one_that_verifies(): void
    {
        $this->useSmsGate();
        Http::fake(['api.sms-gate.app/*' => Http::response(['id' => 'msg-1'], 202)]);
        $service = app(OtpService::class);
        $user = $this->user();

        $service->sendForUser($user);

        $sentCode = null;
        Http::assertSent(function (Request $request) use (&$sentCode) {
            $sentCode = substr($request['textMessage']['text'], -6);

            return true;
        });

        $wrongCode = $sentCode === '000000' ? '111111' : '000000';
        $this->assertFalse($service->verifyForUser($user, $wrongCode));
        $this->assertTrue($service->verifyForUser($user, $sentCode));
        $this->assertFalse($service->verifyForUser($user, $sentCode), 'a code must only verify once');
    }

    public function test_it_refuses_to_claim_success_when_no_sms_driver_is_configured(): void
    {
        config(['otp.sms_driver' => 'none', 'otp.expose_code_in_response' => false]);
        Http::fake();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('SMS delivery is not configured on this server.');

        try {
            app(OtpService::class)->sendForUser($this->user());
        } finally {
            Http::assertNothingSent();
        }
    }

    public function test_a_failed_send_leaves_no_verifiable_code_behind(): void
    {
        $this->useSmsGate();
        Http::fake(['api.sms-gate.app/*' => Http::response(['message' => 'boom'], 500)]);
        $service = app(OtpService::class);
        $user = $this->user();

        try {
            $service->sendForUser($user);
            $this->fail('expected the send to throw');
        } catch (\RuntimeException $e) {
            $this->assertSame('Could not send the SMS right now. Please try again shortly.', $e->getMessage());
        }

        foreach (['000000', '123456', '999999'] as $guess) {
            $this->assertFalse($service->verifyForUser($user, $guess));
        }
    }

    public function test_bad_smsgate_credentials_are_reported_as_misconfiguration(): void
    {
        $this->useSmsGate();
        Http::fake(['api.sms-gate.app/*' => Http::response([], 401)]);

        $this->expectExceptionMessage('SMS delivery is not configured correctly on this server.');

        app(OtpService::class)->sendForUser($this->user());
    }

    public function test_twilio_trial_rejection_explains_the_real_cause(): void
    {
        config([
            'otp.sms_driver' => 'twilio',
            'otp.twilio.account_sid' => 'AC123',
            'otp.twilio.auth_token' => 'tok',
            'otp.twilio.from' => '+15550001111',
        ]);
        Http::fake(['api.twilio.com/*' => Http::response([
            'code' => 21608,
            'message' => 'The number is unverified. Trial accounts cannot send messages to unverified numbers',
        ], 400)]);

        $this->expectExceptionMessage('This server can currently only text its own verified number.');

        app(OtpService::class)->sendForUser($this->user());
    }

    public function test_local_numbers_are_normalized_to_pakistani_e164(): void
    {
        $service = app(OtpService::class);

        $this->assertSame('+923253697546', $service->normalizeToE164('0325 3697546'));
        $this->assertSame('+923253697546', $service->normalizeToE164('923253697546'));
        $this->assertSame('+923253697546', $service->normalizeToE164('+92 325-3697546'));
    }

    private function useOpenWa(): void
    {
        config([
            'otp.sms_driver' => 'openwa',
            'otp.openwa.base_url' => 'https://whatsapp-service.example.com',
            'otp.openwa.api_key' => 'wa-secret-key',
            'otp.expose_code_in_response' => false,
        ]);
    }

    public function test_openwa_sends_the_code_as_a_whatsapp_chat_id_with_the_api_key_header(): void
    {
        $this->useOpenWa();
        Http::fake(['whatsapp-service.example.com/*' => Http::response(['id' => 'true_923253697546@c.us_ABC123'])]);

        $result = app(OtpService::class)->sendForUser($this->user());

        $this->assertTrue($result['sent']);
        Http::assertSent(function (Request $request) {
            return $request->url() === 'https://whatsapp-service.example.com/api/sendText'
                && $request->hasHeader('X-API-Key', 'wa-secret-key')
                // No leading + -- open-wa's chat id format is bare digits + "@c.us".
                && $request['to'] === '923253697546@c.us'
                && preg_match('/^Your ArchIntent verification code is: \d{6}$/', $request['content']) === 1;
        });
    }

    public function test_openwa_session_not_ready_is_reported_plainly(): void
    {
        $this->useOpenWa();
        Http::fake(['whatsapp-service.example.com/*' => Http::response(
            ['error' => 'API not available until the session is truly ready', 'status' => 503],
            503
        )]);

        $this->expectExceptionMessage('WhatsApp verification is temporarily unavailable. Please try again later.');

        app(OtpService::class)->sendForUser($this->user());
    }

    public function test_openwa_bad_api_key_is_reported_as_misconfiguration(): void
    {
        $this->useOpenWa();
        Http::fake(['whatsapp-service.example.com/*' => Http::response(
            ['error' => 'Unauthorized', 'details' => 'Invalid or missing API key'],
            401
        )]);

        $this->expectExceptionMessage('SMS delivery is not configured correctly on this server.');

        app(OtpService::class)->sendForUser($this->user());
    }

    public function test_openwa_unreachable_service_does_not_leak_a_raw_exception(): void
    {
        $this->useOpenWa();
        Http::fake(function () {
            throw new \Illuminate\Http\Client\ConnectionException('cURL error 7: Failed to connect');
        });

        $this->expectExceptionMessage('Could not send the WhatsApp message right now. Please try again shortly.');

        app(OtpService::class)->sendForUser($this->user());
    }
}
