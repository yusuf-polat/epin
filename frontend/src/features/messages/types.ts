export interface Participant {
  id: string;
  name: string;
  avatarUrl?: string | null;
  role: string;
}

export interface ConversationSummary {
  id: string;
  otherUser: Participant;
  product: { id: string; title: string; slug: string; imageUrl: string } | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Conversation {
  id: string;
  otherUser: Participant;
  product: { id: string; title: string; slug: string; imageUrl: string } | null;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  isRead: boolean;
  createdAt: string;
  sender: Participant;
}
