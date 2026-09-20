<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // First, update existing NULL phone_numbers to a placeholder
        DB::table('users')->whereNull('phone_number')->update(['phone_number' => '']);
        
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone_number')->change();
            $table->enum('identity_type', ['cnic', 'passport'])->nullable();
            $table->string('identity_number')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone_number')->nullable()->change();
            $table->dropColumn(['identity_type', 'identity_number']);
        });
    }
};
