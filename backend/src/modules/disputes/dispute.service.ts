import { DisputeStatus } from '@prisma/client';
import { withTransaction } from '@/database/transaction';
import { BadRequestError, ConflictError, NotFoundError } from '@/utils/errors';
import { toNumber } from '@/utils/money';
import { logger } from '@/utils/logger';
import { hasPermission } from '@/modules/permissions/permission.service';
import { notificationService } from '@/modules/notifications/notification.service';
import { autoReleaseDate, escrowService, EscrowResult } from '@/modules/orders/escrow.service';
import { orderRepository } from '@/modules/orders/order.repository';
import { disputeRepository, DisputeRecord } from './dispute.repository';
import { ACTIVE_DISPUTE_STATUSES as ACTIVE, SELLER_RESPONSE_HOURS } from './dispute.constants';
import { CreateDisputeDTO, DisputeViewer as Viewer, ResolveDecision, SellerRespondDTO } from './dispute.types';


async function isDisputeStaff(viewer: Viewer) {
  return viewer.role === 'ADMIN' || (await hasPermission(viewer.role, 'manage_disputes'));
}

function toView(dispute: DisputeRecord, options: { showReplacementCode: boolean }) {
  const { order, replacementCode, ...rest } = dispute;
  return {
    ...rest,
    replacementCode: options.showReplacementCode ? replacementCode : undefined,
    hasReplacementCode: !!replacementCode,
    order: {
      ...order,
      totalAmount: toNumber(order.totalAmount),
      escrowAmount: toNumber(order.escrowAmount ?? order.totalAmount),
      items: order.items.map((i) => ({ ...i, totalPrice: toNumber(i.totalPrice) })),
    },
  };
}

async function load(id: string) {
  const dispute = await disputeRepository.findById(id);
  if (!dispute) throw new NotFoundError('İtiraz bulunamadı', 'DISPUTE_NOT_FOUND');
  return dispute;
}

const stateChanged = () => new ConflictError('İtiraz durumu değişti, lütfen sayfayı yenileyiniz', 'DISPUTE_STATE_CHANGED');

