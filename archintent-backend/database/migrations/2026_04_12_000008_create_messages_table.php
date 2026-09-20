<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->bigIncrements('message_id');
            $table->unsignedBigInteger('conversation_id');
            $table->unsignedBigInteger('sender_id');
            $table->text('body');
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->foreign('conversation_id')
                ->references('conversation_id')
                ->on('conversations')
                ->onDelete('cascade');

            $table->foreign('sender_id')
                ->references('user_id')
                ->on('users')
                ->onDelete('cascade');

            $table->index('conversation_id', 'idx_messages_conversation');
            $table->index(['conversation_id', 'is_read'], 'idx_messages_conversation_read');
            $table->index('sender_id', 'idx_messages_sender');
            $table->index('created_at', 'idx_messages_created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
