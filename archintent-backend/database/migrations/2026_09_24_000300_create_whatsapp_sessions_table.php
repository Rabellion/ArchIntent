<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The one place open-wa's logged-in WhatsApp session (a zipped Chrome
     * profile directory) is persisted, so the whatsapp-service dyno can
     * restore it on every restart/redeploy instead of asking for a fresh
     * QR scan each time. Heroku's own disk does not survive either of
     * those, but this database does.
     */
    public function up(): void
    {
        Schema::create('whatsapp_sessions', function (Blueprint $table) {
            $table->id();
            // One archive per open-wa sessionId; almost always exactly one row.
            $table->string('session_id')->unique();
            $table->longText('archive');
            $table->unsignedBigInteger('size_bytes');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_sessions');
    }
};
