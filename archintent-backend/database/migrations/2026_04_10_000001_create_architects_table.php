<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('architects', function (Blueprint $table) {
            $table->bigIncrements('architect_id');
            $table->unsignedBigInteger('user_id');
            $table->string('license_number')->nullable();
            $table->integer('experience_years')->default(0);
            $table->string('specialization');
            $table->text('bio');
            $table->enum('verification_status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->string('verification_document')->nullable();
            $table->timestamps();

            // Foreign key
            $table->foreign('user_id')
                ->references('user_id')
                ->on('users')
                ->onDelete('cascade');

            // Unique constraint
            $table->unique('user_id');

            // Indexes
            $table->index('verification_status', 'idx_architects_verification');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('architects');
    }
};
