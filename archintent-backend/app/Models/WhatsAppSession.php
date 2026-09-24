<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A zipped, base64-encoded open-wa Chrome profile, keyed by open-wa's
 * sessionId. See the create_whatsapp_sessions_table migration.
 */
class WhatsAppSession extends Model
{
    // Eloquent's naming convention would otherwise infer "whats_app_sessions"
    // (it splits "WhatsApp" into two words), not the migration's table name.
    protected $table = 'whatsapp_sessions';

    protected $fillable = ['session_id', 'archive', 'size_bytes'];
}
