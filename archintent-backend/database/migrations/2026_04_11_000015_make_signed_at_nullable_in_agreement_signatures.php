<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agreement_signatures', function (Blueprint $table) {
            // Change signed_at to nullable
            $table->timestamp('signed_at')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('agreement_signatures', function (Blueprint $table) {
            $table->timestamp('signed_at')->nullable(false)->change();
        });
    }
};
