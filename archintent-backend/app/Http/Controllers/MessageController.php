<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request, int $conversationId)
    {
        $user = $request->user();
        $conversation = $this->getAuthorizedConversation($conversationId, $user->user_id);

        if (!$conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Conversation not found',
            ], 404);
        }

        $page = max((int) $request->query('page', 1), 1);
        $perPage = 50;

        $messages = Message::query()
            ->where('conversation_id', $conversation->conversation_id)
            ->with('sender:user_id,full_name,role,profile_image')
            ->orderBy('created_at', 'asc')
            ->paginate($perPage, ['*'], 'page', $page);

        $markedReadCount = Message::query()
            ->where('conversation_id', $conversation->conversation_id)
            ->where('sender_id', '!=', $user->user_id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
            ]);

        return response()->json([
            'success' => true,
            'data' => collect($messages->items())->map(function (Message $message) {
                return [
                    'message_id' => $message->message_id,
                    'conversation_id' => $message->conversation_id,
                    'sender_id' => $message->sender_id,
                    'message_text' => $message->message_text,
                    'is_read' => (bool) $message->is_read,
                    'created_at' => $message->created_at?->toISOString(),
                    'updated_at' => $message->updated_at?->toISOString(),
                    'sender' => [
                        'user_id' => $message->sender?->user_id,
                        'full_name' => $message->sender?->full_name,
                        'role' => $message->sender?->role,
                        'profile_image' => $message->sender?->profile_image,
                    ],
                ];
            }),
            'meta' => [
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
                'marked_read' => $markedReadCount,
            ],
        ]);
    }

    public function store(Request $request, int $conversationId)
    {
        $validated = $request->validate([
            'message_text' => 'required|string|min:1|max:2000',
        ]);

        $user = $request->user();
        $conversation = $this->getAuthorizedConversation($conversationId, $user->user_id);

        if (!$conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Conversation not found',
            ], 404);
        }

        $message = Message::create([
            'conversation_id' => $conversation->conversation_id,
            'sender_id' => $user->user_id,
            'message_text' => trim($validated['message_text']),
            'is_read' => false,
        ]);

        $conversation->update([
            'last_message_at' => now(),
        ]);

        $message->load('sender:user_id,full_name,role,profile_image');

        broadcast(new MessageSent($message))->toOthers();

        return response()->json([
            'success' => true,
            'data' => [
                'message_id' => $message->message_id,
                'conversation_id' => $message->conversation_id,
                'sender_id' => $message->sender_id,
                'message_text' => $message->message_text,
                'is_read' => (bool) $message->is_read,
                'created_at' => $message->created_at?->toISOString(),
                'updated_at' => $message->updated_at?->toISOString(),
                'sender' => [
                    'user_id' => $message->sender?->user_id,
                    'full_name' => $message->sender?->full_name,
                    'role' => $message->sender?->role,
                    'profile_image' => $message->sender?->profile_image,
                ],
            ],
        ], 201);
    }

    public function markRead(Request $request, int $conversationId)
    {
        $user = $request->user();
        $conversation = $this->getAuthorizedConversation($conversationId, $user->user_id);

        if (!$conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Conversation not found',
            ], 404);
        }

        $markedRead = Message::query()
            ->where('conversation_id', $conversation->conversation_id)
            ->where('sender_id', '!=', $user->user_id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
            ]);

        return response()->json([
            'success' => true,
            'marked_read' => $markedRead,
        ]);
    }

    private function getAuthorizedConversation(int $conversationId, int $userId): ?Conversation
    {
        return Conversation::query()
            ->where('conversation_id', $conversationId)
            ->where(function ($query) use ($userId) {
                $query->where('participant_one_id', $userId)
                    ->orWhere('participant_two_id', $userId);
            })
            ->first();
    }
}
