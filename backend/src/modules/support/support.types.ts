import { Role, TicketPriority, TicketStatus } from '@prisma/client';

export interface CreateTicketDTO {
  subject: string;
  category: string;
  priority: TicketPriority;
  message: string;
}

export interface TicketFilter {
  status?: TicketStatus;
  category?: string;
  search?: string;
}

export interface UpdateTicketDTO {
  status?: TicketStatus;
  priority?: TicketPriority;
}

export interface SupportActor {
  id: string;
  role: Role;
}
