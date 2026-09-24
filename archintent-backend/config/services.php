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

    /*
    | Firebase Authentication (free Spark plan), used only to send email
    | verification links. The Web API key identifies the project and is
    | not a secret (Firebase ships it in every client app), but it still
    | belongs in env. continue_url is optional; if set, its domain must be
    | in Firebase > Authentication > Settings > Authorized domains.
    */
    'firebase' => [
        'api_key' => env('FIREBASE_WEB_API_KEY'),
        'continue_url' => env('FIREBASE_EMAIL_CONTINUE_URL'),
    ],

    /*
    | WhatsApp Cloud API, for free "reverse" phone verification: the user
    | sends ArchIntent's WhatsApp number a one-time code, and WhatsApp's
    | webhook tells us which (WhatsApp-verified) number sent it. Messages a
    | user sends to a business are not charged, nor are free-form replies
    | within the 24-hour customer service window.
    |
    | business_number: ArchIntent's WhatsApp number, digits only with country
    |   code (e.g. 923001234567) -- used for the wa.me link.
    | phone_number_id / access_token: for the confirmation reply (optional;
    |   verification still works without them, it just stays silent).
    | app_secret: verifies Meta's X-Hub-Signature-256 on every webhook.
    | verify_token: any string you choose, entered again in Meta's webhook setup.
    */
    'whatsapp' => [
        'business_number' => preg_replace('/\D+/', '', (string) env('WHATSAPP_BUSINESS_NUMBER', '')),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        'access_token' => env('WHATSAPP_ACCESS_TOKEN'),
        'app_secret' => env('WHATSAPP_APP_SECRET'),
        'verify_token' => env('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
        'graph_version' => env('WHATSAPP_GRAPH_VERSION', 'v25.0'),
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
