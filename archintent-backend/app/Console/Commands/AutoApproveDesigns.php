<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Services\PaymentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class AutoApproveDesigns extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'projects:auto-approve-designs';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically approve designs where MDA verification deadline has passed';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        try {
            $projects = Project::where('project_status', 'design_delivered')
                ->whereNotNull('mda_verification_deadline')
                ->where('mda_verification_deadline', '<', now())
                ->get();

            $count = 0;
            $paymentService = new PaymentService();

            foreach ($projects as $project) {
                $project->update([
                    'project_status' => 'design_approved',
                ]);

                // Release payment to architect
                $paymentService->releasePayment($project->project_id);

                $count++;

                Log::info("Auto-approved design for project {$project->project_id} (Title: {$project->project_title})");

                $this->info("Auto-approved project: {$project->project_title}");
            }

            $this->info("Total projects auto-approved: {$count}");

            return Command::SUCCESS;
        } catch (\Exception $e) {
            Log::error("Failed to auto-approve designs: {$e->getMessage()}");
            $this->error("Error: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }
}
