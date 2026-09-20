<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agreement_signatures', function (Blueprint $table) {
            $table->bigIncrements('signature_id');
            $table->unsignedBigInteger('agreement_id');
            $table->unsignedBigInteger('user_id');
            $table->timestamp('signed_at');

            // Foreign keys
            $table->foreign('agreement_id')
                ->references('agreement_id')
                ->on('agreements')
                ->onDelete('cascade');

            $table->foreign('user_id')
                ->references('user_id')
                ->on('users')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agreement_signatures');
    }
};
