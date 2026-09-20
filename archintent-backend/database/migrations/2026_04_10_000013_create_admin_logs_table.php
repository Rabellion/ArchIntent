<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_logs', function (Blueprint $table) {
            $table->bigIncrements('log_id');
            $table->unsignedBigInteger('admin_id');
            $table->string('action');
            $table->string('target_table')->nullable();
            $table->integer('target_id')->nullable();
            $table->text('description')->nullable();
            $table->timestamp('log_time');

            // Foreign key
            $table->foreign('admin_id')
                ->references('user_id')
                ->on('users')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_logs');
    }
};
