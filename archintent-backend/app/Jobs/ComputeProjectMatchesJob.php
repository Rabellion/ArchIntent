<?php

namespace App\Jobs;

use App\Models\Project;
use App\Services\HeuristicProjectMatcher;
use App\Services\ProjectMatchWriter;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ComputeProjectMatchesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $projectId
    ) {
    }

    public function handle(HeuristicProjectMatcher $heuristic, ProjectMatchWriter $writer): void
    {
        $project = Project::find($this->projectId);
        if (!$project) {
            return;
        }

        $nlpUrl = config('services.matching.nlp_service_url');
        if (is_string($nlpUrl) && $nlpUrl !== '') {
            $usedRemote = $this->tryRemoteMatcher($nlpUrl, $project, $writer);
            if ($usedRemote) {
                return;
            }
        }

        $matches = $heuristic->buildMatches($project);
        $writer->replaceMatches($project->project_id, $matches);
        $writer->markProjectMatched($project->project_id);

        Log::info('Project matches computed (heuristic)', [
            'project_id' => $project->project_id,
            'count' => count($matches),
        ]);
    }

    private function tryRemoteMatcher(string $baseUrl, Project $project, ProjectMatchWriter $writer): bool
    {
        $key = config('app.internal_api_key');
        if (!is_string($key) || $key === '') {
            Log::warning('MATCHING_NLP_SERVICE_URL set but INTERNAL_API_KEY missing; falling back to heuristic');

            return false;
        }

        $architects = \App\Models\Architect::query()
            ->with(['portfolio.projects'])
            ->whereIn('verification_status', ['verified', 'pending'])
            ->limit(80)
            ->get()
            ->map(function ($a) {
                $projects = ($a->portfolio?->projects ?? collect())->map(function ($p) {
                    return [
                        'architect_project_id' => $p->architect_project_id,
                        'project_description' => $p->project_description ?? '',
                        'style_tags' => is_array($p->style_tags) ? $p->style_tags : (json_decode($p->style_tags ?? '[]', true) ?? []),
                    ];
                })->values()->all();

                return [
                    'architect_id' => $a->architect_id,
                    'specialization' => $a->specialization ?? '',
                    'bio' => $a->bio ?? '',
                    'projects' => $projects,
                ];
            })
            ->values()
            ->all();

        $url = rtrim($baseUrl, '/') . '/match';

        try {
            $response = Http::timeout(120)
                ->withHeaders(['X-Internal-Key' => $key])
                ->acceptJson()
                ->post($url, [
                    'project' => [
                        'project_id' => $project->project_id,
                        'project_type' => $project->project_type ?? '',
                        'location' => $project->location ?? '',
                        'brief_text' => $project->brief_text ?? '',
                    ],
                    'architects' => $architects,
                ]);
        } catch (\Throwable $e) {
            Log::warning('NLP matcher request failed', ['error' => $e->getMessage()]);

            return false;
        }

        if (!$response->successful()) {
            Log::warning('NLP matcher non-success', ['status' => $response->status()]);

            return false;
        }

        $matches = $response->json('matches');
        if (!is_array($matches) || $matches === []) {
            return false;
        }

        try {
            $writer->replaceMatches($project->project_id, $matches);
            $writer->markProjectMatched($project->project_id);
        } catch (\Throwable $e) {
            Log::error('NLP matcher returned invalid matches', ['error' => $e->getMessage()]);

            return false;
        }

        Log::info('Project matches computed (remote NLP)', ['project_id' => $project->project_id]);

        return true;
    }
}
