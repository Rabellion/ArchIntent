<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->decimal('platform_fee', 15, 2)->default(0)->after('amount');
            $table->decimal('payee_amount', 15, 2)->nullable()->after('platform_fee');
        });

        DB::table('payments')->whereNull('payee_amount')->update([
            'payee_amount' => DB::raw('amount'),
        ]);
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['platform_fee', 'payee_amount']);
        });
    }
};
