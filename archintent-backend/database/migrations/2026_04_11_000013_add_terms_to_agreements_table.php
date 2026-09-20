<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('agreements')) {
            return;
        }

        Schema::table('agreements', function (Blueprint $table) {
            if (!Schema::hasColumn('agreements', 'scope_of_work')) {
                $table->text('scope_of_work')->nullable();
            }
            if (!Schema::hasColumn('agreements', 'deliverables')) {
                $table->text('deliverables')->nullable();
            }
            if (!Schema::hasColumn('agreements', 'timeline_days')) {
                $table->integer('timeline_days')->nullable();
            }
            if (!Schema::hasColumn('agreements', 'payment_terms')) {
                $table->text('payment_terms')->nullable();
            }
            if (!Schema::hasColumn('agreements', 'revision_policy')) {
                $table->text('revision_policy')->nullable();
            }
            if (!Schema::hasColumn('agreements', 'cancellation_terms')) {
                $table->text('cancellation_terms')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('agreements')) {
            return;
        }

        Schema::table('agreements', function (Blueprint $table) {
            $dropColumns = [];

            foreach (['scope_of_work', 'deliverables', 'timeline_days', 'payment_terms', 'revision_policy', 'cancellation_terms'] as $column) {
                if (Schema::hasColumn('agreements', $column)) {
                    $dropColumns[] = $column;
                }
            }

            if (!empty($dropColumns)) {
                $table->dropColumn($dropColumns);
            }
        });
    }
};
