<?php

namespace App\Services;

use App\Models\Architect;
use App\Models\Project;

class HeuristicProjectMatcher
{
    /**
     * @return array<int, array{architect_id: int, match_score: int, architect_project_id: int|null}>
     */
    public function buildMatches(Project $project): array
    {
        $corpus = strtolower(
            (string) $project->project_title . ' ' .
            (string) $project->brief_text . ' ' .
            (string) $project->location . ' ' .
            (string) $project->project_type
        );
        $projectTokens = $this->tokenize($corpus);

        $architects = Architect::query()
            ->with(['portfolio.projects', 'user'])
            ->whereIn('verification_status', ['verified', 'pending'])
            ->limit(80)
            ->get();

        $rows = [];
        foreach ($architects as $arch) {
            $types = '';
            if (is_array($arch->design_types)) {
                $types = implode(' ', $arch->design_types);
            }
            $archText = strtolower(
                (string) ($arch->specialization ?? '') . ' ' .
                (string) ($arch->bio ?? '') . ' ' .
                (string) ($arch->city ?? '') . ' ' .
                $types
            );
            $archTokens = $this->tokenize($archText);
            $overlap = count(array_intersect($projectTokens, $archTokens));
            $score = (int) min(100, $overlap * 8 + ($arch->verification_status === 'verified' ? 5 : 0));
            if ($score < 1) {
                $score = 1;
            }

            $archProjectId = null;
            $firstPublic = $arch->portfolio?->projects
                ->where('visibility', 'public')
                ->first();
            if ($firstPublic) {
                $archProjectId = $firstPublic->architect_project_id;
            }

            $rows[] = [
                'architect_id' => (int) $arch->architect_id,
                'match_score' => $score,
                'architect_project_id' => $archProjectId,
            ];
        }

        usort($rows, fn ($a, $b) => $b['match_score'] <=> $a['match_score']);

        return array_slice($rows, 0, 10);
    }

    /**
     * @return list<string>
     */
    private function tokenize(string $text): array
    {
        $parts = preg_split('/[^\p{L}\p{N}]+/u', $text, -1, PREG_SPLIT_NO_EMPTY);
        if (!$parts) {
            return [];
        }
        $out = [];
        foreach ($parts as $p) {
            $p = strtolower($p);
            if (strlen($p) > 2) {
                $out[] = $p;
            }
        }

        return array_values(array_unique($out));
    }
}
