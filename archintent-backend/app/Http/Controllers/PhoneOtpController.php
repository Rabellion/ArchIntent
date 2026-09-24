<?php

namespace App\Http\Controllers;

use App\Services\OtpService;
use App\Services\WhatsAppVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PhoneOtpController extends Controller
{
    public function __construct(
        private OtpService $otpService,
        private WhatsAppVerificationService $whatsApp,
    ) {
    }

    /**
     * GET /api/auth/phone-verification/methods
     * Which ways to verify a phone actually work on this server, so the UI
     * only offers those instead of a button that can only fail.
     */
    public function methods(): JsonResponse
    {
        return response()->json([
            'data' => [
                'sms' => config('otp.sms_driver') !== 'none',
                'whatsapp' => $this->whatsApp->isConfigured(),
            ],
        ]);
    }

    /**
     * POST /api/auth/phone-whatsapp/start
     */
    public function startWhatsApp(Request $request): JsonResponse
    {
        if (!$this->whatsApp->isConfigured()) {
            return response()->json(['message' => 'WhatsApp verification is not configured on this server.'], 503);
        }

        $user = $request->user();
        if (trim((string) ($user->phone_number ?? '')) === '') {
            return response()->json([
                'message' => 'Add a phone number on your profile before verifying it.',
            ], 422);
        }

        return response()->json([
            'message' => 'Send the message from WhatsApp on the phone number in your profile.',
            'data' => $this->whatsApp->start($user),
        ]);
    }

    public function send(Request $request): JsonResponse
    {
        $user = $request->user();
        $phone = trim((string) ($user->phone_number ?? ''));
        if ($phone === '') {
            return response()->json([
                'message' => 'Add a phone number on your profile before requesting a code.',
            ], 422);
        }

        try {
            $payload = $this->otpService->sendForUser($user);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 502);
        }

        return response()->json([
            'message' => 'Verification code sent',
            'data' => $payload,
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $code = preg_replace('/\D/', '', (string) $request->input('code'));

        if (strlen($code) !== 6 || !$this->otpService->verifyForUser($user, $code)) {
            return response()->json([
                'message' => 'Invalid or expired code',
            ], 422);
        }

        $user->forceFill(['phone_verified_at' => now()])->save();

        return response()->json([
            'message' => 'Phone verified',
            'data' => [
                'phone_verified_at' => $user->phone_verified_at?->toIso8601String(),
            ],
        ]);
    }
}
