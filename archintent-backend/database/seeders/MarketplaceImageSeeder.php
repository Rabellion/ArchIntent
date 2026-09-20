<?php

namespace Database\Seeders;

use App\Models\Architect;
use App\Models\ArchitectProjectImage;
use App\Models\Contractor;
use App\Models\ContractorProjectImage;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Adds profile photos for every client, architect and construction
 * company, and portfolio images for every architect and contractor
 * project, matched to that project's actual description.
 *
 * Images are hotlinked (LoremFlickr CDN), not uploaded, on purpose: the
 * NLP/backend Heroku dynos use the ephemeral filesystem
 * (FILESYSTEM_DISK is unset -- see DEPLOYMENT.md), so any file actually
 * uploaded to local storage disappears on the next restart or deploy.
 * A stored external URL has no such problem, and the frontend's
 * resolveImageUrl() already passes any http(s):// value straight
 * through unchanged (src/utils/storage.ts), so no frontend change was
 * needed.
 *
 * Every URL in data/marketplace_images.php was resolved from a keyword
 * matched to the specific project or person, then verified to be real
 * photographic content rather than the image service's generic
 * fallback placeholder -- see scratchpad/resolve_images.py from the
 * session that generated this (not part of the shipped app).
 *
 * Idempotent and safe to re-run: images are set unconditionally so a
 * re-run refreshes anyone whose photo was manually cleared, and project
 * images are matched on (project id, display_order) so re-running
 * updates in place rather than duplicating rows.
 */
class MarketplaceImageSeeder extends Seeder
{
    /**
     * Maps a user's login email to the manifest's portrait key. Needed
     * because the manifest was built against short stable slugs, not
     * the email/full_name pairs each seeder actually creates.
     */
    private const EMAIL_TO_PORTRAIT = [
        // architects seeded by TestDataSeeder
        'architect@test.com' => 'sara.malik',
        'architect2@test.com' => 'bilal.ahmed',
        'pending@test.com' => 'zara.shah',
        // architects seeded by PakistaniMarketplaceSeeder
        'ayesha.tariq@archintent.pk' => 'ayesha.tariq',
        'usman.ghani@archintent.pk' => 'usman.ghani',
        'farah.siddiqui@archintent.pk' => 'farah.siddiqui',
        'kamran.rashid@archintent.pk' => 'kamran.rashid',
        'nida.baloch@archintent.pk' => 'nida.baloch',
        'imran.qureshi@archintent.pk' => 'imran.qureshi',
        'mehwish.iqbal@archintent.pk' => 'mehwish.iqbal',
        'asad.mehmood@archintent.pk' => 'asad.mehmood',
        'saima.rauf@archintent.pk' => 'saima.rauf',
        'hamza.sheikh@archintent.pk' => 'hamza.sheikh',
        'rabia.noor@archintent.pk' => 'rabia.noor',
        'tariq.jameel@archintent.pk' => 'tariq.jameel',
        // contractors seeded by TestDataSeeder
        'contractor@test.com' => 'hassan.builders',
        'contractor2@test.com' => 'ali.construction',
        // contractors seeded by PakistaniMarketplaceSeeder
        'shahid@chenabbuilders.pk' => 'shahid.mahmood',
        'wajid@karakoraminfra.pk' => 'wajid.ali.khan',
        'faisal@industeel.pk' => 'faisal.habib',
        'noman@sarhaddev.pk' => 'noman.afridi',
        'zeeshan@meezaninteriors.pk' => 'zeeshan.abbasi',
        'tahir@gadoonindustrial.pk' => 'tahir.yousafzai',
        'adnan@murreehills.pk' => 'adnan.satti',
        'rizwan@albarkatworks.pk' => 'rizwan.cheema',
        // clients present in the database at the time this was written
        'client@test.com' => 'ahmed.khan',
        'dawood@arc.com' => 'client.dawood.1',
        'kingst456@gmail.com' => 'client.dawood.2',
        'huzaifaimran583@gmail.com' => 'huzaifa.1',
        'huzislays123@gmail.com' => 'huzaifa.2',
    ];

