<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budz_packages', function (Blueprint $table) {
            $table->bigIncrements('package_id');
            $table->string('name', 100);
            $table->integer('budz_amount');
            $table->decimal('price_pkr', 10, 2);
            $table->string('stripe_price_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('budz_packages')->insert([
            ['name' => 'Starter Pack', 'budz_amount' => 50, 'price_pkr' => 200.00, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Basic Pack', 'budz_amount' => 150, 'price_pkr' => 500.00, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Pro Pack', 'budz_amount' => 400, 'price_pkr' => 1200.00, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Elite Pack', 'budz_amount' => 1000, 'price_pkr' => 2500.00, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('budz_packages');
    }
};
