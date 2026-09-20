<?php

namespace App\Http\Controllers;

use App\Models\Architect;
use App\Models\ArchitectPortfolio;
use App\Models\ArchitectProject;
use App\Models\ArchitectProjectImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ArchitectPortfolioController extends Controller
{
    public function getOwnPortfolio(Request $request): JsonResponse
    {
        $architect = Architect::where('user_id', $request->user()->user_id)->firstOrFail();
        $portfolio = ArchitectPortfolio::firstOrCreate(['architect_id' => $architect->architect_id]);
        $portfolio->load(['projects' => function ($q) {
            $q->orderByDesc('is_featured')->orderByDesc('created_at');
        }, 'projects.images']);

        return response()->json([
            'portfolio' => $portfolio,
        ]);
    }

    public function setup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'bio_statement' => 'nullable|string',
        ]);

        $architect = Architect::where('user_id', $request->user()->user_id)->firstOrFail();
        $portfolio = ArchitectPortfolio::firstOrCreate(['architect_id' => $architect->architect_id]);
        $portfolio->bio_statement = $validated['bio_statement'] ?? $portfolio->bio_statement;
        $portfolio->save();

        return response()->json(['portfolio' => $portfolio]);
    }

    public function createProject(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_title' => 'required|string|min:3|max:255',
            'project_description' => 'nullable|string|max:2000',
            'project_type' => 'required|in:residential,commercial,industrial,landscape',
            'style_tags' => 'nullable|array',
            'style_tags.*' => 'string|max:50',
            'location' => 'nullable|string|max:255',
            'area_sqft' => 'nullable|integer|min:1',
            'year_completed' => 'nullable|integer|min:1950|max:' . now()->year,
            'budget_range_min' => 'nullable|numeric|min:0',
            'budget_range_max' => 'nullable|numeric|min:0|gte:budget_range_min',
            'visibility' => 'nullable|in:public,private',
            'is_featured' => 'nullable|boolean',
            'images' => 'nullable|array|max:15',
            'images.*' => 'file|image|mimes:jpeg,png,jpg|max:5120',
        ]);

        $architect = Architect::where('user_id', $request->user()->user_id)->firstOrFail();
        $portfolio = ArchitectPortfolio::firstOrCreate(['architect_id' => $architect->architect_id]);

        $project = ArchitectProject::create([
            'architect_portfolio_id' => $portfolio->architect_portfolio_id,
            'project_title' => $validated['project_title'],
            'project_description' => $validated['project_description'] ?? null,
            'project_type' => $validated['project_type'],
            'style_tags' => $validated['style_tags'] ?? [],
            'location' => $validated['location'] ?? null,
            'area_sqft' => $validated['area_sqft'] ?? null,
            'year_completed' => $validated['year_completed'] ?? null,
            'budget_range_min' => $validated['budget_range_min'] ?? null,
            'budget_range_max' => $validated['budget_range_max'] ?? null,
            'is_featured' => (bool) ($validated['is_featured'] ?? false),
            'visibility' => $validated['visibility'] ?? 'public',
        ]);

        if ($request->hasFile('images')) {
            $order = 0;
            foreach ($request->file('images') as $file) {
                $name = $order . '_' . preg_replace('/[^A-Za-z0-9_.-]/', '_', $file->getClientOriginalName());
                $file->storeAs("architect_projects/{$project->architect_project_id}", $name, 'public');

                ArchitectProjectImage::create([
                    'architect_project_id' => $project->architect_project_id,
                    'image_path' => $name,
                    'is_cover' => $order === 0,
                    'display_order' => $order,
                    'uploaded_at' => now(),
                ]);

                $order++;
            }
        }

        $portfolio->update(['total_projects_count' => $portfolio->projects()->count()]);
        $project->load('images');

        return response()->json(['project' => $project], 201);
    }

    public function updateProject(Request $request, int $projectId): JsonResponse
    {
        $validated = $request->validate([
            'project_title' => 'sometimes|string|min:3|max:255',
            'project_description' => 'sometimes|nullable|string|max:2000',
            'project_type' => 'sometimes|in:residential,commercial,industrial,landscape',
            'style_tags' => 'sometimes|array',
            'style_tags.*' => 'string|max:50',
            'location' => 'sometimes|nullable|string|max:255',
            'area_sqft' => 'sometimes|nullable|integer|min:1',
            'year_completed' => 'sometimes|nullable|integer|min:1950|max:' . now()->year,
            'budget_range_min' => 'sometimes|nullable|numeric|min:0',
            'budget_range_max' => 'sometimes|nullable|numeric|min:0|gte:budget_range_min',
            'visibility' => 'sometimes|in:public,private',
            'is_featured' => 'sometimes|boolean',
        ]);

        $project = $this->ownedProject($request, $projectId);
        $project->update($validated);
        $project->load('images');

        return response()->json(['project' => $project]);
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
            $file->storeAs("architect_projects/{$project->architect_project_id}", $name, 'public');

            ArchitectProjectImage::create([
                'architect_project_id' => $project->architect_project_id,
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

        Storage::disk('public')->delete("architect_projects/{$project->architect_project_id}/{$image->image_path}");
        $image->delete();

        if ($wasCover) {
            $next = $project->images()->orderBy('display_order')->first();
            if ($next) {
                $next->update(['is_cover' => true]);
            }
        }

        return response()->json(['success' => true]);
    }

    public function setCover(Request $request, int $projectId, int $imageId): JsonResponse
    {
        $project = $this->ownedProject($request, $projectId);
        $image = $project->images()->where('image_id', $imageId)->firstOrFail();

        $project->images()->update(['is_cover' => false]);
        $image->update(['is_cover' => true]);

        return response()->json(['project' => $project->fresh('images')]);
    }

    public function deleteProject(Request $request, int $projectId): JsonResponse
    {
        $project = $this->ownedProject($request, $projectId);
        $portfolio = $project->portfolio;

        Storage::disk('public')->deleteDirectory('architect_projects/' . $project->architect_project_id);
        $project->images()->delete();
        $project->delete();

        $portfolio->update(['total_projects_count' => $portfolio->projects()->count()]);

        return response()->json(['success' => true]);
    }

    public function listArchitects(Request $request): JsonResponse
    {
        $query = Architect::query()
            ->with(['user:user_id,full_name,profile_image', 'portfolio.projects.images'])
            ->where('verification_status', 'verified')
            ->whereHas('portfolio.projects', function ($q) {
                $q->where('visibility', 'public');
            });

        // Free-text search across the whole catalogue.
        //
        // This previously did not exist server-side: the browse page
        // fetched page 1 (12 architects) and filtered that page in the
        // browser, so architect 13 onward could never be found. Search
        // now runs in SQL over every verified architect, and the result
        // is paginated like any other listing.
        //
        // The outer where() closure groups the alternatives so they AND
        // with the verified / public-portfolio constraints above rather
        // than ORing past them.
        if ($request->filled('search')) {
            $term = trim((string) $request->string('search'));
            $like = '%' . $term . '%';

            $query->where(function ($q) use ($like, $term) {
                $q->whereHas('user', function ($u) use ($like) {
                    $u->where('full_name', 'like', $like);
                })
                    ->orWhere('specialization', 'like', $like)
                    ->orWhere('bio', 'like', $like)
                    ->orWhereHas('portfolio.projects', function ($p) use ($like, $term) {
                        $p->where('visibility', 'public')
                            ->where(function ($sub) use ($like, $term) {
                                $sub->where('project_title', 'like', $like)
                                    ->orWhere('location', 'like', $like)
                                    ->orWhere('project_description', 'like', $like)
                                    ->orWhereJsonContains('style_tags', $term);
                            });
                    });
            });
        }

        if ($request->filled('specialization')) {
            $query->where('specialization', 'like', '%' . $request->string('specialization') . '%');
        }

        if ($request->filled('min_experience')) {
            $query->where('experience_years', '>=', (int) $request->input('min_experience'));
        }

        if ($request->filled('project_type')) {
            $types = (array) $request->input('project_type');
            $query->whereHas('portfolio.projects', function ($q) use ($types) {
                $q->whereIn('project_type', $types)->where('visibility', 'public');
            });
        }

        if ($request->filled('style_tags')) {
            $tags = (array) $request->input('style_tags');
            $query->whereHas('portfolio.projects', function ($q) use ($tags) {
                // The tag alternatives must be grouped. Chaining orWhere
                // directly onto $q would produce
                //   (visibility = 'public' OR tag1 OR tag2)
                // which drops the visibility constraint and lets an
                // architect surface on the strength of a PRIVATE project.
                $q->where('visibility', 'public')
                    ->where(function ($sub) use ($tags) {
                        foreach ($tags as $tag) {
                            $sub->orWhereJsonContains('style_tags', $tag);
                        }
                    });
            });
        }

        if ($request->filled('budget_min') || $request->filled('budget_max')) {
            $budgetMin = $request->input('budget_min');
            $budgetMax = $request->input('budget_max');
            $query->whereHas('portfolio.projects', function ($q) use ($budgetMin, $budgetMax) {
                $q->where('visibility', 'public');
                if ($budgetMin !== null) {
                    $q->where(function ($sub) use ($budgetMin) {
                        $sub->whereNull('budget_range_max')->orWhere('budget_range_max', '>=', $budgetMin);
                    });
                }
                if ($budgetMax !== null) {
                    $q->where(function ($sub) use ($budgetMax) {
                        $sub->whereNull('budget_range_min')->orWhere('budget_range_min', '<=', $budgetMax);
                    });
                }
            });
        }

        $sort = $request->input('sort', 'newest');
        if ($sort === 'most_experienced') {
            $query->orderByDesc('experience_years');
        } elseif ($sort === 'most_projects') {
            $query->withCount(['portfolio as projects_count' => function ($q) {
                $q->selectRaw('COALESCE(total_projects_count,0)');
            }])->orderByDesc('projects_count');
        } else {
            $query->latest('architect_id');
        }

        // withQueryString() carries search and filter params into the
        // next_page_url / prev_page_url that Laravel returns, so paging
        // through a filtered result set keeps the filter applied.
        $architects = $query->paginate(12)->withQueryString();

        $architects->getCollection()->transform(function (Architect $architect) {
            $projects = $architect->portfolio
                ? $architect->portfolio->projects->where('visibility', 'public')->sortByDesc('is_featured')->values()
                : collect();

            return [
                'architect_id' => $architect->architect_id,
                'full_name' => $architect->user?->full_name,
                'profile_image' => $architect->user?->profile_image,
                'average_rating' => $architect->user?->average_rating ?? 0,
                'total_reviews' => $architect->user?->total_reviews ?? 0,
                'specialization' => $architect->specialization,
                'experience_years' => $architect->experience_years,
                'bio' => $architect->bio,
                'verification_status' => $architect->verification_status,
                'portfolio' => [
                    'total_projects_count' => $projects->count(),
                    'featured_projects' => $projects->take(3)->map(function ($p) {
                        return [
                            'architect_project_id' => $p->architect_project_id,
                            'project_ref' => $p->project_ref,
                            'project_title' => $p->project_title,
                            'project_type' => $p->project_type,
                            'style_tags' => $p->style_tags,
                            'cover_image' => $p->cover_image,
                        ];
                    })->values(),
                    'projects' => $projects->map(function ($p) {
                        return [
                            'architect_project_id' => $p->architect_project_id,
                            'project_ref' => $p->project_ref,
                            'project_title' => $p->project_title,
                            'project_type' => $p->project_type,
                            'style_tags' => $p->style_tags,
                            'location' => $p->location,
                            'year_completed' => $p->year_completed,
                            'cover_image' => $p->cover_image,
                        ];
                    })->values(),
                ],
            ];
        });

        return response()->json(['data' => $architects]);
    }

    public function showArchitect(int $architectId): JsonResponse
    {
        $architect = Architect::with(['user:user_id,full_name,email,phone_number,profile_image', 'portfolio.projects.images'])
            ->where('architect_id', $architectId)
            ->where('verification_status', 'verified')
            ->firstOrFail();

        $projects = $architect->portfolio
            ? $architect->portfolio->projects->where('visibility', 'public')->sortByDesc('is_featured')->values()
            : collect();

        return response()->json([
            'data' => [
                'architect_id' => $architect->architect_id,
                'user' => $architect->user,
                'average_rating' => $architect->user?->average_rating ?? 0,
                'total_reviews' => $architect->user?->total_reviews ?? 0,
                'specialization' => $architect->specialization,
                'bio' => $architect->bio,
                'experience_years' => $architect->experience_years,
                'verification_status' => $architect->verification_status,
                'portfolio' => [
                    'architect_portfolio_id' => $architect->portfolio?->architect_portfolio_id,
                    'bio_statement' => $architect->portfolio?->bio_statement,
                    'total_projects_count' => $projects->count(),
                    'projects' => $projects->map(function ($p) {
                        return [
                            'architect_project_id' => $p->architect_project_id,
                            'project_ref' => $p->project_ref,
                            'project_title' => $p->project_title,
                            'project_description' => $p->project_description,
                            'project_type' => $p->project_type,
                            'style_tags' => $p->style_tags,
                            'location' => $p->location,
                            'area_sqft' => $p->area_sqft,
                            'year_completed' => $p->year_completed,
                            'budget_range_min' => $p->budget_range_min,
                            'budget_range_max' => $p->budget_range_max,
                            'formatted_budget' => $p->formatted_budget,
                            'is_featured' => $p->is_featured,
                            'visibility' => $p->visibility,
                            'images' => $p->images,
                            'cover_image' => $p->cover_image,
                        ];
                    })->values(),
                ],
            ],
        ]);
    }

    public function showProjectByRef(string $projectRef): JsonResponse
    {
        $project = ArchitectProject::with(['images', 'portfolio.architect.user'])
            ->where('project_ref', strtoupper($projectRef))
            ->where('visibility', 'public')
            ->firstOrFail();

        return response()->json([
            'data' => [
                'architect_project_id' => $project->architect_project_id,
                'project_ref' => $project->project_ref,
                'project_title' => $project->project_title,
                'project_description' => $project->project_description,
                'project_type' => $project->project_type,
                'style_tags' => $project->style_tags,
                'location' => $project->location,
                'area_sqft' => $project->area_sqft,
                'year_completed' => $project->year_completed,
                'budget_range_min' => $project->budget_range_min,
                'budget_range_max' => $project->budget_range_max,
                'formatted_budget' => $project->formatted_budget,
                'images' => $project->images,
                'cover_image' => $project->cover_image,
                'architect' => [
                    'architect_id' => $project->portfolio->architect->architect_id,
                    'full_name' => $project->portfolio->architect->user->full_name,
                    'profile_image' => $project->portfolio->architect->user->profile_image,
                    'average_rating' => $project->portfolio->architect->user->average_rating ?? 0,
                    'total_reviews' => $project->portfolio->architect->user->total_reviews ?? 0,
                ],
            ],
        ]);
    }

    private function ownedProject(Request $request, int $projectId): ArchitectProject
    {
        $architect = Architect::where('user_id', $request->user()->user_id)->firstOrFail();

        return ArchitectProject::where('architect_project_id', $projectId)
            ->whereHas('portfolio', function ($q) use ($architect) {
                $q->where('architect_id', $architect->architect_id);
            })
            ->with('images')
            ->firstOrFail();
    }
}
