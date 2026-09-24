<?php

$smsGateUser = trim((string) env('SMSGATE_USERNAME', ''));
$smsGatePass = trim((string) env('SMSGATE_PASSWORD', ''));
$twilioSid = trim((string) env('TWILIO_ACCOUNT_SID', ''));
$openWaBaseUrl = trim((string) env('OPENWA_BASE_URL', ''));
$openWaApiKey = trim((string) env('OPENWA_API_KEY', ''));

return [

    'ttl_seconds' => (int) env('OTP_TTL_SECONDS', 600),

    'length' => 6,

    /*
    | SMS driver: 'openwa' | 'smsgate' | 'twilio' | 'none'.
    |
    | Left unset, it is inferred from whichever credentials are present, so
    | adding e.g. OPENWA_* switches delivery over without a second env change.
    */
    'sms_driver' => env('OTP_SMS_DRIVER') ?: match (true) {
        $openWaBaseUrl !== '' && $openWaApiKey !== '' => 'openwa',
        $smsGateUser !== '' && $smsGatePass !== '' => 'smsgate',
        $twilioSid !== '' => 'twilio',
        default => 'none',
    },

    /*
    | Free phone verification via WhatsApp, delivered through a
    | self-hosted open-wa instance (see whatsapp-service/) logged in as a
    | real personal/business WhatsApp number. Messages open-wa's own
    | WhatsApp account sends are free -- the cost is running the instance,
    | not per message. base_url is that service's own root URL (its Easy
    | API), not this app's URL.
    */
    'openwa' => [
        'base_url' => rtrim($openWaBaseUrl, '/'),
        'api_key' => $openWaApiKey,
    ],

    /*
    | SMS Gateway for Android (https://sms-gate.app, Apache-2.0). Texts are
    | sent by an Android phone running the app, from its own SIM -- so they
    | reach any Pakistani number at the SIM's own SMS rate. Credentials are
    | shown in the app under "Cloud Server". Point base_url at a private
    | server instead of the public one if you self-host it.
    */
    'smsgate' => [
        'base_url' => rtrim((string) env('SMSGATE_BASE_URL', 'https://api.sms-gate.app/3rdparty/v1'), '/'),
        'username' => $smsGateUser,
        'password' => $smsGatePass,
    ],

    /*
    | Twilio Programmable SMS. A Trial account can only text numbers
    | verified on that account.
    */
    'twilio' => [
        'account_sid' => $twilioSid,
        'auth_token' => trim((string) env('TWILIO_AUTH_TOKEN', '')),
        'from' => trim((string) env('TWILIO_FROM', '')),
    ],

    /*
    | Email driver:
    |   'firebase' -- Firebase sends a verification LINK (free Spark plan,
    |                 1000/day, any recipient). No 6-digit code.
    |   'mail'     -- 6-digit code via Laravel's mailer (any SMTP, e.g. Gmail).
    |   'mailtrap' -- 6-digit code via Mailtrap's API.
    |
    | Left unset, it is inferred: Firebase once FIREBASE_WEB_API_KEY is set,
    | else Mailtrap while MAILTRAP_API_TOKEN is set, else the mailer.
    */
    'email_driver' => env('OTP_EMAIL_DRIVER') ?: match (true) {
        filled(env('FIREBASE_WEB_API_KEY')) => 'firebase',
        filled(env('MAILTRAP_API_TOKEN')) => 'mailtrap',
        default => 'mail',
    },

    /*
    | When true, API responses from send-otp may include the plaintext code (local QA only).
    */
    'expose_code_in_response' => (bool) env('OTP_EXPOSE_CODE_IN_RESPONSE', false),

];
