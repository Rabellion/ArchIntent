<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agreement_signatures', function (Blueprint $table) {
            if (!Schema::hasColumn('agreement_signatures', 'created_at')) {
                $table->timestamp('created_at')->nullable();
            }
            if (!Schema::hasColumn('agreement_signatures', 'updated_at')) {
                $table->timestamp('updated_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('agreement_signatures', function (Blueprint $table) {
            if (Schema::hasColumn('agreement_signatures', 'created_at')) {
                $table->dropColumn('created_at');
            }
            if (Schema::hasColumn('agreement_signatures', 'updated_at')) {
                $table->dropColumn('updated_at');
            }
        });
    }
};