    /**
     * Any other client that exists but wasn't in the list above (e.g.
     * one registered after this seeder was written) still gets a photo,
     * cycling through this pool by user_id so it stays deterministic
     * rather than picking randomly on every run.
     */
    private const CLIENT_FALLBACK_PORTRAITS = [
        'ahmed.khan', 'client.dawood.1', 'client.dawood.2', 'huzaifa.1', 'huzaifa.2',
    ];

    public function run(): void
    {
        $images = require __DIR__ . '/data/marketplace_images.php';

        $architectsDone = $this->seedArchitectPhotosAndPortfolios($images);
        $contractorsDone = $this->seedContractorPhotosAndPortfolios($images);
        $clientsDone = $this->seedClientPhotos($images['portraits']);

        $this->command?->info(sprintf(
            'Images set: %d architects, %d contractors, %d clients.',
            $architectsDone,
            $contractorsDone,
            $clientsDone
        ));
    }

    private function seedArchitectPhotosAndPortfolios(array $images): int
    {
        $count = 0;

        Architect::with(['user', 'portfolio.projects'])->get()->each(
            function (Architect $architect) use ($images, &$count) {
                $email = $architect->user?->email;
                $portraitKey = self::EMAIL_TO_PORTRAIT[$email] ?? null;

                if ($portraitKey && isset($images['portraits'][$portraitKey])) {
                    $architect->user->forceFill([
                        'profile_image' => $images['portraits'][$portraitKey],
                    ])->save();
                    $count++;
                }

                foreach ($architect->portfolio?->projects ?? [] as $project) {
                    $urls = $images['architect_projects'][$project->project_ref] ?? null;
                    if (!$urls) {
                        continue;
                    }
                    $this->upsertProjectImages(
                        ArchitectProjectImage::class,
                        'architect_project_id',
                        $project->architect_project_id,
                        $urls
                    );
                }
            }
        );

        return $count;
    }

    private function seedContractorPhotosAndPortfolios(array $images): int
    {
        $count = 0;

        Contractor::with(['user', 'portfolio.projects'])->get()->each(
            function (Contractor $contractor) use ($images, &$count) {
                $email = $contractor->user?->email;
                $portraitKey = self::EMAIL_TO_PORTRAIT[$email] ?? null;

                if ($portraitKey && isset($images['portraits'][$portraitKey])) {
                    $contractor->user->forceFill([
                        'profile_image' => $images['portraits'][$portraitKey],
                    ])->save();
                    $count++;
                }

                foreach ($contractor->portfolio?->projects ?? [] as $project) {
                    $urls = $images['contractor_projects'][$project->project_ref] ?? null;
                    if (!$urls) {
                        continue;
                    }
                    $this->upsertProjectImages(
                        ContractorProjectImage::class,
                        'contractor_project_id',
                        $project->contractor_project_id,
                        $urls
                    );
                }
            }
        );

        return $count;
    }

    private function seedClientPhotos(array $portraits): int
    {
        $count = 0;

        User::where('role', 'client')->orderBy('user_id')->get()->each(
            function (User $client, int $index) use ($portraits, &$count) {
                $key = self::EMAIL_TO_PORTRAIT[$client->email]
                    ?? self::CLIENT_FALLBACK_PORTRAITS[$index % count(self::CLIENT_FALLBACK_PORTRAITS)];

                if (isset($portraits[$key])) {
                    $client->forceFill(['profile_image' => $portraits[$key]])->save();
                    $count++;
                }
            }
        );

        return $count;
    }

    /**
     * @param class-string<ArchitectProjectImage|ContractorProjectImage> $model
     */
    private function upsertProjectImages(string $model, string $foreignKey, int $projectId, array $urls): void
    {
        foreach (array_values($urls) as $order => $url) {
            $model::updateOrCreate(
                [$foreignKey => $projectId, 'display_order' => $order],
                [
                    'image_path' => $url,
                    'is_cover' => $order === 0,
                    'uploaded_at' => now(),
                ]
            );
        }
    }
}
