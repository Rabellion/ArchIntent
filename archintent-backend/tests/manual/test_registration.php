<?php
/**
 * Test script to verify registration endpoint
 * Run this from the command line to test the /register endpoint
 */

$backendUrl = 'http://localhost:8000/api/register';

$testData = [
    'full_name' => 'Test User',
    'email' => 'test' . time() . '@example.com',  // Unique email
    'password' => 'TestPassword123!',
    'password_confirmation' => 'TestPassword123!',
    'role' => 'client',
    'phone_number' => '+1234567890'
];

echo "Testing registration endpoint...\n";
echo "URL: $backendUrl\n";
echo "Data: " . json_encode($testData, JSON_PRETTY_PRINT) . "\n\n";

// Make the request using cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $backendUrl);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_VERBOSE, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
echo "Response: " . $response . "\n";

if ($curlError) {
    echo "cURL Error: $curlError\n";
}

// Try to parse JSON response
$decoded = json_decode($response, true);
if ($decoded) {
    echo "\nDecoded Response:\n";
    echo json_encode($decoded, JSON_PRETTY_PRINT) . "\n";
}
