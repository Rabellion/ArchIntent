<?php

namespace Database\Seeders;

use App\Models\Architect;
use App\Models\ArchitectPortfolio;
use App\Models\ArchitectProject;
use App\Models\BudzPackage;
use App\Models\BudzTransaction;
use App\Models\BudzWallet;
use App\Models\Contractor;
use App\Models\ContractorPortfolio;
use App\Models\ContractorProject;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestDataSeeder extends Seeder
{
    /**
     * Seed comprehensive test data for end-to-end platform testing.
     */
    public function run(): void
    {
        $users = $this->seedUsers();

        $architects = $this->seedArchitectProfiles($users);
        $contractors = $this->seedContractorProfiles($users);

        $this->seedArchitectPortfoliosAndProjects($architects);
        $this->seedContractorPortfoliosAndProjects($contractors);

        $this->seedBudzPackages();
        $this->seedBudzWalletsAndTransactions($contractors);
    }

    /**
     * @return array<string, User>
     */
    private function seedUsers(): array
    {
        $passwordHash = Hash::make('Test@1234');

        $admin = User::updateOrCreate(
            ['email' => 'admin@test.com'],
            [
                'full_name' => 'Admin User',
                'password_hash' => $passwordHash,
                'role' => 'admin',
                'account_status' => 'active',
                'phone_number' => '',
                'profile_completed' => true,
            ]
        );

        $client = User::updateOrCreate(
            ['email' => 'client@test.com'],
            [
                'full_name' => 'Ahmed Khan',
                'password_hash' => $passwordHash,
                'role' => 'client',
                'account_status' => 'active',
                'phone_number' => '',
                'profile_completed' => true,
            ]
        );

        $architect = User::updateOrCreate(
            ['email' => 'architect@test.com'],
            [
                'full_name' => 'Sara Malik',
                'password_hash' => $passwordHash,
                'role' => 'architect',
                'account_status' => 'active',
                'phone_number' => '',
                'profile_completed' => true,
            ]
        );

        $contractor = User::updateOrCreate(
            ['email' => 'contractor@test.com'],
            [
                'full_name' => 'Hassan Builders',
                'password_hash' => $passwordHash,
                'role' => 'contractor',
                'account_status' => 'active',
                'phone_number' => '',
                'profile_completed' => true,
            ]
        );

        $architect2 = User::updateOrCreate(
            ['email' => 'architect2@test.com'],
            [
                'full_name' => 'Bilal Ahmed',
                'password_hash' => $passwordHash,
                'role' => 'architect',
                'account_status' => 'active',
                'phone_number' => '',
                'profile_completed' => true,
            ]
        );

        $contractor2 = User::updateOrCreate(
            ['email' => 'contractor2@test.com'],
            [
                'full_name' => 'Ali Construction',
                'password_hash' => $passwordHash,
                'role' => 'contractor',
                'account_status' => 'active',
                'phone_number' => '',
                'profile_completed' => true,
            ]
        );

        $pendingArchitect = User::updateOrCreate(
            ['email' => 'pending@test.com'],
            [
                'full_name' => 'Zara Shah',
                'password_hash' => $passwordHash,
                'role' => 'architect',
                'account_status' => 'pending',
                'phone_number' => '',
                // Zara has submitted her verification docs (profile complete);
                // admin pending-verifications list filters on profile_completed=true.
                'profile_completed' => true,
            ]
        );

        return [
            'admin' => $admin,
            'client' => $client,
            'architect' => $architect,
            'contractor' => $contractor,
            'architect2' => $architect2,
            'contractor2' => $contractor2,
            'pending_architect' => $pendingArchitect,
        ];
    }

    /**
     * @param array<string, User> $users
     * @return array<string, Architect>
     */
    private function seedArchitectProfiles(array $users): array
    {
        $sara = Architect::updateOrCreate(
            ['user_id' => $users['architect']->user_id],
            [
                'license_number' => 'ARCH-2024-001',
                'experience_years' => 8,
                'specialization' => 'Residential',
                'bio' => 'Passionate architect specializing in modern residential and contemporary design with 8 years of experience.',
                'verification_status' => 'verified',
                'verification_document' => null,
            ]
        );

        $bilal = Architect::updateOrCreate(
            ['user_id' => $users['architect2']->user_id],
            [
                'license_number' => 'ARCH-2024-002',
                'experience_years' => 5,
                'specialization' => 'Commercial',
                'bio' => 'Commercial and industrial architect with expertise in modern office spaces and retail environments.',
                'verification_status' => 'verified',
                'verification_document' => null,
            ]
        );

        $pending = Architect::updateOrCreate(
            ['user_id' => $users['pending_architect']->user_id],
            [
                'license_number' => 'ARCH-2024-003',
                'experience_years' => 3,
                'specialization' => 'Landscape',
                'bio' => 'Landscape architect focusing on sustainable design.',
                'verification_status' => 'pending',
                'verification_document' => null,
            ]
        );

        return [
            'sara' => $sara,
            'bilal' => $bilal,
            'pending' => $pending,
        ];
    }

    /**
     * @param array<string, User> $users
     * @return array<string, Contractor>
     */
    private function seedContractorProfiles(array $users): array
    {
        $hassan = Contractor::updateOrCreate(
            ['user_id' => $users['contractor']->user_id],
            [
                'company_name' => 'Hassan Construction Co.',
                'registration_number' => 'REG-2024-001',
                'company_address' => 'Plot 12, Industrial Area, Lahore',
                'verification_status' => 'verified',
                'verification_document' => null,
                'experience_years' => 10,
                'specialization' => 'Residential Construction',
                'bio' => 'Leading construction company with 10 years of experience in residential and commercial projects across Pakistan.',
            ]
        );

        $ali = Contractor::updateOrCreate(
            ['user_id' => $users['contractor2']->user_id],
            [
                'company_name' => 'Ali Construction Ltd.',
                'registration_number' => 'REG-2024-002',
                'company_address' => 'Street 5, DHA, Karachi',
                'verification_status' => 'verified',
                'verification_document' => null,
                'experience_years' => 7,
                'specialization' => 'Commercial Construction',
                'bio' => 'Specialized in commercial and high-rise construction projects with a proven track record.',
            ]
        );

        return [
            'hassan' => $hassan,
            'ali' => $ali,
        ];
    }

    /**
     * @param array<string, Architect> $architects
     */
    private function seedArchitectPortfoliosAndProjects(array $architects): void
    {
        $saraPortfolio = ArchitectPortfolio::updateOrCreate(
            ['architect_id' => $architects['sara']->architect_id],
            [
                'bio_statement' => 'A collection of my finest residential and contemporary projects spanning 8 years.',
                'total_projects_count' => 3,
            ]
        );

        ArchitectProject::updateOrCreate(
            ['project_ref' => 'ARC-0001'],
            [
                'architect_portfolio_id' => $saraPortfolio->architect_portfolio_id,
                'project_title' => 'Modern Villa DHA Lahore',
                'project_description' => 'A stunning 5-bedroom modern villa featuring open floor plan, floor-to-ceiling windows, and seamless indoor-outdoor living spaces. Inspired by contemporary minimalist design principles.',
                'project_type' => 'residential',
                'style_tags' => ['Modern', 'Minimalist', 'Contemporary'],
                'location' => 'DHA Phase 6, Lahore',
                'area_sqft' => 4500,
                'year_completed' => 2023,
                'budget_range_min' => 2000000,
                'budget_range_max' => 5000000,
                'is_featured' => true,
                'visibility' => 'public',
            ]
        );

        ArchitectProject::updateOrCreate(
            ['project_ref' => 'ARC-0002'],
            [
                'architect_portfolio_id' => $saraPortfolio->architect_portfolio_id,
                'project_title' => 'Contemporary Office Complex Gulberg',
                'project_description' => 'A 10-story commercial office complex with modern glass facade, sustainable design features, and open-plan workspace layouts optimized for productivity.',
                'project_type' => 'commercial',
                'style_tags' => ['Contemporary', 'Sustainable', 'Industrial'],
                'location' => 'Gulberg III, Lahore',
                'area_sqft' => 25000,
                'year_completed' => 2022,
                'budget_range_min' => 15000000,
                'budget_range_max' => 30000000,
                'is_featured' => true,
                'visibility' => 'public',
            ]
        );

        ArchitectProject::updateOrCreate(
            ['project_ref' => 'ARC-0003'],
            [
                'architect_portfolio_id' => $saraPortfolio->architect_portfolio_id,
                'project_title' => 'Minimalist Family Home Bahria Town',
                'project_description' => 'Elegant 4-bedroom family home with minimalist aesthetics, natural materials, and energy-efficient design.',
                'project_type' => 'residential',
                'style_tags' => ['Minimalist', 'Classic', 'Sustainable'],
                'location' => 'Bahria Town, Rawalpindi',
                'area_sqft' => 3200,
                'year_completed' => 2024,
                'budget_range_min' => 1500000,
                'budget_range_max' => 3500000,
                'is_featured' => false,
                'visibility' => 'public',
            ]
        );

        $bilalPortfolio = ArchitectPortfolio::updateOrCreate(
            ['architect_id' => $architects['bilal']->architect_id],
            [
                'bio_statement' => 'Commercial and industrial projects focused on functionality and modern aesthetics.',
                'total_projects_count' => 1,
            ]
        );

        ArchitectProject::updateOrCreate(
            ['project_ref' => 'ARC-0004'],
            [
                'architect_portfolio_id' => $bilalPortfolio->architect_portfolio_id,
                'project_title' => 'Retail Mall Interior Karachi',
                'project_description' => 'Complete interior architecture for a 3-floor retail mall with modern commercial spaces.',
                'project_type' => 'commercial',
                'style_tags' => ['Contemporary', 'Commercial', 'Luxury'],
                'location' => 'Clifton, Karachi',
                'area_sqft' => 50000,
                'year_completed' => 2023,
                'budget_range_min' => 20000000,
                'budget_range_max' => 50000000,
                'is_featured' => true,
                'visibility' => 'public',
            ]
        );

        $saraPortfolio->update([
            'total_projects_count' => $saraPortfolio->projects()->count(),
        ]);

        $bilalPortfolio->update([
            'total_projects_count' => $bilalPortfolio->projects()->count(),
        ]);
    }

    /**
     * @param array<string, Contractor> $contractors
     */
    private function seedContractorPortfoliosAndProjects(array $contractors): void
    {
        $hassanPortfolio = ContractorPortfolio::updateOrCreate(
            ['contractor_id' => $contractors['hassan']->contractor_id],
            [
                'company_bio' => 'Award-winning construction company delivering quality residential and commercial projects since 2014.',
                'years_in_business' => 10,
                'total_projects_count' => 2,
            ]
        );

        ContractorProject::updateOrCreate(
            ['project_ref' => 'CON-0001'],
            [
                'contractor_portfolio_id' => $hassanPortfolio->contractor_portfolio_id,
                'project_title' => '5-Bedroom Luxury Home DHA Lahore',
                'project_description' => 'Complete construction of a luxury 5-bedroom home including all civil work, finishing, and landscaping.',
                'project_type' => 'residential',
                'location' => 'DHA Phase 5, Lahore',
                'area_sqft' => 4200,
                'completion_date' => '2023-08-15',
                'project_value_pkr' => 8500000,
                'duration_days' => 240,
                'client_feedback' => 'Exceptional work quality and delivered on time. Highly recommend Hassan Construction for anyone looking for reliable builders.',
                'is_featured' => true,
                'visibility' => 'public',
            ]
        );

        ContractorProject::updateOrCreate(
            ['project_ref' => 'CON-0002'],
            [
                'contractor_portfolio_id' => $hassanPortfolio->contractor_portfolio_id,
                'project_title' => 'Commercial Plaza Gulberg',
                'project_description' => '6-story commercial plaza construction with basement parking and modern facade.',
                'project_type' => 'commercial',
                'location' => 'Gulberg, Lahore',
                'area_sqft' => 18000,
                'completion_date' => '2022-12-01',
                'project_value_pkr' => 35000000,
                'duration_days' => 365,
                'client_feedback' => 'Professional team with excellent project management.',
                'is_featured' => true,
                'visibility' => 'public',
            ]
        );

        $aliPortfolio = ContractorPortfolio::updateOrCreate(
            ['contractor_id' => $contractors['ali']->contractor_id],
            [
                'company_bio' => 'Specialized in commercial and high-rise construction projects with a proven track record.',
                'years_in_business' => 7,
                'total_projects_count' => 1,
            ]
        );

        ContractorProject::updateOrCreate(
            ['project_ref' => 'CON-0003'],
            [
                'contractor_portfolio_id' => $aliPortfolio->contractor_portfolio_id,
                'project_title' => 'Office Building Karachi',
                'project_description' => 'Modern 8-story office building construction.',
                'project_type' => 'commercial',
                'location' => 'PECHS, Karachi',
                'completion_date' => '2023-05-20',
                'project_value_pkr' => 45000000,
                'duration_days' => 400,
                'is_featured' => true,
                'visibility' => 'public',
            ]
        );

        $hassanPortfolio->update([
            'total_projects_count' => $hassanPortfolio->projects()->count(),
        ]);

        $aliPortfolio->update([
            'total_projects_count' => $aliPortfolio->projects()->count(),
        ]);
    }

    private function seedBudzPackages(): void
    {
        BudzPackage::updateOrCreate(
            ['name' => 'Starter Pack'],
            ['budz_amount' => 50, 'price_pkr' => 200, 'is_active' => true]
        );

        BudzPackage::updateOrCreate(
            ['name' => 'Basic Pack'],
            ['budz_amount' => 150, 'price_pkr' => 500, 'is_active' => true]
        );

        BudzPackage::updateOrCreate(
            ['name' => 'Pro Pack'],
            ['budz_amount' => 400, 'price_pkr' => 1200, 'is_active' => true]
        );

        BudzPackage::updateOrCreate(
            ['name' => 'Elite Pack'],
            ['budz_amount' => 1000, 'price_pkr' => 2500, 'is_active' => true]
        );
    }

    /**
     * @param array<string, Contractor> $contractors
     */
    private function seedBudzWalletsAndTransactions(array $contractors): void
    {
        BudzWallet::updateOrCreate(
            ['contractor_id' => $contractors['hassan']->contractor_id],
            ['balance' => 50, 'total_purchased' => 50]
        );

        BudzWallet::updateOrCreate(
            ['contractor_id' => $contractors['ali']->contractor_id],
            ['balance' => 30, 'total_purchased' => 30]
        );

        BudzTransaction::updateOrCreate(
            [
                'contractor_id' => $contractors['hassan']->contractor_id,
                'transaction_type' => 'purchase',
                'description' => 'Starter test balance',
            ],
            [
                'budz_amount' => 50,
                'balance_after' => 50,
                'created_at' => now(),
            ]
        );

        BudzTransaction::updateOrCreate(
            [
                'contractor_id' => $contractors['ali']->contractor_id,
                'transaction_type' => 'purchase',
                'description' => 'Starter test balance',
            ],
            [
                'budz_amount' => 30,
                'balance_after' => 30,
                'created_at' => now(),
            ]
        );
    }
}
