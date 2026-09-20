<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contractors', function (Blueprint $table) {
            // Required core identity fields
            $table->string('cnic', 20)->nullable()->after('company_name');
            $table->string('city', 100)->nullable()->after('cnic');

            // Types of work offered (stored as JSON array)
            $table->json('work_types')->nullable()->after('city');

            // Optional verification numbers (contractor chooses to add these)
            $table->string('pec_registration', 50)->nullable()->after('bio');   // Pakistan Engineering Council
            $table->string('secp_number', 50)->nullable()->after('pec_registration'); // Securities & Exchange Commission
            $table->string('ntn_number', 20)->nullable()->after('secp_number');  // National Tax Number (FBR)

            // Optional verification document for each additional credential
            $table->string('pec_document')->nullable()->after('ntn_number');
            $table->string('secp_document')->nullable()->after('pec_document');
            $table->string('ntn_document')->nullable()->after('secp_document');
        });
    }

    public function down(): void
    {
        Schema::table('contractors', function (Blueprint $table) {
            $table->dropColumn([
                'cnic',
                'city',
                'work_types',
                'pec_registration',
                'secp_number',
                'ntn_number',
                'pec_document',
                'secp_document',
                'ntn_document',
            ]);
        });
    }
};
