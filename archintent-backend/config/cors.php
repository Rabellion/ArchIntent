<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'broadcasting/auth', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Set FRONTEND_URL on Heroku to the exact production Vercel domain,
    // e.g. https://archintent.vercel.app. array_filter drops it cleanly
    // when unset (local dev), rather than allowing an empty string.
    'allowed_origins' => array_filter([
        env('FRONTEND_URL'),
    ]),

    'allowed_origins_patterns' => [
        '/^http:\/\/localhost(:\d+)?$/',
        '/^http:\/\/127\.0\.0\.1(:\d+)?$/',
        // Vercel gives every branch/PR its own preview URL
        // (my-app-<hash>-<team>.vercel.app). Matching the whole
        // *.vercel.app suffix means a demo reviewer landing on a
        // preview deployment isn't silently blocked by CORS.
        '/^https:\/\/[a-z0-9-]+\.vercel\.app$/',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
