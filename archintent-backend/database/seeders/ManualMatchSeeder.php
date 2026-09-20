<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProjectMatch;
use App\Models\Project;
use App\Models\Architect;
use App\Models\ArchitectProject;

class ManualMatchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Usage: php artisan db:seed --class=ManualMatchSeeder
     * 
     * This seeder creates 3 fake matches for testing the client UI.
     * Modify PROJECT_ID below to test with different projects.
     */
    public function run(): void
    {
        // MODIFY THIS PROJECT_ID TO TEST WITH A DIFFERENT PROJECT
        $projectId = 1;

        // Verify project exists
        $project = Project::where('project_id', $projectId)->first();
        if (!$project) {
            $this->command->error("Project with ID {$projectId} not found");
            return;
        }

        // Delete existing matches for this project
        ProjectMatch::where('project_id', $projectId)->delete();

        // Get some architects and portfolios for fake matches
        $architects = Architect::with('user', 'portfolios')->limit(3)->get();
        
        if ($architects->count() < 3) {
            $this->command->error('Need at least 3 architects in database to seed matches');
            return;
        }

        // Create 3 fake matches
        $matches = [
            [
                'project_id' => $projectId,
                'architect_id' => $architects[0]->architect_id,
                'architect_project_id' => ArchitectProject::whereHas('portfolio', function ($q) use ($architects) {
                    $q->where('architect_id', $architects[0]->architect_id);
                })->value('architect_project_id'),
                'match_score' => 92,
            ],
            [
                'project_id' => $projectId,
                'architect_id' => $architects[1]->architect_id,
                'architect_project_id' => ArchitectProject::whereHas('portfolio', function ($q) use ($architects) {
                    $q->where('architect_id', $architects[1]->architect_id);
                })->value('architect_project_id'),
                'match_score' => 85,
            ],
            [
                'project_id' => $projectId,
                'architect_id' => $architects[2]->architect_id,
                'architect_project_id' => ArchitectProject::whereHas('portfolio', function ($q) use ($architects) {
                    $q->where('architect_id', $architects[2]->architect_id);
                })->value('architect_project_id'),
                'match_score' => 78,
            ],
        ];

        foreach ($matches as $matchData) {
            ProjectMatch::create($matchData);
            $this->command->info("Created match for project {$projectId}: Architect {$matchData['architect_id']} with score {$matchData['match_score']}");
        }

        // Update project status to 'matched'
        $project->update(['project_status' => 'matched']);
        $this->command->info("Updated project {$projectId} status to 'matched'");
    }
}
