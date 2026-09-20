<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckInternalApiKey
{
    public function handle(Request $request, Closure $next)
    {
        $providedKey = $request->header('X-Internal-Key');
        $expectedKey = config('app.internal_api_key');

        if (!$providedKey || $providedKey !== $expectedKey) {
            return response()->json([
                'message' => 'Unauthorized: Invalid internal API key',
            ], 401);
        }

        return $next($request);
    }
}
