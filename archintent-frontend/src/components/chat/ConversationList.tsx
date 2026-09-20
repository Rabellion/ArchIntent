import { formatDistanceToNow } from 'date-fns';
import { ConversationItem } from '../../types/chat';

interface Props {
  conversations: ConversationItem[];
  activeConversationId: number | null;
  onSelect: (conversationId: number) => void;
  loading?: boolean;
}

const ConversationList: React.FC<Props> = ({
  conversations,
  activeConversationId,
  onSelect,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="p-4 text-sm text-slate-400">
        Loading conversations...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-400 leading-relaxed">
        No conversations yet. Start one from architect, project, or job pages.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-800">
      {conversations.map((conversation) => {
        const isActive = conversation.conversation_id === activeConversationId;
        const displayName = conversation.other_participant?.full_name || 'Unknown User';
        const subtitle =
          conversation.project?.project_title ||
          conversation.other_participant?.role ||
          conversation.subject ||
          'Conversation';
        const lastMessage = conversation.last_message?.message_text || 'No messages yet';

        return (
          <button
            key={conversation.conversation_id}
            type="button"
            className={`w-full text-left px-4 py-3 transition ${
              isActive ? 'bg-slate-800 ring-1 ring-inset ring-indigo-500/40' : 'hover:bg-slate-900/80'
            }`}
            onClick={() => onSelect(conversation.conversation_id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-100 truncate">{displayName}</p>
                <p className="text-xs text-slate-500 truncate">{subtitle}</p>
                <p className="text-sm text-slate-400 truncate mt-1">{lastMessage}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {conversation.last_message_at && (
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                  </span>
                )}
                {conversation.unread_count > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-rose-600 text-white font-semibold">
                    {conversation.unread_count}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ConversationList;
