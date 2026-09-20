<?php
// Test architect profile endpoint
// First, register an architect and get a token

$emails = [
    'architect1@test.com',
    'architect2@test.com',
    'architect3@test.com'
];

$email = $emails[array_rand($emails)];

// Step 1: Register architect
$registerPayload = [
    'full_name' => 'Test Architect ' . uniqid(),
    'email' => $email . '.' . time(),
    'password' => 'Test@1234',
    'password_confirmation' => 'Test@1234',
    'role' => 'architect',
    'phone_number' => '+1234567890'
];

$options = [
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json\r\nAccept: application/json\r\n',
        'content' => json_encode($registerPayload),
        'timeout' => 5
    ]
];

$context = stream_context_create($options);
$registerResponse = @file_get_contents('http://localhost:8000/api/register', false, $context);

if (!$registerResponse) {
    echo "Failed to register\n";
    exit(1);
}

echo "=== Registration Response ===\n";
echo $registerResponse . "\n\n";

// Step 2: Login to get token
$loginPayload = [
    'email' => $registerPayload['email'],
    'password' => 'Test@1234'
];

$loginOptions = [
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json\r\nAccept: application/json\r\n',
        'content' => json_encode($loginPayload),
        'timeout' => 5
    ]
];

$loginContext = stream_context_create($loginOptions);
$loginResponse = @file_get_contents('http://localhost:8000/api/login', false, $loginContext);

if (!$loginResponse) {
    echo "Failed to login\n";
    exit(1);
}

echo "=== Login Response ===\n";
echo $loginResponse . "\n\n";

$loginData = json_decode($loginResponse, true);
$token = $loginData['data']['token'] ?? null;

if (!$token) {
    echo "No token received\n";
    exit(1);
}

echo "Token: " . substr($token, 0, 20) . "...\n\n";

// Step 3: Try to update architect profile
$profilePayload = [
    'license_number' => 'LIC-2024-001',
    'experience_years' => 5,
    'specialization' => 'Modern Architecture',
    'bio' => 'Professional architect with 5 years of experience'
];

$profileOptions = [
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json\r\nAccept: application/json\r\nAuthorization: Bearer ' . $token . '\r\n',
        'content' => json_encode($profilePayload),
        'timeout' => 5
    ]
];

$profileContext = stream_context_create($profileOptions);
$profileResponse = @file_get_contents('http://localhost:8000/api/architect/profile', false, $profileContext);

if ($profileResponse === false) {
    echo "Error: Could not connect to profile endpoint\n";
    // Try to get the HTTP response header to see the error
    if (isset($http_response_header)) {
        echo "HTTP Headers:\n";
        print_r($http_response_header);
    }
    exit(1);
}

echo "=== Profile Endpoint Response ===\n";
echo $profileResponse . "\n";
