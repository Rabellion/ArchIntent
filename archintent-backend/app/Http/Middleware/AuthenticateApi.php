<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class AuthenticateApi
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        // Extract Bearer token from Authorization header
        $token = $request->bearerToken();
        
        if (!$token) {
            return response()->json([
                'message' => 'No token provided',
                'success' => false,
            ], 401);
        }

        // Find the token and authenticate the user
        $personalAccessToken = PersonalAccessToken::findToken($token);
        
        if (!$personalAccessToken) {
            return response()->json([
                'message' => 'Invalid token',
                'success' => false,
            ], 401);
        }

        // Set the authenticated user
        auth()->setUser($personalAccessToken->tokenable);

        return $next($request);
    }
}

