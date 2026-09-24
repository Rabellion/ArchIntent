<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ArchitectController;
use App\Http\Controllers\ContractorController;
use App\Http\Controllers\ArchitectPortfolioController;
use App\Http\Controllers\ContractorPortfolioController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectIntentController;
use App\Http\Controllers\MatchingController;
use App\Http\Controllers\BiddingController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AgreementController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\BudzController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\PhoneOtpController;
use App\Http\Controllers\WhatsAppWebhookController;
use App\Http\Controllers\ArchitectPayoutController;
use App\Http\Controllers\ArchitectStripeConnectController;

Route::get('/health', function () {
    return response()->json(['ok' => true]);
});

// Serve storage files directly (bypasses Windows symlink issues with php artisan serve)
Route::get('/storage/{path}', function (string $path) {
    $fullPath = storage_path('app/public/' . $path);

    if (!file_exists($fullPath)) {
        abort(404);
    }

    // Security: prevent directory traversal
    $realPath = realpath($fullPath);
    $storagePath = realpath(storage_path('app/public'));
    if (!$realPath || !str_starts_with($realPath, $storagePath)) {
        abort(403);
    }

    $mimeType = mime_content_type($realPath) ?: 'application/octet-stream';

    return response()->file($realPath, [
        'Content-Type' => $mimeType,
        'Cache-Control' => 'public, max-age=86400',
    ]);
})->where('path', '.*');

// Internal routes (for AI service, protected with internal API key)
Route::middleware('internal.key')->group(function () {
    Route::post('/internal/project-matches', [MatchingController::class, 'storeMatches']);
});

// Auth routes with rate limiting
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('/verify-email-otp', [AuthController::class, 'verifyEmailOtp'])->middleware('throttle:10,1');
Route::post('/resend-email-otp', [AuthController::class, 'resendEmailOtp'])->middleware('throttle:6,1');
Route::post('/check-email-verification', [AuthController::class, 'checkEmailVerification'])->middleware('throttle:20,1');

// Meta WhatsApp Cloud API webhook: public, authenticated by the
// X-Hub-Signature-256 HMAC (POST) or the verify token (GET handshake).
Route::get('/webhooks/whatsapp', [WhatsAppWebhookController::class, 'verify']);
Route::post('/webhooks/whatsapp', [WhatsAppWebhookController::class, 'receive']);
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

// Public architect/contractor portfolio routes
Route::get('/architects', [ArchitectPortfolioController::class, 'listArchitects']);
Route::get('/architect/{id}', [ArchitectPortfolioController::class, 'showArchitect'])->whereNumber('id');
Route::get('/architect/projects/{projectRef}', [ArchitectPortfolioController::class, 'showProjectByRef']);
Route::get('/contractor/{id}/portfolio', [ContractorPortfolioController::class, 'showPublicPortfolio'])->whereNumber('id');
Route::get('/contractor/projects/{projectRef}', [ContractorPortfolioController::class, 'showProjectByRef']);
Route::get('/reviews/architect/{architectId}', [ReviewController::class, 'architectReviews'])->whereNumber('architectId');
Route::get('/reviews/contractor/{contractorId}', [ReviewController::class, 'contractorReviews'])->whereNumber('contractorId');

