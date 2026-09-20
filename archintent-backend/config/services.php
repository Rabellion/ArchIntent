<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'mailtrap' => [
        'api_token'   => env('MAILTRAP_API_TOKEN'),
        'inbox_id'    => env('MAILTRAP_INBOX_ID'),
        'mode'        => env('MAILTRAP_MODE', 'sandbox'), // 'sandbox' or 'send'
        'from_email'  => env('MAILTRAP_FROM_EMAIL', 'hello@demomailtrap.co'),
        'from_name'   => env('MAILTRAP_FROM_NAME', 'ArchIntent'),
    ],

    'stripe' => [
        'public' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
        'verify_ssl' => env('STRIPE_VERIFY_SSL', true),
    ],

    /*
    | Optional remote NLP / S-BERT matching service. POST JSON body with project + architects;
    | must return { "matches": [ { "architect_id", "match_score", "architect_project_id?" } ] }.
    | When empty, Laravel uses an on-server heuristic matcher and queues ComputeProjectMatchesJob.
    */
    'matching' => [
        'nlp_service_url' => env('MATCHING_NLP_SERVICE_URL'),
    ],

];
