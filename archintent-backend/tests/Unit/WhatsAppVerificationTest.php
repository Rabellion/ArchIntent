<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\OtpService;
use App\Services\WhatsAppVerificationService;
use Mockery;
use Tests\TestCase;

class WhatsAppVerificationTest extends TestCase
{
    private const SECRET = 'test-app-secret';

    /** @var list<array{to: string, text: string}> */
    private array $replies = [];

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.whatsapp.business_number' => '923110000000',
            'services.whatsapp.app_secret' => self::SECRET,
            'services.whatsapp.verify_token' => 'my-verify-token',
            'otp.ttl_seconds' => 600,
        ]);

        // save() stubbed, so no database is needed.
        $this->user = Mockery::mock(User::class)->makePartial();
        $this->user->shouldReceive('save')->andReturnTrue();
        $this->user->forceFill(['phone_number' => '0300 1234567']);
        $this->user->user_id = 7;

        // Real logic; only the DB lookup and the outbound reply are stubbed.
        $service = Mockery::mock(WhatsAppVerificationService::class, [app(OtpService::class)])
            ->makePartial()
            ->shouldAllowMockingProtectedMethods();
        $service->shouldReceive('findUser')->andReturnUsing(fn (int $id) => $id === 7 ? $this->user : null);
        $service->shouldReceive('reply')->andReturnUsing(function (string $to, string $text) {
            $this->replies[] = ['to' => $to, 'text' => $text];
        });
        $this->app->instance(WhatsAppVerificationService::class, $service);
    }

    private function service(): WhatsAppVerificationService
    {
        return app(WhatsAppVerificationService::class);
    }

    private function inbound(string $from, string $body, string $id = 'wamid.1'): array
    {
        return [
            'object' => 'whatsapp_business_account',
            'entry' => [[
                'id' => '102290129340398',
                'changes' => [[
                    'field' => 'messages',
                    'value' => [
                        'messaging_product' => 'whatsapp',
                        'metadata' => ['display_phone_number' => '923110000000', 'phone_number_id' => '106540352242922'],
                        'contacts' => [['profile' => ['name' => 'Sara'], 'wa_id' => $from]],
                        'messages' => [[
                            'from' => $from, 'id' => $id, 'timestamp' => '1749416383',
                            'type' => 'text', 'text' => ['body' => $body],
                        ]],
                    ],
                ]],
            ]],
        ];
    }

    /** POST the payload to the real route, signed like Meta signs it. */
    private function postWebhook(array $payload, ?string $signature = null)
    {
        $raw = json_encode($payload);
        $signature ??= 'sha256='.hash_hmac('sha256', $raw, self::SECRET);

        return $this->call('POST', '/api/webhooks/whatsapp', [], [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_X_HUB_SIGNATURE_256' => $signature], $raw);
    }

    public function test_start_issues_a_code_and_a_prefilled_wa_me_link(): void
    {
        $result = $this->service()->start($this->user);

        $this->assertMatchesRegularExpression('/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/', $result['code']);
        $this->assertSame("VERIFY {$result['code']}", $result['message']);
        $this->assertSame('https://wa.me/923110000000?text='.rawurlencode($result['message']), $result['wa_link']);
        $this->assertSame(600, $result['expires_in_seconds']);
    }

    public function test_sending_the_code_from_the_profile_number_verifies_the_phone(): void
    {
        $code = $this->service()->start($this->user)['code'];

        $this->postWebhook($this->inbound('923001234567', "VERIFY {$code}"))->assertOk();

        $this->assertNotNull($this->user->phone_verified_at);
        $this->assertStringContainsString('now verified', end($this->replies)['text']);
        $this->assertSame('923001234567', end($this->replies)['to']);
    }

    public function test_a_used_code_cannot_verify_again(): void
    {
        $code = $this->service()->start($this->user)['code'];
        $this->postWebhook($this->inbound('923001234567', "VERIFY {$code}", 'wamid.a'));
        $this->user->phone_verified_at = null;

        $this->postWebhook($this->inbound('923001234567', "VERIFY {$code}", 'wamid.b'));

        $this->assertNull($this->user->phone_verified_at);
        $this->assertStringContainsString('invalid or has expired', end($this->replies)['text']);
    }

    public function test_a_different_whatsapp_number_does_not_verify_and_keeps_the_code(): void
    {
        $code = $this->service()->start($this->user)['code'];

        $this->postWebhook($this->inbound('923339999999', "VERIFY {$code}", 'wamid.x'));

        $this->assertNull($this->user->phone_verified_at);
        $this->assertStringContainsString("doesn't match", end($this->replies)['text']);

        // Still usable from the right phone.
        $this->postWebhook($this->inbound('923001234567', "verify {$code}", 'wamid.y'));
        $this->assertNotNull($this->user->phone_verified_at);
    }

    public function test_requesting_a_new_code_invalidates_the_old_one(): void
    {
        $old = $this->service()->start($this->user)['code'];
        $this->service()->start($this->user);

        $this->postWebhook($this->inbound('923001234567', "VERIFY {$old}"));

        $this->assertNull($this->user->phone_verified_at);
    }

    public function test_a_retried_webhook_is_only_processed_once(): void
    {
        $code = $this->service()->start($this->user)['code'];
        $payload = $this->inbound('923001234567', "VERIFY {$code}", 'wamid.same');

        $this->postWebhook($payload);
        $this->postWebhook($payload);

        $this->assertCount(1, $this->replies);
    }

    public function test_unrelated_messages_get_help_and_status_updates_are_ignored(): void
    {
        $this->postWebhook($this->inbound('923001234567', 'hello'));
        $this->assertStringContainsString('Verify with WhatsApp', end($this->replies)['text']);

        $this->replies = [];
        $status = ['object' => 'whatsapp_business_account', 'entry' => [['changes' => [[
            'field' => 'messages',
            'value' => ['statuses' => [['id' => 'wamid.s', 'status' => 'delivered', 'recipient_id' => '923001234567']]],
        ]]]]];
        $this->postWebhook($status)->assertOk();
        $this->assertSame([], $this->replies);
    }

    public function test_a_forged_or_unsigned_webhook_is_rejected(): void
    {
        $code = $this->service()->start($this->user)['code'];
        $payload = $this->inbound('923001234567', "VERIFY {$code}");

        $this->postWebhook($payload, 'sha256='.hash_hmac('sha256', json_encode($payload), 'wrong-secret'))->assertStatus(401);
        $this->postWebhook($payload, 'not-a-signature')->assertStatus(401);

        $this->assertNull($this->user->phone_verified_at);
        $this->assertSame([], $this->replies);
    }

    public function test_subscription_handshake_echoes_the_challenge_only_for_the_right_token(): void
    {
        $this->get('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=my-verify-token&hub.challenge=1158201444')
            ->assertOk()
            ->assertSeeText('1158201444');

        $this->get('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1158201444')
            ->assertForbidden();
    }

    public function test_not_configured_without_secret_or_verify_token(): void
    {
        $this->assertTrue($this->service()->isConfigured());

        config(['services.whatsapp.app_secret' => null]);
        $this->assertFalse($this->service()->isConfigured());
    }
}
