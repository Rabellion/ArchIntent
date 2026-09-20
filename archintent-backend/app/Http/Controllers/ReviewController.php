<?php

namespace App\Http\Controllers;

use App\Models\Architect;
use App\Models\Contractor;
use App\Models\Project;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id' => 'required|integer|exists:projects,project_id',
            'reviewee_id' => 'required|integer|exists:users,user_id',
            'reviewee_type' => 'required|in:architect,contractor',
            'rating' => 'required|integer|min:1|max:5',
            'review_title' => 'nullable|string|max:255',
            'review_text' => 'nullable|string|min:20|max:2000',
        ]);

        $user = auth()->user();

        if ($user->role !== 'client') {
            return response()->json([
                'message' => 'Only clients can submit reviews',
            ], 403);
        }

        $project = Project::findOrFail($validated['project_id']);

        if ((int) $project->client_id !== (int) $user->user_id) {
            return response()->json([
                'message' => 'You can only review projects you own',
            ], 403);
        }

        if ($validated['reviewee_type'] === 'architect') {
            $selectedArchitect = $project->selected_architect_id
                ? Architect::find($project->selected_architect_id)
                : null;
            $selectedArchitectUserId = $selectedArchitect?->user_id;

            if ((int) $validated['reviewee_id'] !== (int) $selectedArchitectUserId) {
                return response()->json([
                    'message' => 'You can only review the architect selected for this project',
                ], 403);
            }

            $allowedStatuses = [
                'design_approved',
                'construction_open',
                'contractor_selected',
                'in_construction',
                'completed',
            ];

            if (!in_array($project->project_status, $allowedStatuses, true)) {
                return response()->json([
                    'message' => 'You can only review the architect after the design has been approved',
                ], 422);
            }
        }

        if ($validated['reviewee_type'] === 'contractor') {
            $selectedContractor = $project->selected_contractor_id
                ? Contractor::find($project->selected_contractor_id)
                : null;
            $selectedContractorUserId = $selectedContractor?->user_id;

            if ((int) $validated['reviewee_id'] !== (int) $selectedContractorUserId) {
                return response()->json([
                    'message' => 'You can only review the contractor selected for this project',
                ], 403);
            }

            if ($project->project_status !== 'completed') {
                return response()->json([
                    'message' => 'You can only review the contractor after the project is completed',
                ], 422);
            }
        }

        $duplicateReviewExists = Review::where('project_id', $validated['project_id'])
            ->where('reviewer_id', $user->user_id)
            ->where('reviewee_type', $validated['reviewee_type'])
            ->exists();

        if ($duplicateReviewExists) {
            return response()->json([
                'message' => 'You have already reviewed this architect/contractor for this project',
            ], 422);
        }

        $review = Review::create([
            'project_id' => $validated['project_id'],
            'reviewer_id' => $user->user_id,
            'reviewee_id' => $validated['reviewee_id'],
            'reviewee_type' => $validated['reviewee_type'],
            'rating' => $validated['rating'],
            'review_title' => $validated['review_title'] ?? null,
            'review_text' => $validated['review_text'] ?? null,
            'is_verified' => true,
        ])->load([
            'project:project_id,project_title,project_type',
            'reviewer:user_id,full_name',
            'reviewee:user_id,full_name',
        ]);

        return response()->json([
            'message' => 'Review submitted successfully',
            'data' => $review,
        ], 201);
    }

    public function architectReviews(Request $request, int $architectId): JsonResponse
    {
        $architect = Architect::findOrFail($architectId);

        return $this->publicReviewsByType($request, $architect->user_id, 'architect');
    }

    public function contractorReviews(Request $request, int $contractorId): JsonResponse
    {
        $contractor = Contractor::findOrFail($contractorId);

        return $this->publicReviewsByType($request, $contractor->user_id, 'contractor');
    }

    public function canReview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id' => 'required|integer|exists:projects,project_id',
            'reviewee_type' => 'required|in:architect,contractor',
        ]);

        $user = auth()->user();

        if ($user->role !== 'client') {
            return response()->json([
                'can_review' => false,
                'reason' => 'Only clients can submit reviews',
                'already_reviewed' => false,
                'review' => null,
            ]);
        }

        $project = Project::findOrFail($validated['project_id']);

        if ((int) $project->client_id !== (int) $user->user_id) {
            return response()->json([
                'can_review' => false,
                'reason' => 'You can only review projects you own',
                'already_reviewed' => false,
                'review' => null,
            ]);
        }

        $existingReview = Review::where('project_id', $project->project_id)
            ->where('reviewer_id', $user->user_id)
            ->where('reviewee_type', $validated['reviewee_type'])
            ->latest('created_at')
            ->first();

        if ($existingReview) {
            return response()->json([
                'can_review' => false,
                'reason' => 'You have already reviewed this architect/contractor for this project',
                'already_reviewed' => true,
                'review' => $existingReview,
            ]);
        }

        if ($validated['reviewee_type'] === 'architect') {
            if (!$project->selected_architect_id) {
                return response()->json([
                    'can_review' => false,
                    'reason' => 'You can only review the architect selected for this project',
                    'already_reviewed' => false,
                    'review' => null,
                ]);
            }

            $allowedStatuses = [
                'design_approved',
                'construction_open',
                'contractor_selected',
                'in_construction',
                'completed',
            ];

            if (!in_array($project->project_status, $allowedStatuses, true)) {
                return response()->json([
                    'can_review' => false,
                    'reason' => 'You can only review the architect after the design has been approved',
                    'already_reviewed' => false,
                    'review' => null,
                ]);
            }
        }

        if ($validated['reviewee_type'] === 'contractor') {
            if (!$project->selected_contractor_id) {
                return response()->json([
                    'can_review' => false,
                    'reason' => 'You can only review the contractor selected for this project',
                    'already_reviewed' => false,
                    'review' => null,
                ]);
            }

            if ($project->project_status !== 'completed') {
                return response()->json([
                    'can_review' => false,
                    'reason' => 'You can only review the contractor after the project is completed',
                    'already_reviewed' => false,
                    'review' => null,
                ]);
            }
        }

        return response()->json([
            'can_review' => true,
            'reason' => null,
            'already_reviewed' => false,
            'review' => null,
        ]);
    }

    public function projectReviews(Request $request, int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user    = auth()->user();

        $isClient = (int) $project->client_id === (int) $user->user_id;

        // Architect: can see the review left about them on this project
        $architectRecord = null;
        $isSelectedArchitect = false;
        if ($user->role === 'architect') {
            $architectRecord = \App\Models\Architect::where('user_id', $user->user_id)->first();
            $isSelectedArchitect = $architectRecord &&
                (int) $project->selected_architect_id === (int) $architectRecord->architect_id;
        }

        // Contractor: can see the review left about them on this project
        $contractorRecord = null;
        $isSelectedContractor = false;
        if ($user->role === 'contractor') {
            $contractorRecord = \App\Models\Contractor::where('user_id', $user->user_id)->first();
            $isSelectedContractor = $contractorRecord &&
                (int) $project->selected_contractor_id === (int) $contractorRecord->contractor_id;
        }

        if (!$isClient && !$isSelectedArchitect && !$isSelectedContractor) {
            return response()->json([
                'message' => 'You do not have access to view reviews for this project',
            ], 403);
        }

        $query = Review::with([
            'project:project_id,project_title,project_type',
            'reviewer:user_id,full_name',
            'reviewee:user_id,full_name',
        ])->where('project_id', $project->project_id);

        if ($isClient) {
            // Client sees all reviews they submitted for this project
            $query->where('reviewer_id', $user->user_id);
        } elseif ($isSelectedArchitect) {
            // Architect sees ONLY the review written about them
            $query->where('reviewee_id', $user->user_id)
                  ->where('reviewee_type', 'architect');
        } elseif ($isSelectedContractor) {
            // Contractor sees ONLY the review written about them
            $query->where('reviewee_id', $user->user_id)
                  ->where('reviewee_type', 'contractor');
        }

        $reviews = $query->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $reviews,
        ]);
    }

    private function publicReviewsByType(Request $request, int $revieweeUserId, string $revieweeType): JsonResponse
    {
        $baseQuery = Review::query()
            ->where('reviewee_id', $revieweeUserId)
            ->where('reviewee_type', $revieweeType);

        $reviews = Review::where('reviewee_id', $revieweeUserId)
            ->where('reviewee_type', $revieweeType)
            ->with([
                'reviewer:user_id,full_name',
                'project:project_id,project_title,project_type',
            ])
            ->orderByDesc('created_at')
            ->paginate(10, ['*'], 'page', (int) $request->query('page', 1));

        $averageRating = (float) ($baseQuery->avg('rating') ?? 0);
        $totalReviews = (int) (clone $baseQuery)->count();

        $ratingBreakdown = [
            5 => 0,
            4 => 0,
            3 => 0,
            2 => 0,
            1 => 0,
        ];

        $ratingCounts = Review::selectRaw('rating, COUNT(*) as count')
            ->where('reviewee_id', $revieweeUserId)
            ->where('reviewee_type', $revieweeType)
            ->groupBy('rating')
            ->pluck('count', 'rating');

        foreach ($ratingBreakdown as $star => $count) {
            $ratingBreakdown[$star] = (int) ($ratingCounts[$star] ?? 0);
        }

        return response()->json([
            'data' => collect($reviews->items())->map(function (Review $review) {
                return [
                    'review_id' => $review->review_id,
                    'rating' => $review->rating,
                    'review_title' => $review->review_title,
                    'review_text' => $review->review_text,
                    'is_verified' => (bool) $review->is_verified,
                    'created_at' => $review->created_at?->format('F Y'),
                    'reviewer' => [
                        'full_name' => $this->formatReviewerName($review->reviewer?->full_name),
                    ],
                    'project' => [
                        'project_title' => $review->project?->project_title,
                        'project_type' => $review->project?->project_type,
                    ],
                ];
            })->values(),
            'summary' => [
                'average_rating' => round($averageRating, 2),
                'total_reviews' => $totalReviews,
                'rating_breakdown' => $ratingBreakdown,
            ],
            'pagination' => [
                'current_page' => $reviews->currentPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                'last_page' => $reviews->lastPage(),
            ],
        ]);
    }

    private function formatReviewerName(?string $fullName): string
    {
        if (!$fullName) {
            return 'Anonymous';
        }

        $parts = preg_split('/\s+/', trim($fullName)) ?: [];
        $firstName = $parts[0] ?? 'Anonymous';

        if (count($parts) < 2) {
            return $firstName;
        }

        $lastName = $parts[count($parts) - 1];
        $lastInitial = strtoupper(substr($lastName, 0, 1));

        return trim($firstName . ' ' . $lastInitial . '.');
    }
}
