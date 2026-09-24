<?php

namespace App\Http\Controllers;

use App\Helpers\StripeSslHelper;
use App\Models\Payment;
use App\Models\Project;
use App\Models\User;
use App\Notifications\PaymentReceived;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class PaymentController extends Controller
{
    private PaymentService $paymentService;

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    /**
     * POST /api/projects/{id}/payment
     * Create a Stripe payment intent and payment record
     */
    public function createPayment(Request $request, $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Authorize: must be project owner (client)
        if ($project->client_id !== $user->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $existingHeldPayment = Payment::where('project_id', $projectId)
            ->where('payer_id', $user->user_id)
            ->where('payment_status', 'held')
            ->orderByDesc('payment_id')
            ->first();

        // Allow retry when a held payment already exists for this project.
        if ($project->project_status !== 'payment_pending') {
            if ($project->project_status === 'design_in_progress' && $existingHeldPayment && $existingHeldPayment->stripe_payment_id) {
                try {
                    $intent = $this->retrieveStripePaymentIntent($existingHeldPayment->stripe_payment_id);

                    return response()->json([
                        'success' => true,
                        'message' => 'Existing payment intent retrieved',
                        'data' => [
                            'payment_id' => $existingHeldPayment->payment_id,
                            'client_secret' => $intent['client_secret'] ?? null,
                            'amount' => (float) $existingHeldPayment->amount,
                            'platform_fee' => (float) ($existingHeldPayment->platform_fee ?? 0),
                            'payee_amount' => (float) ($existingHeldPayment->payee_amount ?? $existingHeldPayment->amount),
                            'platform_fee_percent' => (float) config('payment.platform_fee_percent', 0),
                        ],
                    ]);
                } catch (\Throwable $e) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Payment already initiated, but retry failed: ' . $e->getMessage(),
                    ], 422);
                }
            }

            return response()->json([
                'success' => false,
                'message' => 'Project must be in payment_pending status',
            ], 422);
        }

        // Check if selected architect exists
        if (!$project->selected_architect_id) {
            return response()->json([
                'success' => false,
                'message' => 'No architect selected for this project',
            ], 422);
        }

        try {
            // Calculate amount in cents
            $amountInCents = $this->paymentService->convertToStripeAmount($project->budget);

            // Create Stripe PaymentIntent using Stripe REST API.
            $intent = $this->createStripePaymentIntent($amountInCents, [
                'project_id' => (string) $project->project_id,
                'client_id' => (string) $user->user_id,
            ]);

            // Get architect's user_id
            $architect = $project->selectedArchitect;
            if (!$architect) {
                return response()->json([
                    'success' => false,
                    'message' => 'Architect user record not found',
                ], 422);
            }

            $gross = (float) $project->budget;
            $split = $this->paymentService->splitGrossForPlatform($gross);

            // Create payment record
            $payment = Payment::create([
                'project_id' => $projectId,
                'payer_id' => $user->user_id,
                'payee_id' => $architect->user_id,
                'amount' => $gross,
                'platform_fee' => $split['platform_fee'],
                'payee_amount' => $split['payee_amount'],
                'stripe_payment_id' => $intent['id'],
                'payment_type' => 'design',
                'payment_status' => 'held',
            ]);

            // Update project status
            $project->update(['project_status' => 'design_in_progress']);

            return response()->json([
                'success' => true,
                'message' => 'Payment intent created successfully',
                'data' => [
                    'payment_id' => $payment->payment_id,
                    'client_secret' => $intent['client_secret'],
                    'amount' => $gross,
                    'platform_fee' => $split['platform_fee'],
                    'payee_amount' => $split['payee_amount'],
                    'platform_fee_percent' => $split['platform_fee_percent'],
                ],
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Payment creation failed: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * POST /api/payments/{id}/confirm
     * Called by the client's browser once Stripe.js reports the card
     * payment succeeded. Re-checks the PaymentIntent with Stripe itself
     * rather than trusting the browser, then notifies the payee
     * (architect) exactly once.
     */
    public function confirmPayment(Request $request, $paymentId): JsonResponse
    {
        $payment = Payment::with(['payer:user_id,full_name', 'payee', 'project:project_id,project_title'])
            ->findOrFail($paymentId);

        if ($payment->payer_id !== auth()->user()->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        if (!$payment->stripe_payment_id) {
            return response()->json([
                'success' => false,
                'message' => 'Payment has no Stripe reference',
            ], 422);
        }

        try {
            $intent = $this->retrieveStripePaymentIntent($payment->stripe_payment_id);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Could not verify payment with Stripe: ' . $e->getMessage(),
            ], 422);
        }

        if (($intent['status'] ?? null) !== 'succeeded') {
            return response()->json([
                'success' => false,
                'message' => 'Payment has not succeeded yet',
            ], 422);
        }

        if ($payment->payee_notified_at === null && $payment->payee) {
            $payment->payee->notify(new PaymentReceived($payment));
            $payment->update(['payee_notified_at' => now()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment confirmed',
        ]);
    }

    /**
     * POST /api/payments/{id}/refund
     * Refund a held payment (full or partial)
     */
    public function refundPayment(Request $request, $paymentId): JsonResponse
    {
        $payment = Payment::findOrFail($paymentId);
        $user = auth()->user();

        // Authorize: must be payer
        if ($payment->payer_id !== $user->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        // Check payment status
        if ($payment->payment_status !== 'held') {
            return response()->json([
                'success' => false,
                'message' => 'Payment must be in held status to refund',
            ], 422);
        }

        $validated = $request->validate([
            'refund_type' => 'required|in:full,partial',
            'amount' => 'required_if:refund_type,partial|numeric|min:0',
        ]);

        try {
            if ($validated['refund_type'] === 'full') {
                // Full refund
                $this->createStripeRefund([
                    'payment_intent' => $payment->stripe_payment_id,
                ]);

                $payment->update(['payment_status' => 'refunded']);

                // Reopen project for new architect selection
                $project = $payment->project;
                $project->update([
                    'project_status' => 'created',
                    'selected_architect_id' => null,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Full refund processed successfully',
                    'data' => $payment->refresh(),
                ]);
            } else {
                // Partial refund
                $refundAmount = $this->paymentService->convertToStripeAmount($validated['amount']);

                $this->createStripeRefund([
                    'payment_intent' => $payment->stripe_payment_id,
                    'amount' => $refundAmount,
                ]);

                // Create new payment record for refund
                Payment::create([
                    'project_id' => $payment->project_id,
                    'payer_id' => $payment->payer_id,
                    'payee_id' => $payment->payee_id,
                    'amount' => $validated['amount'],
                    'platform_fee' => 0,
                    'payee_amount' => $validated['amount'],
                    'stripe_payment_id' => null,
                    'payment_type' => 'refund',
                    'payment_status' => 'completed',
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Partial refund processed successfully',
                    'data' => [
                        'original_payment' => $payment,
                        'refund_amount' => $validated['amount'],
                    ],
                ]);
            }
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Refund failed: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * GET /api/payments
     * Get all payments for authenticated user (as payer or payee)
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();

        $payments = Payment::where(function ($query) use ($user) {
            $query->where('payer_id', $user->user_id)
                ->orWhere('payee_id', $user->user_id);
        })
            ->with(['project:project_id,project_title', 'payer:user_id,full_name', 'payee:user_id,full_name'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $payments,
        ]);
    }

    /**
     * GET /api/payments/{id}
     * Get payment details
     */
    public function show(Request $request, $paymentId): JsonResponse
    {
        $payment = Payment::with(['project', 'payer:user_id,full_name,email', 'payee:user_id,full_name,email'])
            ->findOrFail($paymentId);
        
        $user = auth()->user();

        // Authorize: only payer or payee
        if ($payment->payer_id !== $user->user_id && $payment->payee_id !== $user->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $payment,
        ]);
    }

    private function createStripePaymentIntent(int $amountInCents, array $metadata): array
    {
        $secretKey = config('services.stripe.secret');
        if (empty($secretKey)) {
            throw new \RuntimeException('Stripe secret key is missing');
        }

        $payload = [
            'amount' => $amountInCents,
            // Not payment.currency -- that's the PKR display/DB
            // currency. $amountInCents (from PaymentService::
            // convertToStripeAmount, i.e. CurrencyConverter) is already
            // converted into stripe_currency's minor units, so the
            // currency named here has to match that, not PKR.
            'currency' => (string) config('payment.stripe_currency', 'usd'),
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

    private function createStripeRefund(array $payload): void
    {
        $secretKey = config('services.stripe.secret');
        if (empty($secretKey)) {
            throw new \RuntimeException('Stripe secret key is missing');
        }

        $response = $this->stripeHttpClient()
            ->asForm()
            ->withToken($secretKey)
            ->post('https://api.stripe.com/v1/refunds', $payload);

        if ($response->failed()) {
            $message = $response->json('error.message')
                ?? $response->body()
                ?? 'Stripe refund failed';
            throw new \RuntimeException($message);
        }
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
