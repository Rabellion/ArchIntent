<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\AgreementSignature;
use App\Models\Project;
use App\Models\Architect;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AgreementController extends Controller
{
    /**
     * POST /api/projects/{id}/agreement
     * Architect creates a draft agreement for a project
     */
    public function create(Request $request, $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check if project is in the correct status
        if ($project->project_status !== 'architect_selected') {
            return response()->json([
                'success' => false,
                'message' => 'Agreement can only be created when project status is architect_selected',
            ], 422);
        }

        // Get the architect record for this user
        $architect = Architect::where('user_id', $user->user_id)->firstOrFail();

        // Only the selected architect can create the agreement
        if ($project->selected_architect_id !== $architect->architect_id) {
            return response()->json([
                'success' => false,
                'message' => 'Only the selected architect can create an agreement',
            ], 403);
        }

        // Check if agreement already exists
        $existingAgreement = Agreement::where('project_id', $projectId)->first();
        if ($existingAgreement) {
            return response()->json([
                'success' => false,
                'message' => 'An agreement already exists for this project',
            ], 422);
        }

        $validated = $request->validate([
            'scope_of_work' => 'required|string|max:5000',
            'deliverables' => 'required|string|max:5000',
            'timeline_days' => 'required|integer|min:1',
            'payment_terms' => 'required|string|max:2000',
            'revision_policy' => 'required|string|max:2000',
            'cancellation_terms' => 'required|string|max:2000',
        ]);

        // Create the agreement in draft status
        $agreement = Agreement::create([
            'project_id' => $projectId,
            'agreement_status' => 'draft',
            'scope_of_work' => $validated['scope_of_work'],
            'deliverables' => $validated['deliverables'],
            'timeline_days' => $validated['timeline_days'],
            'payment_terms' => $validated['payment_terms'],
            'revision_policy' => $validated['revision_policy'],
            'cancellation_terms' => $validated['cancellation_terms'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Agreement created successfully',
            'data' => $agreement->load(['project.selectedArchitect.user', 'signatures.user']),
        ], 201);
    }

    /**
     * GET /api/agreements/{id}
     * Get agreement details (client or architect can view)
     */
    public function show(Request $request, $agreementId): JsonResponse
    {
        $agreement = Agreement::with(['project.selectedArchitect.user', 'signatures.user'])
            ->findOrFail($agreementId);
        $user = auth()->user();

        // Check authorization
        $isClient = $agreement->project->client_id === $user->user_id;
        $isArchitect = Architect::where('architect_id', $agreement->project->selected_architect_id)
            ->where('user_id', $user->user_id)
            ->exists();

        if (!($isClient || $isArchitect)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $agreement,
        ]);
    }

    /**
     * PUT /api/agreements/{id}
     * Architect edits a draft agreement
     */
    public function update(Request $request, $agreementId): JsonResponse
    {
        $agreement = Agreement::with('project')->findOrFail($agreementId);
        $user = auth()->user();

        // Check status
        if ($agreement->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Agreement can only be edited when status is draft',
            ], 422);
        }

        // Get the architect record for this user
        $architect = Architect::where('user_id', $user->user_id)->firstOrFail();

        // Only the selected architect can edit
        if ($agreement->project->selected_architect_id !== $architect->architect_id) {
            return response()->json([
                'success' => false,
                'message' => 'Only the agreement architect can edit it',
            ], 403);
        }

        $validated = $request->validate([
            'scope_of_work' => 'sometimes|string|max:5000',
            'deliverables' => 'sometimes|string|max:5000',
            'timeline_days' => 'sometimes|integer|min:1',
            'payment_terms' => 'sometimes|string|max:2000',
            'revision_policy' => 'sometimes|string|max:2000',
            'cancellation_terms' => 'sometimes|string|max:2000',
        ]);

        $agreement->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Agreement updated successfully',
            'data' => $agreement->load(['project.selectedArchitect.user', 'signatures.user']),
        ]);
    }

    /**
     * POST /api/agreements/{id}/finalize
     * Architect finalizes agreement for signing (moves from draft to pending_signatures)
     */
    public function finalize(Request $request, $agreementId): JsonResponse
    {
        $agreement = Agreement::with('project')->findOrFail($agreementId);
        $user = auth()->user();

        // Check status - allow draft or pending_signatures (in case of re-finalization)
        if (!in_array($agreement->status, ['draft', 'pending_signatures'])) {
            return response()->json([
                'success' => false,
                'message' => 'Agreement cannot be finalized in this status',
            ], 422);
        }

        // Get the architect record for this user
        $architect = Architect::where('user_id', $user->user_id)->firstOrFail();

        // Only the selected architect can finalize
        if ($agreement->project->selected_architect_id !== $architect->architect_id) {
            return response()->json([
                'success' => false,
                'message' => 'Only the agreement architect can finalize it',
            ], 403);
        }

        // Update agreement status (clear any prior client change request when re-finalizing)
        $agreement->update([
            'agreement_status' => 'pending_signatures',
            'change_request_message' => null,
        ]);

        // Update project status to agreement_pending
        $agreement->project->update(['project_status' => 'agreement_pending']);

        // Create signature records for both parties (initially unsigned)
        AgreementSignature::updateOrCreate(
            ['agreement_id' => $agreementId, 'user_id' => $agreement->project->client_id],
            ['user_id' => $agreement->project->client_id, 'signed_at' => null]
        );

        AgreementSignature::updateOrCreate(
            ['agreement_id' => $agreementId, 'user_id' => $user->user_id],
            ['user_id' => $user->user_id, 'signed_at' => null]
        );

        return response()->json([
            'success' => true,
            'message' => 'Agreement finalized and ready for signatures',
            'data' => $agreement->load(['project.selectedArchitect.user', 'signatures.user']),
        ]);
    }

    /**
     * POST /api/agreements/{id}/sign
     * Client or architect signs the agreement
     */
    public function sign(Request $request, $agreementId): JsonResponse
    {
        $agreement = Agreement::with(['project', 'signatures'])
            ->findOrFail($agreementId);
        $user = auth()->user();

        // Check status
        if ($agreement->status !== 'pending_signatures') {
            return response()->json([
                'success' => false,
                'message' => 'Agreement must be in pending_signatures status to sign',
            ], 422);
        }

        // Check authorization (must be client or architect)
        $isClient = $agreement->project->client_id === $user->user_id;
        $isArchitect = Architect::where('architect_id', $agreement->project->selected_architect_id)
            ->where('user_id', $user->user_id)
            ->exists();

        if (!($isClient || $isArchitect)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        // Check if user already signed
        $existingSignature = AgreementSignature::where('agreement_id', $agreementId)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$existingSignature) {
            return response()->json([
                'success' => false,
                'message' => 'Signature record not found',
            ], 422);
        }

        if ($existingSignature->signed_at !== null) {
            return response()->json([
                'success' => false,
                'message' => 'You have already signed this agreement',
            ], 422);
        }

        // Sign the agreement
        $existingSignature->update(['signed_at' => now()]);

        // Check if both parties have signed
        $allSigned = AgreementSignature::where('agreement_id', $agreementId)
            ->whereNotNull('signed_at')
            ->count() === 2;

        if ($allSigned) {
            // Update agreement status to signed
            $agreement->update(['agreement_status' => 'signed']);

            // Update project status to payment_pending
            $agreement->project->update(['project_status' => 'payment_pending']);
        }

        $agreement->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Agreement signed successfully',
            'data' => $agreement->load(['project.selectedArchitect.user', 'signatures.user']),
            'all_signed' => $allSigned,
        ]);
    }

    /**
     * GET /api/agreements/pending
     * Get all unsigned agreements for the authenticated user
     */
    public function pending(Request $request): JsonResponse
    {
        return $this->getPending($request);
    }

    /**
     * GET /api/agreements/pending
     * Get all unsigned agreements for the authenticated user
     */
    public function getPending(Request $request): JsonResponse
    {
        $user = auth()->user();

        $agreements = Agreement::whereHas('signatures', function ($query) use ($user) {
            $query->where('user_id', $user->user_id)
                ->whereNull('signed_at');
        })
            ->with(['project.selectedArchitect.user', 'signatures.user'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $agreements,
        ]);
    }

    /**
     * POST /api/agreements/{id}/request-changes
     * Client requests edits before signing; agreement returns to draft for the architect
     */
    public function requestChanges(Request $request, $agreementId): JsonResponse
    {
        $agreement = Agreement::with('project')->findOrFail($agreementId);
        $user = auth()->user();

        if ($agreement->status !== 'pending_signatures') {
            return response()->json([
                'success' => false,
                'message' => 'Changes can only be requested while the agreement is awaiting signatures',
            ], 422);
        }

        if ((int) $agreement->project->client_id !== (int) $user->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Only the project client can request agreement changes',
            ], 403);
        }

        $clientSignature = AgreementSignature::where('agreement_id', $agreementId)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$clientSignature || $clientSignature->signed_at !== null) {
            return response()->json([
                'success' => false,
                'message' => 'You can only request changes before you sign the agreement',
            ], 422);
        }

        $validated = $request->validate([
            'change_request_message' => 'required|string|min:10|max:2000',
        ]);

        DB::transaction(function () use ($agreement, $agreementId, $validated) {
            AgreementSignature::where('agreement_id', $agreementId)->delete();
            $agreement->update([
                'agreement_status' => 'draft',
                'change_request_message' => $validated['change_request_message'],
            ]);
            $agreement->project->update(['project_status' => 'architect_selected']);
        });

        $agreement->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Change request sent. The architect will update the agreement.',
            'data' => $agreement->load(['project.selectedArchitect.user', 'signatures.user']),
        ]);
    }
}
