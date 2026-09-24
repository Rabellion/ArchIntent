<?php

namespace App\Http\Controllers;

use App\Services\WhatsAppVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class WhatsAppWebhookController extends Controller
{
    public function __construct(private readonly WhatsAppVerificationService $whatsapp)
    {
    }

    /**
     * GET /api/webhooks/whatsapp
     * Meta's one-time subscription handshake. PHP turns the "hub.mode"
     * style query keys into "hub_mode".
     */
    public function verify(Request $request): Response
    {
        if ($request->query('hub_mode') === 'subscribe'
            && $this->whatsapp->verifyTokenMatches($request->query('hub_verify_token'))) {
            return response((string) $request->query('hub_challenge'), 200)->header('Content-Type', 'text/plain');
        }

        return response('Forbidden', 403);
    }

    /**
     * POST /api/webhooks/whatsapp
     */
    public function receive(Request $request): JsonResponse
    {
        if (!$this->whatsapp->signatureIsValid($request->getContent(), $request->header('X-Hub-Signature-256'))) {
            Log::warning('WhatsApp webhook rejected: bad signature');

            return response()->json(['message' => 'Invalid signature'], 401);
        }

        try {
            $this->whatsapp->handleWebhook((array) $request->json()->all());
        } catch (\Throwable $e) {
            // Still 200: Meta retries non-200s for 36 hours, and a payload
            // that throws once will throw every time.
            Log::error('WhatsApp webhook handling failed', ['error' => $e->getMessage()]);
        }

        return response()->json(['ok' => true]);
    }
}
