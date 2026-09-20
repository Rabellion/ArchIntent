<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->bigIncrements('user_id');
            $table->string('full_name');
            $table->string('email')->unique('idx_users_email');
            $table->string('password_hash');
            $table->enum('role', ['client', 'architect', 'contractor', 'admin']);
            $table->string('phone_number')->nullable();
            $table->string('profile_image')->nullable();
            $table->enum('account_status', ['active', 'suspended', 'pending'])->default('pending');
            $table->timestamps();

            $table->index('role', 'idx_users_role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
