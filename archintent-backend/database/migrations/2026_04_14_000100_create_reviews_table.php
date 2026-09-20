<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->bigIncrements('review_id');
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('reviewer_id');
            $table->unsignedBigInteger('reviewee_id');
            $table->enum('reviewee_type', ['architect', 'contractor']);
            $table->unsignedTinyInteger('rating');
            $table->string('review_title', 255)->nullable();
            $table->text('review_text')->nullable();
            $table->boolean('is_verified')->default(true);
            $table->timestamps();

            $table->foreign('project_id')
                ->references('project_id')
                ->on('projects')
                ->onDelete('cascade');

            $table->foreign('reviewer_id')
                ->references('user_id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('reviewee_id')
                ->references('user_id')
                ->on('users')
                ->onDelete('cascade');

            $table->unique(['project_id', 'reviewer_id', 'reviewee_type'], 'uniq_reviews_project_reviewer_type');
            $table->index(['reviewee_id', 'reviewee_type'], 'idx_reviews_reviewee');
            $table->index('project_id', 'idx_reviews_project');
            $table->index('rating', 'idx_reviews_rating');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
