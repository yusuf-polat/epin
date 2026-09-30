export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TicketMessage {
  id: string;
  message: string;
  isAdminReply: boolean;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl?: string | null; role: string };
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string; avatarUrl?: string | null; phone?: string | null };
  messages?: TicketMessage[];
  _count?: { messages: number };
}
