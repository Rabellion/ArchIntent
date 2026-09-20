<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budz_wallets', function (Blueprint $table) {
            $table->bigIncrements('wallet_id');
            $table->unsignedBigInteger('contractor_id')->unique();
            $table->integer('balance')->default(0);
            $table->integer('total_purchased')->default(0);
            $table->timestamps();

            $table->foreign('contractor_id')
                ->references('contractor_id')
                ->on('contractors')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budz_wallets');
    }
};
