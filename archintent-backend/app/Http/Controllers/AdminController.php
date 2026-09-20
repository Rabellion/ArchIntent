<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Architect;
use App\Models\Contractor;
use App\Models\AdminLog;
use App\Models\BudzWallet;
use App\Models\BudzTransaction;
use App\Models\Project;
use App\Models\Bid;
use App\Models\Payment;
use App\Models\Review;
use App\Helpers\AdminHelper;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AdminController extends Controller
{
    /**
     * GET /api/admin/dashboard
     * Return admin dashboard statistics
     */
    public function dashboard(): JsonResponse
    {
        try {
            // Total users count
            $totalUsers = User::count();

            // Total profiles by role
            $totalArchitects = Architect::count();
            $totalContractors = Contractor::count();

            // Users by role
            $usersByRole = User::selectRaw('role, COUNT(*) as count')
                ->groupBy('role')
                ->pluck('count', 'role')
                ->toArray();

            // Pending architect verifications
            $pendingArchitects = Architect::where('verification_status', 'pending')
                ->whereHas('user', function ($query) {
                    $query->where('profile_completed', true);
                })
                ->count();

            // Pending contractor verifications
            $pendingContractors = Contractor::where('verification_status', 'pending')
                ->whereHas('user', function ($query) {
                    $query->where('profile_completed', true);
                })
                ->count();

            // Active projects (not completed or created)
            $activeProjects = Project::whereNotIn('project_status', ['completed', 'created'])
                ->count();

            // ---------------------------------------------------------
            //  REVENUE
            //
            //  Two different numbers, deliberately kept apart:
            //
            //  GROSS VOLUME  - everything clients paid through the
            //    platform. Most of this is passed straight through to
            //    architects; it is NOT money the platform earns.
            //
            //  PLATFORM EARNINGS - what the platform actually keeps:
            //      1. the commission taken from each design payment
            //         (payments.platform_fee), and
            //      2. Budz credit sales, which contractors buy from the
            //         platform outright, so the full price is earned.
            //
            //  The dashboard headline must show PLATFORM EARNINGS.
            //  Reporting gross as "revenue" overstates income by
            //  roughly the inverse of the commission rate.
            // ---------------------------------------------------------
            $grossPaymentVolume = Payment::where('payment_status', 'completed')
                ->sum('amount') ?? 0;

            $designCommission = Payment::where('payment_status', 'completed')
                ->sum('platform_fee') ?? 0;

            // Budz revenue: each 'purchase' row references the package
            // bought, and the package carries the PKR price.
            $budzSales = BudzTransaction::where('budz_transactions.transaction_type', 'purchase')
                ->join('budz_packages', 'budz_packages.package_id', '=', 'budz_transactions.reference_id')
                ->sum('budz_packages.price_pkr') ?? 0;

            $platformEarnings = (float) $designCommission + (float) $budzSales;

            // Kept for backward compatibility with any existing caller.
            $totalRevenue = $grossPaymentVolume;
            $totalPlatformFees = $designCommission;

            // Recent logs with admin info
            $recentLogs = AdminLog::with('admin:user_id,full_name')
                ->orderByDesc('log_time')
                ->limit(20)
                ->get()
                ->map(function ($log) {
                    return [
                        'log_id' => $log->log_id,
                        'admin_name' => $log->admin->full_name ?? 'Unknown',
                        'action' => $log->action,
                        'target_table' => $log->target_table,
                        'target_id' => $log->target_id,
                        'description' => $log->description,
                        'created_at' => $log->log_time,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'total_users' => $totalUsers,
                    'total_architects' => $totalArchitects,
                    'total_contractors' => $totalContractors,
                    'users_by_role' => $usersByRole,
                    'pending_architect_verifications' => $pendingArchitects,
                    'pending_contractor_verifications' => $pendingContractors,
                    'active_projects' => $activeProjects,
                    // What the platform actually earned -- show this as
                    // "Revenue" on the dashboard.
                    'platform_earnings' => round($platformEarnings, 2),
                    'earnings_breakdown' => [
                        'design_commission' => round((float) $designCommission, 2),
                        'budz_sales' => round((float) $budzSales, 2),
                    ],
                    // Money that moved through the platform, most of it
                    // paid out to architects. Context, not income.
                    'gross_payment_volume' => round((float) $grossPaymentVolume, 2),

                    // Deprecated aliases, kept so nothing breaks.
                    'total_revenue' => $totalRevenue,
                    'total_platform_fees' => (float) $totalPlatformFees,
                    'platform_fee_percent' => (float) config('payment.platform_fee_percent', 0),
                    'recent_logs' => $recentLogs,
                ],
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard data',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/users
     * List users with pagination and filtering
     */
    public function listUsers(Request $request): JsonResponse
    {
        try {
            $role = $request->query('role');
            $accountStatus = $request->query('account_status');
            $page = $request->query('page', 1);
            $perPage = 20;

            $query = User::query();

            // Filter by role
            if ($role && $role !== 'all') {
                $query->where('role', $role);
            }

            // Filter by account status
            if ($accountStatus && $accountStatus !== 'all') {
                $query->where('account_status', $accountStatus);
            }

            // Include role-specific records
            if ($role === 'architect' || $role === null) {
                $query->with('architect');
            }
            if ($role === 'contractor' || $role === null) {
                $query->with('contractor');
            }

            // Paginate
            $users = $query->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'data' => $users->items(),
                'pagination' => [
                    'current_page' => $users->currentPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                    'last_page' => $users->lastPage(),
                ],
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch users',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/users/{id}
     * Single user detail for the admin "View Profile" panel.
     *
     * The frontend called this endpoint but neither the route nor this
     * method existed, so View Profile always failed with "Failed to
     * load user details".
     *
     * Returns a flat shape rather than nested relations because the
     * panel reads role-specific fields (specialization, company_name,
     * ...) directly off the user object. Sensitive columns are never
     * included: no password hash, no raw identity number, no OTP.
     */
    public function getUser($userId): JsonResponse
    {
        try {
            $user = User::with(['architect', 'contractor'])->findOrFail($userId);

            $details = [
                'user_id' => $user->user_id,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'phone' => $user->phone_number,
                'role' => $user->role,
                'status' => $user->account_status,
                'profile_image' => $user->profile_image,
                'profile_completed' => (bool) $user->profile_completed,
                'created_at' => $user->created_at,
                // Presence only -- the identity number itself is not exposed.
                'identity_type' => $user->identity_type,
                'identity_provided' => !empty($user->identity_number),
            ];

            if ($user->role === 'architect' && $user->architect) {
                $details['verification_status'] = $user->architect->verification_status;
                $details['specialization'] = $user->architect->specialization;
                $details['experience'] = $user->architect->experience_years !== null
                    ? $user->architect->experience_years . ' years'
                    : null;
                $details['bio'] = $user->architect->bio;
                $details['city'] = $user->architect->city;
            }

            if ($user->role === 'contractor' && $user->contractor) {
                $details['verification_status'] = $user->contractor->verification_status;
                $details['company_name'] = $user->contractor->company_name;
                // DB column is registration_number; the admin panel reads
                // company_registration, so map it here.
                $details['company_registration'] = $user->contractor->registration_number;
                $details['city'] = $user->contractor->city;
            }

            return response()->json([
                'success' => true,
                'data' => $details,
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch user details',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/admin/users/{id}/suspend
     * Suspend a user account
     */
    public function suspendUser($userId): JsonResponse
    {
        try {
            $user = User::findOrFail($userId);
            $user->update(['account_status' => 'suspended']);

            // Log action
            AdminHelper::logAction(
                auth()->user()->user_id,
                'suspend_user',
                'users',
                $userId,
                "Suspended user: {$user->full_name}"
            );

            return response()->json([
                'success' => true,
                'message' => 'User suspended successfully',
                'data' => $user,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to suspend user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/admin/users/{id}/activate
     * Activate a user account
     */
    public function activateUser($userId): JsonResponse
    {
        try {
            $user = User::findOrFail($userId);
            $user->update(['account_status' => 'active']);

            // Log action
            AdminHelper::logAction(
                auth()->user()->user_id,
                'activate_user',
                'users',
                $userId,
                "Activated user: {$user->full_name}"
            );

            return response()->json([
                'success' => true,
                'message' => 'User activated successfully',
                'data' => $user,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to activate user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/admin/users/{id}
     * Soft delete a user
     */
    public function deleteUser($userId): JsonResponse
    {
        try {
            $user = User::findOrFail($userId);
            $userName = $user->full_name;
            $user->delete();

            // Log action
            AdminHelper::logAction(
                auth()->user()->user_id,
                'delete_user',
                'users',
                $userId,
                "Deleted user: {$userName}"
            );

            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/architects/pending
     * Get pending architect verifications
     */
    public function pendingArchitects(): JsonResponse
    {
        try {
            $architects = Architect::where('verification_status', 'pending')
                ->whereHas('user', function ($query) {
                    $query->where('profile_completed', true);
                })
                ->with('user:user_id,full_name,email,phone_number,profile_image')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $architects,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch pending architects',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/architects/{id}/review
     * Single pending architect application for admin detail page
     */
    public function reviewArchitect($architectId): JsonResponse
    {
        try {
            $architect = Architect::with([
                'user',
                'portfolio.projects.images',
            ])->findOrFail($architectId);

            if ($architect->verification_status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'This application is not pending verification',
                ], 404);
            }

            if (!$architect->user || !$architect->user->profile_completed) {
                return response()->json([
                    'success' => false,
                    'message' => 'Application not found or profile incomplete',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $architect,
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Architect not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load architect review',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/admin/architects/{id}/verify
     * Verify an architect
     */
    public function verifyArchitect($architectId): JsonResponse
    {
        try {
            $architect = Architect::findOrFail($architectId);
            $architect->update(['verification_status' => 'verified']);

            // Activate user
            User::where('user_id', $architect->user_id)
                ->update(['account_status' => 'active']);

            // Log action
            AdminHelper::logAction(
                auth()->user()->user_id,
                'verify_architect',
                'architects',
                $architectId,
                "Verified architect ID: {$architectId}"
            );

            $architect->load('user');

            return response()->json([
                'success' => true,
                'message' => 'Architect verified successfully',
                'data' => $architect,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to verify architect',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/architects/{id}/document
     * Stream architect verification document for admin review
     */
    public function viewArchitectDocument($architectId)
    {
        try {
            $architect = Architect::findOrFail($architectId);

            if (!$architect->verification_document) {
                return response()->json([
                    'success' => false,
                    'message' => 'No verification document found for this architect',
                ], 404);
            }

            $rawPath = ltrim($architect->verification_document, '/');
            $candidates = [
                $rawPath,
                'verifications/' . basename($rawPath),
                'public/verifications/' . basename($rawPath),
            ];

            $filePath = null;
            $sourceDisk = null;
            foreach ($candidates as $candidate) {
                if (Storage::disk('public')->exists($candidate)) {
                    $filePath = $candidate;
                    $sourceDisk = 'public';
                    break;
                }

                if (Storage::exists($candidate)) {
                    $filePath = $candidate;
                    $sourceDisk = 'local';
                    break;
                }
            }

            if (!$filePath) {
                return response()->json([
                    'success' => false,
                    'message' => 'Verification document file not found',
                ], 404);
            }

            if ($sourceDisk === 'public') {
                $content = Storage::disk('public')->get($filePath);
                $mimeType = Storage::disk('public')->mimeType($filePath) ?? 'application/octet-stream';
            } else {
                $content = Storage::get($filePath);
                $mimeType = Storage::mimeType($filePath) ?? 'application/octet-stream';
            }
            $filename = basename($filePath);

            return response($content, 200, [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'inline; filename="' . $filename . '"',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to open verification document',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/admin/architects/{id}/reject
     * Reject an architect verification
     */
    public function rejectArchitect($architectId, Request $request): JsonResponse
    {
        try {
            $request->validate([
                'reason' => 'required|string|min:10',
            ]);

            $architect = Architect::findOrFail($architectId);
            $architect->update([
                'verification_status' => 'rejected',
                'rejection_reason' => $request->reason,
            ]);

            // Log action
            AdminHelper::logAction(
                auth()->user()->user_id,
                'reject_architect',
                'architects',
                $architectId,
                "Rejected architect: {$request->reason}"
            );

            $architect->load('user');

            return response()->json([
                'success' => true,
                'message' => 'Architect rejected successfully',
                'data' => $architect,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject architect',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/contractors/pending
     * Get pending contractor verifications
     */
    public function pendingContractors(): JsonResponse
    {
        try {
            $contractors = Contractor::where('verification_status', 'pending')
                ->whereHas('user', function ($query) {
                    $query->where('profile_completed', true);
                })
                ->with('user:user_id,full_name,email,phone_number,profile_image')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $contractors,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch pending contractors',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/contractors/{id}/review
     * Single pending contractor application for admin detail page
     */
    public function reviewContractor($contractorId): JsonResponse
    {
        try {
            $contractor = Contractor::with([
                'user',
                'portfolio.projects.images',
            ])->findOrFail($contractorId);

            if ($contractor->verification_status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'This application is not pending verification',
                ], 404);
            }

            if (!$contractor->user || !$contractor->user->profile_completed) {
                return response()->json([
                    'success' => false,
                    'message' => 'Application not found or profile incomplete',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $contractor,
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Contractor not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load contractor review',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/contractors/{id}/document
     * Stream contractor verification document for admin review
     */
    public function viewContractorDocument($contractorId)
    {
        try {
            $contractor = Contractor::findOrFail($contractorId);

            if (!$contractor->verification_document) {
                return response()->json([
                    'success' => false,
                    'message' => 'No verification document found for this contractor',
                ], 404);
            }

            $rawPath = ltrim($contractor->verification_document, '/');
            $candidates = [
                $rawPath,
                'verifications/contractors/' . basename($rawPath),
                'verifications/' . basename($rawPath),
                'public/verifications/' . basename($rawPath),
            ];

            $filePath = null;
            $sourceDisk = null;
            foreach ($candidates as $candidate) {
                if (Storage::disk('public')->exists($candidate)) {
                    $filePath = $candidate;
                    $sourceDisk = 'public';
                    break;
                }

                if (Storage::exists($candidate)) {
                    $filePath = $candidate;
                    $sourceDisk = 'local';
                    break;
                }
            }

            if (!$filePath) {
                return response()->json([
                    'success' => false,
                    'message' => 'Verification document file not found',
                ], 404);
            }

            if ($sourceDisk === 'public') {
                $content = Storage::disk('public')->get($filePath);
                $mimeType = Storage::disk('public')->mimeType($filePath) ?? 'application/octet-stream';
            } else {
                $content = Storage::get($filePath);
                $mimeType = Storage::mimeType($filePath) ?? 'application/octet-stream';
            }
            $filename = basename($filePath);

            return response($content, 200, [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'inline; filename="' . $filename . '"',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to open verification document',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/admin/contractors/{id}/verify
     * Verify a contractor
     */
    public function verifyContractor($contractorId): JsonResponse
    {
        try {
            $contractor = Contractor::findOrFail($contractorId);

            DB::transaction(function () use ($contractor) {
                $contractor->update(['verification_status' => 'verified']);

                // Activate user
                User::where('user_id', $contractor->user_id)
                    ->update(['account_status' => 'active']);

                // Create wallet if missing
                $wallet = BudzWallet::firstOrCreate(
                    ['contractor_id' => $contractor->contractor_id],
                    ['balance' => 0, 'total_purchased' => 0]
                );

                // Welcome bonus only once
                $alreadyReceivedBonus = BudzTransaction::where('contractor_id', $contractor->contractor_id)
                    ->where('description', 'Welcome bonus Budz')
                    ->exists();

                if (!$alreadyReceivedBonus) {
                    $wallet->balance += 10;
                    $wallet->total_purchased += 10;
                    $wallet->save();

                    BudzTransaction::create([
                        'contractor_id' => $contractor->contractor_id,
                        'transaction_type' => 'purchase',
                        'budz_amount' => 10,
                        'balance_after' => $wallet->balance,
                        'description' => 'Welcome bonus Budz',
                        'reference_id' => $contractor->contractor_id,
                        'created_at' => now(),
                    ]);
                }
            });

            // Log action
            AdminHelper::logAction(
                auth()->user()->user_id,
                'verify_contractor',
                'contractors',
                $contractorId,
                "Verified contractor ID: {$contractorId}"
            );

            $contractor->load('user');

            return response()->json([
                'success' => true,
                'message' => 'Contractor verified successfully',
                'data' => $contractor,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to verify contractor',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/admin/contractors/{id}/reject
     * Reject a contractor verification
     */
    public function rejectContractor($contractorId, Request $request): JsonResponse
    {
        try {
            $request->validate([
                'reason' => 'required|string|min:10',
            ]);

            $contractor = Contractor::findOrFail($contractorId);
            $contractor->update([
                'verification_status' => 'rejected',
                'rejection_reason' => $request->reason,
            ]);

            // Log action
            AdminHelper::logAction(
                auth()->user()->user_id,
                'reject_contractor',
                'contractors',
                $contractorId,
                "Rejected contractor: {$request->reason}"
            );

            $contractor->load('user');

            return response()->json([
                'success' => true,
                'message' => 'Contractor rejected successfully',
                'data' => $contractor,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject contractor',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/analytics
     * Advanced analytics with date filtering
     */
    public function analytics(Request $request): JsonResponse
    {
        try {
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');

            // Registrations by date
            $registrationsByDate = User::selectRaw('DATE(created_at) as date, COUNT(*) as count')
                ->when($startDate, fn($q) => $q->whereDate('created_at', '>=', $startDate))
                ->when($endDate, fn($q) => $q->whereDate('created_at', '<=', $endDate))
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->map(fn($row) => [
                    'date' => $row->date,
                    'count' => (int) $row->count,
                ])
                ->values();

            // Projects by status
            $projectsByStatus = Project::selectRaw('project_status as status, COUNT(*) as count')
                ->groupBy('project_status')
                ->get()
                ->map(fn($row) => [
                    'status' => $row->status,
                    'count' => (int) $row->count,
                ])
                ->values();

            $completedPaymentsBase = function () use ($startDate, $endDate) {
                return Payment::query()
                    ->where('payment_status', 'completed')
                    ->when($startDate, fn($q) => $q->whereDate('created_at', '>=', $startDate))
                    ->when($endDate, fn($q) => $q->whereDate('created_at', '<=', $endDate));
            };

            // Revenue by month (gross client payments)
            $revenueByMonth = $completedPaymentsBase()
                ->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, SUM(platform_fee) as amount')
                ->groupBy('month')
                ->orderBy('month')
                ->get()
                ->map(fn($row) => [
                    'month' => $row->month,
                    'amount' => (float) $row->amount,
                ])
                ->values();

            $platformFeeSummary = [
                'gross_completed' => (float) ($completedPaymentsBase()->sum('amount') ?? 0),
                'platform_fees' => (float) ($completedPaymentsBase()->sum('platform_fee') ?? 0),
                'net_to_payees' => (float) ($completedPaymentsBase()->sum('payee_amount') ?? 0),
                'platform_fee_percent' => (float) config('payment.platform_fee_percent', 0),
            ];

            // Top architects (by completed projects)
            $topArchitects = Architect::with('user:user_id,full_name')
                ->get()
                ->map(function($arch) {
                    // Count completed projects for this architect
                    $completedCount = Project::where('selected_architect_id', $arch->architect_id)
                        ->where('project_status', 'completed')
                        ->count();

                    $totalEarned = Payment::where('payee_id', $arch->user_id)
                        ->where('payment_status', 'completed')
                        ->sum('payee_amount');
                    
                    return [
                        'architect_id' => $arch->architect_id,
                        'full_name' => $arch->user->full_name ?? 'Unknown',
                        'completed_projects' => $completedCount,
                        'total_earned' => (float) $totalEarned,
                    ];
                })
                ->sortByDesc('completed_projects')
                ->sortByDesc('total_earned')
                ->take(5)
                ->values();

            // Top contractors (by won bids)
            $topContractors = Contractor::with('user:user_id,full_name')
                ->get()
                ->map(function ($cont) {
                    $bidsTotal = Bid::where('contractor_id', $cont->contractor_id)->count();
                    $bidsWon = Bid::where('contractor_id', $cont->contractor_id)
                        ->where('bid_status', 'accepted')
                        ->count();

                    return [
                        'contractor_id' => $cont->contractor_id,
                        'company_name' => $cont->company_name ?: ($cont->user->full_name ?? 'Unknown'),
                        'bids_won' => (int) $bidsWon,
                        'win_rate' => $bidsTotal > 0 ? ($bidsWon / $bidsTotal) : 0,
                    ];
                })
                ->sortByDesc('bids_won')
                ->take(5)
                ->values();

            // Reviews analytics
            $reviewsBaseQuery = Review::query()
                ->when($startDate, fn($q) => $q->whereDate('created_at', '>=', $startDate))
                ->when($endDate, fn($q) => $q->whereDate('created_at', '<=', $endDate));

            $averagePlatformRating = round((float) ($reviewsBaseQuery->avg('rating') ?? 0), 2);
            $totalReviewsSubmitted = (int) (clone $reviewsBaseQuery)->count();

            $reviewsByMonth = Review::selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) as count')
                ->when($startDate, fn($q) => $q->whereDate('created_at', '>=', $startDate))
                ->when($endDate, fn($q) => $q->whereDate('created_at', '<=', $endDate))
                ->groupBy('month')
                ->orderBy('month')
                ->get()
                ->map(fn($row) => [
                    'month' => $row->month,
                    'count' => (int) $row->count,
                ])
                ->values();

            $topRatedArchitects = Architect::with('user:user_id,full_name')
                ->get()
                ->map(function ($architect) {
                    $reviewQuery = Review::where('reviewee_id', $architect->user_id)
                        ->where('reviewee_type', 'architect');

                    $reviewsCount = (int) $reviewQuery->count();
                    $averageRating = round((float) ($reviewQuery->avg('rating') ?? 0), 2);

                    return [
                        'architect_id' => $architect->architect_id,
                        'full_name' => $architect->user?->full_name ?? 'Unknown',
                        'average_rating' => $averageRating,
                        'reviews_count' => $reviewsCount,
                    ];
                })
                ->filter(fn($architect) => $architect['reviews_count'] >= 3)
                ->sortByDesc('average_rating')
                ->take(5)
                ->values();

            $topRatedContractors = Contractor::with('user:user_id,full_name')
                ->get()
                ->map(function ($contractor) {
                    $reviewQuery = Review::where('reviewee_id', $contractor->user_id)
                        ->where('reviewee_type', 'contractor');

                    $reviewsCount = (int) $reviewQuery->count();
                    $averageRating = round((float) ($reviewQuery->avg('rating') ?? 0), 2);

                    return [
                        'contractor_id' => $contractor->contractor_id,
                        'company_name' => $contractor->company_name ?: ($contractor->user?->full_name ?? 'Unknown'),
                        'average_rating' => $averageRating,
                        'reviews_count' => $reviewsCount,
                    ];
                })
                ->filter(fn($contractor) => $contractor['reviews_count'] >= 3)
                ->sortByDesc('average_rating')
                ->take(5)
                ->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'registrations_by_date' => $registrationsByDate,
                    'projects_by_status' => $projectsByStatus,
                    'revenue_by_month' => $revenueByMonth,
                    'platform_fee_summary' => $platformFeeSummary,
                    'top_architects' => $topArchitects,
                    'top_contractors' => $topContractors,
                    'reviews' => [
                        'average_platform_rating' => $averagePlatformRating,
                        'total_reviews_submitted' => $totalReviewsSubmitted,
                        'top_rated_architects' => $topRatedArchitects,
                        'top_rated_contractors' => $topRatedContractors,
                        'reviews_by_month' => $reviewsByMonth,
                    ],
                ],
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch analytics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/logs
     * Get admin activity logs with filtering and pagination
     */
    public function logs(Request $request): JsonResponse
    {
        try {
            $adminId = $request->query('admin_id');
            $action = $request->query('action');
            $targetTable = $request->query('target_table');
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');
            $page = $request->query('page', 1);
            $perPage = 25;

            $query = AdminLog::with('admin:user_id,full_name');

            // Filter by admin
            if ($adminId) {
                $query->where('admin_id', $adminId);
            }

            // Filter by action (LIKE search)
            if ($action) {
                $query->where('action', 'LIKE', "%{$action}%");
            }

            // Filter by target table
            if ($targetTable) {
                $query->where('target_table', $targetTable);
            }

            // Filter by date range
            if ($startDate) {
                $query->whereDate('log_time', '>=', $startDate);
            }
            if ($endDate) {
                $query->whereDate('log_time', '<=', $endDate);
            }

            // Order by log_time DESC and paginate
            $logs = $query->orderByDesc('log_time')
                ->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'data' => $logs->items(),
                'pagination' => [
                    'current_page' => $logs->currentPage(),
                    'per_page' => $logs->perPage(),
                    'total' => $logs->total(),
                    'last_page' => $logs->lastPage(),
                ],
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch logs',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
