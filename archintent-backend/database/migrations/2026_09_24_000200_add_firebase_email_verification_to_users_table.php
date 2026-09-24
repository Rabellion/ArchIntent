<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // The Firebase account created solely so Firebase will send
            // the verification email. Laravel remains the source of truth
            // for auth; this is never used to log anyone in.
            $table->string('firebase_uid', 128)->nullable()->index();
            // Random, server-generated, stored encrypted (cast on the
            // model). Needed to obtain the Firebase ID token that sending
            // and checking the verification email both require.
            $table->text('firebase_password')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['firebase_uid']);
            $table->dropColumn(['firebase_uid', 'firebase_password']);
        });
    }
};
