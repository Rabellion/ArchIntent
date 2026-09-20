<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('phone_verified_at')->nullable()->after('phone_number');
        });

        Schema::table('architects', function (Blueprint $table) {
            $table->string('stripe_connect_account_id', 64)->nullable()->after('verification_document');
            $table->boolean('stripe_connect_onboarding_complete')->default(false)->after('stripe_connect_account_id');
        });

        Schema::table('contractors', function (Blueprint $table) {
            $table->string('stripe_connect_account_id', 64)->nullable()->after('verification_document');
            $table->boolean('stripe_connect_onboarding_complete')->default(false)->after('stripe_connect_account_id');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->string('stripe_transfer_id', 64)->nullable()->after('stripe_payment_id');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('stripe_transfer_id');
        });

        Schema::table('contractors', function (Blueprint $table) {
            $table->dropColumn(['stripe_connect_account_id', 'stripe_connect_onboarding_complete']);
        });

        Schema::table('architects', function (Blueprint $table) {
            $table->dropColumn(['stripe_connect_account_id', 'stripe_connect_onboarding_complete']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('phone_verified_at');
        });
    }
};