// Protected routes
Route::middleware('auth.api')->group(function () {
    Route::get('/contractor/{id}', [ContractorController::class, 'showContractor'])->whereNumber('id');

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/profile', [AuthController::class, 'profile']);
    // POST + PUT: multipart profile_image is unreliable on PUT with PHP; clients should POST FormData
    Route::match(['put', 'post'], '/profile', [AuthController::class, 'updateProfile']);
    Route::get('/auth/phone-verification/methods', [PhoneOtpController::class, 'methods']);
    Route::post('/auth/phone-whatsapp/start', [PhoneOtpController::class, 'startWhatsApp'])->middleware('throttle:6,1');
    Route::post('/auth/phone-otp/send', [PhoneOtpController::class, 'send'])->middleware('throttle:6,1');
    Route::post('/auth/phone-otp/verify', [PhoneOtpController::class, 'verify'])->middleware('throttle:20,1');

    // Architect routes (protected by auth.api, role checked in controller)
    Route::middleware('role:architect')->group(function () {
        Route::get('/architect/profile', [ArchitectController::class, 'getProfile']);
        Route::post('/architect/profile', [ArchitectController::class, 'updateProfile']);
        Route::post('/architect/mark-profile-complete', [ArchitectController::class, 'markProfileComplete']);
        Route::get('/architect/portfolio', [ArchitectPortfolioController::class, 'getOwnPortfolio']);
        Route::post('/architect/portfolio/setup', [ArchitectPortfolioController::class, 'setup']);
        Route::post('/architect/portfolio/projects', [ArchitectPortfolioController::class, 'createProject']);
        Route::put('/architect/portfolio/projects/{projectId}', [ArchitectPortfolioController::class, 'updateProject']);
        Route::post('/architect/portfolio/projects/{projectId}/images', [ArchitectPortfolioController::class, 'addImages']);
        Route::delete('/architect/portfolio/projects/{projectId}/images/{imageId}', [ArchitectPortfolioController::class, 'deleteImage']);
        Route::put('/architect/portfolio/projects/{projectId}/cover/{imageId}', [ArchitectPortfolioController::class, 'setCover']);
        Route::delete('/architect/portfolio/projects/{projectId}', [ArchitectPortfolioController::class, 'deleteProject']);
        Route::get('/architect/me/dashboard', [ArchitectController::class, 'getDashboard']);
        Route::get('/architect/dashboard', [ArchitectController::class, 'getDashboard']);
        Route::get('/architect/projects', [ArchitectController::class, 'getProjects']);
        Route::get('/architect/stripe-connect/status', [ArchitectStripeConnectController::class, 'status']);
        Route::post('/architect/stripe-connect/account', [ArchitectStripeConnectController::class, 'createAccount']);
        Route::post('/architect/stripe-connect/onboarding-link', [ArchitectStripeConnectController::class, 'onboardingLink']);

        // Demo bank-transfer payout path. Records bank details and
        // withdrawal requests; does NOT move money (Stripe Connect
        // above is the real transfer mechanism).
        Route::get('/architect/bank-details', [ArchitectPayoutController::class, 'getBankDetails']);
        Route::post('/architect/bank-details', [ArchitectPayoutController::class, 'saveBankDetails']);
        Route::get('/architect/balance', [ArchitectPayoutController::class, 'balance']);
        Route::get('/architect/withdrawals', [ArchitectPayoutController::class, 'listWithdrawals']);
        Route::post('/architect/withdraw', [ArchitectPayoutController::class, 'requestWithdrawal']);
    });

    // Contractor routes (protected by auth.api + role:contractor)
    Route::middleware('role:contractor')->group(function () {
        Route::get('/contractor/profile', [ContractorController::class, 'getProfile']);
        Route::post('/contractor/profile', [ContractorController::class, 'updateProfile']);
        Route::post('/contractor/mark-profile-complete', [ContractorController::class, 'markProfileComplete']);
        Route::get('/contractor/portfolio', [ContractorPortfolioController::class, 'getOwnPortfolio']);
        Route::post('/contractor/portfolio/setup', [ContractorPortfolioController::class, 'setup']);
        Route::post('/contractor/portfolio/projects', [ContractorPortfolioController::class, 'createProject']);
        Route::put('/contractor/portfolio/projects/{projectId}', [ContractorPortfolioController::class, 'updateProject']);
        Route::post('/contractor/portfolio/projects/{projectId}/images', [ContractorPortfolioController::class, 'addImages']);
        Route::delete('/contractor/portfolio/projects/{projectId}/images/{imageId}', [ContractorPortfolioController::class, 'deleteImage']);
        Route::delete('/contractor/portfolio/projects/{projectId}', [ContractorPortfolioController::class, 'deleteProject']);
        Route::get('/contractor/dashboard', [ContractorController::class, 'getDashboard']);
        Route::get('/contractor/bids', [BiddingController::class, 'getContractorBids']);
        Route::get('/projects/construction-jobs', [ProjectController::class, 'constructionJobs']);
        Route::post('/projects/{id}/bids', [BiddingController::class, 'submitBid']);
        Route::post('/projects/{id}/start-construction', [ProjectController::class, 'startConstruction']);
    });

    // Client project routes
    Route::middleware('role:client')->group(function () {
        Route::post('/projects', [ProjectController::class, 'store']);
        Route::get('/projects', [ProjectController::class, 'index']);
        // Intent decoding for the create-project form: called live,
        // before a project exists, so these sit ahead of the store()
        // route rather than nested under /projects/{id}.
        // preview-intent runs spaCy locally (cheap) -- looser limit.
        Route::post('/projects/preview-intent', [ProjectIntentController::class, 'previewIntent'])
            ->middleware('throttle:30,1');
        // transcribe calls the paid OpenAI Whisper API -- tighter limit.
        Route::post('/projects/transcribe', [ProjectIntentController::class, 'transcribe'])
            ->middleware('throttle:10,1');
        Route::put('/projects/{id}', [ProjectController::class, 'update']);
        Route::delete('/projects/{id}', [ProjectController::class, 'destroy']);
        Route::post('/projects/{id}/select-architect', [ProjectController::class, 'selectArchitect']);
        Route::post('/projects/{id}/approve-design', [ProjectController::class, 'approveDesign']);
        Route::post('/projects/{id}/request-revision', [ProjectController::class, 'requestRevision']);
        Route::post('/projects/{id}/post-construction', [ProjectController::class, 'postConstruction']);
        Route::get('/projects/{id}/matches', [MatchingController::class, 'getMatches']);
        Route::get('/projects/{id}/bids', [BiddingController::class, 'getProjectBids']);
        Route::post('/bids/{id}/accept', [BiddingController::class, 'acceptBid']);
        Route::post('/bids/{id}/reject', [BiddingController::class, 'rejectBid']);
    });

    // Architect design routes
    Route::middleware('role:architect')->group(function () {
        Route::post('/projects/{id}/deliver-design', [ProjectController::class, 'deliverDesign']);
    });

    // Design download (accessible to authenticated users - client or architect)
    Route::get('/projects/{id}/design', [ProjectController::class, 'downloadDesign']);

    // Construction completion -- either the selected contractor or the
    // project's client can mark it complete.
    Route::post('/projects/{id}/complete-construction', [ProjectController::class, 'completeConstruction']);

    // Design revisions (accessible to authenticated users - client or architect)
    Route::get('/projects/{id}/revisions', [ProjectController::class, 'getRevisions']);

    // Architect agreement routes
    Route::middleware('role:architect')->group(function () {
        Route::post('/projects/{id}/agreement', [AgreementController::class, 'create']);
        Route::put('/agreements/{id}', [AgreementController::class, 'update']);
        Route::post('/agreements/{id}/finalize', [AgreementController::class, 'finalize']);
    });

    // Agreement routes (accessible to client and architect)
    Route::get('/agreements/pending', [AgreementController::class, 'pending']);
    Route::get('/agreements/{id}', [AgreementController::class, 'show']);
    Route::post('/agreements/{id}/sign', [AgreementController::class, 'sign']);
    Route::middleware('role:client')->post('/agreements/{id}/request-changes', [AgreementController::class, 'requestChanges']);

    // Payment routes - client only for payment creation
    Route::middleware('role:client')->group(function () {
        Route::post('/projects/{id}/payment', [PaymentController::class, 'createPayment']);
    });

    // Payment routes - accessible to payer or payee
    Route::post('/payments/{id}/refund', [PaymentController::class, 'refundPayment']);
    Route::post('/payments/{id}/confirm', [PaymentController::class, 'confirmPayment']);
    Route::get('/payments', [PaymentController::class, 'index']);
    Route::get('/payments/{id}', [PaymentController::class, 'show']);

    // In-app notifications (any authenticated role, scoped to the caller)
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);

    // Budz routes
    Route::get('/budz/packages', [BudzController::class, 'packages']);
    Route::middleware('role:contractor')->group(function () {
        Route::get('/budz/wallet', [BudzController::class, 'wallet']);
        Route::post('/budz/purchase', [BudzController::class, 'purchase']);
        Route::post('/budz/purchase/confirm', [BudzController::class, 'confirmPurchase']);
    });

    // Admin routes (protected by auth.api + role:admin)
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/admin/users', [AdminController::class, 'listUsers']);
        // Single-user detail for the admin View Profile panel.
        // Declared after the collection route so '/admin/users' is not
        // swallowed by the {id} wildcard.
        Route::get('/admin/users/{id}', [AdminController::class, 'getUser']);
        Route::put('/admin/users/{id}/suspend', [AdminController::class, 'suspendUser']);
        Route::put('/admin/users/{id}/activate', [AdminController::class, 'activateUser']);
        Route::delete('/admin/users/{id}', [AdminController::class, 'deleteUser']);
        Route::put('/admin/projects/{id}/status', [AdminController::class, 'setProjectStatus']);

        Route::get('/admin/architects/pending', [AdminController::class, 'pendingArchitects']);
        Route::get('/admin/architects/{id}/review', [AdminController::class, 'reviewArchitect']);
        Route::get('/admin/architects/{id}/document', [AdminController::class, 'viewArchitectDocument']);
        Route::post('/admin/architects/{id}/verify', [AdminController::class, 'verifyArchitect']);
        Route::post('/admin/architects/{id}/reject', [AdminController::class, 'rejectArchitect']);

        Route::get('/admin/contractors/pending', [AdminController::class, 'pendingContractors']);
        Route::get('/admin/contractors/{id}/review', [AdminController::class, 'reviewContractor']);
        Route::get('/admin/contractors/{id}/document', [AdminController::class, 'viewContractorDocument']);
        Route::post('/admin/contractors/{id}/verify', [AdminController::class, 'verifyContractor']);
        Route::post('/admin/contractors/{id}/reject', [AdminController::class, 'rejectContractor']);
        
        Route::get('/admin/analytics', [AdminController::class, 'analytics']);
        Route::get('/admin/logs', [AdminController::class, 'logs']);
    });

    // Project detail route (accessible by any authenticated user with proper authorization)
    Route::get('/projects/{id}', [ProjectController::class, 'show']);

    // Chat routes
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/conversations', [ConversationController::class, 'store']);
    Route::get('/conversations/{id}', [ConversationController::class, 'show']);
    Route::get('/conversations/{id}/messages', [MessageController::class, 'index']);
    Route::post('/conversations/{id}/messages', [MessageController::class, 'store']);
    Route::post('/conversations/{id}/read', [MessageController::class, 'markRead']);
    Route::delete('/conversations/{id}', [ConversationController::class, 'destroy']);
    Route::get('/messages/unread-count', [ConversationController::class, 'unreadCount']);

    // Backward compatibility for existing frontend code paths.
    Route::get('/chat/conversations', [ConversationController::class, 'index']);
    Route::post('/chat/conversations/start', [ConversationController::class, 'store']);
    Route::get('/chat/unread-count', [ConversationController::class, 'unreadCount']);
    Route::get('/chat/conversations/{id}/messages', [MessageController::class, 'index']);
    Route::post('/chat/conversations/{id}/messages', [MessageController::class, 'store']);
    Route::post('/chat/conversations/{id}/read', [MessageController::class, 'markRead']);

    // Review routes
    Route::post('/reviews', [ReviewController::class, 'store']);
    Route::get('/reviews/can-review', [ReviewController::class, 'canReview']);
    Route::get('/projects/{id}/reviews', [ReviewController::class, 'projectReviews']);
});
