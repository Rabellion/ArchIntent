<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\FirebaseEmailVerifier;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

class FirebaseEmailVerifierTest extends TestCase
{
    private const API = 'https://identitytoolkit.googleapis.com/v1/accounts:';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.firebase.api_key' => 'test-web-key', 'services.firebase.continue_url' => null]);
    }

    /** A User whose save() is a no-op, so no database is needed. */
    private function user(array $attributes = []): User
    {
        $user = Mockery::mock(User::class)->makePartial();
        $user->shouldReceive('save')->andReturnTrue();
        $user->forceFill(array_merge(['email' => 'sara@gmail.com', 'full_name' => 'Sara Malik'], $attributes));
        $user->user_id = 5;

        return $user;
    }

    private static function firebaseError(string $message, int $status = 400): \GuzzleHttp\Promise\PromiseInterface
    {
        return Http::response(['error' => ['code' => $status, 'message' => $message]], $status);
    }

    public function test_first_send_creates_the_firebase_account_and_emails_a_verify_link(): void
    {
        Http::fake([
            self::API.'signUp*' => Http::response(['idToken' => 'tok-signup', 'localId' => 'fb-uid-1']),
            self::API.'sendOobCode*' => Http::response(['email' => 'sara@gmail.com']),
        ]);
        $user = $this->user();

        $result = app(FirebaseEmailVerifier::class)->sendVerification($user);

        $this->assertSame(['sent' => true, 'reason' => null], $result);
        $this->assertSame('fb-uid-1', $user->firebase_uid);
        $this->assertSame(48, strlen((string) $user->firebase_password));

        Http::assertSent(fn (Request $r) => str_starts_with($r->url(), self::API.'signUp?key=test-web-key')
            && $r['email'] === 'sara@gmail.com'
            && $r['password'] === $user->firebase_password
            && $r['displayName'] === 'Sara Malik'
            // Not in the v1 signUp schema; Google rejects unknown fields.
            && !isset($r['returnSecureToken']));
        Http::assertSent(fn (Request $r) => str_starts_with($r->url(), self::API.'sendOobCode')
            && $r['requestType'] === 'VERIFY_EMAIL'
            && $r['idToken'] === 'tok-signup'
            && !isset($r['continueUrl']));
    }

    public function test_resend_signs_in_to_the_existing_account_with_the_same_password(): void
    {
        Http::fake([
            self::API.'signUp*' => self::firebaseError('EMAIL_EXISTS'),
            self::API.'signInWithPassword*' => Http::response(['idToken' => 'tok-signin', 'localId' => 'fb-uid-1']),
            self::API.'sendOobCode*' => Http::response(['email' => 'sara@gmail.com']),
        ]);
        $user = $this->user(['firebase_password' => 'existing-secret-password']);

        $result = app(FirebaseEmailVerifier::class)->sendVerification($user);

        $this->assertTrue($result['sent']);
        $this->assertSame('existing-secret-password', $user->firebase_password, 'the password must not rotate on resend');
        Http::assertSent(fn (Request $r) => str_starts_with($r->url(), self::API.'signInWithPassword')
            && $r['password'] === 'existing-secret-password');
        Http::assertSent(fn (Request $r) => str_starts_with($r->url(), self::API.'sendOobCode')
            && $r['idToken'] === 'tok-signin');
    }

    public function test_continue_url_is_passed_only_when_configured(): void
    {
        config(['services.firebase.continue_url' => 'https://archintent.vercel.app/login']);
        Http::fake([
            self::API.'signUp*' => Http::response(['idToken' => 't', 'localId' => 'u']),
            self::API.'sendOobCode*' => Http::response([]),
        ]);

        app(FirebaseEmailVerifier::class)->sendVerification($this->user());

        Http::assertSent(fn (Request $r) => str_starts_with($r->url(), self::API.'sendOobCode')
            && $r['continueUrl'] === 'https://archintent.vercel.app/login');
    }

    public function test_missing_api_key_fails_but_still_marks_the_account_pending(): void
    {
        config(['services.firebase.api_key' => null]);
        Http::fake();
        $user = $this->user();

        $result = app(FirebaseEmailVerifier::class)->sendVerification($user);

        $this->assertFalse($result['sent']);
        $this->assertSame('Email delivery is not configured on this server.', $result['reason']);
        // What keeps login blocked for an unverified user.
        $this->assertNotEmpty($user->firebase_password);
        Http::assertNothingSent();
    }

    public function test_disabled_email_password_provider_reads_as_misconfiguration(): void
    {
        Http::fake([self::API.'signUp*' => self::firebaseError('OPERATION_NOT_ALLOWED')]);

        $result = app(FirebaseEmailVerifier::class)->sendVerification($this->user());

        $this->assertFalse($result['sent']);
        $this->assertSame('Email delivery is not configured correctly on this server.', $result['reason']);
    }

    public function test_invalid_api_key_reads_as_misconfiguration(): void
    {
        Http::fake([self::API.'signUp*' => self::firebaseError('API key not valid. Please pass a valid API key.')]);

        $result = app(FirebaseEmailVerifier::class)->sendVerification($this->user());

        $this->assertSame('Email delivery is not configured correctly on this server.', $result['reason']);
    }

    public function test_rate_limit_asks_the_user_to_wait(): void
    {
        Http::fake([
            self::API.'signUp*' => Http::response(['idToken' => 't', 'localId' => 'u']),
            self::API.'sendOobCode*' => self::firebaseError('TOO_MANY_ATTEMPTS_TRY_LATER : Too many attempts'),
        ]);

        $result = app(FirebaseEmailVerifier::class)->sendVerification($this->user());

        $this->assertStringContainsString('wait a few minutes', $result['reason']);
    }

    public function test_is_verified_reflects_firebase_email_verified_flag(): void
    {
        Http::fake([
            self::API.'signInWithPassword*' => Http::response(['idToken' => 'tok', 'localId' => 'u']),
            self::API.'lookup*' => Http::sequence()
                ->push(['users' => [['localId' => 'u', 'emailVerified' => false]]])
                ->push(['users' => [['localId' => 'u', 'emailVerified' => true]]]),
        ]);
        $user = $this->user(['firebase_password' => 'secret']);
        $verifier = app(FirebaseEmailVerifier::class);

        $this->assertFalse($verifier->isVerified($user));
        $this->assertTrue($verifier->isVerified($user));
        Http::assertSent(fn (Request $r) => str_starts_with($r->url(), self::API.'lookup') && $r['idToken'] === 'tok');
    }

    public function test_is_verified_is_false_without_a_firebase_account_or_on_error(): void
    {
        Http::fake([self::API.'signInWithPassword*' => self::firebaseError('INVALID_LOGIN_CREDENTIALS')]);
        $verifier = app(FirebaseEmailVerifier::class);

        $this->assertFalse($verifier->isVerified($this->user()));
        $this->assertFalse($verifier->isVerified($this->user(['firebase_password' => 'secret'])));
    }

    public function test_the_firebase_password_is_encrypted_at_rest_and_hidden_from_json(): void
    {
        // A real model, not the partial mock: Mockery skips Eloquent's
        // constructor, which is where casts() is registered, so a mock
        // would store plaintext and make this test meaningless.
        $user = (new User())->forceFill(['firebase_password' => 'plain-secret', 'firebase_uid' => 'fb-uid-1']);

        $this->assertNotSame('plain-secret', $user->getAttributes()['firebase_password']);
        $this->assertSame('plain-secret', $user->firebase_password);
        $this->assertArrayNotHasKey('firebase_password', $user->toArray());
        $this->assertArrayNotHasKey('firebase_uid', $user->toArray());
    }
}
