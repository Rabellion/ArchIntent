<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_matches', function (Blueprint $table) {
            if (!Schema::hasColumn('project_matches', 'architect_project_id')) {
                $table->unsignedBigInteger('architect_project_id')->nullable()->after('architect_id');
                $table->foreign('architect_project_id')->references('architect_project_id')->on('architect_projects')->nullOnDelete();
                $table->index('architect_project_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('project_matches', function (Blueprint $table) {
            if (Schema::hasColumn('project_matches', 'architect_project_id')) {
                $table->dropForeign(['architect_project_id']);
                $table->dropIndex(['architect_project_id']);
                $table->dropColumn('architect_project_id');
            }
        });
    }
};
