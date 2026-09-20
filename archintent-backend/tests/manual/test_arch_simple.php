<?php
// Test architect profile endpoint - Simple test without file uploads

$token = null;

// Step 1: Register architect
$registerPayload = [
    'full_name' => 'Test Architect ' . uniqid(),
    'email' => 'archtest' . time() . '@test.com',
    'password' => 'Test@1234',
    'password_confirmation' => 'Test@1234',
    'role' => 'architect',
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
$registerResponse = file_get_contents('http://localhost:8000/api/register', false, $context);
$registerData = json_decode($registerResponse, true);

echo "[1] Registered: " . $registerData['data']['email'] . " (ID: " . $registerData['data']['user_id'] . ")\n";

// Step 2: Login
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
$loginResponse = file_get_contents('http://localhost:8000/api/login', false, $loginContext);
$loginData = json_decode($loginResponse, true);
$token = $loginData['data']['token'];

echo "[2] Logged in with token: " . substr($token, 0, 20) . "...\n";

// Step 3: Try without file - just test the endpoint
$profilePayload = [
    'license_number' => 'LIC-001',
    'experience_years' => 5,
    'specialization' => 'Modern',
    'bio' => 'Test bio'
];

echo "\n[3] Testing POST /api/architect/profile\n";
echo "    Payload: " . json_encode($profilePayload) . "\n";

$profileOptions = [
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json\r\nAccept: application/json\r\nAuthorization: Bearer ' . $token . '\r\n',
        'content' => json_encode($profilePayload),
        'timeout' => 10
    ]
];

$profileContext = stream_context_create($profileOptions);

// Reset global http_response_header
$http_response_header = [];

$profileResponse = file_get_contents('http://localhost:8000/api/architect/profile', false, $profileContext);

echo "\n    HTTP Response Headers:\n";
if (!empty($http_response_header)) {
    foreach ($http_response_header as $header) {
        echo "    " . $header . "\n";
    }
} else {
    echo "    (no headers captured)\n";
}

echo "\n    Response Body:\n";
if ($profileResponse === false) {
    echo "    ERROR: Failed to connect\n";
} else {
    // Limit output to first 500 chars
    $preview = substr($profileResponse, 0, 1000);
    echo "    " . $preview . (strlen($profileResponse) > 1000 ? "...\n" : "\n");
}
