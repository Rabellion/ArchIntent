import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance from '../api/axios';
import { getEcho } from '../lib/echo';
import { ChatMessage, ConversationItem } from '../types/chat';
import { useAuth } from '../context/AuthContext';

interface MessagesResponse {
  data: ChatMessage[];
}

const sortByLastActivity = (list: ConversationItem[]) => {
  return [...list].sort((a, b) => {
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
  });
};

export const useChat = () => {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.conversation_id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const activeConversationId = activeConversation?.conversation_id ?? null;
  const subscribedConversationRef = useRef<number | null>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const response = await axiosInstance.get('/conversations');
      const list: ConversationItem[] = Array.isArray(response.data?.data) ? response.data.data : [];
      const sorted = sortByLastActivity(list);
      setConversations(sorted);

      if (!selectedConversationId && sorted.length > 0) {
        setSelectedConversationId(sorted[0].conversation_id);
      }
    } finally {
      setIsLoadingConversations(false);
    }
  }, [selectedConversationId]);

  const fetchMessages = useCallback(async (conversationId: number, page = 1) => {
    setIsLoadingMessages(true);
    try {
      const response = await axiosInstance.get<MessagesResponse>(`/conversations/${conversationId}/messages`, {
        params: { page },
      });
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setMessages(rows);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const markAsRead = useCallback(async (conversationId: number) => {
    await axiosInstance.post(`/conversations/${conversationId}/read`);
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.conversation_id === conversationId
          ? { ...conversation, unread_count: 0 }
          : conversation
      )
    );
  }, []);

  const sendMessage = useCallback(
    async (conversationId: number, text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !user) {
        return;
      }

      const optimisticId = Date.now() * -1;
      const optimisticMessage: ChatMessage = {
        message_id: optimisticId,
        conversation_id: conversationId,
        sender_id: user.user_id,
        message_text: trimmed,
        is_read: false,
        created_at: new Date().toISOString(),
        optimistic: true,
        sender: {
          user_id: user.user_id,
          full_name: user.full_name,
          role: user.role,
          profile_image: user.profile_image,
        },
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setIsSending(true);

      try {
        const response = await axiosInstance.post(`/conversations/${conversationId}/messages`, {
          message_text: trimmed,
        });
        const saved = response.data?.data as ChatMessage;

        setMessages((prev) => prev.map((msg) => (msg.message_id === optimisticId ? saved : msg)));
        setConversations((prev) =>
          sortByLastActivity(
            prev.map((conversation) =>
              conversation.conversation_id === conversationId
                ? {
                    ...conversation,
                    last_message_at: saved.created_at,
                    last_message: {
                      message_text: saved.message_text,
                      sender_id: saved.sender_id,
                      created_at: saved.created_at,
                    },
                  }
                : conversation
            )
          )
        );
      } catch (error) {
        setMessages((prev) => prev.filter((msg) => msg.message_id !== optimisticId));
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [user]
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    fetchMessages(selectedConversationId);
    markAsRead(selectedConversationId).catch(() => undefined);

    const echo = getEcho();
    if (!echo) {
      return;
    }

    if (
      subscribedConversationRef.current &&
      subscribedConversationRef.current !== selectedConversationId
    ) {
      echo.leaveChannel(`private-conversation.${subscribedConversationRef.current}`);
    }

    const channel = echo.private(`conversation.${selectedConversationId}`);
    subscribedConversationRef.current = selectedConversationId;

    channel.listen('MessageSent', (event: any) => {
      const incoming: ChatMessage = {
        message_id: Number(event.message_id),
        conversation_id: Number(event.conversation_id),
        sender_id: Number(event.sender_id),
        message_text: event.message_text || '',
        is_read: Boolean(event.is_read),
        created_at: event.created_at,
        sender_name: event.sender_name,
        sender_role: event.sender_role,
        sender_avatar: event.sender_avatar,
      };

      setConversations((prev) =>
        sortByLastActivity(
          prev.map((conversation) => {
            if (conversation.conversation_id !== incoming.conversation_id) {
              return conversation;
            }

            const isOwnMessage = incoming.sender_id === user?.user_id;
            const isActiveConversation = selectedConversationId === incoming.conversation_id;

            return {
              ...conversation,
              last_message_at: incoming.created_at,
              unread_count: isOwnMessage || isActiveConversation
                ? 0
                : (conversation.unread_count || 0) + 1,
              last_message: {
                message_text: incoming.message_text,
                sender_id: incoming.sender_id,
                created_at: incoming.created_at,
              },
            };
          })
        )
      );

      if (incoming.conversation_id === selectedConversationId) {
        setMessages((prev) => {
          const exists = prev.some((message) => message.message_id === incoming.message_id);
          return exists ? prev : [...prev, incoming];
        });

        if (incoming.sender_id !== user?.user_id) {
          markAsRead(incoming.conversation_id).catch(() => undefined);
        }
      }
    });

    return () => {
      echo.leaveChannel(`private-conversation.${selectedConversationId}`);
      if (subscribedConversationRef.current === selectedConversationId) {
        subscribedConversationRef.current = null;
      }
    };
  }, [fetchMessages, markAsRead, selectedConversationId, user?.user_id]);

  return {
    conversations,
    activeConversation,
    activeConversationId,
    setSelectedConversationId,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    fetchConversations,
    sendMessage,
    markAsRead,
  };
};
