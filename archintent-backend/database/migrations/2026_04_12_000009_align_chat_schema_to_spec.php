<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function hasIndex(string $table, string $indexName): bool
    {
        $result = DB::selectOne(
            'SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
            [$table, $indexName]
        );

        return ((int) ($result->cnt ?? 0)) > 0;
    }

    private function dropIndexIfPossible(string $sql): void
    {
        try {
            DB::statement($sql);
        } catch (QueryException $exception) {
            // Some legacy indexes are bound to FKs and cannot be dropped safely in-place.
        }
    }

    public function up(): void
    {
        if (Schema::hasTable('conversations')) {
            if (Schema::hasColumn('conversations', 'user_one_id') && !Schema::hasColumn('conversations', 'participant_one_id')) {
                DB::statement('ALTER TABLE conversations CHANGE user_one_id participant_one_id BIGINT UNSIGNED NOT NULL');
            }

            if (Schema::hasColumn('conversations', 'user_two_id') && !Schema::hasColumn('conversations', 'participant_two_id')) {
                DB::statement('ALTER TABLE conversations CHANGE user_two_id participant_two_id BIGINT UNSIGNED NOT NULL');
            }

            Schema::table('conversations', function (Blueprint $table) {
                if (!Schema::hasColumn('conversations', 'subject')) {
                    $table->string('subject', 255)->nullable()->after('project_id');
                }

                if (!Schema::hasColumn('conversations', 'conversation_type')) {
                    $table->enum('conversation_type', ['general', 'project_inquiry', 'project_active'])
                        ->default('general')
                        ->after('subject');
                }
            });

            if ($this->hasIndex('conversations', 'idx_conversations_users')) {
                $this->dropIndexIfPossible('ALTER TABLE conversations DROP INDEX idx_conversations_users');
            }

            if ($this->hasIndex('conversations', 'idx_conversations_project')) {
                $this->dropIndexIfPossible('ALTER TABLE conversations DROP INDEX idx_conversations_project');
            }

            if ($this->hasIndex('conversations', 'idx_conversations_last_message_at')) {
                $this->dropIndexIfPossible('ALTER TABLE conversations DROP INDEX idx_conversations_last_message_at');
            }

            Schema::table('conversations', function (Blueprint $table) {
                if (!Schema::hasColumn('conversations', 'participant_one_id') || !Schema::hasColumn('conversations', 'participant_two_id')) {
                    return;
                }

                if (!DB::selectOne('SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?', ['conversations', 'uniq_conv_participants_project'])->cnt) {
                    $table->unique(['participant_one_id', 'participant_two_id', 'project_id'], 'uniq_conv_participants_project');
                }

                if (!DB::selectOne('SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?', ['conversations', 'idx_conversations_participant_one'])->cnt) {
                    $table->index('participant_one_id', 'idx_conversations_participant_one');
                }

                if (!DB::selectOne('SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?', ['conversations', 'idx_conversations_participant_two'])->cnt) {
                    $table->index('participant_two_id', 'idx_conversations_participant_two');
                }

                if (!DB::selectOne('SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?', ['conversations', 'idx_conversations_project'])->cnt) {
                    $table->index('project_id', 'idx_conversations_project');
                }

                if (!DB::selectOne('SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?', ['conversations', 'idx_conversations_last_message_at'])->cnt) {
                    $table->index('last_message_at', 'idx_conversations_last_message_at');
                }
            });
        }

        if (Schema::hasTable('messages')) {
            if (Schema::hasColumn('messages', 'body') && !Schema::hasColumn('messages', 'message_text')) {
                DB::statement('ALTER TABLE messages CHANGE body message_text TEXT NOT NULL');
            }

            if ($this->hasIndex('messages', 'idx_messages_conversation')) {
                $this->dropIndexIfPossible('ALTER TABLE messages DROP INDEX idx_messages_conversation');
            }

            if ($this->hasIndex('messages', 'idx_messages_conversation_read')) {
                $this->dropIndexIfPossible('ALTER TABLE messages DROP INDEX idx_messages_conversation_read');
            }

            if ($this->hasIndex('messages', 'idx_messages_sender')) {
                $this->dropIndexIfPossible('ALTER TABLE messages DROP INDEX idx_messages_sender');
            }

            if ($this->hasIndex('messages', 'idx_messages_created_at')) {
                $this->dropIndexIfPossible('ALTER TABLE messages DROP INDEX idx_messages_created_at');
            }

            Schema::table('messages', function (Blueprint $table) {
                if (!DB::selectOne('SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?', ['messages', 'idx_messages_conversation'])->cnt) {
                    $table->index('conversation_id', 'idx_messages_conversation');
                }

                if (!DB::selectOne('SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?', ['messages', 'idx_messages_sender'])->cnt) {
                    $table->index('sender_id', 'idx_messages_sender');
                }

                if (!DB::selectOne('SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?', ['messages', 'idx_messages_is_read'])->cnt) {
                    $table->index('is_read', 'idx_messages_is_read');
                }
            });
        }
    }

    public function down(): void
    {
        // Intentionally left empty because this migration aligns existing chat schema in-place.
    }
};
