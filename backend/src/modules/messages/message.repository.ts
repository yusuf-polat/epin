import { Prisma } from '@prisma/client';
import { DbClient, prisma } from '@/config/prisma';
import { MESSAGE_HISTORY_LIMIT } from './message.constants';

const participantSelect = { id: true, name: true, avatarUrl: true, role: true } satisfies Prisma.UserSelect;

export const conversationInclude = {
  user1: { select: participantSelect },
  user2: { select: participantSelect },
  product: { select: { id: true, title: true, slug: true, imageUrl: true } },
} satisfies Prisma.ConversationInclude;

export type ConversationRecord = Prisma.ConversationGetPayload<{ include: typeof conversationInclude }>;

export const messageRepository = {
  findConversationsForUser(userId: string) {
    return prisma.conversation.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      orderBy: { lastMessageAt: 'desc' },
      include: conversationInclude,
    });
  },

  /** Kullanıcıya gelen okunmamış mesaj sayıları, sohbet bazında tek sorguda */
  async unreadCounts(userId: string, conversationIds: string[]) {
    if (conversationIds.length === 0) return new Map<string, number>();
    const rows = await prisma.directMessage.groupBy({
      by: ['conversationId'],
      where: { conversationId: { in: conversationIds }, senderId: { not: userId }, isRead: false },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.conversationId, r._count._all]));
  },

  findUser(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { ...participantSelect, isBanned: true } });
  },

  findConversation(user1Id: string, user2Id: string) {
    return prisma.conversation.findUnique({ where: { user1Id_user2Id: { user1Id, user2Id } }, include: conversationInclude });
  },

  findConversationById(id: string) {
    return prisma.conversation.findUnique({ where: { id }, include: conversationInclude });
  },

  /** İki kullanıcı arasındaki tek sohbeti getirir; yoksa oluşturur (eşzamanlı oluşturmaya dayanıklı) */
  async findOrCreateConversation(user1Id: string, user2Id: string, productId: string | null) {
    const existing = await this.findConversation(user1Id, user2Id);
    if (existing) return existing;
    try {
      return await prisma.conversation.create({ data: { user1Id, user2Id, productId }, include: conversationInclude });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const created = await this.findConversation(user1Id, user2Id);
        if (created) return created;
      }
      throw err;
    }
  },

  productExists(productId: string) {
    return prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  },

  markRead(conversationId: string, readerId: string) {
    return prisma.directMessage.updateMany({
      where: { conversationId, senderId: { not: readerId }, isRead: false },
      data: { isRead: true },
    });
  },

  /** Son 200 mesaj, kronolojik sırada */
  async findMessages(conversationId: string) {
    const latest = await prisma.directMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_HISTORY_LIMIT,
      include: { sender: { select: participantSelect } },
    });
    return latest.reverse();
  },

  createMessage(db: DbClient, conversationId: string, senderId: string, text: string) {
    return db.directMessage.create({
      data: { conversationId, senderId, text },
      include: { sender: { select: participantSelect } },
    });
  },

  touchConversation(db: DbClient, conversationId: string, lastMessage: string) {
    return db.conversation.update({ where: { id: conversationId }, data: { lastMessage, lastMessageAt: new Date() } });
  },
};
