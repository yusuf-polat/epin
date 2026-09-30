import { withTransaction } from '@/database/transaction';
import { BadRequestError, ConflictError, NotFoundError } from '@/utils/errors';
import { notificationService } from '@/modules/notifications/notification.service';
import { clearProductCache } from '@/modules/products/product.service';
import { complaintRepository } from './complaint.repository';
import { COMPLAINT_REASONS, MAX_DAILY_COMPLAINTS } from './complaint.constants';
import { AdminComplaintListQuery, CreateComplaintDTO, ResolveComplaintDTO } from './complaint.types';

const TARGET_LABEL = { PRODUCT: 'ilan', STORE: 'mağaza', REVIEW: 'yorum' } as const;

export const complaintService = {
  async create(reporterId: string, dto: CreateComplaintDTO) {
    const target = await complaintRepository.findTarget(dto.targetType, dto.targetId);
    if (!target) throw new NotFoundError('Şikâyet edilen içerik bulunamadı', 'TARGET_NOT_FOUND');
    if (target.ownerId === reporterId) throw new BadRequestError('Kendi içeriğinizi şikâyet edemezsiniz', 'OWN_CONTENT');
    if (await complaintRepository.findOpenByReporter(reporterId, dto.targetType, dto.targetId)) {
      throw new ConflictError('Bu içerik için açık bir şikâyetiniz zaten var', 'ALREADY_REPORTED');
    }
    if ((await complaintRepository.countSince(reporterId, new Date(Date.now() - 24 * 60 * 60_000))) >= MAX_DAILY_COMPLAINTS) {
      throw new BadRequestError('Günlük şikâyet sınırına ulaştınız', 'TOO_MANY_COMPLAINTS');
    }

    const complaint = await complaintRepository.create({
      reporterId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
      details: dto.details?.trim() || null,
    });
    await notificationService.notifyStaff({
      type: 'SYSTEM',
      title: 'Yeni Şikâyet',
      message: `Bir ${TARGET_LABEL[dto.targetType]} şikâyet edildi: ${COMPLAINT_REASONS[dto.reason]} ("${target.title.slice(0, 60)}")`,
      link: '/panel/sikayetler',
    });
    return complaint;
  },

  async listForAdmin(query: AdminComplaintListQuery) {
    const { items, total } = await complaintRepository.findForAdmin(query);
    const openCounts = await complaintRepository.countOpenByTargets([...new Set(items.map((c) => c.targetId))]);
    const withTargets = await Promise.all(
      items.map(async (c) => ({
        ...c,
        reasonLabel: COMPLAINT_REASONS[c.reason as keyof typeof COMPLAINT_REASONS] ?? c.reason,
        target: await complaintRepository.findTarget(c.targetType, c.targetId),
        openCountForTarget: openCounts.get(c.targetId) ?? 0,
      }))
    );
    return { items: withTargets, total };
  },

  /**
   * Şikâyeti sonuçlandırır. Aynı içerik hakkındaki diğer açık şikâyetler de
   * aynı kararla kapatılır; içerik kaldırılırsa sahibi bilgilendirilir.
   */
  async resolve(adminId: string, id: string, dto: ResolveComplaintDTO) {
    const complaint = await complaintRepository.findById(id);
    if (!complaint) throw new NotFoundError('Şikâyet bulunamadı', 'COMPLAINT_NOT_FOUND');
    if (complaint.status !== 'OPEN') throw new ConflictError('Bu şikâyet zaten sonuçlandırılmış', 'COMPLAINT_RESOLVED');
    const takeDown = dto.status === 'RESOLVED' && !!dto.takeDown;
    const target = await complaintRepository.findTarget(complaint.targetType, complaint.targetId);
    if (takeDown && !target) throw new BadRequestError('İçerik zaten kaldırılmış', 'TARGET_NOT_FOUND');

    const closed = await withTransaction(async (tx) => {
      const { count } = await complaintRepository.resolveOpenForTarget(tx, complaint.targetType, complaint.targetId, {
        status: dto.status,
        resolutionNote: dto.note,
        resolvedById: adminId,
        resolvedAt: new Date(),
      });
      if (count === 0) throw new ConflictError('Bu şikâyet zaten sonuçlandırılmış', 'COMPLAINT_RESOLVED');
      if (takeDown) await complaintRepository.takeDown(tx, complaint.targetType, complaint.targetId);
      return count;
    });

    if (takeDown) {
      await clearProductCache();
      if (target?.ownerId) {
        await notificationService.send({
          userId: target.ownerId,
          type: 'SYSTEM',
          title: `${TARGET_LABEL[complaint.targetType][0].toLocaleUpperCase('tr-TR')}${TARGET_LABEL[complaint.targetType].slice(1)} Kaldırıldı`,
          message: `"${target.title.slice(0, 60)}" hakkındaki şikâyet incelendi ve içerik kaldırıldı. Açıklama: ${dto.note}`,
          link: complaint.targetType === 'STORE' ? '/hesabim/magazam/olustur' : '/hesabim/pazar',
        });
      }
    }
    await notificationService.send({
      userId: complaint.reporterId,
      type: 'SYSTEM',
      title: 'Şikâyetiniz Sonuçlandı',
      message: dto.status === 'RESOLVED' ? 'Bildiriminiz için teşekkürler; gerekli işlem yapıldı.' : `Şikâyetiniz incelendi, ihlal tespit edilmedi. ${dto.note}`,
      link: target?.link ?? undefined,
    });
    return { id, status: dto.status, closedCount: closed, takenDown: takeDown };
  },
};
