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

        $country = strtolower((string) config('payment.stripe_connect.country', 'PK'));

        // Accounts v1 (type=express) is what this integration was built
        // against, but newly-created Stripe accounts are opted into a
        // policy that rejects it: "Stripe no longer recommends Accounts
        // v1 for new Connect integrations. Create connected accounts
        // with POST /v2/core/accounts instead." -- confirmed against a
        // real account, not assumed. v2 replaces the single `type`
        // shortcut with an explicit configuration: `dashboard: express`
        // + `defaults.responsibilities` (both stripe, matching what v1
        // Express set implicitly) + a `recipient` configuration
        // requesting the `stripe_transfers` capability, which is v2's
        // name for v1's `capabilities[transfers][requested]`. Verified
        // against Stripe's own v2 Accounts + connected-account-
        // configuration docs, not guessed. Account Links (below) and
        // this account's own id are unaffected -- Stripe states v2 is
        // interoperable with most v1 APIs, and /v1/account_links takes
        // a v2 account id the same as a v1 one.
        $response = $this->stripeV2JsonClient($secret)
            ->post('https://api.stripe.com/v2/core/accounts', [
                'contact_email' => $user->email,
                'identity' => ['country' => $country],
                'dashboard' => 'express',
                // Verified live: 'stripe' here 400s for a recipient-only
                // account with "Losses/Fees collector can only be
                // 'application' for the set of configurations this
                // account has." Stripe can only collect fees/absorb
                // losses out of a payment flow it processes -- a pure
                // recipient (transfers only, no merchant/card-payments
                // configuration) has no such flow, so the platform must
                // be the collector for both.
                'defaults' => [
                    'responsibilities' => [
                        'fees_collector' => 'application',
                        'losses_collector' => 'application',
                    ],
                ],
                'configuration' => [
                    'recipient' => [
                        'capabilities' => [
                            'stripe_balance' => [
                                'stripe_transfers' => ['requested' => true],
                            ],
                        ],
                    ],
                ],
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

        // v2 account: capability status folds "submitted all required
        // info" and "Stripe will actually pay out" into one field, so
        // unlike v1 (details_submitted AND payouts_enabled, checked
        // separately) this is the single source of truth.
        $response = $this->stripeV2JsonClient($secret)
            ->get('https://api.stripe.com/v2/core/accounts/' . $architect->stripe_connect_account_id, [
                'include' => ['configuration.recipient'],
            ]);

        if (!$response->successful()) {
            return;
        }

        $status = $response->json('configuration.recipient.capabilities.stripe_balance.stripe_transfers.status');
        $complete = $status === 'active';

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

    /**
     * Accounts v2 takes a JSON body (v1 endpoints, including
     * /v1/account_links above, stay form-encoded) and requires an
     * explicit Stripe-Version header -- v2 is independently versioned
     * from the account's own default API version. Pinned to the
     * version shown in Stripe's own current v2 Accounts documentation.
     */
    private function stripeV2JsonClient(string $secret)
    {
        return Http::withOptions(['verify' => StripeSslHelper::verify()])
            ->withToken($secret)
            ->withHeaders(['Stripe-Version' => '2026-08-26.dahlia'])
            ->acceptJson();
    }
}
