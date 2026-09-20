<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->bigIncrements('project_id');
            $table->unsignedBigInteger('client_id');
            $table->unsignedBigInteger('selected_architect_id')->nullable();
            $table->unsignedBigInteger('selected_contractor_id')->nullable();
            $table->string('project_title');
            $table->text('brief_text');
            $table->json('extracted_parameters')->nullable();
            $table->decimal('budget', 15, 2);
            $table->string('location');
            $table->enum('project_type', ['residential', 'commercial', 'industrial', 'landscape']);
            $table->enum('project_status', [
                'created', 'matched', 'architect_selected', 'agreement_pending',
                'payment_pending', 'design_in_progress', 'design_delivered', 'design_approved',
                'construction_open', 'contractor_selected', 'in_construction', 'completed'
            ])->default('created');
            $table->string('semantic_vector_id')->nullable();
            $table->string('design_file_path')->nullable();
            $table->timestamp('design_delivered_at')->nullable();
            $table->timestamp('mda_verification_deadline')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('client_id')
                ->references('user_id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('selected_architect_id')
                ->references('architect_id')
                ->on('architects')
                ->onDelete('set null');

            $table->foreign('selected_contractor_id')
                ->references('contractor_id')
                ->on('contractors')
                ->onDelete('set null');

            // Indexes
            $table->index('client_id', 'idx_projects_client');
            $table->index('project_status', 'idx_projects_status');
            $table->index('selected_architect_id', 'idx_projects_architect');
            $table->index('selected_contractor_id', 'idx_projects_contractor');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
