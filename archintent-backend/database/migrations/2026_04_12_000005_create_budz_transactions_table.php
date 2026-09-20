<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budz_transactions', function (Blueprint $table) {
            $table->bigIncrements('transaction_id');
            $table->unsignedBigInteger('contractor_id');
            $table->enum('transaction_type', ['purchase', 'spent', 'refunded']);
            $table->integer('budz_amount');
            $table->integer('balance_after');
            $table->string('description', 255);
            $table->string('stripe_payment_id')->nullable();
            $table->integer('reference_id')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('contractor_id')
                ->references('contractor_id')
                ->on('contractors')
                ->onDelete('cascade');

            $table->index('contractor_id');
            $table->index('transaction_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budz_transactions');
    }
};
