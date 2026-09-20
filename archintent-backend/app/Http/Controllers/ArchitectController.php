<?php

namespace App\Http\Controllers;

use App\Models\Architect;
use App\Models\Agreement;
use App\Models\Payment;
use App\Models\Project;
use App\Models\ProjectMatch;
use App\Models\Portfolio;
use App\Models\PortfolioImage;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ArchitectController extends Controller
{
    /**
     * GET /api/architect/profile
     * Fetch current architect profile
     */
    public function getProfile(Request $request)
    {
        $user = auth()->user();
        $architect = Architect::where('user_id', $user->user_id)->first();

        if (!$architect) {
            return response()->json([
                'success' => false,
                'message' => 'Architect profile not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $architect,
        ]);
    }

    /**
     * POST /api/architect/profile
     * Update architect profile with new required fields and optional verification
     */
    public function updateProfile(Request $request)
    {
        $user = auth()->user();
        $architect = Architect::firstOrCreate(
            ['user_id' => $user->user_id],
            ['verification_status' => 'pending']
        );

        $validated = $request->validate([
            // ── Required core fields ────────────────────────────────────
            'license_number'  => 'required|string|max:255',
            'cnic'            => 'required|string|max:20',
            'city'            => 'required|string|max:100',
            'design_types'    => 'required|array|min:1',
            'design_types.*'  => 'string|max:100',
            'experience_years'=> 'required|integer|min:0',
            'specialization'  => 'required|string|max:255',
            'bio'             => 'required|string|max:1000',

            // Primary verification document
            'verification_document' => 'sometimes|nullable|file|mimes:pdf,doc,docx|max:5120',

            // ── Optional PCATP verification ─────────────────────────────
            'pcatp_number'   => 'nullable|string|max:50',
            'pcatp_document' => 'nullable|file|mimes:pdf,doc,docx|max:5120',

            // ── Optional NTN ────────────────────────────────────────────
            'ntn_number'     => 'nullable|string|max:20',
            'ntn_document'   => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

        // ── Handle all document uploads ───────────────────────────────
        $docFields = [
            'verification_document' => 'verifications',
            'pcatp_document'        => 'verifications/architects/pcatp',
            'ntn_document'          => 'verifications/architects/ntn',
        ];

        foreach ($docFields as $field => $folder) {
            if ($request->hasFile($field)) {
                $file = $request->file($field);
                $ext  = $file->getClientOriginalExtension();
                $filename = "{$architect->architect_id}_{$field}.{$ext}";

                // Delete old file
                if ($architect->$field) {
                    Storage::disk('public')->delete("{$folder}/{$architect->$field}");
                }

                $file->storeAs($folder, $filename, 'public');
                $validated[$field] = $filename;
            }
        }

        // Don't overwrite existing docs if no new upload
        foreach (array_keys($docFields) as $field) {
            if (!isset($validated[$field])) {
                unset($validated[$field]);
            }
        }

        // Update architect record
        $architect->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data'    => $architect,
        ]);
    }


    /**
     * GET /api/architect/portfolio
     * Get architect's portfolio with all images
     */
    public function getPortfolio(Request $request)
    {
        $user = auth()->user();
        $architect = Architect::firstOrCreate(
            ['user_id' => $user->user_id],
            ['verification_status' => 'pending']
        );

        $portfolio = Portfolio::with('images')
            ->where('architect_id', $architect->architect_id)
            ->first();

        return response()->json([
            'success' => true,
            'data' => $portfolio,
        ]);
    }

    /**
     * POST /api/architect/portfolio
     * Create new portfolio with images
     */
    public function createPortfolio(Request $request)
    {
        $user = auth()->user();
        $architect = Architect::firstOrCreate(
            ['user_id' => $user->user_id],
            ['verification_status' => 'pending']
        );

        // Check if portfolio already exists
        $existingPortfolio = Portfolio::where('architect_id', $architect->architect_id)->first();
        if ($existingPortfolio) {
            return response()->json([
                'success' => false,
                'message' => 'Architect can only have one portfolio',
            ], 422);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'style_tags' => 'required|array|min:1',
            'style_tags.*' => 'string|max:50',
            'budget_min' => 'required|numeric|min:0',
            'budget_max' => 'required|numeric|min:0|gte:budget_min',
            'visibility' => 'sometimes|in:public,private',
            'images' => 'required|array|min:1|max:10',
            'images.*' => 'file|image|mimes:jpeg,png|max:5120',
        ]);

        // Create portfolio
        $portfolio = Portfolio::create([
            'architect_id' => $architect->architect_id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'style_tags' => $validated['style_tags'],
            'budget_min' => $validated['budget_min'],
            'budget_max' => $validated['budget_max'],
            'visibility' => 'public',
        ]);

        // Store images
        $images = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $filename = uniqid() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs("public/portfolios/{$portfolio->portfolio_id}", $filename);

                $portfolioImage = PortfolioImage::create([
                    'portfolio_id' => $portfolio->portfolio_id,
                    'image_path' => $filename,
                    'uploaded_at' => now(),
                ]);

                $images[] = $portfolioImage;
            }
        }

        $portfolio->load('images');

        return response()->json([
            'success' => true,
            'message' => 'Portfolio created successfully',
            'data' => $portfolio,
        ], 201);
    }

    /**
     * PUT /api/architect/portfolio/{portfolio_id}
     * Update portfolio and optionally add new images
     */
    public function updatePortfolio(Request $request, $portfolioId)
    {
        $user = auth()->user();
        $architect = Architect::firstOrCreate(
            ['user_id' => $user->user_id],
            ['verification_status' => 'pending']
        );

        $portfolio = Portfolio::findOrFail($portfolioId);

        // Authorize
        if ($portfolio->architect_id !== $architect->architect_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string|max:5000',
            'style_tags' => 'sometimes|array|min:1',
            'style_tags.*' => 'string|max:50',
            'budget_min' => 'sometimes|numeric|min:0',
            'budget_max' => 'sometimes|numeric|min:0',
            'visibility' => 'sometimes|in:public,private',
            'images' => 'sometimes|array|max:10',
            'images.*' => 'file|image|mimes:jpeg,png|max:5120',
        ]);

        // Check if new images would exceed limit
        if ($request->hasFile('images')) {
            $currentImageCount = PortfolioImage::where('portfolio_id', $portfolio->portfolio_id)->count();
            $newImageCount = count($request->file('images'));

            if ($currentImageCount + $newImageCount > 10) {
                return response()->json([
                    'success' => false,
                    'message' => 'Total images cannot exceed 10',
                ], 422);
            }

            // Store new images
            foreach ($request->file('images') as $file) {
                $filename = uniqid() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs("public/portfolios/{$portfolio->portfolio_id}", $filename);

                PortfolioImage::create([
                    'portfolio_id' => $portfolio->portfolio_id,
                    'image_path' => $filename,
                    'uploaded_at' => now(),
                ]);
            }
        }

        // Update portfolio fields
        $updateData = [
            'title' => $validated['title'] ?? $portfolio->title,
            'description' => $validated['description'] ?? $portfolio->description,
            'style_tags' => $validated['style_tags'] ?? $portfolio->style_tags,
            'budget_min' => $validated['budget_min'] ?? $portfolio->budget_min,
            'budget_max' => $validated['budget_max'] ?? $portfolio->budget_max,
            'visibility' => $validated['visibility'] ?? $portfolio->visibility,
        ];

        $portfolio->update($updateData);
        $portfolio->load('images');

        return response()->json([
            'success' => true,
            'message' => 'Portfolio updated successfully',
            'data' => $portfolio,
        ]);
    }

    /**
     * DELETE /api/architect/portfolio/{portfolio_id}/image/{image_id}
     * Delete a specific image from portfolio
     */
    public function deleteImage(Request $request, $portfolioId, $imageId)
    {
        $user = auth()->user();
        $architect = Architect::firstOrCreate(
            ['user_id' => $user->user_id],
            ['verification_status' => 'pending']
        );

        $portfolio = Portfolio::findOrFail($portfolioId);

        // Authorize
        if ($portfolio->architect_id !== $architect->architect_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $image = PortfolioImage::where('image_id', $imageId)
            ->where('portfolio_id', $portfolioId)
            ->firstOrFail();

        // Delete file from storage
        Storage::delete("public/portfolios/{$portfolio->portfolio_id}/{$image->image_path}");

        // Delete record
        $image->delete();

        return response()->json([
            'success' => true,
            'message' => 'Image deleted successfully',
        ]);
    }

    /**
     * GET /api/architects?specialization=&experience_years=
     * Public endpoint - Get verified architects with public portfolios
     */
    public function listArchitects(Request $request)
    {
        $query = Architect::with(['user', 'portfolio.images'])
            ->where('verification_status', 'verified');

        // Filter by specialization
        if ($request->has('specialization')) {
            $query->where('specialization', $request->input('specialization'));
        }

        // Filter by minimum experience
        if ($request->has('experience_years')) {
            $query->whereRaw('experience_years >= ?', [$request->input('experience_years')]);
        }

        // Filter by public portfolios only
        $query->whereHas('portfolio', function ($q) {
            $q->where('visibility', 'public');
        });

        $architects = $query->paginate(12);

        // Add thumbnail
        $architects->getCollection()->transform(function ($architect) {
            $architect->thumbnail = $architect->portfolio?->images?->first()?->image_path;
            return $architect;
        });

        return response()->json([
            'success' => true,
            'data' => $architects,
        ]);
    }

    /**
     * GET /api/architect/dashboard
     * Authenticated endpoint - Get architect dashboard stats and projects
     */
    public function getDashboard(Request $request)
    {
        $user = auth()->user()->load('architect.portfolio.projects.images');
        $architect = $user->architect;

        if (!$architect) {
            return response()->json([
                'success' => false,
                'message' => 'Architect profile not found',
            ], 404);
        }

        $architect->load('portfolio.projects.images');

        // Check individual profile fields
        $has_license = !empty($architect->license_number);
        $has_bio = !empty($architect->bio);
        $has_portfolio = $architect->portfolio !== null;
        $has_verification_document = !empty($architect->verification_document);
        $experience_filled = $architect->experience_years !== null && $architect->experience_years >= 0;
        $specialization_filled = !empty($architect->specialization);

        // Profile is complete when all required fields are set
        $is_complete = $has_license && $has_bio && $has_portfolio && $has_verification_document && $experience_filled && $specialization_filled;

        // Calculate profile completion percentage
        $profileFields = [
            'license_number',
            'experience_years',
            'specialization',
            'bio',
            'verification_document',
        ];

        $completedFields = 0;
        foreach ($profileFields as $field) {
            if ($field === 'experience_years') {
                // experience_years is valid if it's not null and >= 0
                if ($architect->$field !== null && $architect->$field >= 0) {
                    $completedFields++;
                }
            } else {
                // For other fields, check if not empty
                if (!empty($architect->$field)) {
                    $completedFields++;
                }
            }
        }
        $profileCompletion = min(100, ($completedFields / count($profileFields)) * 100);

        // Get all active projects where this architect is selected
        $activeProjects = Project::where('selected_architect_id', $architect->architect_id)
            ->whereNotIn('project_status', ['completed'])
            ->with(['client:user_id,full_name', 'revisions'])
            ->select('project_id', 'project_title', 'project_type', 'project_status', 'budget', 'location', 'client_id', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($project) {
                $pendingRevisions = $project->revisions->where('revision_status', 'pending')->values();
                return [
                    'project_id' => $project->project_id,
                    'project_title' => $project->project_title,
                    'project_type' => $project->project_type,
                    'project_status' => $project->project_status,
                    'budget' => $project->budget,
                    'location' => $project->location,
                    'client_name' => $project->client->full_name ?? 'Unknown Client',
                    'created_at' => $project->created_at,
                    'pending_revisions' => $pendingRevisions,
                    'pending_revisions_count' => $pendingRevisions->count(),
                ];
            });

        $completed_projects_count = Project::where('selected_architect_id', $architect->architect_id)
            ->where('project_status', 'completed')
            ->count();

        $active_projects_count = $activeProjects->count();

        // Get earnings
        $total_earned = Payment::where('payee_id', $user->user_id)
            ->where('payment_status', 'completed')
            ->sum('payee_amount') ?? 0;

        // Agreements pending this user's signature
        $pending_agreements = Agreement::where('agreement_status', 'pending_signatures')
            ->whereHas('project', function ($q) use ($architect) {
                $q->where('selected_architect_id', $architect->architect_id);
            })
            ->where(function ($q) use ($user) {
                $q->whereDoesntHave('signatures', function ($sq) use ($user) {
                    $sq->where('user_id', $user->user_id);
                })->orWhereHas('signatures', function ($sq) use ($user) {
                    $sq->where('user_id', $user->user_id)
                        ->whereNull('signed_at');
                });
            })
            ->with('project:project_id,project_title')
            ->get();

        $matched_projects_count = ProjectMatch::where('architect_id', $architect->architect_id)->count();

        $reviewsQuery = Review::where('reviewee_id', $user->user_id)
            ->where('reviewee_type', 'architect');

        $recentReviews = Review::with([
            'reviewer:user_id,full_name',
            'project:project_id,project_title,project_type',
        ])
            ->where('reviewee_id', $user->user_id)
            ->where('reviewee_type', 'architect')
            ->orderByDesc('created_at')
            ->limit(3)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'architect' => $architect,
                'profile_status' => [
                    'is_complete' => $is_complete,
                    'has_license' => $has_license,
                    'has_bio' => $has_bio,
                    'has_portfolio' => $has_portfolio,
                    'has_verification_document' => $has_verification_document,
                    'experience_years' => $architect->experience_years,
                    'specialization' => $architect->specialization,
                    'verification_status' => $architect->verification_status,
                    'rejection_reason' => $architect->rejection_reason ?? null,
                ],
                'profile_completion' => $profileCompletion,
                'verification_status' => $architect->verification_status,
                'portfolio' => $architect->portfolio,
                'portfolio_exists' => $architect->portfolio !== null,
                'stats' => [
                    'matched_projects_count' => $matched_projects_count,
                    'active_projects_count' => $active_projects_count,
                    'completed_projects_count' => $completed_projects_count,
                    'total_earned' => $total_earned,
                ],
                'reviews' => [
                    'average_rating' => round((float) ($reviewsQuery->avg('rating') ?? 0), 2),
                    'total_reviews' => (int) (clone $reviewsQuery)->count(),
                    'recent_reviews' => $recentReviews,
                ],
                'active_projects' => $activeProjects,
                'pending_agreements' => $pending_agreements,
            ],
        ]);
    }

    /**
     * GET /api/architect/projects
     * Get all projects assigned to authenticated architect
     */
    public function getProjects(Request $request)
    {
        $user = auth()->user()->load('architect');
        $architect = $user->architect;

        if (!$architect) {
            return response()->json([
                'success' => false,
                'message' => 'Architect profile not found',
            ], 404);
        }

        $projects = Project::where('selected_architect_id', $architect->architect_id)
            ->with(['client:user_id,full_name', 'agreement'])
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $projects,
        ]);
    }

    /**
     * POST /api/architect/mark-profile-complete
     * Mark architect profile as completed and ready for verification
     */
    public function markProfileComplete(Request $request)
    {
        $user = $request->user();
        
        $user->update(['profile_completed' => true]);
        
        return response()->json([
            'success' => true,
            'message' => 'Profile marked as complete',
            'data' => [
                'profile_completed' => $user->profile_completed,
            ],
        ]);
    }
}
