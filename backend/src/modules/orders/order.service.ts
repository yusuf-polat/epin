import { DeliveryType, Role } from '@prisma/client';
import { withTransaction } from '@/database/transaction';
import { BadRequestError, ConflictError, NotFoundError } from '@/utils/errors';
import { formatTRY, roundMoney, toNumber } from '@/utils/money';
import { logger } from '@/utils/logger';
import { walletRepository } from '@/modules/wallet/wallet.repository';
import { settingsService } from '@/modules/settings/settings.service';
import { notificationService } from '@/modules/notifications/notification.service';
import { clearProductCache } from '@/modules/products/product.service';
import { hasPermission } from '@/modules/permissions/permission.service';
import { orderRepository } from './order.repository';
import { autoReleaseDate, escrowService } from './escrow.service';
import { toOrderView } from './order.mapper';
import { PageParams } from '@/utils/pagination';
import { AdminOrderListQuery, CheckoutDTO, CheckoutLine, DeliverOrderDTO, SellerOrderFilter } from './order.types';
import { CHECKOUT_TX_OPTIONS, JOB_BATCH_SIZE } from './order.constants';
import { assertPurchasable, deliveryDeadline, generateOrderNumber, groupLines, mergeLines, OrderGroup } from './order.rules';

interface Viewer {
  id: string;
  role: Role;
}

async function canViewAnyOrder(viewer: Viewer) {
  if (viewer.role === 'ADMIN') return true;
  return (await hasPermission(viewer.role, 'manage_orders')) || (await hasPermission(viewer.role, 'manage_disputes'));
}

