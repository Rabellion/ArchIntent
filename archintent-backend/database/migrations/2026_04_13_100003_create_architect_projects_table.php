<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('architect_projects', function (Blueprint $table) {
            $table->id('architect_project_id');
            $table->unsignedBigInteger('architect_portfolio_id');
            $table->string('project_ref', 20)->unique();
            $table->string('project_title', 255);
            $table->text('project_description')->nullable();
            $table->enum('project_type', ['residential', 'commercial', 'industrial', 'landscape']);
            $table->json('style_tags')->nullable();
            $table->string('location', 255)->nullable();
            $table->integer('area_sqft')->nullable();
            $table->year('year_completed')->nullable();
            $table->decimal('budget_range_min', 15, 2)->nullable();
            $table->decimal('budget_range_max', 15, 2)->nullable();
            $table->boolean('is_featured')->default(false);
            $table->enum('visibility', ['public', 'private'])->default('public');
            $table->timestamps();

            $table->foreign('architect_portfolio_id')->references('architect_portfolio_id')->on('architect_portfolios')->onDelete('cascade');
            $table->index('architect_portfolio_id');
            $table->index('project_type');
            $table->index('is_featured');
            $table->index('visibility');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('architect_projects');
    }
};
