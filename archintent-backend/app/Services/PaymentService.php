<?php

namespace App\Services;

use App\Helpers\StripeSslHelper;
use App\Models\Architect;
use App\Models\Payment;
use App\Models\AdminLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    /**
     * Split gross client charge into platform fee and net payee (architect) amount.
     *
     * @return array{platform_fee: float, payee_amount: float, platform_fee_percent: float}
     */
    public function splitGrossForPlatform(float $gross): array
    {
        $percent = (float) config('payment.platform_fee_percent', 0);
        $percent = max(0.0, min(100.0, $percent));
        $fee = round($gross * ($percent / 100), 2);
        $net = round($gross - $fee, 2);
        if ($net < 0) {
            $net = 0.0;
        }

        return [
            'platform_fee' => $fee,
            'payee_amount' => $net,
            'platform_fee_percent' => $percent,
        ];
    }

    /**
     * Release held payment (mark as completed)
     * 
     * @param int $projectId
     * @return bool
     */
    public function releasePayment($projectId): bool
    {
        $payment = Payment::where('project_id', $projectId)
            ->where('payment_status', 'held')
            ->first();

        if (!$payment) {
            Log::warning("No held payment found for project {$projectId}");
            return false;
        }

        $payment->update(['payment_status' => 'completed']);

        $this->maybeStripeConnectTransfer($payment, $projectId);

        // Log to admin logs (system-triggered action, no admin_id)
        AdminLog::create([
            'action' => 'payment_released',
            'target_table' => 'payments',
            'target_id' => $payment->payment_id,
            'description' => "Payment {$payment->payment_id} released for project {$projectId}",
        ]);

        Log::info("Payment {$payment->payment_id} released for project {$projectId}");

        return true;
    }

    private function maybeStripeConnectTransfer(Payment $payment, int $projectId): void
    {
        if (!config('payment.stripe_connect.transfer_on_release', true)) {
            return;
        }

        $secret = config('services.stripe.secret');
        if (!is_string($secret) || $secret === '') {
            return;
        }

        $architect = Architect::where('user_id', $payment->payee_id)->first();
        if (!$architect || !$architect->stripe_connect_account_id || !$architect->stripe_connect_onboarding_complete) {
            return;
        }

        $payee = (float) ($payment->payee_amount ?? $payment->amount);
        $currency = strtolower((string) config('payment.currency', 'pkr'));
        $minor = $currency === 'jpy' ? 1 : 100;
        $amountUnits = (int) max(1, round($payee * $minor));

        $verify = StripeSslHelper::verify();

        try {
            $response = Http::withOptions(['verify' => $verify])
                ->withToken($secret)
                ->asForm()
                ->post('https://api.stripe.com/v1/transfers', [
                    'amount' => $amountUnits,
                    'currency' => $currency,
                    'destination' => $architect->stripe_connect_account_id,
                    'transfer_group' => 'project_' . $projectId,
                    'metadata[payment_id]' => (string) $payment->payment_id,
                    'metadata[project_id]' => (string) $projectId,
                ]);
        } catch (\Throwable $e) {
            Log::error('Stripe Connect transfer exception', [
                'payment_id' => $payment->payment_id,
                'error' => $e->getMessage(),
            ]);

            return;
        }

        if (!$response->successful()) {
            Log::error('Stripe Connect transfer failed', [
                'payment_id' => $payment->payment_id,
                'body' => $response->body(),
            ]);

            return;
        }

        $tid = $response->json('id');
        if (is_string($tid) && $tid !== '') {
            $payment->update(['stripe_transfer_id' => $tid]);
        }

        AdminLog::create([
            'action' => 'stripe_transfer',
            'target_table' => 'payments',
            'target_id' => $payment->payment_id,
            'description' => "Stripe transfer {$tid} to architect Connect account for payment {$payment->payment_id}",
        ]);
    }

    /**
     * Calculate payment amount from project budget
     * 
     * @param float $budget
     * @return int Amount in cents
     */
    public function convertToStripeAmount($budget): int
    {
        // Convert to cents
        return (int) ($budget * 100);
    }
}
