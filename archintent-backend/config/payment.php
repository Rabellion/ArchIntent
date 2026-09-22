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

    /*
    | Display currency: what every price on the frontend, the Payment
    | table's amount/platform_fee/payee_amount columns, and admin
    | analytics are denominated in. This is deliberately NOT what
    | actually gets charged through Stripe -- see stripe_currency below.
    */
    'currency' => strtolower((string) env('PAYMENT_CURRENCY', 'pkr')),

    /*
    | Percent of gross project payment retained by the platform (0–100).
    | Architect receives (gross - platform_fee) recorded as payee_amount.
    */
    'platform_fee_percent' => (float) env('PLATFORM_FEE_PERCENT', 10),

    /*
    | The platform's Stripe account is US-region and does not settle in
    | PKR, so every amount actually sent to Stripe (PaymentIntents,
    | Transfers, Refunds) is converted from PKR to this currency first.
    | Every PKR figure the frontend shows, and everything stored in the
    | database, is completely unaffected -- only the number handed to
    | Stripe's API changes.
    */
    'stripe_currency' => strtolower((string) env('STRIPE_CHARGE_CURRENCY', 'usd')),

    /*
    | Fixed PKR-per-USD rate used to convert an amount before it's sent
    | to Stripe. Deliberately a fixed rate, not a live FX lookup -- a
    | client's charge and the architect's later payout for the same
    | project must convert at the same number, or the two sides of one
    | transaction would drift apart.
    */
    'pkr_per_usd' => (float) env('PKR_PER_USD_RATE', 280),

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
