<?php

namespace App\Http\Controllers;

use App\Helpers\StripeSslHelper;
use App\Models\BudzPackage;
use App\Models\BudzTransaction;
use App\Models\BudzWallet;
use App\Models\Contractor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class BudzController extends Controller
{
    public function wallet(Request $request): JsonResponse
    {
        $user = auth()->user();
        $contractor = Contractor::where('user_id', $user->user_id)->first();

        if (!$contractor) {
            return response()->json([
                'success' => false,
                'message' => 'Contractor profile not found',
            ], 404);
        }

        $wallet = BudzWallet::firstOrCreate(
            ['contractor_id' => $contractor->contractor_id],
            ['balance' => 0, 'total_purchased' => 0]
        );

        $recent = BudzTransaction::where('contractor_id', $contractor->contractor_id)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'balance' => $wallet->balance,
                'total_purchased' => $wallet->total_purchased,
                'recent_transactions' => $recent,
            ],
        ]);
    }

    public function packages(): JsonResponse
    {
        $packages = BudzPackage::where('is_active', true)
            ->orderBy('budz_amount', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $packages,
        ]);
    }

    public function purchase(Request $request): JsonResponse
    {
        if ($guard = $this->stripeUnavailableResponse()) {
            return $guard;
        }

        $user = auth()->user();
        $contractor = Contractor::where('user_id', $user->user_id)->first();

        if (!$contractor) {
            return response()->json([
                'success' => false,
                'message' => 'Contractor profile not found',
            ], 404);
        }

        $validated = $request->validate([
            'package_id' => 'required|integer|exists:budz_packages,package_id',
        ]);

        $package = BudzPackage::where('package_id', $validated['package_id'])
            ->where('is_active', true)
            ->first();

        if (!$package) {
            return response()->json([
                'success' => false,
                'message' => 'Package not available',
            ], 422);
        }

        $amountInCents = (int) round(((float) $package->price_pkr) * 100);

        $intent = $this->createStripePaymentIntent($amountInCents, [
            'contractor_id' => (string) $contractor->contractor_id,
            'package_id' => (string) $package->package_id,
            'budz_amount' => (string) $package->budz_amount,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'client_secret' => $intent['client_secret'],
                'package' => $package,
            ],
        ]);
    }

    public function confirmPurchase(Request $request): JsonResponse
    {
        if ($guard = $this->stripeUnavailableResponse()) {
            return $guard;
        }

        $user = auth()->user();
        $contractor = Contractor::where('user_id', $user->user_id)->first();

        if (!$contractor) {
            return response()->json([
                'success' => false,
                'message' => 'Contractor profile not found',
            ], 404);
        }

        $validated = $request->validate([
            'stripe_payment_id' => 'required|string',
            'package_id' => 'required|integer|exists:budz_packages,package_id',
        ]);

        $package = BudzPackage::where('package_id', $validated['package_id'])
            ->where('is_active', true)
            ->first();

        if (!$package) {
            return response()->json([
                'success' => false,
                'message' => 'Package not available',
            ], 422);
        }

        $intent = $this->retrieveStripePaymentIntent($validated['stripe_payment_id']);

        if (($intent['status'] ?? null) !== 'succeeded') {
            return response()->json([
                'success' => false,
                'message' => 'Payment not completed',
            ], 422);
        }

        $metadata = $intent['metadata'] ?? [];
        if ((string) ($metadata['contractor_id'] ?? '') !== (string) $contractor->contractor_id) {
            return response()->json([
                'success' => false,
                'message' => 'Payment does not belong to this contractor',
            ], 403);
        }

        $existing = BudzTransaction::where('stripe_payment_id', $validated['stripe_payment_id'])
            ->where('transaction_type', 'purchase')
            ->first();

        if ($existing) {
            $wallet = BudzWallet::firstOrCreate(
                ['contractor_id' => $contractor->contractor_id],
                ['balance' => 0, 'total_purchased' => 0]
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'balance' => $wallet->balance,
                    'total_purchased' => $wallet->total_purchased,
                ],
            ]);
        }

        $walletData = DB::transaction(function () use ($contractor, $package, $validated) {
            $wallet = BudzWallet::where('contractor_id', $contractor->contractor_id)
                ->lockForUpdate()
                ->first();

            if (!$wallet) {
                $wallet = BudzWallet::create([
                    'contractor_id' => $contractor->contractor_id,
                    'balance' => 0,
                    'total_purchased' => 0,
                ]);
            }

            $wallet->balance += $package->budz_amount;
            $wallet->total_purchased += $package->budz_amount;
            $wallet->save();

            BudzTransaction::create([
                'contractor_id' => $contractor->contractor_id,
                'transaction_type' => 'purchase',
                'budz_amount' => $package->budz_amount,
                'balance_after' => $wallet->balance,
                'description' => 'Purchased ' . $package->name,
                'stripe_payment_id' => $validated['stripe_payment_id'],
                'reference_id' => $package->package_id,
                'created_at' => now(),
            ]);

            return [
                'balance' => $wallet->balance,
                'total_purchased' => $wallet->total_purchased,
                'budz_added' => $package->budz_amount,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $walletData,
        ]);
    }

    /**
     * Returns a 503 response when Stripe has no secret configured, or null
     * when it is safe to proceed.
     *
     * Without this, the private helpers below throw a RuntimeException that
     * nothing catches, so an unconfigured environment answered a Budz
     * purchase with a bare 500 "Server Error". ArchitectStripeConnectController
     * already degrades this way; this brings Budz in line with it so the
     * frontend gets a message it can actually show the user.
     */
    private function stripeUnavailableResponse(): ?JsonResponse
    {
        $secret = config('services.stripe.secret');

        if (!is_string($secret) || $secret === '') {
            return response()->json([
                'success' => false,
                'message' => 'Stripe is not configured',
            ], 503);
        }

        return null;
    }

    private function createStripePaymentIntent(int $amountInCents, array $metadata): array
    {
        $secretKey = config('services.stripe.secret');
        if (empty($secretKey)) {
            throw new \RuntimeException('Stripe secret key is missing');
        }

        $payload = [
            'amount' => $amountInCents,
            'currency' => strtolower(config('payment.currency', 'pkr')),
            'metadata' => $metadata,
        ];

        $response = $this->stripeHttpClient()
            ->asForm()
            ->withToken($secretKey)
            ->post('https://api.stripe.com/v1/payment_intents', $payload);

        if ($response->failed()) {
            $message = $response->json('error.message')
                ?? $response->body()
                ?? 'Stripe payment intent creation failed';
            throw new \RuntimeException($message);
        }

        return $response->json();
    }

    private function retrieveStripePaymentIntent(string $paymentIntentId): array
    {
        $secretKey = config('services.stripe.secret');
        if (empty($secretKey)) {
            throw new \RuntimeException('Stripe secret key is missing');
        }

        $response = $this->stripeHttpClient()
            ->withToken($secretKey)
            ->get('https://api.stripe.com/v1/payment_intents/' . $paymentIntentId);

        if ($response->failed()) {
            $message = $response->json('error.message')
                ?? $response->body()
                ?? 'Stripe payment intent retrieval failed';
            throw new \RuntimeException($message);
        }

        return $response->json();
    }

    /**
     * All Stripe calls in this controller pass absolute URLs, so no
     * base URL is set here. TLS verification is resolved centrally by
     * StripeSslHelper, which refuses to disable it outside local and
     * testing environments.
     */
    private function stripeHttpClient()
    {
        return Http::withOptions(['verify' => StripeSslHelper::verify()]);
    }
}
