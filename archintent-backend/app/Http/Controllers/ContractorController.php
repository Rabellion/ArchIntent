<?php

namespace App\Http\Controllers;

use App\Models\Contractor;
use App\Models\ContractorPortfolio;
use App\Models\ContractorPortfolioImage;
use App\Models\Bid;
use App\Models\Project;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class ContractorController extends Controller
{
    /**
     * GET /api/contractor/profile
     * Fetch current contractor profile
     */
    public function getProfile(Request $request): JsonResponse
    {
        $user = auth()->user();
        $contractor = Contractor::where('user_id', $user->user_id)->first();

        if (!$contractor) {
            return response()->json([
                'success' => false,
                'message' => 'Contractor profile not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $contractor,
        ], 200);
    }

    /**
     * POST /api/contractor/profile
     * Update contractor profile with new required fields and optional verifications
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = auth()->user();
        $contractor = Contractor::firstOrCreate(
            ['user_id' => $user->user_id],
            ['verification_status' => 'pending']
        );

        $validated = $request->validate([
            // ── Required core fields ──────────────────────────────────────
            'company_name'      => 'required|string|max:255',
            'cnic'              => 'required|string|max:20',
            'city'              => 'required|string|max:100',
            'work_types'        => 'required|array|min:1',
            'work_types.*'      => 'string|max:100',
            'company_address'   => 'required|string|max:500',
            'experience_years'  => 'required|integer|min:0',
            'bio'               => 'required|string|max:1000',

            // Optional profile fields
            'specialization'        => 'nullable|string|max:255',
            'registration_number'   => 'nullable|string|max:255',

            // Primary verification document
            'verification_document' => 'sometimes|nullable|file|mimes:pdf,doc,docx|max:10240',

            // ── Optional extra verification ────────────────────────────────
            'pec_registration'  => 'nullable|string|max:50',
            'pec_document'      => 'nullable|file|mimes:pdf,doc,docx|max:10240',

            'secp_number'       => 'nullable|string|max:50',
            'secp_document'     => 'nullable|file|mimes:pdf,doc,docx|max:10240',

            'ntn_number'        => 'nullable|string|max:20',
            'ntn_document'      => 'nullable|file|mimes:pdf,doc,docx|max:10240',
        ]);

        // ── Handle file uploads ────────────────────────────────────────────
        $docFields = [
            'verification_document' => 'verifications/contractors',
            'pec_document'          => 'verifications/contractors/pec',
            'secp_document'         => 'verifications/contractors/secp',
            'ntn_document'          => 'verifications/contractors/ntn',
        ];

        foreach ($docFields as $field => $folder) {
            if ($request->hasFile($field)) {
                $file = $request->file($field);
                $ext  = $file->getClientOriginalExtension();
                $filename = "{$contractor->contractor_id}_{$field}.{$ext}";

                // Delete old file
                if ($contractor->$field) {
                    Storage::disk('public')->delete("{$folder}/{$contractor->$field}");
                }

                $file->storeAs($folder, $filename, 'public');
                $validated[$field] = $filename;
            }
        }

        // Remove null file entries that weren't uploaded (don't overwrite existing)
        foreach (array_keys($docFields) as $field) {
            if (!isset($validated[$field])) {
                unset($validated[$field]);
            }
        }

        // Update contractor record
        $contractor->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data'    => $contractor,
        ], 200);
    }


    /**
     * POST /api/contractor/portfolio
     * Create new contractor portfolio with optional images
     */
    public function createPortfolio(Request $request): JsonResponse
    {
        $user = auth()->user();
        $contractor = Contractor::firstOrCreate(
            ['user_id' => $user->user_id],
            ['verification_status' => 'pending']
        );

        $validated = $request->validate([
            'project_title' => 'required|string|max:255',
            'description' => 'required|string|max:2000',
            'completion_date' => 'required|date_format:Y-m-d',
            'images' => 'nullable|array|max:5',
            'images.*' => 'file|image|mimes:jpeg,png|max:5120',
        ]);

        // Create portfolio
        $portfolio = ContractorPortfolio::create([
            'contractor_id' => $contractor->contractor_id,
            'project_title' => $validated['project_title'],
            'description' => $validated['description'],
            'completion_date' => $validated['completion_date'],
            'created_at' => now(),
        ]);

        // Store images if provided
        $images = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $filename = uniqid() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs("public/contractor_portfolios/{$portfolio->portfolio_id}", $filename);

                $portfolioImage = ContractorPortfolioImage::create([
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
     * GET /api/contractor/portfolio
     * Get all portfolio projects for authenticated contractor with images
     */
    public function getPortfolio(Request $request): JsonResponse
    {
        $user = auth()->user();
        $contractor = Contractor::firstOrCreate(
            ['user_id' => $user->user_id],
            ['verification_status' => 'pending']
        );

        $portfolios = ContractorPortfolio::with('images')
            ->where('contractor_id', $contractor->contractor_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $portfolios,
        ], 200);
    }

    /**
     * GET /api/contractor/{id}
     * Get contractor public profile with full portfolio
     */
    public function showContractor(Request $request, $id): JsonResponse
    {
        $contractor = Contractor::with(['user:user_id,full_name,email,phone_number,profile_image', 'portfolio.projects.images'])
            ->where('contractor_id', $id)
            ->first();

        if (!$contractor) {
            return response()->json([
                'success' => false,
                'message' => 'Contractor not found',
            ], 404);
        }

        $wonBidsCount = Bid::where('contractor_id', $contractor->contractor_id)
            ->where('bid_status', 'accepted')
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'contractor_id'     => $contractor->contractor_id,
                'company_name'      => $contractor->company_name,
                'city'              => $contractor->city,
                'work_types'        => $contractor->work_types ?? [],
                'registration_number' => $contractor->registration_number,
                'company_address'   => $contractor->company_address,
                'experience_years'  => $contractor->experience_years,
                'specialization'    => $contractor->specialization,
                'bio'               => $contractor->bio,
                'verification_status' => $contractor->verification_status,
                // Optional public verification badges (numbers only — no docs exposed)
                'pec_registration'  => $contractor->pec_registration,
                'secp_number'       => $contractor->secp_number,
                'ntn_number'        => $contractor->ntn_number,
                'won_bids_count'    => $wonBidsCount,
                'average_rating'    => $contractor->user?->average_rating ?? 0,
                'total_reviews'     => $contractor->user?->total_reviews ?? 0,
                'user'              => $contractor->user,
                'portfolio' => [
                    'company_bio' => $contractor->portfolio?->company_bio,
                    'years_in_business' => $contractor->portfolio?->years_in_business,
                    'total_projects_count' => $contractor->portfolio?->projects?->count() ?? 0,
                    'projects' => ($contractor->portfolio?->projects ?? collect())->map(function ($project) {
                        return [
                            'contractor_project_id' => $project->contractor_project_id,
                            'project_ref' => $project->project_ref,
                            'project_title' => $project->project_title,
                            'description' => $project->project_description,
                            'project_type' => $project->project_type,
                            'completion_date' => $project->completion_date,
                            'project_value_pkr' => $project->project_value_pkr,
                            'duration_days' => $project->duration_days,
                            'client_feedback' => $project->client_feedback,
                            'images' => $project->images,
                        ];
                    })->values(),
                ],
                // Backward compatibility alias
                'portfolios' => ($contractor->portfolio?->projects ?? collect())->map(function ($project) {
                    return [
                        'portfolio_id' => $project->contractor_project_id,
                        'project_title' => $project->project_title,
                        'description' => $project->project_description,
                        'completion_date' => $project->completion_date,
                        'images' => $project->images,
                    ];
                })->values(),
            ],
        ], 200);
    }

    /**
     * DELETE /api/contractor/portfolio/{id}
     * Delete portfolio and all its images
     */
    public function deletePortfolio(Request $request, $portfolioId): JsonResponse
    {
        $user = auth()->user();
        $contractor = Contractor::firstOrCreate(
            ['user_id' => $user->user_id],
            ['verification_status' => 'pending']
        );

        $portfolio = ContractorPortfolio::findOrFail($portfolioId);

        // Authorize - verify ownership
        if ($portfolio->contractor_id !== $contractor->contractor_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized - You do not own this portfolio',
            ], 403);
        }

        // Delete all images from storage
        $images = ContractorPortfolioImage::where('portfolio_id', $portfolioId)->get();
        foreach ($images as $image) {
            Storage::delete("public/contractor_portfolios/{$portfolioId}/{$image->image_path}");
        }

        // Delete the portfolio (cascade will delete images records)
        $portfolio->delete();

        return response()->json([
            'success' => true,
            'message' => 'Portfolio deleted successfully',
        ], 200);
    }

    /**
     * GET /api/contractor/dashboard
     * Get contractor dashboard stats
     */
    public function getDashboard(Request $request): JsonResponse
    {
        $user = auth()->user();
        $contractor = Contractor::firstOrCreate(
            ['user_id' => $user->user_id],
            ['verification_status' => 'pending']
        );

        // Get verification status
        $verificationStatus = $contractor->verification_status;

        // Count available projects (projects with status = construction_open)
        $availableProjects = Project::where('project_status', 'construction_open')->count();

        // Count bids submitted by this contractor
        $submittedBids = Bid::where('contractor_id', $contractor->contractor_id)->count();

        // Count accepted/won bids (status = accepted)
        $acceptedBids = Bid::where('contractor_id', $contractor->contractor_id)
            ->where('bid_status', 'accepted')
            ->count();

        $reviewsQuery = Review::where('reviewee_id', $user->user_id)
            ->where('reviewee_type', 'contractor');

        $recentReviews = Review::with([
            'reviewer:user_id,full_name',
            'project:project_id,project_title,project_type',
        ])
            ->where('reviewee_id', $user->user_id)
            ->where('reviewee_type', 'contractor')
            ->orderByDesc('created_at')
            ->limit(3)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'contractor_id' => $contractor->contractor_id,
                'verification_status' => $verificationStatus,
                'available_projects_count' => $availableProjects,
                'submitted_bids_count' => $submittedBids,
                'accepted_bids_count' => $acceptedBids,
                'reviews' => [
                    'average_rating' => round((float) ($reviewsQuery->avg('rating') ?? 0), 2),
                    'total_reviews' => (int) (clone $reviewsQuery)->count(),
                    'recent_reviews' => $recentReviews,
                ],
            ],
        ], 200);
    }

    /**
     * GET /api/contractor/bids
     * Get all bids submitted by authenticated contractor
     */
    public function getBids(Request $request): JsonResponse
    {
        $user = auth()->user();
        $contractor = Contractor::firstOrCreate(
            ['user_id' => $user->user_id],
            ['verification_status' => 'pending']
        );

        $bids = Bid::where('contractor_id', $contractor->contractor_id)
            ->with('project:project_id,project_title,project_status')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($bid) {
                return [
                    'bid_id' => $bid->bid_id,
                    'project_id' => $bid->project_id,
                    'project_title' => $bid->project->project_title,
                    'proposed_cost' => $bid->proposed_cost,
                    'estimated_duration' => $bid->estimated_duration,
                    'proposal_text' => $bid->proposal_text,
                    'bid_status' => $bid->bid_status,
                    'project_status' => $bid->project->project_status,
                    'created_at' => $bid->created_at,
                    'updated_at' => $bid->updated_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $bids,
        ], 200);
    }

    /**
     * POST /api/contractor/mark-profile-complete
     * Mark contractor profile as completed and ready for verification
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
