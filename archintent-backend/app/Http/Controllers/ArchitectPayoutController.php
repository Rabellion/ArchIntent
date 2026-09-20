<?php

namespace App\Http\Controllers;

use App\Models\Architect;
use App\Models\ArchitectWithdrawal;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Demo bank-transfer payout path for architects.
 *
 * Separate from ArchitectStripeConnectController, which performs real
 * Stripe transfers. This path stores local bank details and records
 * withdrawal requests. IT DOES NOT MOVE MONEY -- a withdrawal row is a
 * request that an operator would settle manually.
 */
class ArchitectPayoutController extends Controller
{
    /**
     * GET /api/architect/bank-details
     *
     * The stored account number is never returned in full; only the
     * last four digits, which is enough for the architect to recognise
     * the account without the response becoming a disclosure risk.
     */
    public function getBankDetails(Request $request): JsonResponse
    {
        $architect = $this->architectOr404($request);
        if ($architect instanceof JsonResponse) {
            return $architect;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'has_bank_details' => !empty($architect->bank_account_number),
                'bank_name' => $architect->bank_name,
                'bank_account_title' => $architect->bank_account_title,
                'bank_account_last4' => $this->last4($architect->bank_account_number),
                'bank_iban' => $architect->bank_iban,
                'updated_at' => $architect->bank_details_updated_at,
            ],
        ]);
    }

    /**
     * POST /api/architect/bank-details
     */
    public function saveBankDetails(Request $request): JsonResponse
    {
        $architect = $this->architectOr404($request);
        if ($architect instanceof JsonResponse) {
            return $architect;
        }

        $validated = $request->validate([
            'bank_name' => 'required|string|max:120',
            'bank_account_title' => 'required|string|max:150',
            // Digits and dashes only; length covers local and IBAN-style
            // account numbers.
            'bank_account_number' => 'required|string|min:6|max:34|regex:/^[0-9\- ]+$/',
            'bank_iban' => 'nullable|string|max:34|regex:/^[A-Za-z0-9 ]+$/',
        ], [
            'bank_account_number.regex' => 'Account number may contain digits, spaces and dashes only.',
            'bank_iban.regex' => 'IBAN may contain letters and digits only.',
        ]);

        $architect->update([
            'bank_name' => $validated['bank_name'],
            'bank_account_title' => $validated['bank_account_title'],
            'bank_account_number' => preg_replace('/[\s-]/', '', $validated['bank_account_number']),
            'bank_iban' => isset($validated['bank_iban'])
                ? strtoupper(preg_replace('/\s/', '', $validated['bank_iban']))
                : null,
            'bank_details_updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Bank details saved',
            'data' => [
                'has_bank_details' => true,
                'bank_name' => $architect->bank_name,
                'bank_account_title' => $architect->bank_account_title,
                'bank_account_last4' => $this->last4($architect->bank_account_number),
                'bank_iban' => $architect->bank_iban,
                'updated_at' => $architect->bank_details_updated_at,
            ],
        ]);
    }

    /**
     * GET /api/architect/balance
     *
     * available = everything earned from completed payments
     *             - anything already requested or approved for payout
     */
    public function balance(Request $request): JsonResponse
    {
        $architect = $this->architectOr404($request);
        if ($architect instanceof JsonResponse) {
            return $architect;
        }

        return response()->json([
            'success' => true,
            'data' => $this->balanceFor($architect, $request->user()->user_id),
        ]);
    }

    /**
     * POST /api/architect/withdraw
     */
    public function requestWithdrawal(Request $request): JsonResponse
    {
        $architect = $this->architectOr404($request);
        if ($architect instanceof JsonResponse) {
            return $architect;
        }

        if (empty($architect->bank_account_number)) {
            return response()->json([
                'success' => false,
                'message' => 'Add your bank details before requesting a withdrawal',
            ], 422);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'note' => 'nullable|string|max:255',
        ]);

        $userId = $request->user()->user_id;

        // Lock the architect row so two concurrent requests cannot each
        // pass the balance check and jointly overdraw.
        $result = DB::transaction(function () use ($architect, $userId, $validated) {
            Architect::where('architect_id', $architect->architect_id)
                ->lockForUpdate()
                ->first();

            $balance = $this->balanceFor($architect, $userId);
            $amount = round((float) $validated['amount'], 2);

            if ($amount > $balance['available']) {
                return ['error' => sprintf(
                    'Requested amount exceeds your available balance of %s',
                    number_format($balance['available'], 2)
                )];
            }

            $withdrawal = ArchitectWithdrawal::create([
                'architect_id' => $architect->architect_id,
                'amount' => $amount,
                'status' => 'requested',
                'bank_name' => $architect->bank_name,
                'bank_account_title' => $architect->bank_account_title,
                'bank_account_last4' => $this->last4($architect->bank_account_number),
                'note' => $validated['note'] ?? null,
                'requested_at' => now(),
            ]);

            return ['withdrawal' => $withdrawal];
        });

        if (isset($result['error'])) {
            return response()->json([
                'success' => false,
                'message' => $result['error'],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Withdrawal requested. It will be transferred to your bank account.',
            'data' => [
                'withdrawal' => $result['withdrawal'],
                'balance' => $this->balanceFor($architect, $userId),
            ],
        ], 201);
    }

    /**
     * GET /api/architect/withdrawals
     */
    public function listWithdrawals(Request $request): JsonResponse
    {
        $architect = $this->architectOr404($request);
        if ($architect instanceof JsonResponse) {
            return $architect;
        }

        $rows = ArchitectWithdrawal::where('architect_id', $architect->architect_id)
            ->orderByDesc('withdrawal_id')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    // ----------------------------------------------------------------

    /**
     * Earnings are the architect's share (payee_amount) of payments
     * that completed, i.e. after the client approved the design and the
     * platform commission was taken.
     */
    private function balanceFor(Architect $architect, int $userId): array
    {
        $earned = (float) (Payment::where('payee_id', $userId)
            ->where('payment_status', 'completed')
            ->sum('payee_amount') ?? 0);

        $encumbered = (float) (ArchitectWithdrawal::where('architect_id', $architect->architect_id)
            ->whereIn('status', ArchitectWithdrawal::ENCUMBERING_STATUSES)
            ->sum('amount') ?? 0);

        return [
            'total_earned' => round($earned, 2),
            'withdrawn_or_pending' => round($encumbered, 2),
            'available' => round(max(0, $earned - $encumbered), 2),
            'currency' => strtoupper((string) config('payment.currency', 'PKR')),
        ];
    }

    private function last4(?string $accountNumber): ?string
    {
        if (!$accountNumber) {
            return null;
        }

        return substr(preg_replace('/\D/', '', $accountNumber), -4) ?: null;
    }

    private function architectOr404(Request $request): Architect|JsonResponse
    {
        $architect = Architect::where('user_id', $request->user()->user_id)->first();

        if (!$architect) {
            return response()->json([
                'success' => false,
                'message' => 'Architect profile not found',
            ], 404);
        }

        return $architect;
    }
}
