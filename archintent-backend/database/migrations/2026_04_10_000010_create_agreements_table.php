<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agreements', function (Blueprint $table) {
            $table->bigIncrements('agreement_id');
            $table->unsignedBigInteger('project_id');
            $table->string('agreement_file_path')->nullable();
            $table->enum('agreement_status', ['draft', 'pending_signatures', 'signed'])->default('draft');
            $table->timestamps();

            // Foreign key
            $table->foreign('project_id')
                ->references('project_id')
                ->on('projects')
                ->onDelete('cascade');

            // Unique constraint
            $table->unique('project_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agreements');
    }
};
