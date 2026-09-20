<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portfolios', function (Blueprint $table) {
            $table->bigIncrements('portfolio_id');
            $table->unsignedBigInteger('architect_id');
            $table->string('title');
            $table->text('description');
            $table->json('style_tags');
            $table->decimal('budget_min', 15, 2);
            $table->decimal('budget_max', 15, 2);
            $table->string('semantic_vector_id')->nullable();
            $table->enum('visibility', ['public', 'private'])->default('public');
            $table->timestamps();

            // Foreign key
            $table->foreign('architect_id')
                ->references('architect_id')
                ->on('architects')
                ->onDelete('cascade');

            // Indexes
            $table->index('architect_id', 'idx_portfolios_architect');
            $table->index('visibility', 'idx_portfolios_visibility');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolios');
    }
};
