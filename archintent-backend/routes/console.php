<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('seed:fresh', function () {
    $exitCode = $this->call('migrate:fresh', ['--seed' => true]);

    if ($exitCode === 0) {
        $this->info('Database refreshed and seeded successfully.');
        return;
    }

    $this->error('Database refresh and seed failed.');
})->purpose('Run migrate:fresh --seed');
