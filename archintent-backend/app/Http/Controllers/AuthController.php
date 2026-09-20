<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Architect;
use App\Models\Contractor;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Mailtrap\MailtrapClient;
use Mailtrap\Mime\MailtrapEmail;
use Symfony\Component\Mime\Address;

class AuthController extends Controller
{
    /**
     * Register a new user
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function register(Request $request): JsonResponse
    {
        // Validate input
        $validator = Validator::make($request->all(), [
            'full_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[A-Z]/', // must have uppercase
                'regex:/[0-9]/', // must have number
                'regex:/[!@#$%^&*(),.?":{}|<>]/', // must have special character
            ],
            'role' => 'required|in:client,architect,contractor',
            'phone_number' => 'required|string|max:20',
            'identity_type' => 'required|in:cnic,passport',
            'identity_number' => 'required|string|max:50',
            'company_name' => 'required_if:role,contractor|string|max:255',
        ], [
            'password.regex' => 'Password must contain at least one uppercase letter, one number, and one special character.',
            'phone_number.required' => 'Phone number is required.',
            'identity_type.required' => 'Please select CNIC or Passport.',
            'identity_number.required' => 'Identity number is required.',
            'company_name.required_if' => 'Company name is required for contractors.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            \Log::info('Registration attempt', [
                'email' => $request->email,
                'role' => $request->role,
            ]);

            // Create user
            $user = User::create([
                'full_name' => $request->full_name,
                'email' => $request->email,
                'password_hash' => Hash::make($request->password),
                'role' => $request->role,
                'phone_number' => $request->phone_number,
                'identity_type' => $request->identity_type,
                'identity_number' => $request->identity_number,
                'account_status' => $request->role === 'client' ? 'active' : 'pending',
            ]);

            \Log::info('User created', ['user_id' => $user->user_id]);

            // Create role-specific records
            if ($request->role === 'architect') {
                Architect::create([
                    'user_id' => $user->user_id,
                    'license_number' => null,
                    'experience_years' => 0,
                    'specialization' => '',
                    'bio' => '',
                    'verification_status' => 'pending',
                    'verification_document' => null,
                ]);
                \Log::info('Architect record created', ['user_id' => $user->user_id]);
            } elseif ($request->role === 'contractor') {
                Contractor::create([
                    'user_id' => $user->user_id,
                    'company_name' => $request->company_name,
                    'registration_number' => null,
                    'company_address' => '',
                    'verification_status' => 'pending',
                    'verification_document' => null,
                    'experience_years' => 0,
                    'specialization' => null,
                    'bio' => '',
                ]);
                \Log::info('Contractor record created', ['user_id' => $user->user_id]);
            }

            $otp = $this->issueEmailOtpForUser($user);
            $emailSent = $this->sendOtpEmail($user->email, $user->full_name, $otp);

            \Log::info('Registration successful', ['user_id' => $user->user_id, 'email' => $user->email]);

            $response = [
                'message' => 'Registration successful. Please verify your email.',
                'data' => [
                    'user_id' => $user->user_id,
                    'full_name' => $user->full_name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'needs_email_verification' => true,
                    'account_status' => $user->account_status,
                    'profile_completed' => $user->profile_completed,
                    'email_delivered' => $emailSent,
                ],
            ];

            if (config('app.debug')) {
                $response['data']['dev_otp'] = $otp;
            }

            if (!$emailSent) {
                $response['message'] .= ' We could not send the email — use "Resend code" on the verification page after configuring mail, or check logs in local debug.';
            }

            return response()->json($response, 201);
        } catch (\Exception $e) {
            // Log the error for debugging
            \Log::error('Registration error: ' . $e->getMessage(), [
                'exception' => $e,
                'email' => $request->email ?? 'unknown',
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Registration failed',
                'error' => 'An error occurred during registration. Please try again later.',
                'debug' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Generate a new 6-digit OTP, store hash + expiry on the user, return plaintext for emailing.
     */
    private function issueEmailOtpForUser(User $user): string
    {
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->forceFill([
            'email_otp' => Hash::make($otp),
            'email_otp_expires_at' => now()->addMinutes(10),
        ])->save();

        return $otp;
    }

