<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectMatch;
use Illuminate\Support\Facades\Validator;

class ProjectMatchWriter
{
    /**
     * Replace all matches for a project with validated rows (max 10 by score).
     *
     * @param  array<int, array{architect_id: int, match_score: int, architect_project_id?: int|null}>  $matchesData
     */
    public function replaceMatches(int $projectId, array $matchesData): int
    {
        $validator = Validator::make([
            'project_id' => $projectId,
            'matches' => $matchesData,
        ], [
            'project_id' => 'required|integer|exists:projects,project_id',
            'matches' => 'required|array|min:1',
            'matches.*.architect_id' => 'required|integer|exists:architects,architect_id',
            'matches.*.architect_project_id' => 'nullable|integer|exists:architect_projects,architect_project_id',
            'matches.*.match_score' => 'required|integer|min:0|max:100',
        ]);

        if ($validator->fails()) {
            throw new \InvalidArgumentException($validator->errors()->first());
        }

        ProjectMatch::where('project_id', $projectId)->delete();

        $topMatches = collect($matchesData)
            ->sortByDesc('match_score')
            ->take(10)
            ->values();

        foreach ($topMatches as $match) {
            ProjectMatch::create([
                'project_id' => $projectId,
                'architect_id' => $match['architect_id'],
                'architect_project_id' => $match['architect_project_id'] ?? null,
                'match_score' => $match['match_score'],
            ]);
        }

        return $topMatches->count();
    }

    public function markProjectMatched(int $projectId): void
    {
        $project = Project::where('project_id', $projectId)->first();
        if ($project && $project->project_status === 'created') {
            $project->update(['project_status' => 'matched']);
        }
    }
}
