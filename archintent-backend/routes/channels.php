<?php

use App\Models\Conversation;
use Illuminate\Support\Facades\Broadcast;

Broadcast::routes(['middleware' => ['auth.api']]);

Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    $conv = Conversation::find((int) $conversationId);
    if (!$conv) {
        return false;
    }

    return (int) $user->user_id === (int) $conv->participant_one_id
        || (int) $user->user_id === (int) $conv->participant_two_id;
});