    /**
     * Send OTP email via Mailtrap API (sandbox or sending mode).
     * Returns true when the recipient should receive mail via Mailtrap, or in local debug without a token (OTP is in logs / dev_otp).
     */
    private function sendOtpEmail(string $toEmail, string $toName, string $otp): bool
    {
        $token = config('services.mailtrap.api_token');

        if (!$token) {
            \Log::warning('MAILTRAP_API_TOKEN not set — OTP not sent by email', ['email' => $toEmail]);

            return (bool) config('app.debug');
        }

        try {
            $htmlBody = view('emails.otp', ['userName' => $toName, 'otpCode' => $otp])->render();
            $textBody = "Hi {$toName},\n\nYour ArchIntent verification code is: {$otp}\n\nThis code expires in 10 minutes.\n\nIf you did not register, ignore this email.";

            $fromEmail = (string) config('services.mailtrap.from_email', 'hello@demomailtrap.co');
            $fromName = (string) config('services.mailtrap.from_name', 'ArchIntent');

            $email = (new MailtrapEmail())
                ->from(new Address($fromEmail, $fromName))
                ->to(new Address($toEmail, $toName))
                ->subject('Your ArchIntent verification code')
                ->text($textBody)
                ->html($htmlBody)
                ->category('OTP');

            $mailtrap = MailtrapClient::initSendingEmails(apiKey: $token);
            $mailtrap->send($email);

            \Log::info('OTP email sent via Mailtrap', ['email' => $toEmail]);

            return true;
        } catch (\Throwable $e) {
            \Log::error('Mailtrap OTP send failed', ['error' => $e->getMessage(), 'email' => $toEmail]);

            return false;
        }
    }

