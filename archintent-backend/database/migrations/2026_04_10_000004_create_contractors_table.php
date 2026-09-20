<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contractors', function (Blueprint $table) {
            $table->bigIncrements('contractor_id');
            $table->unsignedBigInteger('user_id');
            $table->string('company_name');
            $table->string('registration_number')->nullable();
            $table->text('company_address');
            $table->enum('verification_status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->string('verification_document')->nullable();
            $table->integer('experience_years')->default(0);
            $table->string('specialization')->nullable();
            $table->text('bio');
            $table->timestamps();

            // Foreign key
            $table->foreign('user_id')
                ->references('user_id')
                ->on('users')
                ->onDelete('cascade');

            // Unique constraint
            $table->unique('user_id');

            // Indexes
            $table->index('verification_status', 'idx_contractors_verification');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contractors');
    }
};
