<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('architects', function (Blueprint $table) {
            // Required core identity
            $table->string('cnic', 20)->nullable()->after('license_number');
            $table->string('city', 100)->nullable()->after('cnic');

            // Project type specializations (JSON array — e.g. ["Residential", "Commercial"])
            $table->json('design_types')->nullable()->after('city');

            // Primary verification body for architects in Pakistan
            $table->string('pcatp_number', 50)->nullable()->after('bio');
            $table->string('pcatp_document')->nullable()->after('pcatp_number');

            // Optional supplementary credentials
            $table->string('ntn_number', 20)->nullable()->after('pcatp_document');
            $table->string('ntn_document')->nullable()->after('ntn_number');
        });
    }

    public function down(): void
    {
        Schema::table('architects', function (Blueprint $table) {
            $table->dropColumn([
                'cnic',
                'city',
                'design_types',
                'pcatp_number',
                'pcatp_document',
                'ntn_number',
                'ntn_document',
            ]);
        });
    }
};
