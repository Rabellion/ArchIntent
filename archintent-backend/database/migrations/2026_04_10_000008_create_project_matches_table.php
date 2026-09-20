<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_matches', function (Blueprint $table) {
            $table->bigIncrements('match_id');
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('architect_id');
            $table->unsignedBigInteger('portfolio_id');
            $table->decimal('match_score', 5, 2);
            $table->timestamp('created_at');

            // Foreign keys
            $table->foreign('project_id')
                ->references('project_id')
                ->on('projects')
                ->onDelete('cascade');

            $table->foreign('architect_id')
                ->references('architect_id')
                ->on('architects')
                ->onDelete('cascade');

            $table->foreign('portfolio_id')
                ->references('portfolio_id')
                ->on('portfolios')
                ->onDelete('cascade');

            // Indexes
            $table->index('project_id', 'idx_matches_project');
            $table->index('architect_id', 'idx_matches_architect');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_matches');
    }
};