export const orderService = {
  async checkout(userId: string, dto: CheckoutDTO) {
    const lines = mergeLines(dto.items?.length ? dto.items : await orderRepository.findCartLines(userId));
    if (lines.length === 0) throw new BadRequestError('Sepetinizde ürün bulunmamaktadır', 'CART_EMPTY');

    const variantList = await orderRepository.findVariantsForCheckout(lines.map((l) => l.variantId));
    const variants = new Map(variantList.map((v) => [v.id, v]));
    for (const line of lines) assertPurchasable(variants.get(line.variantId), userId);

    const { defaultSalePercent } = await settingsService.getCommission();
    const groups = groupLines(lines, variants, defaultSalePercent);
    const grandTotal = roundMoney(groups.reduce((sum, g) => sum + g.total, 0));

    // Kullanıcı dostu hata mesajı için ön kontrol; asıl koruma transaction içindeki koşullu düşümdür
    const balance = toNumber((await walletRepository.getBalance(userId))?.walletBalance);
    if (balance < grandTotal) {
      throw new BadRequestError(
        `Yetersiz cüzdan bakiyesi. Mevcut: ${formatTRY(balance)}, Gereken: ${formatTRY(grandTotal)}`,
        'INSUFFICIENT_BALANCE'
      );
    }

    const now = new Date();
    const created = await withTransaction(
      async (tx) => {
        const results = [];
        for (const group of groups) {
          const isManual = group.deliveryType === 'MANUAL';
          const orderNumber = generateOrderNumber();

          const order = await orderRepository.createOrder(tx, {
            orderNumber,
            userId,
            sellerId: group.sellerId,
            totalAmount: group.total,
            escrowAmount: group.total,
            commissionAmount: group.commission,
            paymentMethod: 'WALLET',
            status: 'COMPLETED',
            deliveryType: group.deliveryType,
            deliveryStatus: isManual ? 'PENDING' : 'DELIVERED',
            deliveredAt: isManual ? null : now,
            deliveryDeadlineAt: isManual ? deliveryDeadline(group, now) : null,
            escrowStatus: 'HELD_IN_ESCROW',
            autoReleaseAt: isManual ? null : autoReleaseDate(),
          });

          const paid = await walletRepository.debitIfSufficient(tx, {
            userId,
            amount: group.total,
            type: 'PURCHASE',
            orderId: order.id,
            description: `#${orderNumber} sipariş ödemesi`,
          });
          if (!paid) throw new BadRequestError('Yetersiz cüzdan bakiyesi', 'INSUFFICIENT_BALANCE');

          const pins: { id: string; code: string; serialNumber: string | null; productTitle: string }[] = [];
          for (const line of group.lines) {
            const { variant, quantity } = line;
            await orderRepository.createOrderItem(tx, {
              orderId: order.id,
              variantId: variant.id,
              quantity,
              unitPrice: variant.price,
              totalPrice: line.lineTotal,
            });

            if (isManual) {
              const reserved = await orderRepository.decrementStock(tx, variant.id, quantity);
              if (!reserved) {
                throw new BadRequestError(`"${variant.product.title}" için yeterli stok bulunmamaktadır`, 'INSUFFICIENT_STOCK');
              }
            } else {
              const claimed = await orderRepository.claimPins(tx, variant.id, quantity, order.id, userId);
              if (claimed.length < quantity) {
                throw new BadRequestError(
                  `"${variant.product.title}" için yeterli dijital kod stoku bulunmamaktadır (mevcut: ${claimed.length})`,
                  'INSUFFICIENT_STOCK'
                );
              }
              // Bilgi amaçlı sayaç; asıl stok AVAILABLE kod sayısıdır
              await orderRepository.decrementStock(tx, variant.id, quantity);
              pins.push(...claimed.map((p) => ({ ...p, productTitle: variant.product.title })));
            }
          }
          results.push({ order, group, pins });
        }

        await orderRepository.clearCartLines(tx, userId, lines.map((l) => l.variantId));
        return results;
      },
      CHECKOUT_TX_OPTIONS
    );

    await this.notifyCheckout(userId, created);
    await clearProductCache(...new Set(variantList.map((v) => v.product.slug)));

    const newBalance = toNumber((await walletRepository.getBalance(userId))?.walletBalance);
    return {
      totalAmount: grandTotal,
      walletBalance: newBalance,
      orders: created.map(({ order, pins }) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: toNumber(order.totalAmount),
        deliveryType: order.deliveryType,
        deliveryStatus: order.deliveryStatus,
        deliveryDeadlineAt: order.deliveryDeadlineAt,
        escrowStatus: order.escrowStatus,
        // Satın alma anında alıcıya teslim edilen kodlar
        pins,
      })),
    };
  },

  async notifyCheckout(
    buyerId: string,
    created: { order: { id: string; orderNumber: string; deliveryType: DeliveryType; sellerId: string | null }; group: OrderGroup }[]
  ) {
    for (const { order, group } of created) {
      const isManual = order.deliveryType === 'MANUAL';
      const titles = group.lines.map((l) => l.variant.product.title).join(', ');
      await notificationService.send({
        userId: buyerId,
        type: 'ORDER',
        title: isManual ? 'Siparişiniz Alındı (Satıcı Teslimatı)' : 'Siparişiniz Teslim Edildi!',
        message: isManual
          ? `#${order.orderNumber} numaralı siparişiniz oluşturuldu. Satıcı teslimatı hazırlıyor; ödemeniz teslimat onayına kadar güvenli havuzda tutulur.`
          : `#${order.orderNumber} numaralı siparişinizin kodları teslim edildi. Kodları kontrol edip siparişi onaylayınız.`,
        link: `/hesabim/siparislerim/${order.id}`,
      });
      if (order.sellerId) {
        await notificationService.send({
          userId: order.sellerId,
          type: 'ORDER',
          title: isManual ? 'Teslimat Bekleyen Yeni Sipariş' : 'Yeni Bir Satış Yaptınız',
          message: isManual
            ? `"${titles}" için sipariş alındı (#${order.orderNumber}). Lütfen teslim süresi içinde teslim ediniz.`
            : `"${titles}" satıldı (#${order.orderNumber}). Tutar alıcı onayına kadar havuzda bekletilir.`,
          link: '/hesabim/pazar/satislar',
        });
      }
    }
  },

  async listForBuyer(userId: string, page: PageParams) {
    const { items, total } = await orderRepository.findBuyerOrders(userId, page);
    return { items: items.map(toOrderView), total };
  },

  async listForSeller(sellerId: string, filter: SellerOrderFilter, page: PageParams) {
    const { items, total } = await orderRepository.findSellerOrders(sellerId, filter === 'pending', page);
    return { items: items.map(toOrderView), total };
  },

  async listForAdmin(query: AdminOrderListQuery) {
    const { items, total } = await orderRepository.findForAdmin(query);
    return { items: items.map(toOrderView), total };
  },

  async getDetail(orderId: string, viewer: Viewer) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError('Sipariş bulunamadı', 'ORDER_NOT_FOUND');
    const isParty = order.userId === viewer.id || order.sellerId === viewer.id;
    if (!isParty && !(await canViewAnyOrder(viewer))) throw new NotFoundError('Sipariş bulunamadı', 'ORDER_NOT_FOUND');
    return toOrderView(order);
  },

  /** Satıcı manuel siparişi teslim eder; alıcı onayı için süre başlar */
  async deliver(sellerId: string, orderId: string, dto: DeliverOrderDTO) {
    const order = await orderRepository.findById(orderId);
    if (!order || order.sellerId !== sellerId) throw new NotFoundError('Sipariş bulunamadı', 'ORDER_NOT_FOUND');
    if (order.deliveryStatus !== 'PENDING') throw new ConflictError('Bu sipariş zaten teslim edilmiş veya iptal edilmiş', 'ALREADY_DELIVERED');
    if (order.escrowStatus !== 'HELD_IN_ESCROW') throw new ConflictError('Bu sipariş teslim edilebilir durumda değil', 'ORDER_NOT_DELIVERABLE');

    // Kodlar sipariş kalemlerine sırayla dağıtılır
    const variantQueue = order.items.flatMap((item) => Array<string>(item.quantity).fill(item.variantId));
    const codes = (dto.codes ?? []).map((c) => c.trim()).filter(Boolean);
    if (codes.length > variantQueue.length) {
      throw new BadRequestError(`Bu sipariş için en fazla ${variantQueue.length} kod girebilirsiniz`, 'TOO_MANY_CODES');
    }

    await withTransaction(async (tx) => {
      const moved = await orderRepository.transition(
        tx,
        orderId,
        { deliveryStatus: 'PENDING', escrowStatus: 'HELD_IN_ESCROW' },
        { deliveryStatus: 'DELIVERED', deliveredAt: new Date(), deliveryNotes: dto.deliveryNotes, autoReleaseAt: autoReleaseDate() }
      );
      if (!moved) throw new ConflictError('Sipariş durumu değişti, lütfen sayfayı yenileyiniz', 'ORDER_STATE_CHANGED');

      if (codes.length > 0) {
        const stamp = Date.now().toString().slice(-6);
        await orderRepository.createDeliveredPins(
          tx,
          codes.map((code, i) => ({
            variantId: variantQueue[i],
            code,
            serialNumber: `DLV-${stamp}-${i + 1}`,
            status: 'SOLD' as const,
            orderId: order.id,
            userId: order.userId,
            soldAt: new Date(),
          }))
        );
      }
    });

    await notificationService.send({
      userId: order.userId,
      type: 'ORDER',
      title: 'Siparişiniz Teslim Edildi',
      message: `#${order.orderNumber} numaralı siparişiniz satıcı tarafından teslim edildi. Lütfen kontrol edip onaylayınız.`,
      link: `/hesabim/siparislerim/${order.id}`,
    });
    return this.getDetail(orderId, { id: sellerId, role: 'USER' });
  },

  /** Alıcı teslimatı onaylar; havuzdaki tutar satıcıya aktarılır */
  async confirm(buyerId: string, orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order || order.userId !== buyerId) throw new NotFoundError('Sipariş bulunamadı', 'ORDER_NOT_FOUND');
    if (order.deliveryStatus !== 'DELIVERED') throw new BadRequestError('Teslim edilmemiş sipariş onaylanamaz', 'NOT_DELIVERED');
    if (order.escrowStatus !== 'HELD_IN_ESCROW') throw new ConflictError('Bu siparişin ödemesi zaten işlenmiş', 'ESCROW_ALREADY_PROCESSED');

    await escrowService.release(orderId, 'BUYER_CONFIRMED', {
      escrowStatus: 'HELD_IN_ESCROW',
      deliveryStatus: 'DELIVERED',
      ...orderRepository.noActiveDispute,
    });
    return this.getDetail(orderId, { id: buyerId, role: 'USER' });
  },

  /** Teslim süresi dolmuş manuel sipariş için alıcı iptal ve iade talep eder */
  async cancelOverdue(buyerId: string, orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order || order.userId !== buyerId) throw new NotFoundError('Sipariş bulunamadı', 'ORDER_NOT_FOUND');
    if (order.deliveryStatus !== 'PENDING') throw new BadRequestError('Yalnızca teslim bekleyen siparişler iptal edilebilir', 'NOT_PENDING');
    if (!order.deliveryDeadlineAt || order.deliveryDeadlineAt > new Date()) {
      throw new BadRequestError('Satıcının teslim süresi henüz dolmadı', 'DEADLINE_NOT_PASSED');
    }
    await escrowService.refund(orderId, 'DELIVERY_OVERDUE', {
      from: { deliveryStatus: 'PENDING', escrowStatus: 'HELD_IN_ESCROW' },
      cancelOrder: true,
    });
    return this.getDetail(orderId, { id: buyerId, role: 'USER' });
  },

  /** Satıcı teslim edemeyeceği manuel siparişi iptal eder; alıcıya iade yapılır */
  async cancelBySeller(sellerId: string, orderId: string, reason: string) {
    const order = await orderRepository.findById(orderId);
    if (!order || order.sellerId !== sellerId) throw new NotFoundError('Sipariş bulunamadı', 'ORDER_NOT_FOUND');
    if (order.deliveryStatus !== 'PENDING') throw new BadRequestError('Yalnızca teslim bekleyen siparişler iptal edilebilir', 'NOT_PENDING');

    await escrowService.refund(orderId, 'SELLER_CANCELLED', {
      from: { deliveryStatus: 'PENDING', escrowStatus: 'HELD_IN_ESCROW' },
      cancelOrder: true,
    });
    await notificationService.send({
      userId: order.userId,
      type: 'ORDER',
      title: 'Siparişiniz Satıcı Tarafından İptal Edildi',
      message: `#${order.orderNumber} iptal edildi. Gerekçe: ${reason}. Ödemeniz cüzdanınıza iade edildi.`,
      link: `/hesabim/siparislerim/${order.id}`,
    });
    return this.getDetail(orderId, { id: sellerId, role: 'USER' });
  },

  // ─── Zamanlanmış işler ──────────────────────────────────────────────────────

  async autoReleaseDue(batchSize = JOB_BATCH_SIZE) {
    const due = await orderRepository.findReleasable(batchSize);
    let released = 0;
    for (const { id } of due) {
      try {
        await escrowService.release(id, 'AUTO_RELEASE', {
          escrowStatus: 'HELD_IN_ESCROW',
          deliveryStatus: 'DELIVERED',
          autoReleaseAt: { lte: new Date() },
          ...orderRepository.noActiveDispute,
        });
        released++;
      } catch (err) {
        // Durum başka bir işlemle değiştiyse (ör. alıcı aynı anda onayladı) atlanır
        if (!(err instanceof ConflictError)) logger.error('Auto-release failed', { orderId: id, err });
      }
    }
    return released;
  },

  async refundOverdueDeliveries(batchSize = JOB_BATCH_SIZE) {
    const overdue = await orderRepository.findOverdueManual(batchSize);
    let refunded = 0;
    for (const { id } of overdue) {
      try {
        await escrowService.refund(id, 'DELIVERY_OVERDUE', {
          from: { deliveryStatus: 'PENDING', escrowStatus: 'HELD_IN_ESCROW', deliveryDeadlineAt: { lte: new Date() } },
          cancelOrder: true,
        });
        refunded++;
      } catch (err) {
        if (!(err instanceof ConflictError)) logger.error('Overdue refund failed', { orderId: id, err });
      }
    }
    return refunded;
  },
};
