<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Drop the four archived portfolio tables.
 *
 * Migration 2026_04_13_100001_archive_old_portfolio_tables renamed the
 * original portfolio tables to "*_old" when the architect/contractor
 * portfolio split replaced them. That was the right call at the time --
 * it kept a rollback path while the new schema settled.
 *
 * They are now dead weight:
 *   - no application code, model, route or seeder references them;
 *   - the only mention anywhere is the archival migration itself;
 *   - all four are empty.
 *
 * Leaving them in place means the schema presents two competing
 * portfolio designs, which is confusing to anyone reading the ER model.
 *
 * Child tables are dropped before their parents so the foreign keys
 * (portfolio_images_old.portfolio_id -> portfolios_old.portfolio_id,
 * and the contractor equivalent) do not block the drop.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('portfolio_images_old');
        Schema::dropIfExists('contractor_portfolio_images_old');
        Schema::dropIfExists('portfolios_old');
        Schema::dropIfExists('contractor_portfolios_old');
    }

    /**
     * Deliberately a no-op.
     *
     * These tables were empty archives, so there is nothing to restore.
     * Recreating hollow copies would only reintroduce the confusion this
     * migration removes. If the old schema is ever genuinely needed, it
     * is recoverable from the archived dump (archintent.sql) or from
     * migration 2026_04_13_100001 in version control.
     */
    public function down(): void
    {
        // No rollback: the dropped tables held no data.
    }
};
