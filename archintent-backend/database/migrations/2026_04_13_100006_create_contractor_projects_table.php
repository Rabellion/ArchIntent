<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contractor_projects', function (Blueprint $table) {
            $table->id('contractor_project_id');
            $table->unsignedBigInteger('contractor_portfolio_id');
            $table->string('project_ref', 20)->unique();
            $table->string('project_title', 255);
            $table->text('project_description')->nullable();
            $table->enum('project_type', ['residential', 'commercial', 'industrial', 'landscape', 'renovation', 'infrastructure']);
            $table->string('location', 255)->nullable();
            $table->integer('area_sqft')->nullable();
            $table->date('completion_date')->nullable();
            $table->decimal('project_value_pkr', 15, 2)->nullable();
            $table->integer('duration_days')->nullable();
            $table->text('client_feedback')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->enum('visibility', ['public', 'private'])->default('public');
            $table->timestamps();

            $table->foreign('contractor_portfolio_id')->references('contractor_portfolio_id')->on('contractor_portfolios')->onDelete('cascade');
            $table->index('contractor_portfolio_id');
            $table->index('project_type');
            $table->index('is_featured');
            $table->index('visibility');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contractor_projects');
    }
};
