import { Prisma } from '@prisma/client';
import { env } from '@/config/env';
import { sendMail } from '@/config/mailer';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { PageParams } from '@/utils/pagination';
import { broadcastRepository } from './broadcast.repository';

export const BROADCAST_AUDIENCES = ['ALL', 'SELLERS', 'BUYERS', 'STAFF', 'USER'] as const;
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];

export interface BroadcastDTO {
  audience: BroadcastAudience;
  /** audience = USER ise alıcının e-posta adresi */
  email?: string;
  title: string;
  message: string;
  link?: string;
  sendEmail: boolean;
}

const MAIL_CONCURRENCY = 5;

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Yasaklı hesaplar hiçbir kitleye dahil edilmez */
export function audienceWhere(audience: BroadcastAudience, email?: string): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { isBanned: false };
  switch (audience) {
    case 'SELLERS':
      return { ...base, canSell: true };
    case 'BUYERS':
      return { ...base, canSell: false, role: 'USER' };
    case 'STAFF':
      return { ...base, role: { in: ['ADMIN', 'DESTEK'] } };
    case 'USER':
      return { ...base, email: email?.toLowerCase() ?? '' };
    default:
      return base;
  }
}

/** Eşzamanlılığı sınırlı e-posta gönderimi; gönderilen sayıyı döner */
async function mailAll(recipients: { email: string; name: string }[], title: string, message: string, link?: string) {
  const url = link ? `${env.frontendUrl}${link}` : env.frontendUrl;
  let sent = 0;
  for (let i = 0; i < recipients.length; i += MAIL_CONCURRENCY) {
    const results = await Promise.all(
      recipients.slice(i, i + MAIL_CONCURRENCY).map((r) =>
        sendMail({
          to: r.email,
          subject: title,
          text: `Merhaba ${r.name},\n\n${message}\n\n${url}`,
          html: `<p>Merhaba ${escapeHtml(r.name)},</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p><p><a href="${escapeHtml(url)}">NexusPin'de görüntüle</a></p>`,
        })
      )
    );
    sent += results.filter(Boolean).length;
  }
  return sent;
}

export const broadcastService = {
  countRecipients(audience: BroadcastAudience, email?: string) {
    return broadcastRepository.countUsers(audienceWhere(audience, email));
  },

  /**
   * Seçilen kitleye sistem bildirimi gönderir. Bildirimler hemen yazılır;
   * e-postalar isteği bekletmemek için arka planda gönderilir ve sayısı kayda işlenir.
   */
  async send(adminId: string, dto: BroadcastDTO) {
    const recipients = await broadcastRepository.findUsers(audienceWhere(dto.audience, dto.email));
    if (recipients.length === 0) {
      if (dto.audience === 'USER') throw new NotFoundError('Bu e-posta adresine kayıtlı aktif kullanıcı bulunamadı', 'USER_NOT_FOUND');
      throw new BadRequestError('Seçilen kitlede kullanıcı yok', 'NO_RECIPIENTS');
    }

    const link = dto.link || null;
    await broadcastRepository.createNotifications(
      recipients.map((r) => r.id),
      { title: dto.title, message: dto.message, link }
    );
    const broadcast = await broadcastRepository.create({
      title: dto.title,
      message: dto.message,
      link,
      audience: dto.audience === 'USER' ? `USER:${dto.email}` : dto.audience,
      recipientCount: recipients.length,
      sendEmail: dto.sendEmail,
      sentById: adminId,
    });

    if (dto.sendEmail) {
      void mailAll(recipients, dto.title, dto.message, dto.link)
        .then((count) => broadcastRepository.setEmailCount(broadcast.id, count))
        .catch((err) => logger.error('Toplu e-posta gönderimi tamamlanamadı', { broadcastId: broadcast.id, err }));
    }
    return { id: broadcast.id, recipientCount: recipients.length, emailQueued: dto.sendEmail };
  },

  list(page: PageParams) {
    return broadcastRepository.list(page);
  },
};
