<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('design_revisions')) {
            return;
        }

        Schema::create('design_revisions', function (Blueprint $table) {
            $table->id('revision_id');
            $table->unsignedBigInteger('project_id');
            $table->text('revision_message');
            $table->enum('revision_status', ['pending', 'addressed', 'completed'])->default('pending');
            $table->timestamp('requested_at')->useCurrent();
            $table->timestamp('addressed_at')->nullable();
            $table->timestamps();

            $table->foreign('project_id')->references('project_id')->on('projects')->onDelete('cascade');
            $table->index('project_id');
            $table->index('revision_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('design_revisions');
    }
};
