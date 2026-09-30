import { withTransaction } from '@/database/transaction';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/utils/errors';
import { notificationService } from '@/modules/notifications/notification.service';
import { messageRepository, ConversationRecord } from './message.repository';
import { NOTIFICATION_PREVIEW_LENGTH } from './message.constants';

function withOtherUser(conv: ConversationRecord, userId: string) {
  return { ...conv, otherUser: conv.user1Id === userId ? conv.user2 : conv.user1 };
}

async function loadParticipantConversation(conversationId: string, userId: string) {
  const conv = await messageRepository.findConversationById(conversationId);
  if (!conv || (conv.user1Id !== userId && conv.user2Id !== userId)) {
    throw new NotFoundError('Sohbet bulunamadı', 'CONVERSATION_NOT_FOUND');
  }
  return conv;
}

export const messageService = {
  async listConversations(userId: string) {
    const conversations = await messageRepository.findConversationsForUser(userId);
    const unread = await messageRepository.unreadCounts(userId, conversations.map((c) => c.id));
    return conversations.map((conv) => ({
      id: conv.id,
      otherUser: conv.user1Id === userId ? conv.user2 : conv.user1,
      product: conv.product,
      lastMessage: conv.lastMessage,
      lastMessageAt: conv.lastMessageAt,
      unreadCount: unread.get(conv.id) ?? 0,
      createdAt: conv.createdAt,
    }));
  },

  async getOrCreateConversation(userId: string, targetUserId: string, productId?: string) {
    if (userId === targetUserId) throw new BadRequestError('Kendinizle sohbet başlatamazsınız', 'SELF_CONVERSATION');
    const target = await messageRepository.findUser(targetUserId);
    if (!target) throw new NotFoundError('Kullanıcı bulunamadı');
    if (target.isBanned) throw new ForbiddenError('Bu kullanıcıyla mesajlaşılamıyor', 'USER_UNAVAILABLE');
    if (productId && !(await messageRepository.productExists(productId))) throw new NotFoundError('Ürün bulunamadı');

    // Aynı iki kullanıcı arasında tek sohbet: ID'ler sıralı saklanır
    const [u1, u2] = [userId, targetUserId].sort();
    const conv = await messageRepository.findOrCreateConversation(u1, u2, productId ?? null);
    return withOtherUser(conv, userId);
  },

  async getMessages(conversationId: string, userId: string) {
    const conv = await loadParticipantConversation(conversationId, userId);
    await messageRepository.markRead(conversationId, userId);
    return { conversation: withOtherUser(conv, userId), messages: await messageRepository.findMessages(conversationId) };
  },

  async send(conversationId: string, senderId: string, text: string) {
    const conv = await loadParticipantConversation(conversationId, senderId);
    const message = await withTransaction(async (tx) => {
      const created = await messageRepository.createMessage(tx, conversationId, senderId, text);
      await messageRepository.touchConversation(tx, conversationId, text.slice(0, 200));
      return created;
    });

    const recipientId = conv.user1Id === senderId ? conv.user2Id : conv.user1Id;
    const senderName = conv.user1Id === senderId ? conv.user1.name : conv.user2.name;
    await notificationService.send({
      userId: recipientId,
      type: 'MESSAGE',
      title: `Yeni Mesaj: ${senderName}`,
      message: text.length > NOTIFICATION_PREVIEW_LENGTH ? `${text.slice(0, NOTIFICATION_PREVIEW_LENGTH - 3)}...` : text,
      link: `/hesabim/mesajlar?conv=${conversationId}`,
    });
    return message;
  },
};
