<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add rejection_reason to architects (if not already exists)
        if (!Schema::hasColumn('architects', 'rejection_reason')) {
            Schema::table('architects', function (Blueprint $table) {
                $table->string('rejection_reason')->nullable()->after('verification_status');
            });
        }

        // Add rejection_reason to contractors (if not already exists)
        if (!Schema::hasColumn('contractors', 'rejection_reason')) {
            Schema::table('contractors', function (Blueprint $table) {
                $table->string('rejection_reason')->nullable()->after('verification_status');
            });
        }

        // Add soft deletes to users (if not already exists)
        if (!Schema::hasColumn('users', 'deleted_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->softDeletes()->after('account_status');
            });
        }
    }

    public function down(): void
    {
        Schema::table('architects', function (Blueprint $table) {
            $table->dropColumn('rejection_reason');
        });

        Schema::table('contractors', function (Blueprint $table) {
            $table->dropColumn('rejection_reason');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
