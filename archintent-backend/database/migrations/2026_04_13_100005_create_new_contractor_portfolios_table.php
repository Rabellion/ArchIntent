<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contractor_portfolios', function (Blueprint $table) {
            $table->id('contractor_portfolio_id');
            $table->unsignedBigInteger('contractor_id')->unique();
            $table->text('company_bio')->nullable();
            $table->integer('years_in_business')->nullable();
            $table->integer('total_projects_count')->default(0);
            $table->timestamps();

            $table->foreign('contractor_id', 'fk_new_contractor_portfolios_contractor_id')
                ->references('contractor_id')
                ->on('contractors')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contractor_portfolios');
    }
};
