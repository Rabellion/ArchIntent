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
        // Behind Heroku's router (and Vercel in front of the SPA), the
        // socket peer is the load balancer, not the visitor. Without
        // this, $request->ip() returns whichever Heroku router handled
        // the request -- a different address almost every time -- so
        // every 'throttle:x,y' bucket got a unique key and rate
        // limiting silently never engaged. It also fixes scheme
        // detection (https) and the IP recorded in admin_logs.
        //
        // '*' here does NOT mean "trust any X-Forwarded-For". Laravel
        // maps it to "trust only the calling IP", so Symfony walks the
        // XFF chain from the right and stops at the first untrusted
        // entry -- which on Heroku is the real client IP the router
        // appends itself. A client-supplied XFF cannot displace it.
        $middleware->trustProxies(at: '*');

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
