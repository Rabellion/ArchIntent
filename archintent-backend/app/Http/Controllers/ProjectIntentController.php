<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Client-facing intent decoding: live keyword extraction and voice
 * transcription for the project-creation form.
 *
 * Both endpoints are thin proxies to the NLP service (see nlp-service/
 * main.py, keyword_extractor.py, transcriber.py) -- the browser never
 * talks to that service directly, so INTERNAL_API_KEY and the OpenAI
 * API key it guards never reach client-side code.
 *
 * Neither endpoint writes anything. They exist purely to give the
 * client a live preview (keyword chips, a transcript to review and
 * edit) BEFORE they submit a project -- the actual matching pipeline
 * (ComputeProjectMatchesJob) re-derives keywords from the final
 * brief_text server-side regardless of whether the client used these.
 */
class ProjectIntentController extends Controller
{
    /**
     * POST /api/projects/preview-intent
     *
     * Decode a client's in-progress brief into structured design terms
     * (style, room type, material, feature) for a "we understood: ..."
     * confirmation shown while they are still writing/reviewing it.
     */
    public function previewIntent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'brief_text' => 'required|string|min:20|max:5000',
        ]);

        $nlpUrl = config('services.matching.nlp_service_url');
        $key = config('app.internal_api_key');

        if (!is_string($nlpUrl) || $nlpUrl === '' || !is_string($key) || $key === '') {
            return response()->json([
                'success' => false,
                'message' => 'Intent preview is not configured on this server.',
            ], 503);
        }

        try {
            $response = Http::timeout(15)
                ->withHeaders(['X-Internal-Key' => $key])
                ->acceptJson()
                ->post(rtrim($nlpUrl, '/') . '/extract-keywords', [
                    'text' => $validated['brief_text'],
                ]);
        } catch (\Throwable $e) {
            Log::warning('Intent preview request failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Could not analyse the brief right now.',
            ], 502);
        }

        if (!$response->successful()) {
            return response()->json([
                'success' => false,
                'message' => 'Could not analyse the brief right now.',
            ], 502);
        }

        return response()->json([
            'success' => true,
            'data' => $response->json('intent'),
        ]);
    }

    /**
     * POST /api/projects/transcribe
     *
     * Transcribe a recorded voice brief. The audio never touches disk
     * here -- it is streamed straight through to the NLP service, which
     * forwards it to the OpenAI Whisper API and returns text only.
     */
    public function transcribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // MediaRecorder's default output is webm/opus; mp3/wav/m4a
            // are accepted too in case a future client records
            // differently. 15MB mirrors the NLP service's own cap
            // (MAX_AUDIO_BYTES) so an oversized upload is rejected here
            // before spending a Heroku-to-Heroku request on it.
            'audio' => 'required|file|mimetypes:audio/webm,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a,video/webm|max:15360',
        ]);

        $nlpUrl = config('services.matching.nlp_service_url');
        $key = config('app.internal_api_key');

        if (!is_string($nlpUrl) || $nlpUrl === '' || !is_string($key) || $key === '') {
            return response()->json([
                'success' => false,
                'message' => 'Voice transcription is not configured on this server.',
            ], 503);
        }

        $file = $validated['audio'];

        try {
            $response = Http::timeout(60)
                ->withHeaders(['X-Internal-Key' => $key])
                ->acceptJson()
                ->attach(
                    'file',
                    file_get_contents($file->getRealPath()),
                    $file->getClientOriginalName() ?: 'recording.webm'
                )
                ->post(rtrim($nlpUrl, '/') . '/transcribe');
        } catch (\Throwable $e) {
            Log::warning('Transcription request failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Could not transcribe the recording right now.',
            ], 502);
        }

        if (!$response->successful()) {
            // The NLP service returns a user-safe message in `detail`
            // for both "not configured" and genuine Whisper failures;
            // fall back to a generic one only if that is missing.
            $detail = $response->json('detail');
            $message = is_string($detail) && $detail !== ''
                ? $detail
                : 'Could not transcribe the recording right now.';

            // 429 means the Groq key pool is momentarily out of headroom,
            // not that anything is broken. Passing the status and
            // Retry-After straight through lets the client say "try again
            // in N seconds" instead of showing a generic failure.
            if ($response->status() === 429) {
                $retryAfter = $response->header('Retry-After');

                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'retry_after' => is_numeric($retryAfter) ? (int) $retryAfter : null,
                ], 429)->withHeaders(
                    is_numeric($retryAfter) ? ['Retry-After' => (string) (int) $retryAfter] : []
                );
            }

            return response()->json([
                'success' => false,
                'message' => $message,
            ], 502);
        }

        return response()->json([
            'success' => true,
            'transcript' => $response->json('transcript'),
        ]);
    }
}
