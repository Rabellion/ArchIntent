<?php

namespace App\Http\Controllers;

use App\Helpers\StripeSslHelper;
use App\Models\Architect;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ArchitectStripeConnectController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $architect = $this->architectOr404($request);
        if ($architect instanceof JsonResponse) {
            return $architect;
        }

        if (!$architect->stripe_connect_account_id) {
            return response()->json([
                'success' => true,
                'data' => [
                    'has_account' => false,
                    'onboarding_complete' => false,
                ],
            ]);
        }

        $this->syncAccountFlagsFromStripe($architect);

        return response()->json([
            'success' => true,
            'data' => [
                'has_account' => true,
                'account_id' => $architect->stripe_connect_account_id,
                'onboarding_complete' => (bool) $architect->stripe_connect_onboarding_complete,
            ],
        ]);
    }

    public function createAccount(Request $request): JsonResponse
    {
        $architect = $this->architectOr404($request);
        if ($architect instanceof JsonResponse) {
            return $architect;
        }

        if ($architect->stripe_connect_account_id) {
            return response()->json([
                'success' => true,
                'message' => 'Stripe account already exists',
                'data' => ['account_id' => $architect->stripe_connect_account_id],
            ]);
        }

        $user = $request->user();
        $secret = config('services.stripe.secret');
        if (!is_string($secret) || $secret === '') {
            return response()->json([
                'success' => false,
                'message' => 'Stripe is not configured',
            ], 503);
        }

        $country = strtoupper((string) config('payment.stripe_connect.country', 'PK'));

        $response = $this->stripeFormClient($secret)
            ->post('https://api.stripe.com/v1/accounts', [
                'type' => 'express',
                'country' => $country,
                'email' => $user->email,
                'capabilities[transfers][requested]' => 'true',
            ]);

        if (!$response->successful()) {
            Log::error('Stripe Connect account create failed', ['body' => $response->body()]);

            return response()->json([
                'success' => false,
                'message' => 'Could not create Stripe Connect account',
            ], 502);
        }

        $id = $response->json('id');
        if (!is_string($id) || $id === '') {
            return response()->json([
                'success' => false,
                'message' => 'Invalid Stripe response',
            ], 502);
        }

        $architect->update([
            'stripe_connect_account_id' => $id,
            'stripe_connect_onboarding_complete' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Stripe Connect account created',
            'data' => ['account_id' => $id],
        ], 201);
    }

    public function onboardingLink(Request $request): JsonResponse
    {
        $architect = $this->architectOr404($request);
        if ($architect instanceof JsonResponse) {
            return $architect;
        }

        if (!$architect->stripe_connect_account_id) {
            return response()->json([
                'success' => false,
                'message' => 'Create a Stripe Connect account first',
            ], 422);
        }

        $secret = config('services.stripe.secret');
        if (!is_string($secret) || $secret === '') {
            return response()->json([
                'success' => false,
                'message' => 'Stripe is not configured',
            ], 503);
        }

        $return = (string) config('payment.stripe_connect.return_url');
        $refresh = (string) config('payment.stripe_connect.refresh_url');

        $response = $this->stripeFormClient($secret)
            ->post('https://api.stripe.com/v1/account_links', [
                'account' => $architect->stripe_connect_account_id,
                'refresh_url' => $refresh,
                'return_url' => $return,
                'type' => 'account_onboarding',
            ]);

        if (!$response->successful()) {
            Log::error('Stripe account link failed', ['body' => $response->body()]);

            return response()->json([
                'success' => false,
                'message' => 'Could not create onboarding link',
            ], 502);
        }

        $url = $response->json('url');
        if (!is_string($url) || $url === '') {
            return response()->json([
                'success' => false,
                'message' => 'Invalid Stripe response',
            ], 502);
        }

        return response()->json([
            'success' => true,
            'data' => ['url' => $url],
        ]);
    }

    private function architectOr404(Request $request): Architect|JsonResponse
    {
        $user = $request->user();
        $architect = Architect::where('user_id', $user->user_id)->first();
        if (!$architect) {
            return response()->json([
                'success' => false,
                'message' => 'Architect profile not found',
            ], 404);
        }

        return $architect;
    }

    private function syncAccountFlagsFromStripe(Architect $architect): void
    {
        $secret = config('services.stripe.secret');
        if (!is_string($secret) || $secret === '' || !$architect->stripe_connect_account_id) {
            return;
        }

        $response = $this->stripeJsonClient($secret)
            ->get('https://api.stripe.com/v1/accounts/' . $architect->stripe_connect_account_id);

        if (!$response->successful()) {
            return;
        }

        $detailsSubmitted = (bool) $response->json('details_submitted');
        $payoutsEnabled = (bool) $response->json('payouts_enabled');
        // Payout-ready: details submitted + Stripe can pay out (charges_enabled alone is wrong for transfer-only recipients)
        $complete = $detailsSubmitted && $payoutsEnabled;

        if ($complete !== (bool) $architect->stripe_connect_onboarding_complete) {
            $architect->update(['stripe_connect_onboarding_complete' => $complete]);
        }
    }

    private function stripeFormClient(string $secret)
    {
        return Http::withOptions(['verify' => StripeSslHelper::verify()])
            ->withBasicAuth($secret, '')
            ->asForm();
    }

    private function stripeJsonClient(string $secret)
    {
        return Http::withOptions(['verify' => StripeSslHelper::verify()])
            ->withBasicAuth($secret, '')
            ->acceptJson();
    }
}
