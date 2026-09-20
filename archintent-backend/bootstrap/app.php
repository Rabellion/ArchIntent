<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\AuthenticateApi;
use App\Http\Middleware\CheckInternalApiKey;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        channels: __DIR__.'/../routes/channels.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => CheckRole::class,
            'auth.api' => AuthenticateApi::class,
            'internal.key' => CheckInternalApiKey::class,
        ]);
    })
    ->withSchedule(function ($schedule) {
        $schedule->command('projects:auto-approve-designs')->daily();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Handle RouteNotFoundException for API requests - return JSON instead of redirect
        $exceptions->render(function (\Throwable $e, $request) {
            if ($e instanceof \Symfony\Component\Routing\Exception\RouteNotFoundException && 
                ($request->expectsJson() || $request->is('api/*'))) {
                return response()->json([
                    'message' => 'Unauthenticated',
                    'success' => false,
                ], 401);
            }
            return null; // Let default exception handling continue
        });
    })->create();
