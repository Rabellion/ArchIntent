<?php

namespace Database\Seeders;

use App\Models\Architect;
use App\Models\ArchitectPortfolio;
use App\Models\ArchitectProject;
use App\Models\Contractor;
use App\Models\ContractorPortfolio;
use App\Models\ContractorProject;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Depth for the marketplace, specifically so semantic matching can be
 * tested rather than merely demonstrated.
 *
 * The original TestDataSeeder has three architects whose portfolios are
 * all some variation of "modern contemporary residential". Sentence-BERT
 * has almost nothing to separate them on, so every brief returns roughly
 * the same ranking and a wrong answer is indistinguishable from a right
 * one.
 *
 * Every profile below therefore occupies a deliberately distinct
 * vocabulary space -- heritage conservation, mosque design, passive
 * solar, hospital planning, cold-chain logistics, hillside resorts --
 * chosen so that a brief written for one of them should rank that
 * architect clearly above the rest. That separation is what makes the
 * ranking falsifiable: if a brief about restoring a Mughal haveli does
 * not surface the conservation specialist, the matching is wrong, and
 * now that is visible.
 *
 * Idempotent: re-running updates in place rather than duplicating, so it
 * is safe against the production database.
 */
class PakistaniMarketplaceSeeder extends Seeder
{
    private const PASSWORD = 'Test@1234';

    public function run(): void
    {
        $hash = Hash::make(self::PASSWORD);

        foreach ($this->architects() as $data) {
            $this->seedArchitect($data, $hash);
        }

        foreach ($this->contractors() as $data) {
            $this->seedContractor($data, $hash);
        }

        $this->command?->info(sprintf(
            'Seeded %d architects and %d construction companies.',
            count($this->architects()),
            count($this->contractors())
        ));
    }

    private function seedArchitect(array $data, string $hash): void
    {
        $user = User::updateOrCreate(
            ['email' => $data['email']],
            [
                'full_name' => $data['name'],
                'password_hash' => $hash,
                'role' => 'architect',
                'account_status' => 'active',
                'phone_number' => $data['phone'],
                'profile_completed' => true,
            ]
        );

        $architect = Architect::updateOrCreate(
            ['user_id' => $user->user_id],
            [
                'license_number' => $data['license'],
                'city' => $data['city'],
                'experience_years' => $data['years'],
                'specialization' => $data['specialization'],
                'design_types' => $data['design_types'],
                'bio' => $data['bio'],
                // Verified, because browse filters on it and an unverified
                // profile would never appear in a match list.
                'verification_status' => 'verified',
                'verification_document' => null,
            ]
        );

        $portfolio = ArchitectPortfolio::updateOrCreate(
            ['architect_id' => $architect->architect_id],
            [
                'bio_statement' => $data['portfolio_statement'],
                'total_projects_count' => count($data['projects']),
            ]
        );

        foreach ($data['projects'] as $project) {
            ArchitectProject::updateOrCreate(
                ['project_ref' => $project['ref']],
                [
                    'architect_portfolio_id' => $portfolio->architect_portfolio_id,
                    'project_title' => $project['title'],
                    'project_description' => $project['description'],
                    'project_type' => $project['type'],
                    'style_tags' => $project['tags'],
                    'location' => $project['location'],
                    'area_sqft' => $project['area'],
                    'year_completed' => $project['year'],
                    'budget_range_min' => $project['budget_min'],
                    'budget_range_max' => $project['budget_max'],
                    'is_featured' => $project['featured'] ?? false,
                    'visibility' => 'public',
                ]
            );
        }
    }

    private function seedContractor(array $data, string $hash): void
    {
        $user = User::updateOrCreate(
            ['email' => $data['email']],
            [
                'full_name' => $data['contact_name'],
                'password_hash' => $hash,
                'role' => 'contractor',
                'account_status' => 'active',
                'phone_number' => $data['phone'],
                'profile_completed' => true,
            ]
        );

        $contractor = Contractor::updateOrCreate(
            ['user_id' => $user->user_id],
            [
                'company_name' => $data['company'],
                'registration_number' => $data['registration'],
                'company_address' => $data['address'],
                'city' => $data['city'],
                'experience_years' => $data['years'],
                'specialization' => $data['specialization'],
                'work_types' => $data['work_types'],
                'bio' => $data['bio'],
                'verification_status' => 'verified',
                'verification_document' => null,
            ]
        );

        // ContractorPortfolio names these differently from
        // ArchitectPortfolio (company_bio / years_in_business, not
        // bio_statement) -- using the architect names here would have been
        // dropped silently by mass assignment.
        $portfolio = ContractorPortfolio::updateOrCreate(
            ['contractor_id' => $contractor->contractor_id],
            [
                'company_bio' => $data['portfolio_statement'],
                'years_in_business' => $data['years'],
                'total_projects_count' => count($data['projects']),
            ]
        );

        foreach ($data['projects'] as $project) {
            ContractorProject::updateOrCreate(
                ['project_ref' => $project['ref']],
                [
                    'contractor_portfolio_id' => $portfolio->contractor_portfolio_id,
                    'project_title' => $project['title'],
                    'project_description' => $project['description'],
                    'project_type' => $project['type'],
                    'location' => $project['location'],
                    'area_sqft' => $project['area'],
                    'completion_date' => $project['completed'],
                    'project_value_pkr' => $project['value'],
                    'duration_days' => $project['duration'],
                    'client_feedback' => $project['feedback'],
                    'is_featured' => $project['featured'] ?? false,
                    'visibility' => 'public',
                ]
            );
        }
    }

    /**
     * Twelve architects, each in a distinct semantic niche.
     */
    private function architects(): array
    {
        return require __DIR__ . '/data/pakistani_architects.php';
    }

    /**
     * Eight construction companies, each in a distinct build discipline.
     */
    private function contractors(): array
    {
        return require __DIR__ . '/data/pakistani_contractors.php';
    }
}
