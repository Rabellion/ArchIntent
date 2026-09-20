<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('portfolio_images') && !Schema::hasTable('portfolio_images_old')) {
            Schema::rename('portfolio_images', 'portfolio_images_old');
        }

        if (Schema::hasTable('portfolios') && !Schema::hasTable('portfolios_old')) {
            Schema::rename('portfolios', 'portfolios_old');
        }

        if (Schema::hasTable('contractor_portfolio_images') && !Schema::hasTable('contractor_portfolio_images_old')) {
            Schema::rename('contractor_portfolio_images', 'contractor_portfolio_images_old');
        }

        if (Schema::hasTable('contractor_portfolios') && !Schema::hasTable('contractor_portfolios_old')) {
            Schema::rename('contractor_portfolios', 'contractor_portfolios_old');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contractor_portfolios_old') && !Schema::hasTable('contractor_portfolios')) {
            Schema::rename('contractor_portfolios_old', 'contractor_portfolios');
        }

        if (Schema::hasTable('contractor_portfolio_images_old') && !Schema::hasTable('contractor_portfolio_images')) {
            Schema::rename('contractor_portfolio_images_old', 'contractor_portfolio_images');
        }

        if (Schema::hasTable('portfolios_old') && !Schema::hasTable('portfolios')) {
            Schema::rename('portfolios_old', 'portfolios');
        }

        if (Schema::hasTable('portfolio_images_old') && !Schema::hasTable('portfolio_images')) {
            Schema::rename('portfolio_images_old', 'portfolio_images');
        }
    }
};
