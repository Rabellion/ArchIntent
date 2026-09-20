export interface ChatParticipant {
  user_id: number;
  full_name: string;
  email?: string;
  role: 'client' | 'architect' | 'contractor' | 'admin';
  profile_image?: string;
  account_status?: 'active' | 'pending' | 'suspended' | string;
  company_name?: string;
  specialization?: string;
}

export interface ChatProjectSummary {
  project_id: number;
  project_title: string;
  project_status: string;
}

export interface ChatMessage {
  message_id: number;
  conversation_id: number;
  sender_id: number;
  message_text: string;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
  sender_name?: string;
  sender_role?: string;
  sender_avatar?: string;
  optimistic?: boolean;
  sender?: {
    user_id: number;
    full_name: string;
    role: string;
    profile_image?: string;
  };
}

export interface ConversationItem {
  conversation_id: number;
  project_id?: number | null;
  subject?: string | null;
  conversation_type?: 'general' | 'project_inquiry' | 'project_active' | string;
  project?: ChatProjectSummary | null;
  other_participant: ChatParticipant | null;
  last_message_at?: string | null;
  created_at?: string;
  last_message?: {
    message_text: string;
    sender_id: number;
    created_at: string;
  } | null;
  unread_count: number;
}