export const disputeService = {
  /** Alıcı teslim edilmiş sipariş için itiraz açar; ödeme dondurulur */
  async create(buyerId: string, dto: CreateDisputeDTO) {
    const order = await disputeRepository.findOrderForDispute(dto.orderId);
    if (!order || order.userId !== buyerId) throw new NotFoundError('Sipariş bulunamadı', 'ORDER_NOT_FOUND');
    if (order.deliveryStatus !== 'DELIVERED') {
      throw new BadRequestError('Teslim edilmemiş siparişler için itiraz yerine süre dolunca iptal talebi oluşturabilirsiniz', 'NOT_DELIVERED');
    }
    if (order.escrowStatus !== 'HELD_IN_ESCROW') {
      throw new BadRequestError('Bu siparişin ödemesi işlenmiş; itiraz açılamaz', 'ESCROW_NOT_HELD');
    }
    if (order.dispute && order.dispute.status !== 'CANCELLED') {
      throw new ConflictError(
        order.dispute.sellerAction === 'REPLACE'
          ? 'Bu sipariş için değişim yapıldı. Sorun devam ediyorsa mevcut itirazı destek ekibine iletebilirsiniz.'
          : 'Bu sipariş için zaten bir itiraz mevcut',
        'DISPUTE_EXISTS'
      );
    }

    const status: DisputeStatus = order.sellerId ? 'WAITING_SELLER' : 'WAITING_SUPPORT';
    const dispute = await withTransaction(async (tx) => {
      const frozen = await orderRepository.transition(
        tx,
        order.id,
        { escrowStatus: 'HELD_IN_ESCROW', deliveryStatus: 'DELIVERED' },
        { escrowStatus: 'DISPUTED' }
      );
      if (!frozen) throw new ConflictError('Sipariş durumu değişti, lütfen sayfayı yenileyiniz', 'ORDER_STATE_CHANGED');
      return disputeRepository.upsertForOrder(tx, order.id, {
        buyerId,
        sellerId: order.sellerId,
        reason: dto.reason,
        description: dto.description,
        videoUrl: dto.videoUrl,
        status,
      });
    });

    if (order.sellerId) {
      await notificationService.send({
        userId: order.sellerId,
        type: 'DISPUTE',
        title: 'Siparişinize İtiraz Açıldı',
        message: `#${order.orderNumber} için alıcı itiraz açtı. ${SELLER_RESPONSE_HOURS} saat içinde yanıt vermezseniz itiraz destek ekibine aktarılır.`,
        link: '/hesabim/pazar/itirazlar',
      });
    } else {
      await notificationService.notifyStaff({
        type: 'DISPUTE',
        title: 'Platform Siparişine İtiraz',
        message: `#${order.orderNumber} için itiraz açıldı ve hakem kararı bekliyor.`,
        link: '/panel/itirazlar',
      });
    }
    return dispute;
  },

  async sellerRespond(sellerId: string, id: string, dto: SellerRespondDTO) {
    const dispute = await load(id);
    if (dispute.sellerId !== sellerId) throw new NotFoundError('İtiraz bulunamadı', 'DISPUTE_NOT_FOUND');
    if (dispute.status !== 'WAITING_SELLER') throw new BadRequestError('Bu itiraz artık satıcı yanıtı beklemiyor', 'NOT_WAITING_SELLER');

    const sellerFields = { sellerAction: dto.action, sellerResponse: dto.response, sellerActionAt: new Date() };

    if (dto.action === 'REFUND') {
      const result = await withTransaction(async (tx) => {
        if (!(await disputeRepository.transition(tx, id, ['WAITING_SELLER'], { status: 'SELLER_APPROVED', ...sellerFields }))) throw stateChanged();
        return escrowService.refundInTx(tx, dispute.orderId, 'SELLER_REFUND', { from: { escrowStatus: 'DISPUTED' } });
      });
      await escrowService.notifyRefund(result, 'SELLER_REFUND');
    } else if (dto.action === 'REPLACE') {
      // Yeni kod alıcıya teslim edilir, ödeme tekrar onay süresine girer
      await withTransaction(async (tx) => {
        if (
          !(await disputeRepository.transition(tx, id, ['WAITING_SELLER'], {
            status: 'SELLER_APPROVED',
            replacementCode: dto.replacementCode,
            ...sellerFields,
          }))
        ) {
          throw stateChanged();
        }
        const item = await disputeRepository.firstOrderVariant(tx, dispute.orderId);
        if (item) {
          await disputeRepository.createReplacementPin(tx, {
            variantId: item.variantId,
            code: dto.replacementCode!.trim(),
            serialNumber: `RPL-${Date.now().toString().slice(-6)}`,
            status: 'SOLD',
            orderId: dispute.orderId,
            userId: dispute.buyerId,
            soldAt: new Date(),
          });
        }
        const reopened = await orderRepository.transition(tx, dispute.orderId, { escrowStatus: 'DISPUTED' }, {
          escrowStatus: 'HELD_IN_ESCROW',
          autoReleaseAt: autoReleaseDate(),
        });
        if (!reopened) throw stateChanged();
      });
      await notificationService.send({
        userId: dispute.buyerId,
        type: 'DISPUTE',
        title: 'Satıcı Yeni Kod Gönderdi',
        message: `#${dispute.order.orderNumber} için değişim kodu Dijital Kodlarım sayfanıza eklendi. Sorun devam ederse destek ekibine iletebilirsiniz.`,
        link: '/hesabim/kodlarim',
      });
    } else {
      if (!(await withTransaction((tx) => disputeRepository.transition(tx, id, ['WAITING_SELLER'], { status: 'WAITING_SUPPORT', ...sellerFields })))) {
        throw stateChanged();
      }
      await notificationService.send({
        userId: dispute.buyerId,
        type: 'DISPUTE',
        title: 'İtirazınız Destek Ekibine Aktarıldı',
        message: `#${dispute.order.orderNumber} için satıcı itirazı kabul etmedi. Destek ekibimiz inceleyip karar verecektir.`,
        link: `/hesabim/siparislerim/${dispute.orderId}`,
      });
      await notificationService.notifyStaff({
        type: 'DISPUTE',
        title: 'Hakem Kararı Bekleyen İtiraz',
        message: `#${dispute.order.orderNumber} için satıcı itirazı reddetti.`,
        link: '/panel/itirazlar',
      });
    }
    return this.getById(id, { id: sellerId, role: 'USER' });
  },

  /** Değişim kodu da çalışmazsa alıcı itirazı destek ekibine taşır */
  async escalate(buyerId: string, id: string, description: string) {
    const dispute = await load(id);
    if (dispute.buyerId !== buyerId) throw new NotFoundError('İtiraz bulunamadı', 'DISPUTE_NOT_FOUND');
    if (dispute.status !== 'SELLER_APPROVED' || dispute.sellerAction !== 'REPLACE') {
      throw new BadRequestError('Yalnızca değişim yapılmış itirazlar destek ekibine iletilebilir', 'NOT_ESCALATABLE');
    }
    await withTransaction(async (tx) => {
      const frozen = await orderRepository.transition(tx, dispute.orderId, { escrowStatus: 'HELD_IN_ESCROW' }, { escrowStatus: 'DISPUTED' });
      if (!frozen) throw new BadRequestError('Siparişin ödemesi işlenmiş; itiraz iletilemez', 'ESCROW_NOT_HELD');
      const moved = await disputeRepository.transition(tx, id, ['SELLER_APPROVED'], {
        status: 'WAITING_SUPPORT',
        description: `${dispute.description}\n\n[Değişim sonrası alıcı notu] ${description}`,
      });
      if (!moved) throw stateChanged();
    });
    await notificationService.notifyStaff({
      type: 'DISPUTE',
      title: 'Değişim Sonrası İtiraz',
      message: `#${dispute.order.orderNumber} için alıcı değişim kodunun da çalışmadığını bildirdi.`,
      link: '/panel/itirazlar',
    });
    return this.getById(id, { id: buyerId, role: 'USER' });
  },

  /** Hakem kararı: ödeme alıcıya iade edilir veya satıcıya aktarılır */
  async resolve(staffId: string, id: string, decision: ResolveDecision, adminNotes: string) {
    const dispute = await load(id);
    if (!ACTIVE.includes(dispute.status)) throw new BadRequestError('Bu itiraz karar beklemiyor', 'NOT_ACTIVE');

    const resolution = { resolvedByAdminId: staffId, adminNotes, resolvedAt: new Date() };
    let result: EscrowResult;
    if (decision === 'BUYER') {
      result = await withTransaction(async (tx) => {
        if (!(await disputeRepository.transition(tx, id, ACTIVE, { status: 'RESOLVED_BUYER', ...resolution }))) throw stateChanged();
        return escrowService.refundInTx(tx, dispute.orderId, 'DISPUTE_RESOLVED', { from: { escrowStatus: 'DISPUTED' } });
      });
      await escrowService.notifyRefund(result, 'DISPUTE_RESOLVED');
    } else {
      result = await withTransaction(async (tx) => {
        if (!(await disputeRepository.transition(tx, id, ACTIVE, { status: 'RESOLVED_SELLER', ...resolution }))) throw stateChanged();
        return escrowService.releaseInTx(tx, dispute.orderId, 'DISPUTE_RESOLVED', { escrowStatus: 'DISPUTED' });
      });
      await escrowService.notifyRelease(result, 'DISPUTE_RESOLVED');
      await notificationService.send({
        userId: dispute.buyerId,
        type: 'DISPUTE',
        title: 'İtirazınız Sonuçlandı',
        message: `#${dispute.order.orderNumber} için itiraz satıcı lehine sonuçlandı. Hakem notu: ${adminNotes}`,
        link: `/hesabim/siparislerim/${dispute.orderId}`,
      });
    }
    return this.getById(id, { id: staffId, role: 'ADMIN' });
  },

  /** Alıcı aktif itirazını geri çeker; ödeme tekrar onay sürecine döner */
  async cancel(buyerId: string, id: string) {
    const dispute = await load(id);
    if (dispute.buyerId !== buyerId) throw new NotFoundError('İtiraz bulunamadı', 'DISPUTE_NOT_FOUND');
    if (!ACTIVE.includes(dispute.status)) throw new BadRequestError('Bu itiraz geri çekilemez', 'NOT_ACTIVE');

    await withTransaction(async (tx) => {
      if (!(await disputeRepository.transition(tx, id, ACTIVE, { status: 'CANCELLED' }))) throw stateChanged();
      const reopened = await orderRepository.transition(tx, dispute.orderId, { escrowStatus: 'DISPUTED' }, {
        escrowStatus: 'HELD_IN_ESCROW',
        autoReleaseAt: autoReleaseDate(),
      });
      if (!reopened) throw stateChanged();
    });
    if (dispute.sellerId) {
      await notificationService.send({
        userId: dispute.sellerId,
        type: 'DISPUTE',
        title: 'İtiraz Geri Çekildi',
        message: `#${dispute.order.orderNumber} için alıcı itirazını geri çekti.`,
        link: '/hesabim/pazar/itirazlar',
      });
    }
    return this.getById(id, { id: buyerId, role: 'USER' });
  },

  async getById(id: string, viewer: Viewer) {
    const dispute = await load(id);
    const isParty = dispute.buyerId === viewer.id || dispute.sellerId === viewer.id;
    const isStaff = await isDisputeStaff(viewer);
    if (!isParty && !isStaff) throw new NotFoundError('İtiraz bulunamadı', 'DISPUTE_NOT_FOUND');
    return toView(dispute, { showReplacementCode: isStaff || dispute.sellerId === viewer.id });
  },

  async listForBuyer(buyerId: string) {
    return (await disputeRepository.findMany({ buyerId })).map((d) => toView(d, { showReplacementCode: false }));
  },

  async listForSeller(sellerId: string) {
    return (await disputeRepository.findMany({ sellerId })).map((d) => toView(d, { showReplacementCode: true }));
  },

  async listAll(status?: DisputeStatus) {
    return (await disputeRepository.findMany(status ? { status } : {})).map((d) => toView(d, { showReplacementCode: true }));
  },

  /** Süresi içinde yanıt vermeyen satıcıların itirazlarını destek ekibine aktarır */
  async escalateUnanswered(batchSize = 50) {
    const threshold = new Date(Date.now() - SELLER_RESPONSE_HOURS * 3_600_000);
    const stale = await disputeRepository.findStaleWaitingSeller(threshold, batchSize);
    let escalated = 0;
    for (const d of stale) {
      try {
        if (await withTransaction((tx) => disputeRepository.transition(tx, d.id, ['WAITING_SELLER'], { status: 'WAITING_SUPPORT' }))) escalated++;
      } catch (err) {
        logger.error('Dispute escalation failed', { disputeId: d.id, err });
      }
    }
    if (escalated > 0) {
      await notificationService.notifyStaff({
        type: 'DISPUTE',
        title: 'Yanıtsız İtirazlar Aktarıldı',
        message: `${escalated} itiraz satıcı yanıt süresini aştığı için hakem kararına aktarıldı.`,
        link: '/panel/itirazlar',
      });
    }
    return escalated;
  },
};
