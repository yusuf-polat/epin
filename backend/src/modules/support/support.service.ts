import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { notificationService } from '@/modules/notifications/notification.service';
import { supportRepository } from './support.repository';
import { TICKET_NUMBER_PREFIX } from './support.constants';
import { CreateTicketDTO, SupportActor as Actor, TicketFilter, UpdateTicketDTO } from './support.types';

const isStaff = (actor: Actor) => actor.role === 'ADMIN' || actor.role === 'DESTEK';

const generateTicketNumber = () => `${TICKET_NUMBER_PREFIX}-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

async function loadAccessible(ticketId: string, actor: Actor) {
  const ticket = await supportRepository.findById(ticketId);
  if (!ticket || (!isStaff(actor) && ticket.userId !== actor.id)) {
    throw new NotFoundError('Destek talebi bulunamadı', 'TICKET_NOT_FOUND');
  }
  return ticket;
}

export const supportService = {
  async create(userId: string, dto: CreateTicketDTO) {
    const ticket = await supportRepository.createTicket({ ...dto, userId, ticketNumber: generateTicketNumber() });
    await notificationService.notifyStaff({
      type: 'SUPPORT',
      title: `Yeni Destek Talebi: #${ticket.ticketNumber}`,
      message: `Yeni bir destek talebi oluşturuldu: "${ticket.subject}"`,
      link: '/panel/destek',
    });
    return ticket;
  },

  listMine(userId: string) {
    return supportRepository.findByUser(userId);
  },

  getById(ticketId: string, actor: Actor) {
    return loadAccessible(ticketId, actor);
  },

  async addMessage(ticketId: string, actor: Actor, message: string) {
    const ticket = await loadAccessible(ticketId, actor);
    if (ticket.status === 'CLOSED') throw new BadRequestError('Kapatılmış bir destek talebine mesaj yazılamaz', 'TICKET_CLOSED');

    const staffReply = isStaff(actor) && ticket.userId !== actor.id;
    const created = await supportRepository.addMessage(ticketId, actor.id, message, staffReply, staffReply ? 'WAITING_USER' : 'IN_PROGRESS');

    if (staffReply) {
      await notificationService.send({
        userId: ticket.userId,
        type: 'SUPPORT',
        title: `Destek Yanıtı: #${ticket.ticketNumber}`,
        message: `Destek ekibi "${ticket.subject}" konulu talebinize yanıt verdi.`,
        link: '/hesabim/destek',
      });
    } else {
      await notificationService.notifyStaff({
        type: 'SUPPORT',
        title: `Yeni Destek Yanıtı: #${ticket.ticketNumber}`,
        message: `${ticket.user.name} "${ticket.subject}" talebine yeni bir yanıt yazdı.`,
        link: '/panel/destek',
      });
    }
    return created;
  },

  listAll(filter: TicketFilter) {
    return supportRepository.findAll(filter);
  },

  async update(ticketId: string, data: UpdateTicketDTO) {
    const ticket = await supportRepository.findById(ticketId);
    if (!ticket) throw new NotFoundError('Destek talebi bulunamadı', 'TICKET_NOT_FOUND');
    const updated = await supportRepository.update(ticketId, data);
    if (data.status && data.status !== ticket.status && (data.status === 'RESOLVED' || data.status === 'CLOSED')) {
      await notificationService.send({
        userId: ticket.userId,
        type: 'SUPPORT',
        title: `Destek Talebiniz ${data.status === 'RESOLVED' ? 'Çözüldü' : 'Kapatıldı'}`,
        message: `#${ticket.ticketNumber} numaralı "${ticket.subject}" talebinizin durumu güncellendi.`,
        link: '/hesabim/destek',
      });
    }
    return updated;
  },
};
