import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Send } from 'lucide-react';
import { ChatMessage, ConversationItem } from '../../types/chat';

interface Props {
  conversation: ConversationItem | null;
  currentUserId: number;
  messages: ChatMessage[];
  loading?: boolean;
  sending?: boolean;
  onSend: (body: string) => Promise<void>;
}

const ChatWindow: React.FC<Props> = ({
  conversation,
  currentUserId,
  messages,
  loading = false,
  sending = false,
  onSend,
}) => {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messages]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages.length, conversation?.conversation_id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || !conversation) {
      return;
    }

    const body = draft;
    setDraft('');
    await onSend(body);
  };

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 bg-slate-950 px-6 text-center text-sm">
        Select a conversation to begin chatting.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-900 shrink-0">
        <p className="font-semibold text-slate-100">{conversation.other_participant?.full_name}</p>
        <p className="text-xs text-slate-400">
          {conversation.project?.project_title || `Role: ${conversation.other_participant?.role || 'user'}`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
        {loading ? (
          <div className="text-sm text-slate-500">Loading messages...</div>
        ) : sortedMessages.length === 0 ? (
          <div className="text-sm text-slate-500">No messages yet. Say hello.</div>
        ) : (
          <div className="space-y-3">
            {sortedMessages.map((message) => {
              const isMine = message.sender_id === currentUserId;
              return (
                <div
                  key={message.message_id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 ${
                      isMine
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 border border-slate-600 text-slate-100'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                    <p className={`text-[11px] mt-1 ${isMine ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {format(new Date(message.created_at), 'p')}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-700 bg-slate-900 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message..."
            aria-label="Message text"
            className="flex-1 border border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
          >
            <Send size={16} aria-hidden />
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
