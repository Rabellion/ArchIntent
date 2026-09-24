<?php

namespace App\Http\Controllers;

use App\Models\WhatsAppSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Internal-only (see the `internal.key` middleware group in routes/api.php):
 * lets the whatsapp-service dyno save and restore its logged-in WhatsApp
 * session across restarts, using this app's database as the one place on
 * this whole setup that actually persists. See the create_whatsapp_sessions_table
 * migration and whatsapp-service/index.mjs.
 */
class WhatsAppSessionController extends Controller
{
    public function show(string $sessionId): JsonResponse
    {
        $session = WhatsAppSession::where('session_id', $sessionId)->first();

        if (!$session) {
            return response()->json(['message' => 'No saved session'], 404);
        }

        return response()->json([
            'data' => [
                'session_id' => $session->session_id,
                'archive' => $session->archive,
                'size_bytes' => $session->size_bytes,
                'updated_at' => $session->updated_at?->toIso8601String(),
            ],
        ]);
    }

    public function store(Request $request, string $sessionId): JsonResponse
    {
        $validated = $request->validate([
            'archive' => 'required|string',
        ]);

        // Some headroom over a typical open-wa profile; mainly a guard
        // against silently accepting a stream from a misbehaving client.
        // Configurable so a test can prove the boundary without actually
        // allocating a 200MB string.
        $maxBytes = (int) config('otp.openwa.max_session_archive_bytes', 200 * 1024 * 1024);
        $sizeBytes = strlen($validated['archive']);
        if ($sizeBytes > $maxBytes) {
            return response()->json(['message' => 'Archive too large'], 413);
        }

        WhatsAppSession::updateOrCreate(
            ['session_id' => $sessionId],
            ['archive' => $validated['archive'], 'size_bytes' => $sizeBytes],
        );

        Log::info('WhatsApp session archive saved', ['session_id' => $sessionId, 'size_bytes' => $sizeBytes]);

        return response()->json(['message' => 'Saved', 'data' => ['size_bytes' => $sizeBytes]]);
    }

    public function destroy(string $sessionId): JsonResponse
    {
        WhatsAppSession::where('session_id', $sessionId)->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
