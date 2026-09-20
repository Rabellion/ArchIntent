<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email_otp', 64)->nullable()->after('email');
            $table->timestamp('email_otp_expires_at')->nullable()->after('email_otp');
            $table->timestamp('email_verified_at')->nullable()->after('email_otp_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['email_otp', 'email_otp_expires_at', 'email_verified_at']);
        });
    }
};
