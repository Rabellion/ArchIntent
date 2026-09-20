<?php

namespace App\Http\Controllers;

use App\Models\Contractor;
use App\Models\ContractorPortfolio;
use App\Models\ContractorProject;
use App\Models\ContractorProjectImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ContractorPortfolioController extends Controller
{
    public function getOwnPortfolio(Request $request): JsonResponse
    {
        $contractor = Contractor::where('user_id', $request->user()->user_id)->firstOrFail();
        $portfolio = ContractorPortfolio::firstOrCreate(['contractor_id' => $contractor->contractor_id]);
        $portfolio->load(['projects.images']);

        return response()->json(['portfolio' => $portfolio]);
    }

    public function setup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_bio' => 'nullable|string',
            'years_in_business' => 'nullable|integer|min:0',
        ]);

        $contractor = Contractor::where('user_id', $request->user()->user_id)->firstOrFail();
        $portfolio = ContractorPortfolio::firstOrCreate(['contractor_id' => $contractor->contractor_id]);
        $portfolio->fill($validated);
        $portfolio->save();

        return response()->json(['portfolio' => $portfolio]);
    }

    public function createProject(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_title' => 'required|string|min:3|max:255',
            'project_description' => 'nullable|string|max:2000',
            'project_type' => 'required|in:residential,commercial,industrial,landscape,renovation,infrastructure',
            'location' => 'nullable|string|max:255',
            'area_sqft' => 'nullable|integer|min:1',
            'completion_date' => 'nullable|date',
            'project_value_pkr' => 'nullable|numeric|min:0',
            'duration_days' => 'nullable|integer|min:1',
            'client_feedback' => 'nullable|string',
            'visibility' => 'nullable|in:public,private',
            'is_featured' => 'nullable|boolean',
            'images' => 'nullable|array|max:15',
            'images.*' => 'file|image|mimes:jpeg,png,jpg|max:5120',
        ]);

        $contractor = Contractor::where('user_id', $request->user()->user_id)->firstOrFail();
        $portfolio = ContractorPortfolio::firstOrCreate(['contractor_id' => $contractor->contractor_id]);

        $project = ContractorProject::create([
            'contractor_portfolio_id' => $portfolio->contractor_portfolio_id,
            'project_title' => $validated['project_title'],
            'project_description' => $validated['project_description'] ?? null,
            'project_type' => $validated['project_type'],
            'location' => $validated['location'] ?? null,
            'area_sqft' => $validated['area_sqft'] ?? null,
            'completion_date' => $validated['completion_date'] ?? null,
            'project_value_pkr' => $validated['project_value_pkr'] ?? null,
            'duration_days' => $validated['duration_days'] ?? null,
            'client_feedback' => $validated['client_feedback'] ?? null,
            'is_featured' => (bool) ($validated['is_featured'] ?? false),
            'visibility' => $validated['visibility'] ?? 'public',
        ]);

        if ($request->hasFile('images')) {
            $order = 0;
            foreach ($request->file('images') as $file) {
                $name = $order . '_' . preg_replace('/[^A-Za-z0-9_.-]/', '_', $file->getClientOriginalName());
                $file->storeAs("contractor_projects/{$project->contractor_project_id}", $name, 'public');

                ContractorProjectImage::create([
                    'contractor_project_id' => $project->contractor_project_id,
                    'image_path' => $name,
                    'is_cover' => $order === 0,
                    'display_order' => $order,
                    'uploaded_at' => now(),
                ]);
                $order++;
            }
        }

        $portfolio->update(['total_projects_count' => $portfolio->projects()->count()]);

        return response()->json(['project' => $project->fresh('images')], 201);
    }

    public function updateProject(Request $request, int $projectId): JsonResponse
    {
        $validated = $request->validate([
            'project_title' => 'sometimes|string|min:3|max:255',
            'project_description' => 'sometimes|nullable|string|max:2000',
            'project_type' => 'sometimes|in:residential,commercial,industrial,landscape,renovation,infrastructure',
            'location' => 'sometimes|nullable|string|max:255',
            'area_sqft' => 'sometimes|nullable|integer|min:1',
            'completion_date' => 'sometimes|nullable|date',
            'project_value_pkr' => 'sometimes|nullable|numeric|min:0',
            'duration_days' => 'sometimes|nullable|integer|min:1',
            'client_feedback' => 'sometimes|nullable|string',
            'visibility' => 'sometimes|in:public,private',
            'is_featured' => 'sometimes|boolean',
        ]);

        $project = $this->ownedProject($request, $projectId);
        $project->update($validated);

        return response()->json(['project' => $project->fresh('images')]);
    }

    public function addImages(Request $request, int $projectId): JsonResponse
    {
        $request->validate([
            'images' => 'required|array|max:15',
            'images.*' => 'file|image|mimes:jpeg,png,jpg|max:5120',
        ]);

        $project = $this->ownedProject($request, $projectId);
        $current = $project->images()->count();
        $incoming = count($request->file('images'));

        if ($current + $incoming > 15) {
            return response()->json(['message' => 'Max 15 images per project'], 422);
        }

        $order = (int) ($project->images()->max('display_order') ?? -1) + 1;
        foreach ($request->file('images') as $file) {
            $name = $order . '_' . preg_replace('/[^A-Za-z0-9_.-]/', '_', $file->getClientOriginalName());
            $file->storeAs("contractor_projects/{$project->contractor_project_id}", $name, 'public');

            ContractorProjectImage::create([
                'contractor_project_id' => $project->contractor_project_id,
                'image_path' => $name,
                'is_cover' => $project->images()->where('is_cover', true)->doesntExist() && $order === 0,
                'display_order' => $order,
                'uploaded_at' => now(),
            ]);
            $order++;
        }

        return response()->json(['images' => $project->fresh()->images]);
    }

    public function deleteImage(Request $request, int $projectId, int $imageId): JsonResponse
    {
        $project = $this->ownedProject($request, $projectId);
        $image = $project->images()->where('image_id', $imageId)->firstOrFail();
        $wasCover = (bool) $image->is_cover;

        Storage::disk('public')->delete("contractor_projects/{$project->contractor_project_id}/{$image->image_path}");
        $image->delete();

        if ($wasCover) {
            $next = $project->images()->orderBy('display_order')->first();
            if ($next) {
                $next->update(['is_cover' => true]);
            }
        }

        return response()->json(['success' => true]);
    }

    public function deleteProject(Request $request, int $projectId): JsonResponse
    {
        $project = $this->ownedProject($request, $projectId);
        $portfolio = $project->portfolio;

        Storage::disk('public')->deleteDirectory('contractor_projects/' . $project->contractor_project_id);
        $project->images()->delete();
        $project->delete();

        $portfolio->update(['total_projects_count' => $portfolio->projects()->count()]);

        return response()->json(['success' => true]);
    }

    public function showPublicPortfolio(int $contractorId): JsonResponse
    {
        $contractor = Contractor::with(['user:user_id,full_name,profile_image', 'portfolio.projects.images'])
            ->where('contractor_id', $contractorId)
            ->where('verification_status', 'verified')
            ->firstOrFail();

        $projects = $contractor->portfolio
            ? $contractor->portfolio->projects->where('visibility', 'public')->sortByDesc('is_featured')->values()
            : collect();

        return response()->json([
            'data' => [
                'contractor_id' => $contractor->contractor_id,
                'company_name' => $contractor->company_name,
                'experience_years' => $contractor->experience_years,
                'specialization' => $contractor->specialization,
                'user' => $contractor->user,
                'average_rating' => $contractor->user?->average_rating ?? 0,
                'total_reviews' => $contractor->user?->total_reviews ?? 0,
                'portfolio' => [
                    'company_bio' => $contractor->portfolio?->company_bio,
                    'years_in_business' => $contractor->portfolio?->years_in_business,
                    'total_projects_count' => $projects->count(),
                    'projects' => $projects,
                ],
            ],
        ]);
    }

    public function showProjectByRef(string $projectRef): JsonResponse
    {
        $project = ContractorProject::with(['images', 'portfolio.contractor.user'])
            ->where('project_ref', strtoupper($projectRef))
            ->where('visibility', 'public')
            ->firstOrFail();

        return response()->json([
            'data' => [
                'project' => $project,
                'contractor' => [
                    'contractor_id' => $project->portfolio->contractor->contractor_id,
                    'company_name' => $project->portfolio->contractor->company_name,
                    'profile_image' => $project->portfolio->contractor->user->profile_image,
                    'average_rating' => $project->portfolio->contractor->user->average_rating ?? 0,
                    'total_reviews' => $project->portfolio->contractor->user->total_reviews ?? 0,
                ],
            ],
        ]);
    }

    private function ownedProject(Request $request, int $projectId): ContractorProject
    {
        $contractor = Contractor::where('user_id', $request->user()->user_id)->firstOrFail();

        return ContractorProject::where('contractor_project_id', $projectId)
            ->whereHas('portfolio', function ($q) use ($contractor) {
                $q->where('contractor_id', $contractor->contractor_id);
            })
            ->with('images')
            ->firstOrFail();
    }
}
