<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\User;
use App\Models\Architect;
use App\Models\DesignRevision;
use App\Models\Contractor;
use App\Models\ProjectMatch;
use App\Jobs\ComputeProjectMatchesJob;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class ProjectController extends Controller
{
    /**
     * POST /api/projects
     * Create a new project
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_title' => 'required|string|max:255',
            'brief_text' => 'required|string|min:100',
            'budget' => 'required|numeric|min:0',
            'location' => 'required|string|max:255',
            'project_type' => 'required|in:residential,commercial,industrial,landscape',
        ]);

        $user = auth()->user();

        $project = Project::create([
            'client_id' => $user->user_id,
            'project_title' => $validated['project_title'],
            'brief_text' => $validated['brief_text'],
            'budget' => $validated['budget'],
            'location' => $validated['location'],
            'project_type' => $validated['project_type'],
            'project_status' => 'created',
        ]);

        ComputeProjectMatchesJob::dispatch($project->project_id)->afterCommit();

        return response()->json([
            'success' => true,
            'message' => 'Project created successfully',
            'data' => $project,
        ], 201);
    }

    /**
     * GET /api/projects
     * Get all projects for authenticated client
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();

        $projects = Project::where('client_id', $user->user_id)
            ->with(['client:user_id,full_name'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($project) {
                $data = $project->toArray();
                if ($project->selected_architect_id) {
                    $architect = Architect::find($project->selected_architect_id);
                    $data['selected_architect_name'] = $architect?->user?->full_name ?? 'N/A';
                }
                return $data;
            });

        return response()->json([
            'success' => true,
            'data' => $projects,
        ]);
    }

    /**
     * GET /api/projects/{id}
     * Get project details with authorization
     */
    public function show(Request $request, $projectId): JsonResponse
    {
        $project = Project::with([
            'client:user_id,full_name,email',
            'selectedArchitect.user:user_id,full_name,email',
            'selectedContractor.user:user_id,full_name,email',
            'agreement:agreement_id,project_id,agreement_status',
            'matches.architect.user:user_id,full_name',
        ])->findOrFail($projectId);

        $user = auth()->user()->load(['architect', 'contractor']);
        $architect = $user->architect;
        $contractor = $user->contractor;

        $isClient = $project->client_id === $user->user_id;
        $isArchitect = $architect && $project->selected_architect_id === $architect->architect_id;
        $isContractor = $contractor && $project->selected_contractor_id === $contractor->contractor_id;
        $isContractorViewingOpenJob = $contractor && $project->project_status === 'construction_open';
        $isAdmin = $user->role === 'admin';

        if (!$isClient && !$isArchitect && !$isContractor && !$isContractorViewingOpenJob && !$isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden',
            ], 403);
        }

        $data = $project->toArray();
        $data['agreement_id'] = $project->agreement?->agreement_id;
        $data['agreement_status'] = $project->agreement?->status;
        $data['client'] = $project->client;

        // Include selected architect profile if exists
        if ($project->selected_architect_id) {
            $architect = Architect::with(['user:user_id,full_name'])->find($project->selected_architect_id);
            $data['selected_architect'] = $architect;
            $data['selected_architect']['average_rating'] = $architect?->user?->average_rating ?? 0;
            $data['selected_architect']['total_reviews'] = $architect?->user?->total_reviews ?? 0;
        }

        // Include selected contractor if exists
        if ($project->selected_contractor_id) {
            $contractor = Contractor::with(['user:user_id,full_name'])->find($project->selected_contractor_id);
            $data['selected_contractor'] = $contractor;
            $data['selected_contractor_name'] = $contractor?->company_name ?? 'N/A';
            $data['selected_contractor']['average_rating'] = $contractor?->user?->average_rating ?? 0;
            $data['selected_contractor']['total_reviews'] = $contractor?->user?->total_reviews ?? 0;
        }

        // Include counts
        $data['matches_count'] = $project->matches()->count();
        $data['bids_count'] = $project->bids()->count();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * PUT /api/projects/{id}
     * Update project (only if status is created or matched)
     */
    public function update(Request $request, $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Authorization: must be project owner
        if ($project->client_id !== $user->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        // Only allow update if status is created or matched
        if (!in_array($project->project_status, ['created', 'matched'])) {
            return response()->json([
                'success' => false,
                'message' => 'Project cannot be updated at this stage',
            ], 422);
        }

        $validated = $request->validate([
            'project_title' => 'sometimes|string|max:255',
            'brief_text' => 'sometimes|string|min:100',
            'budget' => 'sometimes|numeric|min:0',
            'location' => 'sometimes|string|max:255',
            'project_type' => 'sometimes|in:residential,commercial,industrial,landscape',
        ]);

        $project->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Project updated successfully',
            'data' => $project,
        ]);
    }

    /**
     * DELETE /api/projects/{id}
     * Delete project (only if status is created)
     */
    public function destroy(Request $request, $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Authorization: must be project owner
        if ($project->client_id !== $user->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        // Only allow delete if status is created
        if ($project->project_status !== 'created') {
            return response()->json([
                'success' => false,
                'message' => 'Project cannot be deleted at this stage',
            ], 422);
        }

        $project->delete();

        return response()->json([
            'success' => true,
            'message' => 'Project deleted successfully',
        ]);
    }

    /**
     * POST /api/projects/{id}/select-architect
     * Select architect for project
     */
    public function selectArchitect(Request $request, $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Authorization: project owner
        if ($project->client_id !== $user->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        // Selection is only allowed once an architect has actually been
        // matched to this project (project status must be `matched`).
        if (!in_array($project->project_status, ['matched', 'architect_selected'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Project must be in matched status before selecting an architect',
            ], 422);
        }

        $validated = $request->validate([
            'architect_id' => 'required|integer|exists:architects,architect_id',
        ]);

        // Architect must be in this project's matches — prevents clients from
        // picking an unmatched architect by guessing IDs.
        $isMatched = ProjectMatch::where('project_id', $project->project_id)
            ->where('architect_id', $validated['architect_id'])
            ->exists();
        if (!$isMatched) {
            return response()->json([
                'success' => false,
                'message' => 'Architect is not in this project\'s matches',
            ], 422);
        }

        $project->update([
            'selected_architect_id' => $validated['architect_id'],
            'project_status' => 'architect_selected',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Architect selected successfully',
            'data' => $project,
        ]);
    }

    /**
     * POST /api/projects/{id}/deliver-design
     * Upload design file
     */
    public function deliverDesign(Request $request, $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Authorization: selected_architect_id matches auth architect
        $architect = Architect::where('user_id', $user->user_id)->first();
        if (!$architect || $project->selected_architect_id !== $architect->architect_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized - You are not the selected architect',
            ], 403);
        }

        // Validate project status
        if ($project->project_status !== 'design_in_progress') {
            return response()->json([
                'success' => false,
                'message' => 'Project design must be in progress',
            ], 422);
        }

        $validated = $request->validate([
            'design_file' => 'required|file|mimes:pdf,zip,dwg|max:51200',
        ]);

        // Store design file
        if ($request->hasFile('design_file')) {
            try {
                $file = $request->file('design_file');
                $ext = $file->getClientOriginalExtension();
                $filename = "design.{$ext}";
                $designDirectory = "public/designs/{$projectId}";

                // Ensure directory exists
                $fullPath = storage_path("app/" . $designDirectory);
                if (!is_dir($fullPath)) {
                    mkdir($fullPath, 0755, true);
                }

                // Delete old file if exists
                if ($project->design_file_path) {
                    $oldFilePath = "{$designDirectory}/{$project->design_file_path}";
                    Storage::delete($oldFilePath);
                }

                // Store new file
                $path = $file->storeAs($designDirectory, $filename);
                
                if (!$path) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to store design file',
                    ], 500);
                }

                $designFilePath = basename($path);

                // Update project
                $project->update([
                    'design_file_path' => $designFilePath,
                    'design_delivered_at' => now(),
                    'mda_verification_deadline' => now()->addDays(3),
                    'project_status' => 'design_delivered',
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error storing design file: ' . $e->getMessage(),
                ], 500);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Design delivered successfully',
            'data' => $project,
        ]);
    }

    /**
     * POST /api/projects/{id}/approve-design
     * Approve design and move to construction
     */
    public function approveDesign(Request $request, $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Authorization: project owner
        if ($project->client_id !== $user->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        // Validate status
        if ($project->project_status !== 'design_delivered') {
            return response()->json([
                'success' => false,
                'message' => 'Design has not been delivered yet',
            ], 422);
        }

        $project->update([
            'project_status' => 'design_approved',
        ]);

        // Release payment to architect
        $paymentService = new PaymentService();
        $paymentService->releasePayment($projectId);

        return response()->json([
            'success' => true,
            'message' => 'Design approved successfully! Payment released to architect.',
            'data' => $project,
        ]);
    }

    /**
     * GET /api/projects/{id}/design
     * Download design file
     */
    public function downloadDesign($projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Authorization: client or architect
        $isAuthorized = ($project->client_id === $user->user_id) || 
                       ($project->selected_architect_id && 
                        Architect::where('user_id', $user->user_id)
                                 ->where('architect_id', $project->selected_architect_id)
                                 ->exists());

        if (!$isAuthorized) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to download this design',
            ], 403);
        }

        // Check if design exists
        if (!$project->design_file_path) {
            return response()->json([
                'success' => false,
                'message' => 'No design file available for this project',
            ], 404);
        }

        $filePath = "public/designs/{$projectId}/{$project->design_file_path}";
        
        if (!Storage::exists($filePath)) {
            return response()->json([
                'success' => false,
                'message' => 'Design file not found',
            ], 404);
        }

        try {
            $file = Storage::get($filePath);
            $filename = $project->project_title . '.' . pathinfo($project->design_file_path, PATHINFO_EXTENSION);
            
            return response($file, 200)
                ->header('Content-Type', 'application/octet-stream')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error downloading file: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/projects/{id}/request-revision
     * Request design revision
     */
    public function requestRevision(Request $request, $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Authorization: project owner
        if ($project->client_id !== $user->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        // Validate status
        if ($project->project_status !== 'design_delivered') {
            return response()->json([
                'success' => false,
                'message' => 'Can only request revision on delivered design',
            ], 422);
        }

        // Validate revision message
        $validated = $request->validate([
            'revision_message' => 'required|string|min:20|max:2000',
        ]);

        // Create revision record
        DesignRevision::create([
            'project_id' => $projectId,
            'revision_message' => $validated['revision_message'],
            'revision_status' => 'pending',
        ]);

        // Delete design file if exists
        if ($project->design_file_path) {
            Storage::delete("public/designs/{$projectId}/{$project->design_file_path}");
        }

        $project->update([
            'design_file_path' => null,
            'design_delivered_at' => null,
            'mda_verification_deadline' => null,
            'project_status' => 'design_in_progress',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Revision requested successfully',
            'data' => $project,
        ]);
    }

    /**
     * GET /api/projects/{id}/revisions
     * Get design revision requests for a project
     */
    public function getRevisions($projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Authorization: architect or client can view
        $architect = Architect::where('user_id', $user->user_id)->first();
        $isAuthorized = ($project->client_id === $user->user_id) || 
                       ($architect && $project->selected_architect_id === $architect->architect_id);

        if (!$isAuthorized) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $revisions = $project->revisions()
            ->orderByDesc('requested_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $revisions,
        ]);
    }

    /**
     * POST /api/projects/{id}/post-construction
     * Post project to construction (move to construction_open status)
     */
    public function postConstruction(Request $request, $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Authorization: project owner
        if ($project->client_id !== $user->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        // Validate status
        if ($project->project_status !== 'design_approved') {
            return response()->json([
                'success' => false,
                'message' => 'Design must be approved before posting to construction',
            ], 422);
        }

        $project->update([
            'project_status' => 'construction_open',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Project posted to construction successfully',
            'data' => $project,
        ]);
    }

    /**
     * POST /api/projects/{id}/start-construction
     * Selected contractor marks the job as started.
     *
     * Mirrors the architect's design_in_progress step, but there is no
     * agreement/escrow stage for construction -- the accepted bid is
     * the agreed terms, so this is a single status transition with no
     * payment side effect.
     */
    public function startConstruction(Request $request, $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        $contractor = Contractor::where('user_id', $user->user_id)->first();
        if (!$contractor || $project->selected_contractor_id !== $contractor->contractor_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized - You are not the selected contractor',
            ], 403);
        }

        if ($project->project_status !== 'contractor_selected') {
            return response()->json([
                'success' => false,
                'message' => 'Construction cannot be started from the current project status',
            ], 422);
        }

        $project->update(['project_status' => 'in_construction']);

        return response()->json([
            'success' => true,
            'message' => 'Construction started',
            'data' => $project,
        ]);
    }

    /**
     * POST /api/projects/{id}/complete-construction
     * Either the selected contractor or the project's client can mark
     * the job as finished -- whichever of them notices it's done
     * first (there's no separate confirmation step, since there's no
     * status between in_construction and completed to hold one).
     *
     * No payment is released here -- unlike the design phase, there is
     * no in-app escrow for the construction bid amount, so there is
     * nothing for PaymentService to release.
     */
    public function completeConstruction(Request $request, $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        $isClientOwner = $project->client_id === $user->user_id;
        $contractor = Contractor::where('user_id', $user->user_id)->first();
        $isSelectedContractor = $contractor && $project->selected_contractor_id === $contractor->contractor_id;

        if (!$isClientOwner && !$isSelectedContractor) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized - You are not party to this project',
            ], 403);
        }

        if ($project->project_status !== 'in_construction') {
            return response()->json([
                'success' => false,
                'message' => 'Construction must be in progress before it can be marked complete',
            ], 422);
        }

        $project->update(['project_status' => 'completed']);

        return response()->json([
            'success' => true,
            'message' => 'Construction marked complete',
            'data' => $project,
        ]);
    }

    /**
     * GET /api/construction-jobs
     * Get all available construction jobs for contractors
     */
    public function constructionJobs(Request $request): JsonResponse
    {
        $page = $request->get('page', 1);
        $perPage = 10;

        $projects = Project::where('project_status', 'construction_open')
            ->with(['client:user_id,full_name'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'success' => true,
            'data' => $projects->items(),
            'pagination' => [
                'current_page' => $projects->currentPage(),
                'per_page' => $projects->perPage(),
                'total' => $projects->total(),
                'last_page' => $projects->lastPage(),
            ],
        ]);
    }
}
