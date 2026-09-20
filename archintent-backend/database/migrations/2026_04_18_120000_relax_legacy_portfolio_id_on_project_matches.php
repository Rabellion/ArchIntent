<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('project_matches') || !Schema::hasColumn('project_matches', 'portfolio_id')) {
            return;
        }

        // Drop legacy FK to portfolios/portfolios_old if it exists.
        $hasLegacyForeign = DB::table('information_schema.table_constraints')
            ->where('constraint_schema', DB::raw('DATABASE()'))
            ->where('table_name', 'project_matches')
            ->where('constraint_type', 'FOREIGN KEY')
            ->where('constraint_name', 'project_matches_portfolio_id_foreign')
            ->exists();

        if ($hasLegacyForeign) {
            Schema::table('project_matches', function (Blueprint $table) {
                $table->dropForeign('project_matches_portfolio_id_foreign');
            });
        }

        // Keep legacy column for compatibility, but allow NULL so new matching flow can omit it.
        DB::statement('ALTER TABLE project_matches MODIFY portfolio_id BIGINT UNSIGNED NULL');
    }

    public function down(): void
    {
        if (!Schema::hasTable('project_matches') || !Schema::hasColumn('project_matches', 'portfolio_id')) {
            return;
        }

        DB::statement('ALTER TABLE project_matches MODIFY portfolio_id BIGINT UNSIGNED NOT NULL');

        // Restore FK for rollback compatibility.
        $hasLegacyForeign = DB::table('information_schema.table_constraints')
            ->where('constraint_schema', DB::raw('DATABASE()'))
            ->where('table_name', 'project_matches')
            ->where('constraint_type', 'FOREIGN KEY')
            ->where('constraint_name', 'project_matches_portfolio_id_foreign')
            ->exists();

        if (!$hasLegacyForeign) {
            Schema::table('project_matches', function (Blueprint $table) {
                $table->foreign('portfolio_id', 'project_matches_portfolio_id_foreign')
                    ->references('portfolio_id')
                    ->on('portfolios_old')
                    ->onDelete('cascade');
            });
        }
    }
};
