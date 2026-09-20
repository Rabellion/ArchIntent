import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../context/AuthContext';
import { useUnreadCount } from '../../context/UnreadCountContext';

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { refreshUnreadCount } = useUnreadCount();
  const [searchParams] = useSearchParams();

  const {
    conversations,
    activeConversationId,
    activeConversation,
    setSelectedConversationId,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    sendMessage,
    markAsRead,
  } = useChat();

  useEffect(() => {
    document.title = 'Messages - ArchIntent';
  }, []);

  useEffect(() => {
    const conversationFromQuery = Number(searchParams.get('conversation'));
    if (conversationFromQuery) {
      setSelectedConversationId(conversationFromQuery);
    }
  }, [searchParams, setSelectedConversationId]);

  useEffect(() => {
    if (activeConversationId) {
      markAsRead(activeConversationId).then(() => refreshUnreadCount());
    }
  }, [activeConversationId, markAsRead, refreshUnreadCount]);

  return (
    <div className="h-[calc(100vh-9rem)] bg-slate-900 rounded-xl shadow-lg shadow-black/20 overflow-hidden border border-slate-700 text-slate-100">
      <div className="h-full grid grid-cols-1 md:grid-cols-3">
        <div className="md:col-span-1 border-r border-slate-700 overflow-y-auto bg-slate-950">
          <div className="px-4 py-3 border-b border-slate-700 bg-slate-900">
            <h1 className="font-semibold text-slate-100 tracking-tight">Messages</h1>
          </div>
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelect={setSelectedConversationId}
            loading={isLoadingConversations}
          />
        </div>

        <div className="md:col-span-2 h-full">
          <ChatWindow
            conversation={activeConversation}
            currentUserId={user?.user_id || 0}
            messages={messages}
            loading={isLoadingMessages}
            sending={isSending}
            onSend={async (body) => {
              if (!activeConversationId) {
                return;
              }
              await sendMessage(activeConversationId, body);
              await refreshUnreadCount();
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
