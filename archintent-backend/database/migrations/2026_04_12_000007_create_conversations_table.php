<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->bigIncrements('conversation_id');
            $table->unsignedBigInteger('user_one_id');
            $table->unsignedBigInteger('user_two_id');
            $table->unsignedBigInteger('project_id')->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->foreign('user_one_id')
                ->references('user_id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('user_two_id')
                ->references('user_id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('project_id')
                ->references('project_id')
                ->on('projects')
                ->onDelete('set null');

            $table->index(['user_one_id', 'user_two_id'], 'idx_conversations_users');
            $table->index('project_id', 'idx_conversations_project');
            $table->index('last_message_at', 'idx_conversations_last_message_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
