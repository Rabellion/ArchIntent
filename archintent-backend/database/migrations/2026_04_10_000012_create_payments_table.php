<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->bigIncrements('payment_id');
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('payer_id');
            $table->unsignedBigInteger('payee_id');
            $table->decimal('amount', 15, 2);
            $table->string('stripe_payment_id')->nullable();
            $table->enum('payment_type', ['design', 'construction', 'refund']);
            $table->enum('payment_status', ['pending', 'held', 'completed', 'refunded'])->default('pending');
            $table->timestamps();

            // Foreign keys
            $table->foreign('project_id')
                ->references('project_id')
                ->on('projects')
                ->onDelete('cascade');

            $table->foreign('payer_id')
                ->references('user_id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('payee_id')
                ->references('user_id')
                ->on('users')
                ->onDelete('cascade');

            // Indexes
            $table->index('project_id', 'idx_payments_project');
            $table->index('payment_status', 'idx_payments_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
