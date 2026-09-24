<?php

$smsGateUser = trim((string) env('SMSGATE_USERNAME', ''));
$smsGatePass = trim((string) env('SMSGATE_PASSWORD', ''));
$twilioSid = trim((string) env('TWILIO_ACCOUNT_SID', ''));

return [

    'ttl_seconds' => (int) env('OTP_TTL_SECONDS', 600),

    'length' => 6,

    /*
    | SMS driver: 'smsgate' | 'twilio' | 'none'.
    |
    | Left unset, it is inferred from whichever credentials are present, so
    | adding SMSGATE_* switches delivery over without a second env change.
    */
    'sms_driver' => env('OTP_SMS_DRIVER') ?: match (true) {
        $smsGateUser !== '' && $smsGatePass !== '' => 'smsgate',
        $twilioSid !== '' => 'twilio',
        default => 'none',
    },

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
    | Email driver: 'mail' (Laravel mailer -- any SMTP, e.g. Gmail) | 'mailtrap'.
    |
    | Left unset, it stays on Mailtrap while MAILTRAP_API_TOKEN is present,
    | so deploying this doesn't change delivery until OTP_EMAIL_DRIVER=mail
    | and the MAIL_* SMTP settings are in place.
    */
    'email_driver' => env('OTP_EMAIL_DRIVER') ?: (env('MAILTRAP_API_TOKEN') ? 'mailtrap' : 'mail'),

    /*
    | When true, API responses from send-otp may include the plaintext code (local QA only).
    */
    'expose_code_in_response' => (bool) env('OTP_EXPOSE_CODE_IN_RESPONSE', false),

];
