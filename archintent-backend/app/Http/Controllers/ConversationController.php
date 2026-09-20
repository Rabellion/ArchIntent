<?php

namespace App\Http\Controllers;

use App\Models\Architect;
use App\Models\Contractor;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $conversations = Conversation::query()
            ->forUser($user->user_id)
            ->with([
                'participantOne.architect',
                'participantOne.contractor',
                'participantTwo.architect',
                'participantTwo.contractor',
                'project:project_id,project_title,project_status',
                'messages' => function ($query) {
                    $query->latest('created_at')->limit(1);
                },
            ])
            ->orderByDesc('last_message_at')
            ->orderByDesc('created_at')
            ->get();

        $data = $conversations->map(function (Conversation $conversation) use ($user) {
            $otherUser = $conversation->getOtherParticipant($user->user_id);
            $latestMessage = $conversation->messages->first();

            $unreadCount = Message::query()
                ->where('conversation_id', $conversation->conversation_id)
                ->where('sender_id', '!=', $user->user_id)
                ->where('is_read', false)
                ->count();

            return [
                'conversation_id' => $conversation->conversation_id,
                'project_id' => $conversation->project_id,
                'subject' => $conversation->subject,
                'conversation_type' => $conversation->conversation_type,
                'project' => $conversation->project ? [
                    'project_id' => $conversation->project->project_id,
                    'project_title' => $conversation->project->project_title,
                    'project_status' => $conversation->project->project_status,
                ] : null,
                'other_participant' => $otherUser ? $this->formatUser($otherUser) : null,
                'last_message_at' => $conversation->last_message_at?->toISOString(),
                'created_at' => $conversation->created_at?->toISOString(),
                'last_message' => $latestMessage ? [
                    'message_text' => mb_substr($latestMessage->message_text, 0, 60),
                    'sender_id' => $latestMessage->sender_id,
                    'created_at' => $latestMessage->created_at?->toISOString(),
                ] : null,
                'unread_count' => $unreadCount,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'other_user_id' => 'nullable|integer|exists:users,user_id',
            'recipient_user_id' => 'nullable|integer|exists:users,user_id',
            'project_id' => 'nullable|integer|exists:projects,project_id',
            'subject' => 'nullable|string|max:255',
            'initial_message' => 'nullable|string|min:1|max:2000',
        ]);

        $otherUserId = $validated['other_user_id'] ?? $validated['recipient_user_id'] ?? null;
        if (!$otherUserId) {
            return response()->json(['message' => 'other_user_id is required'], 422);
        }

        if ($request->is('api/conversations') && empty($validated['initial_message'])) {
            return response()->json(['message' => 'initial_message is required'], 422);
        }

        if (empty($validated['initial_message'])) {
            $validated['initial_message'] = 'Hi, I would like to start a conversation.';
        }

        $authUser = $request->user();
        $otherUser = User::findOrFail($otherUserId);

        if ((int) $authUser->user_id === (int) $otherUser->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot start a conversation with yourself',
            ], 422);
        }

        if (in_array($authUser->role, ['architect', 'contractor'], true) && $otherUser->role !== 'client') {
            return response()->json([
                'success' => false,
                'message' => 'You can only reply to clients who contact you first',
            ], 403);
        }

        if (in_array($authUser->role, ['architect', 'contractor'], true)) {
            $priorConversationExists = Conversation::query()
                ->forUser($authUser->user_id)
                ->where(function ($query) use ($otherUser) {
                    $query->where('participant_one_id', $otherUser->user_id)
                        ->orWhere('participant_two_id', $otherUser->user_id);
                })
                ->exists();

            if (!$priorConversationExists) {
                return response()->json([
                    'message' => 'You can only reply to clients who contact you first',
                ], 403);
            }
        }

        if (!$this->isConversationAllowed($authUser, $otherUser)) {
            return response()->json([
                'message' => 'You cannot message users of the same role',
            ], 403);
        }

        if ($authUser->role === 'client' && !$this->isClientTargetVerified($otherUser)) {
            return response()->json([
                'message' => 'Clients can only message verified architects or contractors',
            ], 403);
        }

        [$participantOneId, $participantTwoId] = Conversation::canonicalUserOrder($authUser->user_id, $otherUser->user_id);
        $projectId = $validated['project_id'] ?? null;

        $conversationQuery = Conversation::query()
            ->where(function ($query) use ($participantOneId, $participantTwoId) {
                $query->where(function ($inner) use ($participantOneId, $participantTwoId) {
                    $inner->where('participant_one_id', $participantOneId)
                        ->where('participant_two_id', $participantTwoId);
                })->orWhere(function ($inner) use ($participantOneId, $participantTwoId) {
                    $inner->where('participant_one_id', $participantTwoId)
                        ->where('participant_two_id', $participantOneId);
                });
            });

        if ($projectId) {
            $conversationQuery->where('project_id', $projectId);
        } else {
            $conversationQuery->whereNull('project_id');
        }

        $conversation = $conversationQuery->first();

        // If a project-specific thread does not exist, reuse any existing thread
        // between the same participants to avoid duplicate chats.
        if (!$conversation) {
            $conversation = Conversation::query()
                ->where(function ($query) use ($participantOneId, $participantTwoId) {
                    $query->where(function ($inner) use ($participantOneId, $participantTwoId) {
                        $inner->where('participant_one_id', $participantOneId)
                            ->where('participant_two_id', $participantTwoId);
                    })->orWhere(function ($inner) use ($participantOneId, $participantTwoId) {
                        $inner->where('participant_one_id', $participantTwoId)
                            ->where('participant_two_id', $participantOneId);
                    });
                })
                ->orderByDesc('last_message_at')
                ->orderByDesc('conversation_id')
                ->first();
        }

        if (!$conversation) {
            $conversation = Conversation::create([
                'participant_one_id' => $participantOneId,
                'participant_two_id' => $participantTwoId,
                'project_id' => $projectId,
                'subject' => $validated['subject'] ?? null,
                'conversation_type' => $projectId ? 'project_inquiry' : 'general',
            ]);
        }

        $message = Message::create([
            'conversation_id' => $conversation->conversation_id,
            'sender_id' => $authUser->user_id,
            'message_text' => trim($validated['initial_message']),
            'is_read' => false,
        ]);

        $conversation->update(['last_message_at' => now()]);

        $message->load('sender:user_id,full_name,role,profile_image');
        broadcast(new \App\Events\MessageSent($message))->toOthers();

        $conversation->load([
            'participantOne.architect',
            'participantOne.contractor',
            'participantTwo.architect',
            'participantTwo.contractor',
            'project:project_id,project_title,project_status',
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'conversation_id' => $conversation->conversation_id,
                'project_id' => $conversation->project_id,
                'subject' => $conversation->subject,
                'conversation_type' => $conversation->conversation_type,
                'project' => $conversation->project ? [
                    'project_id' => $conversation->project->project_id,
                    'project_title' => $conversation->project->project_title,
                    'project_status' => $conversation->project->project_status,
                ] : null,
                'other_participant' => $this->formatUser($conversation->getOtherParticipant($authUser->user_id)),
                'last_message_at' => $conversation->last_message_at?->toISOString(),
                'created_at' => $conversation->created_at?->toISOString(),
                'last_message' => [
                    'message_text' => mb_substr($message->message_text, 0, 60),
                    'sender_id' => $message->sender_id,
                    'created_at' => $message->created_at?->toISOString(),
                ],
                'unread_count' => 0,
                'message' => $this->formatMessage($message),
            ],
        ], 201);
    }

    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $conversation = Conversation::query()
            ->forUser($user->user_id)
            ->where('conversation_id', $id)
            ->with([
                'participantOne.architect',
                'participantOne.contractor',
                'participantTwo.architect',
                'participantTwo.contractor',
                'project:project_id,project_title,project_status,project_type',
            ])
            ->first();

        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found'], 404);
        }

        Message::query()
            ->where('conversation_id', $conversation->conversation_id)
            ->where('sender_id', '!=', $user->user_id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'data' => [
                'conversation_id' => $conversation->conversation_id,
                'project_id' => $conversation->project_id,
                'subject' => $conversation->subject,
                'conversation_type' => $conversation->conversation_type,
                'last_message_at' => $conversation->last_message_at?->toISOString(),
                'created_at' => $conversation->created_at?->toISOString(),
                'updated_at' => $conversation->updated_at?->toISOString(),
                'other_participant' => $this->formatUser($conversation->getOtherParticipant($user->user_id)),
                'project' => $conversation->project ? [
                    'project_id' => $conversation->project->project_id,
                    'project_title' => $conversation->project->project_title,
                    'project_status' => $conversation->project->project_status,
                    'project_type' => $conversation->project->project_type,
                ] : null,
            ],
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $conversation = Conversation::query()
            ->forUser($user->user_id)
            ->where('conversation_id', $id)
            ->first();

        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found'], 404);
        }

        $conversation->delete();

        return response()->json([
            'success' => true,
            'message' => 'Conversation deleted successfully',
        ]);
    }

    public function unreadCount(Request $request)
    {
        $user = $request->user();

        $count = Message::query()
            ->whereIn('conversation_id', function ($query) use ($user) {
                $query->select('conversation_id')
                    ->from('conversations')
                    ->where('participant_one_id', $user->user_id)
                    ->orWhere('participant_two_id', $user->user_id);
            })
            ->where('sender_id', '!=', $user->user_id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'unread_count' => $count,
            ],
        ]);
    }

    private function isConversationAllowed(User $authUser, User $otherUser): bool
    {
        if ($authUser->role === 'admin' || $otherUser->role === 'admin') {
            return true;
        }

        if ($authUser->role === $otherUser->role) {
            return false;
        }

        if ($authUser->role === 'contractor' && $otherUser->role === 'architect') {
            return false;
        }

        if ($authUser->role === 'architect' && $otherUser->role === 'contractor') {
            return false;
        }

        if (in_array($authUser->role, ['architect', 'contractor'], true) && $otherUser->role === 'client') {
            return true;
        }

        if ($authUser->role === 'client' && in_array($otherUser->role, ['architect', 'contractor'], true)) {
            return true;
        }

        return false;
    }

    private function isClientTargetVerified(User $otherUser): bool
    {
        if ($otherUser->role === 'architect') {
            return Architect::query()
                ->where('user_id', $otherUser->user_id)
                ->where('verification_status', 'verified')
                ->exists();
        }

        if ($otherUser->role === 'contractor') {
            return Contractor::query()
                ->where('user_id', $otherUser->user_id)
                ->where('verification_status', 'verified')
                ->exists();
        }

        return false;
    }

    private function formatUser(?User $user): ?array
    {
        if (!$user) {
            return null;
        }

        return [
            'user_id' => $user->user_id,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'role' => $user->role,
            'profile_image' => $user->profile_image,
            'account_status' => $user->account_status,
            'specialization' => $user->architect?->specialization,
            'company_name' => $user->contractor?->company_name,
        ];
    }

    private function formatMessage(Message $message): array
    {
        return [
            'message_id' => $message->message_id,
            'conversation_id' => $message->conversation_id,
            'sender_id' => $message->sender_id,
            'message_text' => $message->message_text,
            'is_read' => (bool) $message->is_read,
            'created_at' => $message->created_at?->toISOString(),
            'sender' => [
                'user_id' => $message->sender?->user_id,
                'full_name' => $message->sender?->full_name,
                'role' => $message->sender?->role,
                'profile_image' => $message->sender?->profile_image,
            ],
        ];
    }
}
