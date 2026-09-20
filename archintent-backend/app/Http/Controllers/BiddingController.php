<?php

namespace App\Http\Controllers;

use App\Models\Bid;
use App\Models\Project;
use App\Models\Contractor;
use App\Models\ContractorProject;
use App\Models\BudzWallet;
use App\Models\BudzTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class BiddingController extends Controller
{
    /**
     * POST /api/projects/{id}/bids
     * Contractor submits a bid for a construction project
     * Protected: auth:sanctum + role:contractor
     */
    public function submitBid(Request $request, $projectId)
    {
        // Get the contractor for the authenticated user
        $user = $request->user();
        $contractor = Contractor::where('user_id', $user->user_id)->first();

        if (!$contractor) {
            return response()->json([
                'message' => 'Contractor profile not found',
            ], 404);
        }

        // Verify project exists and is in construction_open status
        $project = Project::where('project_id', $projectId)->first();
        if (!$project) {
            return response()->json([
                'message' => 'Project not found',
            ], 404);
        }

        if ($project->project_status !== 'construction_open') {
            return response()->json([
                'message' => 'Project is not open for construction bids',
            ], 422);
        }

        // Check if contractor has already bid on this project
        $existingBid = Bid::where('project_id', $projectId)
            ->where('contractor_id', $contractor->contractor_id)
            ->first();

        if ($existingBid) {
            return response()->json([
                'message' => 'You have already submitted a bid for this project',
            ], 422);
        }

        // Validate input
        $validator = Validator::make($request->all(), [
            'proposed_cost' => 'required|numeric|min:0',
            'estimated_duration' => 'required|integer|min:1',
            'proposal_text' => 'nullable|string|min:50',
            'budz_to_spend' => 'required|integer|min:1|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $budzToSpend = (int) $request->input('budz_to_spend');

        $wallet = BudzWallet::firstOrCreate(
            ['contractor_id' => $contractor->contractor_id],
            ['balance' => 0, 'total_purchased' => 0]
        );

        if ($wallet->balance < $budzToSpend) {
            return response()->json([
                'message' => 'Insufficient Budz balance',
                'balance' => $wallet->balance,
                'required' => $budzToSpend,
            ], 422);
        }

        try {
            $bid = DB::transaction(function () use ($project, $projectId, $contractor, $request, $budzToSpend) {
                $wallet = BudzWallet::where('contractor_id', $contractor->contractor_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($wallet->balance < $budzToSpend) {
                    throw new \RuntimeException('Insufficient Budz balance');
                }

                $wallet->balance -= $budzToSpend;
                $wallet->save();

                BudzTransaction::create([
                    'contractor_id' => $contractor->contractor_id,
                    'transaction_type' => 'spent',
                    'budz_amount' => -$budzToSpend,
                    'balance_after' => $wallet->balance,
                    'description' => 'Spent on bid for ' . $project->project_title,
                    'reference_id' => (int) $projectId,
                    'created_at' => now(),
                ]);

                return Bid::create([
                    'project_id' => $projectId,
                    'contractor_id' => $contractor->contractor_id,
                    'proposed_cost' => $request->input('proposed_cost'),
                    'estimated_duration' => $request->input('estimated_duration'),
                    'proposal_text' => $request->input('proposal_text'),
                    'bid_status' => 'pending',
                    'budz_spent' => $budzToSpend,
                ]);
            });
        } catch (\RuntimeException $e) {
            return response()->json([
                'message' => 'Insufficient Budz balance',
                'balance' => BudzWallet::where('contractor_id', $contractor->contractor_id)->value('balance') ?? 0,
                'required' => $budzToSpend,
            ], 422);
        }

        return response()->json([
            'message' => 'Bid submitted successfully',
            'data' => $bid,
        ], 201);
    }

    /**
     * GET /api/projects/{id}/bids
     * Client views all bids for their project
     * Protected: auth:sanctum + role:client
     */
    public function getProjectBids(Request $request, $projectId)
    {
        // Verify project exists and client owns it
        $user = $request->user();
        $project = Project::where('project_id', $projectId)
            ->where('client_id', $user->user_id)
            ->first();

        if (!$project) {
            return response()->json([
                'message' => 'Project not found or unauthorized',
            ], 404);
        }

        // Get all bids for this project, ranked by Budz spent (highest first)
        $bids = Bid::where('project_id', $projectId)
            ->with([
                'contractor.user',
                'contractor.portfolio.projects.images',
            ])
            ->orderByDesc('budz_spent')
            ->orderBy('created_at', 'asc')
            ->get();

        $wonBidsCountByContractor = Bid::select('contractor_id', DB::raw('COUNT(*) as won_bids_count'))
            ->whereIn('contractor_id', $bids->pluck('contractor_id')->unique()->values())
            ->where('bid_status', 'accepted')
            ->groupBy('contractor_id')
            ->pluck('won_bids_count', 'contractor_id');

        // Transform bids with contractor data
        $data = $bids->map(function ($bid) use ($wonBidsCountByContractor) {
            $contractor = $bid->contractor;

            if (!$contractor) {
                return null;
            }

            $portfolio = $contractor->portfolio;
            $portfolioProjects = $portfolio
                ? $portfolio->projects->where('visibility', 'public')->sortByDesc('is_featured')->values()
                : collect();

            return [
                'bid_id' => $bid->bid_id,
                'project_id' => $bid->project_id,
                'proposed_cost' => $bid->proposed_cost,
                'estimated_duration' => $bid->estimated_duration,
                'proposal_text' => $bid->proposal_text,
                'bid_status' => $bid->bid_status,
                'budz_spent' => $bid->budz_spent,
                'created_at' => $bid->created_at,
                'contractor' => [
                    'contractor_id' => $contractor->contractor_id,
                    'company_name' => $contractor->company_name,
                    'experience_years' => $contractor->experience_years,
                    'specialization' => $contractor->specialization,
                    'won_bids_count' => (int) ($wonBidsCountByContractor[$contractor->contractor_id] ?? 0),
                    'average_rating' => $contractor->user?->average_rating ?? 0,
                    'total_reviews' => $contractor->user?->total_reviews ?? 0,
                    'contractor_portfolio' => [
                        'company_bio' => $portfolio?->company_bio,
                        'years_in_business' => $portfolio?->years_in_business,
                        'total_projects_count' => $portfolioProjects->count(),
                        'projects' => $portfolioProjects->map(function ($project) {
                            return [
                                'contractor_project_id' => $project->contractor_project_id,
                                'project_ref' => $project->project_ref,
                                'project_title' => $project->project_title,
                                'project_type' => $project->project_type,
                                'location' => $project->location,
                                'completion_date' => $project->completion_date,
                                'project_value_pkr' => $project->project_value_pkr,
                                'duration_days' => $project->duration_days,
                                'client_feedback' => $project->client_feedback,
                                'cover_image' => $project->cover_image,
                                'images' => $project->images,
                            ];
                        })->values(),
                    ],
                ],
            ];
        })->filter()->values();

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * POST /api/bids/{id}/accept
     * Client accepts a bid for their project
     * Protected: auth:sanctum + role:client
     */
    public function acceptBid(Request $request, $bidId)
    {
        // Find the bid
        $bid = Bid::find($bidId);
        if (!$bid) {
            return response()->json([
                'message' => 'Bid not found',
            ], 404);
        }

        // Authorize: project owner
        $user = $request->user();
        $project = Project::where('project_id', $bid->project_id)
            ->where('client_id', $user->user_id)
            ->first();

        if (!$project) {
            return response()->json([
                'message' => 'Unauthorized to accept bids for this project',
            ], 403);
        }

        // Validate: project status must be construction_open
        if ($project->project_status !== 'construction_open') {
            return response()->json([
                'message' => 'Project is not open for bid acceptance',
            ], 422);
        }

        // Update this bid to accepted
        $bid->update(['bid_status' => 'accepted']);

        // Update project: set selected_contractor_id and status
        $project->update([
            'selected_contractor_id' => $bid->contractor_id,
            'project_status' => 'contractor_selected',
        ]);

        // Reject all other pending bids for this project and refund 50% Budz
        $otherBids = Bid::where('project_id', $bid->project_id)
            ->where('bid_id', '!=', $bidId)
            ->where('bid_status', 'pending')
            ->get();

        foreach ($otherBids as $otherBid) {
            $otherBid->update(['bid_status' => 'rejected']);
            $this->refundHalfBudzForRejectedBid($otherBid, $project);
        }

        return response()->json([
            'message' => 'Bid accepted successfully',
            'data' => $bid->refresh(),
        ]);
    }

    /**
     * POST /api/bids/{id}/reject
     * Client rejects a bid
     * Protected: auth:sanctum + role:client
     */
    public function rejectBid(Request $request, $bidId)
    {
        // Find the bid
        $bid = Bid::find($bidId);
        if (!$bid) {
            return response()->json([
                'message' => 'Bid not found',
            ], 404);
        }

        // Authorize: project owner
        $user = $request->user();
        $project = Project::where('project_id', $bid->project_id)
            ->where('client_id', $user->user_id)
            ->first();

        if (!$project) {
            return response()->json([
                'message' => 'Unauthorized to reject bids for this project',
            ], 403);
        }

        // Update bid status to rejected
        $bid->update(['bid_status' => 'rejected']);

        $this->refundHalfBudzForRejectedBid($bid, $project);

        return response()->json([
            'message' => 'Bid rejected successfully',
            'data' => $bid,
        ]);
    }

    /**
     * GET /api/contractor/bids
     * Contractor views all their bids
     * Protected: auth:sanctum + role:contractor
     */
    public function getContractorBids(Request $request)
    {
        // Get the contractor for the authenticated user
        $user = $request->user();
        $contractor = Contractor::where('user_id', $user->user_id)->first();

        if (!$contractor) {
            return response()->json([
                'message' => 'Contractor profile not found',
            ], 404);
        }

        // Get all bids for this contractor, ordered by created_at DESC
        $bids = Bid::where('contractor_id', $contractor->contractor_id)
            ->with('project')
            ->orderBy('created_at', 'desc')
            ->get();

        // Transform bids with project data
        $data = $bids->map(function ($bid) {
            return [
                'bid_id' => $bid->bid_id,
                'project_id' => $bid->project->project_id,
                'project_title' => $bid->project->project_title,
                'proposed_cost' => $bid->proposed_cost,
                'estimated_duration' => $bid->estimated_duration,
                'proposal_text' => $bid->proposal_text,
                'bid_status' => $bid->bid_status,
                'status' => $bid->bid_status,
                'bid_date' => $bid->created_at,
                'budz_spent' => $bid->budz_spent,
                'created_at' => $bid->created_at,
                'project' => [
                    'project_id' => $bid->project->project_id,
                    'title' => $bid->project->project_title,
                    'type' => $bid->project->project_type,
                    'status' => $bid->project->project_status,
                ],
            ];
        });

        return response()->json([
            'data' => $data,
        ]);
    }

    private function refundHalfBudzForRejectedBid(Bid $bid, Project $project): void
    {
        $refundAmount = (int) floor(((int) $bid->budz_spent) / 2);
        if ($refundAmount <= 0) {
            return;
        }

        DB::transaction(function () use ($bid, $project, $refundAmount) {
            $wallet = BudzWallet::where('contractor_id', $bid->contractor_id)
                ->lockForUpdate()
                ->first();

            if (!$wallet) {
                return;
            }

            $wallet->balance += $refundAmount;
            $wallet->save();

            BudzTransaction::create([
                'contractor_id' => $bid->contractor_id,
                'transaction_type' => 'refunded',
                'budz_amount' => $refundAmount,
                'balance_after' => $wallet->balance,
                'description' => '50% Budz refund for rejected bid on ' . $project->project_title,
                'reference_id' => $project->project_id,
                'created_at' => now(),
            ]);
        });
    }
}
