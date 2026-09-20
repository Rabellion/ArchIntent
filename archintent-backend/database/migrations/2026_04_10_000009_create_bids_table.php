<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bids', function (Blueprint $table) {
            $table->bigIncrements('bid_id');
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('contractor_id');
            $table->decimal('proposed_cost', 15, 2);
            $table->integer('estimated_duration');
            $table->text('proposal_text')->nullable();
            $table->enum('bid_status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->timestamps();

            // Foreign keys
            $table->foreign('project_id')
                ->references('project_id')
                ->on('projects')
                ->onDelete('cascade');

            $table->foreign('contractor_id')
                ->references('contractor_id')
                ->on('contractors')
                ->onDelete('cascade');

            // Indexes
            $table->index('project_id', 'idx_bids_project');
            $table->index('contractor_id', 'idx_bids_contractor');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bids');
    }
};
