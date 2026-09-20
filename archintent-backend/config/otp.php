<?php

return [

    'ttl_seconds' => (int) env('OTP_TTL_SECONDS', 600),

    'length' => 6,

    /*
    | Phone OTP via Twilio Programmable SMS (Messages API).
    */
    'twilio' => [
        'account_sid' => trim((string) env('TWILIO_ACCOUNT_SID', '')),
        'auth_token' => trim((string) env('TWILIO_AUTH_TOKEN', '')),
        'from' => trim((string) env('TWILIO_FROM', '')),
    ],

    /*
    | When true, API responses from send-otp may include the plaintext code (local QA only).
    */
    'expose_code_in_response' => (bool) env('OTP_EXPOSE_CODE_IN_RESPONSE', false),

];
