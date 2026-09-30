import { SellerRequestStatus } from '@prisma/client';
import { BadRequestError, ConflictError, NotFoundError } from '@/utils/errors';
import { userRepository } from '@/modules/users/user.repository';
import { notificationService } from '@/modules/notifications/notification.service';
import { sellerRequestRepository } from './seller-request.repository';
import { ResolveAction } from './seller-request.types';

export const sellerRequestService = {
  async create(userId: string, reason: string) {
    const user = await userRepository.findById(userId);
    if (user?.canSell) throw new BadRequestError('Zaten satıcı yetkiniz mevcut.', 'ALREADY_SELLER');

    const pending = await sellerRequestRepository.findPendingByUser(userId);
    if (pending) throw new ConflictError('Zaten bekleyen bir başvurunuz var. Onay sürecini bekleyiniz.', 'REQUEST_PENDING');

    const request = await sellerRequestRepository.create(userId, reason);
    await notificationService.notifyStaff({
      type: 'SELLER_REQUEST',
      title: 'Yeni Satıcı Başvurusu',
      message: `${user?.name ?? 'Bir kullanıcı'} satıcı olmak için başvuru yaptı.`,
      link: '/panel/kullanicilar',
    });
    return request;
  },

  listMine(userId: string) {
    return sellerRequestRepository.findByUser(userId);
  },

  list(status?: SellerRequestStatus) {
    return sellerRequestRepository.findMany(status);
  },

  async resolve(id: string, action: ResolveAction, adminNotes?: string) {
    const request = await sellerRequestRepository.findById(id);
    if (!request) throw new NotFoundError('Başvuru bulunamadı');

    const updated = await sellerRequestRepository.resolve(id, request.userId, action, adminNotes);
    if (!updated) throw new ConflictError('Bu başvuru zaten işlenmiş', 'REQUEST_ALREADY_RESOLVED');

    const approved = action === 'APPROVED';
    await notificationService.send({
      userId: request.userId,
      type: 'SELLER_REQUEST',
      title: approved ? 'Satıcı Başvurunuz Onaylandı!' : 'Satıcı Başvurunuz Reddedildi',
      message: approved
        ? 'Tebrikler! Satıcı başvurunuz onaylandı. Artık mağazanızı oluşturabilir ve ürün satışına başlayabilirsiniz.'
        : `Satıcı başvurunuz uygun görülmedi.${adminNotes ? ` Gerekçe: ${adminNotes}` : ''}`,
      link: approved ? '/hesabim/magazam/olustur' : '/hesabim/satici-basvuru',
    });
    return updated;
  },
};
