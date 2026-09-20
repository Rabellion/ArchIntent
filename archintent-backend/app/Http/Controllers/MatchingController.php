<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectMatch;
use App\Services\ProjectMatchWriter;
use Illuminate\Http\Request;

class MatchingController extends Controller
{
    public function __construct(
        private ProjectMatchWriter $matchWriter
    ) {
    }

    /**
     * POST /api/internal/project-matches
     * Internal endpoint for AI service to submit project matches
     * Protected with X-Internal-Key header middleware
     */
    public function storeMatches(Request $request)
    {
        $projectId = (int) $request->input('project_id');
        $matchesData = $request->input('matches');

        $project = Project::where('project_id', $projectId)->first();
        if (!$project) {
            return response()->json([
                'message' => 'Project not found',
            ], 404);
        }

        try {
            $count = $this->matchWriter->replaceMatches($projectId, is_array($matchesData) ? $matchesData : []);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        $project->update(['project_status' => 'matched']);

        return response()->json([
            'message' => 'Matches stored successfully',
            'project_id' => $projectId,
            'matches_count' => $count,
        ], 201);
    }

    /**
     * GET /api/projects/{id}/matches
     * Client endpoint to view matched architects for a project
     * Protected with auth:sanctum + role:client
     */
    public function getMatches(Request $request, $projectId)
    {
        // Get project and verify ownership
        $project = Project::where('project_id', $projectId)
            ->where('client_id', $request->user()->user_id)
            ->first();

        if (!$project) {
            return response()->json([
                'message' => 'Project not found or unauthorized',
            ], 404);
        }

        // Get matches ordered by score descending, paginated
        $matches = ProjectMatch::with([
                'architect.user',
                'architectProject.images',
            ])
            ->where('project_id', $projectId)
            ->orderByDesc('match_score')
            ->paginate(10);

        // Transform matches with architect and project data
        $data = $matches->getCollection()
            ->filter(fn ($match) => $match->architect !== null)
            ->map(function ($match) {
                $architect = $match->architect;
                $matchedProject = $match->architectProject;

                // image_url is an appended accessor on ArchitectProjectImage
                // (App\Support\ImageUrl::resolve) that already handles both
                // a locally-stored filename and an already-absolute URL
                // correctly -- this used to duplicate that logic inline as
                // a "just in case" fallback, with the same bug the accessor
                // itself had before it was fixed: wrapping an absolute URL
                // in the /api/storage path instead of using it as-is.
                $portfolioImages = $matchedProject
                    ? $matchedProject->images->map(fn ($image) => [
                        'image_id' => $image->image_id,
                        'image_url' => $image->image_url,
                    ])->values()
                    : collect();

                return [
                    'match_id' => $match->match_id,
                    'match_score' => (float) $match->match_score,
                    'architect_id' => $architect->architect_id,
                    'architect_user_id' => $architect->user_id,
                    'full_name' => $architect->user->full_name ?? '',
                    'email' => $architect->user->email ?? '',
                    'specialization' => $architect->specialization,
                    'experience_years' => $architect->experience_years,
                    'bio' => $architect->bio,
                    'profile_photo_url' => $architect->user->profile_photo_url ?? null,
                    'style_tags' => $matchedProject?->style_tags ?? [],
                    'budget_range_min' => $matchedProject?->budget_range_min,
                    'budget_range_max' => $matchedProject?->budget_range_max,
                    'portfolio_images' => $portfolioImages,
                    'matched_project' => $matchedProject ? [
                        'architect_project_id' => $matchedProject->architect_project_id,
                        'project_ref' => $matchedProject->project_ref,
                        'project_title' => $matchedProject->project_title,
                        'project_type' => $matchedProject->project_type,
                        'style_tags' => $matchedProject->style_tags ?? [],
                        'budget_range_min' => $matchedProject->budget_range_min,
                        'budget_range_max' => $matchedProject->budget_range_max,
                        'cover_image' => $matchedProject->cover_image,
                        'images' => $matchedProject->images,
                    ] : null,
                ];
            })
            ->values();

        return response()->json([
            'data' => $data->all(),
            'pagination' => [
                'current_page' => $matches->currentPage(),
                'per_page' => $matches->perPage(),
                'total' => $matches->total(),
                'last_page' => $matches->lastPage(),
            ],
        ]);
    }
}
