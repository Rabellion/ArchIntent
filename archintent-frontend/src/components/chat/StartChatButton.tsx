import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

interface Props {
  recipientUserId: number;
  projectId?: number;
  variant?: 'primary' | 'secondary' | 'outline';
  label?: string;
  className?: string;
  allowedRoles?: Array<'client' | 'architect' | 'contractor' | 'admin'>;
}

const StartChatButton: React.FC<Props> = ({
  recipientUserId,
  projectId,
  variant = 'secondary',
  label = 'Message',
  className = '',
  allowedRoles,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState('');

  const canStartByRole =
    !!user &&
    ['client', 'architect', 'contractor', 'admin'].includes(user.role) &&
    (!allowedRoles || allowedRoles.includes(user.role as 'client' | 'architect' | 'contractor' | 'admin'));
  const canStart = canStartByRole && user.user_id !== recipientUserId;

  if (user && !canStart) {
    return null;
  }

  /** Finds a matching existing conversation from a list */
  const findExistingConversation = (list: any[]) => {
    const exactMatch = projectId
      ? list.find(
          (c: any) =>
            c?.other_participant?.user_id === recipientUserId &&
            Number(c?.project_id) === Number(projectId)
        )
      : null;

    const anyMatch = list.find(
      (c: any) => c?.other_participant?.user_id === recipientUserId
    );

    return exactMatch || anyMatch || null;
  };

  /**
   * Called when the button is first clicked.
   * If a conversation already exists → navigate directly to it (no composer).
   * Otherwise → show the composer to write the first message.
   */
  const handleButtonClick = async () => {
    if (!user) {
      toast.error('Please log in to start a conversation');
      navigate('/login');
      return;
    }

    setStarting(true);
    try {
      const res = await axiosInstance.get('/conversations');
      const existingList = Array.isArray(res.data?.data) ? res.data.data : [];
      const existing = findExistingConversation(existingList);

      if (existing?.conversation_id) {
        // Already messaged this person — jump straight to the chat
        navigate(`/messages?conversation=${existing.conversation_id}`);
        return;
      }

      // No existing conversation — show composer
      setShowComposer(true);
    } catch (_error) {
      // On network error fall back to showing the composer
      setShowComposer(true);
    } finally {
      setStarting(false);
    }
  };

  /**
   * Called when the user submits the composer.
   * Re-checks for an existing conversation (race-condition safety),
   * then either sends to it or creates a new one.
   */
  const handleStart = async () => {
    if (!user) {
      toast.error('Please log in to start a conversation');
      navigate('/login');
      return;
    }

    const initialMessage = draft.trim();
    if (!initialMessage) {
      toast.error('Please enter a short message to start the conversation');
      return;
    }

    setStarting(true);
    try {
      const res = await axiosInstance.get('/conversations');
      const existingList = Array.isArray(res.data?.data) ? res.data.data : [];
      const targetConversation = findExistingConversation(existingList);

      if (targetConversation?.conversation_id) {
        await axiosInstance.post(`/conversations/${targetConversation.conversation_id}/messages`, {
          message_text: initialMessage,
        });

        navigate(`/messages?conversation=${targetConversation.conversation_id}`);
        setShowComposer(false);
        setDraft('');
        return;
      }

      const response = await axiosInstance.post('/conversations', {
        other_user_id: recipientUserId,
        project_id: projectId,
        initial_message: initialMessage,
      });

      const conversationId = response.data?.data?.conversation_id;
      navigate(conversationId ? `/messages?conversation=${conversationId}` : '/messages');
      setShowComposer(false);
      setDraft('');
    } catch (_error) {
      navigate('/messages');
    } finally {
      setStarting(false);
    }
  };

  const baseClass =
    variant === 'primary'
      ? 'bg-blue-600 hover:bg-blue-700 text-white'
      : variant === 'outline'
        ? 'bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
        : 'bg-slate-900 border border-blue-500/30 text-blue-300 hover:bg-blue-500/10';

  return (
    <>
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={starting}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-60 ${baseClass} ${className}`}
      >
        <MessageCircle size={16} />
        {starting ? 'Checking...' : label}
      </button>

      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-slate-900 p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100">Start Conversation</h3>
            <p className="mt-1 text-sm text-slate-400">Send an opening message to begin chatting.</p>

            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Hi, I would like to discuss this."
              rows={4}
              className="mt-4 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowComposer(false);
                  setDraft('');
                }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStart}
                disabled={starting || !draft.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {starting ? 'Starting...' : 'Start Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StartChatButton;