    /**
     * POST /api/resend-email-otp
     * Send a fresh code to an unverified account (same email as registration).
     */
    public function resendEmailOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || $user->email_verified_at) {
            return response()->json([
                'message' => 'If that email is registered and still needs verification, we sent a new code.',
            ]);
        }

        $otp = $this->issueEmailOtpForUser($user);
        $sent = $this->sendOtpEmail($user->email, $user->full_name, $otp);

        $payload = [
            'message' => $sent
                ? 'A new verification code was sent to your email.'
                : 'Could not send email. Set MAILTRAP_API_TOKEN and MAILTRAP_FROM_EMAIL, or try again later.',
            'data' => [
                'user_id' => $user->user_id,
                'email_delivered' => $sent,
            ],
        ];

        if (config('app.debug')) {
            $payload['data']['dev_otp'] = $otp;
        }

        return response()->json($payload, $sent ? 200 : 503);
    }

    /**
     * POST /api/verify-email-otp
     * Verify the 6-digit code sent to the user's email after registration.
     */
    public function verifyEmailOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|integer',
            'otp'     => ['required', 'string', 'regex:/^[0-9]{6}$/'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $user = User::find($request->user_id);

        if (!$user) {
            return response()->json(['message' => 'Invalid or expired verification code'], 422);
        }

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email already verified'], 422);
        }

        if (!$user->email_otp || !$user->email_otp_expires_at) {
            return response()->json(['message' => 'No pending verification code. Please re-register.'], 422);
        }

        if (now()->isAfter($user->email_otp_expires_at)) {
            return response()->json(['message' => 'Verification code has expired'], 422);
        }

        if (!Hash::check((string) $request->otp, $user->email_otp)) {
            return response()->json(['message' => 'Invalid verification code'], 422);
        }

        $user->forceFill([
            'email_verified_at'     => now(),
            'email_otp'             => null,
            'email_otp_expires_at'  => null,
        ])->save();

        return response()->json([
            'message' => 'Email verified successfully. You can now log in.',
            'data'    => ['email_verified_at' => $user->email_verified_at->toIso8601String()],
        ]);
    }

    /**
     * Login user and return authorization token
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = User::where('email', $request->email)->first();

            // Check if user exists and password is correct
            if (!$user || !Hash::check($request->password, $user->password_hash)) {
                return response()->json([
                    'message' => 'Invalid credentials',
                ], 401);
            }

            // Reject unverified emails only when this account has a pending OTP flow (OTP columns set at registration)
            $pendingEmailVerification = !$user->email_verified_at
                && (filled($user->email_otp) || filled($user->email_otp_expires_at));

            if ($pendingEmailVerification) {
                return response()->json([
                    'message' => 'Email not verified. Check your inbox for the code, or use Resend on the verification page.',
                    'needs_email_verification' => true,
                    'user_id' => $user->user_id,
                    'email' => $user->email,
                ], 403);
            }

            // Check account status
            if ($user->account_status === 'suspended') {
                return response()->json([
                    'message' => 'Account suspended',
                ], 403);
            }

            // Allow login for pending accounts (they just won't be visible in public listings)
            // if ($user->account_status === 'pending') {
            //     return response()->json([
            //         'message' => 'Account pending verification',
            //     ], 403);
            // }

            // Create Sanctum token
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'message' => 'Login successful',
                'data' => [
                    'token' => $token,
                    'user' => [
                        'user_id' => $user->user_id,
                        'full_name' => $user->full_name,
                        'email' => $user->email,
                        'role' => $user->role,
                        'account_status' => $user->account_status,
                    ],
                ],
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Login failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Logout user by revoking current token
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $request->user()->currentAccessToken()->delete();

            return response()->json([
                'message' => 'Logout successful',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Logout failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get authenticated user profile with role-specific data
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function profile(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Load role-specific data
            $profileData = [
                'user_id' => $user->user_id,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'role' => $user->role,
                'phone_number' => $user->phone_number,
                'profile_image' => $user->profile_image,
                'account_status' => $user->account_status,
                'identity_type' => $user->identity_type,
                'identity_number' => $user->identity_number,
                'profile_completed' => $user->profile_completed,
                'phone_verified_at' => $user->phone_verified_at?->toIso8601String(),
            ];

            if ($user->role === 'architect' && $user->architect) {
                $profileData['architect'] = $user->architect;
            } elseif ($user->role === 'contractor' && $user->contractor) {
                $profileData['contractor'] = $user->contractor;
            }

            return response()->json([
                'message' => 'Profile retrieved successfully',
                'data' => $profileData,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to retrieve profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update user profile (accepts POST or PUT; multipart file uploads should use POST — PHP often omits files on PUT).
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'full_name' => 'sometimes|required|string|max:255',
            'phone_number' => 'sometimes|nullable|string|max:20',
            'profile_image' => 'sometimes|nullable|image|mimes:jpeg,png|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();
            $updateData = [];

            // Update full name if provided
            if ($request->has('full_name')) {
                $updateData['full_name'] = $request->input('full_name');
            }

            // Update phone number if provided (empty string -> null for nullable column)
            if ($request->has('phone_number')) {
                $phone = $request->input('phone_number');
                $newPhone = ($phone === '' || $phone === null) ? null : trim((string) $phone);
                $oldPhone = $user->phone_number === null ? null : trim((string) $user->phone_number);
                if ($newPhone !== $oldPhone) {
                    $updateData['phone_verified_at'] = null;
                }
                $updateData['phone_number'] = $newPhone;
            }

            // Handle profile image upload
            if ($request->hasFile('profile_image')) {
                $old = $user->profile_image;
                if (is_string($old) && $old !== '' && ! str_contains($old, '..') && ! preg_match('#^https?://#i', $old)) {
                    if (Storage::disk('public')->exists($old)) {
                        Storage::disk('public')->delete($old);
                    }
                }

                $imagePath = $request->file('profile_image')->store('profiles', 'public');
                if (! is_string($imagePath) || $imagePath === '') {
                    return response()->json([
                        'message' => 'Failed to store profile image',
                        'error' => 'Storage returned an empty path',
                    ], 500);
                }
                $updateData['profile_image'] = $imagePath;
            }

            if ($updateData !== []) {
                $user->update($updateData);
            }

            $user->refresh();

            return response()->json([
                'message' => 'Profile updated successfully',
                'data' => [
                    'user_id' => $user->user_id,
                    'full_name' => $user->full_name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'phone_number' => $user->phone_number,
                    'phone_verified_at' => $user->phone_verified_at?->toIso8601String(),
                    'profile_image' => $user->profile_image,
                    'account_status' => $user->account_status,
                ],
            ], 200);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Failed to update profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
