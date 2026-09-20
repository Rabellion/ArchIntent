<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Payment Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for payment processing and handling
    |
    */

    'currency' => strtolower((string) env('PAYMENT_CURRENCY', 'pkr')),

    /*
    | Percent of gross project payment retained by the platform (0–100).
    | Architect receives (gross - platform_fee) recorded as payee_amount.
    */
    'platform_fee_percent' => (float) env('PLATFORM_FEE_PERCENT', 10),

    'stripe' => [
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

    'stripe_connect' => [
        'country' => env('STRIPE_CONNECT_COUNTRY', 'PK'),
        'transfer_on_release' => (bool) env('STRIPE_CONNECT_TRANSFER_ON_RELEASE', true),
        'return_url' => env('STRIPE_CONNECT_RETURN_URL', env('APP_URL', 'http://localhost:5173') . '/dashboard/architect?stripe=return'),
        'refresh_url' => env('STRIPE_CONNECT_REFRESH_URL', env('APP_URL', 'http://localhost:5173') . '/dashboard/architect?stripe=refresh'),
    ],

];
