<?php

namespace App\Services;

use App\Exceptions\FirebaseAuthException;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Sends and checks email verification through Firebase Authentication's
 * REST API (free Spark plan), so Firebase -- not our own mail server --
 * delivers the email, to any address.
 *
 * Firebase will only email a user that exists in Firebase and only on
 * that user's own ID token, so each Laravel user gets a shadow Firebase
 * account with a random server-held password. Laravel stays the source
 * of truth for authentication; the shadow account is never used to log
 * anyone in.
 */
class FirebaseEmailVerifier
{
    private const BASE_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:';

    /**
     * @return array{sent: bool, reason: string|null}
     */
    public function sendVerification(User $user): array
    {
        // Set before anything can fail: it is also what marks the account
        // as awaiting verification, so login stays blocked even if Firebase
        // is misconfigured. Reused on every resend, so retries just work.
        if (!$user->firebase_password) {
            $user->forceFill(['firebase_password' => Str::random(48)])->save();
        }

        if (!$this->apiKey()) {
            Log::warning('FIREBASE_WEB_API_KEY not set — verification email not sent', ['user_id' => $user->user_id]);

            return ['sent' => false, 'reason' => 'Email delivery is not configured on this server.'];
        }

        try {
            $payload = ['requestType' => 'VERIFY_EMAIL', 'idToken' => $this->idTokenFor($user)];
            if ($continueUrl = config('services.firebase.continue_url')) {
                $payload['continueUrl'] = $continueUrl;
            }

            $this->call('sendOobCode', $payload);

            Log::info('Firebase verification email sent', ['user_id' => $user->user_id]);

            return ['sent' => true, 'reason' => null];
        } catch (FirebaseAuthException $e) {
            Log::error('Firebase verification email failed', ['user_id' => $user->user_id, 'code' => $e->firebaseCode]);

            return ['sent' => false, 'reason' => $this->describe($e->firebaseCode)];
        } catch (\Throwable $e) {
            Log::error('Firebase verification email failed', ['user_id' => $user->user_id, 'error' => $e->getMessage()]);

            return ['sent' => false, 'reason' => 'Could not send the verification email. Please try again shortly.'];
        }
    }

    /**
     * Whether the user has clicked the link Firebase emailed them.
     */
    public function isVerified(User $user): bool
    {
        if (!$this->apiKey() || !$user->firebase_password) {
            return false;
        }

        try {
            $account = $this->call('lookup', ['idToken' => $this->signIn($user)]);

            return (bool) data_get($account, 'users.0.emailVerified', false);
        } catch (\Throwable $e) {
            Log::warning('Firebase verification check failed', [
                'user_id' => $user->user_id,
                'code' => $e instanceof FirebaseAuthException ? $e->firebaseCode : $e->getMessage(),
            ]);

            return false;
        }
    }

    private function idTokenFor(User $user): string
    {
        try {
            $created = $this->call('signUp', [
                'email' => $user->email,
                'password' => $user->firebase_password,
                'displayName' => $user->full_name,
            ]);
            $user->forceFill(['firebase_uid' => $created['localId'] ?? null])->save();

            return (string) $created['idToken'];
        } catch (FirebaseAuthException $e) {
            // Already created on an earlier attempt (e.g. a resend).
            if ($e->firebaseCode === 'EMAIL_EXISTS') {
                return $this->signIn($user);
            }
            throw $e;
        }
    }

    private function signIn(User $user): string
    {
        $session = $this->call('signInWithPassword', [
            'email' => $user->email,
            'password' => $user->firebase_password,
            'returnSecureToken' => true,
        ]);

        if (!$user->firebase_uid && !empty($session['localId'])) {
            $user->forceFill(['firebase_uid' => $session['localId']])->save();
        }

        return (string) $session['idToken'];
    }

    private function call(string $method, array $body): array
    {
        $response = Http::acceptJson()
            ->timeout(20)
            ->post(self::BASE_URL.$method.'?key='.urlencode((string) $this->apiKey()), $body);

        if (!$response->successful()) {
            throw new FirebaseAuthException($this->errorCode((string) $response->json('error.message', '')));
        }

        return (array) $response->json();
    }

    /**
     * Firebase error messages are "CODE" or "CODE : detail"; an invalid
     * API key comes back as a sentence instead.
     */
    private function errorCode(string $message): string
    {
        if (stripos($message, 'API key not valid') !== false) {
            return 'INVALID_API_KEY';
        }

        $code = trim(explode(':', $message, 2)[0]);

        return $code !== '' ? $code : 'UNKNOWN';
    }

    private function describe(string $code): string
    {
        return match ($code) {
            // Email/Password provider not enabled, Authentication never set
            // up, bad key, or continue URL domain not authorized.
            'OPERATION_NOT_ALLOWED', 'CONFIGURATION_NOT_FOUND', 'INVALID_API_KEY',
            'UNAUTHORIZED_DOMAIN', 'INVALID_CONTINUE_URI' => 'Email delivery is not configured correctly on this server.',
            'TOO_MANY_ATTEMPTS_TRY_LATER' => 'Too many verification emails were requested. Please wait a few minutes and try again.',
            'QUOTA_EXCEEDED' => 'This server has reached today\'s email limit. Please try again tomorrow.',
            // The email already has a Firebase account this server can't
            // sign in to (created outside this app).
            'INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD' => 'This email is already registered with our verification service. Please contact support.',
            default => 'Could not send the verification email. Please try again shortly.',
        };
    }

    private function apiKey(): ?string
    {
        $key = config('services.firebase.api_key');

        return is_string($key) && $key !== '' ? $key : null;
    }
}
