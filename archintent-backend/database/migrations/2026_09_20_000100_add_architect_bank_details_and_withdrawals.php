<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Demo bank-transfer payout path for architects.
 *
 * The platform already supports real payouts through Stripe Connect
 * (ArchitectStripeConnectController). Stripe Connect is not available
 * to every account in every region, so this adds a simple local
 * bank-details record and a withdrawal request log, allowing the payout
 * journey to be demonstrated end to end without depending on Stripe
 * onboarding.
 *
 * NOTE: this path records intent only. It does NOT move money. A
 * withdrawal row is a request an operator would action manually.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('architects', function (Blueprint $table) {
            $table->string('bank_name', 120)->nullable()->after('verification_document');
            $table->string('bank_account_title', 150)->nullable()->after('bank_name');
            $table->string('bank_account_number', 34)->nullable()->after('bank_account_title');
            $table->string('bank_iban', 34)->nullable()->after('bank_account_number');
            $table->timestamp('bank_details_updated_at')->nullable()->after('bank_iban');
        });

        Schema::create('architect_withdrawals', function (Blueprint $table) {
            $table->bigIncrements('withdrawal_id');
            $table->unsignedBigInteger('architect_id');
            $table->decimal('amount', 15, 2);

            // requested -> approved/rejected is an operator decision.
            $table->enum('status', ['requested', 'approved', 'rejected'])
                ->default('requested');

            // Snapshot of where the money was to be sent, so a later
            // edit to the architect's bank details cannot rewrite the
            // history of an already-submitted request.
            $table->string('bank_name', 120)->nullable();
            $table->string('bank_account_title', 150)->nullable();
            $table->string('bank_account_last4', 4)->nullable();

            $table->string('note', 255)->nullable();
            $table->timestamp('requested_at')->useCurrent();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->foreign('architect_id')
                ->references('architect_id')->on('architects')
                ->onDelete('cascade');

            $table->index(['architect_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('architect_withdrawals');

        Schema::table('architects', function (Blueprint $table) {
            $table->dropColumn([
                'bank_name',
                'bank_account_title',
                'bank_account_number',
                'bank_iban',
                'bank_details_updated_at',
            ]);
        });
    }
};
