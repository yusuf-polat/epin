import { Prisma, TicketPriority, TicketStatus } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { ADMIN_TICKET_LIST_LIMIT } from './support.constants';
import { TicketFilter } from './support.types';

const senderSelect = { id: true, name: true, avatarUrl: true, role: true } satisfies Prisma.UserSelect;

const ticketSummaryInclude = {
  user: { select: { id: true, name: true, email: true, avatarUrl: true } },
  _count: { select: { messages: true } },
  messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { message: true, createdAt: true, isAdminReply: true } },
} satisfies Prisma.SupportTicketInclude;

export const supportRepository = {
  createTicket(data: { ticketNumber: string; userId: string; subject: string; category: string; priority: TicketPriority; message: string }) {
    const { message, ...ticket } = data;
    return prisma.supportTicket.create({
      data: { ...ticket, status: 'OPEN', messages: { create: { senderId: data.userId, message, isAdminReply: false } } },
      include: { messages: { include: { sender: { select: senderSelect } } } },
    });
  },

  findByUser(userId: string) {
    return prisma.supportTicket.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, include: ticketSummaryInclude });
  },

  findById(id: string) {
    return prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true } },
        messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: senderSelect } } },
      },
    });
  },

  addMessage(ticketId: string, senderId: string, message: string, isAdminReply: boolean, nextStatus: TicketStatus) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.supportTicketMessage.create({
        data: { ticketId, senderId, message, isAdminReply },
        include: { sender: { select: senderSelect } },
      });
      await tx.supportTicket.update({ where: { id: ticketId }, data: { status: nextStatus } });
      return created;
    });
  },

  findAll(filter: TicketFilter) {
    const where: Prisma.SupportTicketWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.search
        ? {
            OR: [
              { ticketNumber: { contains: filter.search, mode: 'insensitive' } },
              { subject: { contains: filter.search, mode: 'insensitive' } },
              { user: { name: { contains: filter.search, mode: 'insensitive' } } },
              { user: { email: { contains: filter.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    return prisma.supportTicket.findMany({ where, orderBy: { updatedAt: 'desc' }, include: ticketSummaryInclude, take: ADMIN_TICKET_LIST_LIMIT });
  },

  update(id: string, data: { status?: TicketStatus; priority?: TicketPriority }) {
    return prisma.supportTicket.update({ where: { id }, data });
  },
};
