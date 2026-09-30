import { Prisma } from '@prisma/client';
import { env } from '@/config/env';
import { withTransaction, Tx } from '@/database/transaction';
import { ConflictError } from '@/utils/errors';
import { formatTRY, roundMoney, toNumber } from '@/utils/money';
import { walletRepository } from '@/modules/wallet/wallet.repository';
import { notificationService } from '@/modules/notifications/notification.service';
import { orderRepository } from './order.repository';
import { RefundReason, ReleaseReason } from './order.types';
import { REFUND_TEXT, RELEASE_TEXT } from './order.constants';

export const autoReleaseDate = () => new Date(Date.now() + env.ESCROW_AUTO_RELEASE_HOURS * 60 * 60 * 1000);

export interface EscrowResult {
  orderId: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string | null;
  amount: number;
  /** Satıcıya aktarılan net tutar (amount - komisyon) */
  sellerAmount: number;
  commission: number;
}

interface RefundOptions {
  from: Prisma.OrderWhereInput;
  /** Teslim edilmemiş siparişlerde sipariş iptal edilir */
  cancelOrder?: boolean;
  /** Manuel siparişlerde ayrılan stok satıcıya geri verilir */
  restock?: boolean;
}

async function loadOrder(db: Tx, orderId: string) {
  const order = await orderRepository.findEscrowInfo(db, orderId);
  if (!order) throw new ConflictError('Sipariş bulunamadı', 'ORDER_NOT_FOUND');
  return order;
}

/**
 * Escrow para hareketleri tek bir yerden yönetilir. Her işlem siparişi yalnızca
 * beklenen durumdaysa günceller (koşullu update); eşzamanlı isteklerde satıcıya
 * çift ödeme veya alıcıya çift iade yapılamaz.
 *
 * *InTx fonksiyonları çağıranın transaction'ı içinde çalışır; bildirimler
 * commit sonrası notify* fonksiyonlarıyla gönderilmelidir.
 */
export const escrowService = {
  async releaseInTx(db: Tx, orderId: string, reason: ReleaseReason, from: Prisma.OrderWhereInput): Promise<EscrowResult> {
    const order = await loadOrder(db, orderId);
    const moved = await orderRepository.transition(db, orderId, from, { escrowStatus: 'RELEASED_TO_SELLER' });
    if (!moved) throw new ConflictError('Sipariş ödemesi zaten işlenmiş veya uygun durumda değil', 'ESCROW_STATE_CHANGED');

    const amount = toNumber(order.escrowAmount ?? order.totalAmount);
    const commission = Math.min(amount, toNumber(order.commissionAmount));
    const sellerAmount = roundMoney(amount - commission);
    // Platform siparişlerinde (sellerId null) tutar platformda kalır
    if (order.sellerId && sellerAmount > 0) {
      await walletRepository.credit(db, {
        userId: order.sellerId,
        amount: sellerAmount,
        type: 'SALE_RELEASE',
        orderId: order.id,
        description:
          `#${order.orderNumber} satış ödemesi (${RELEASE_TEXT[reason]})` +
          (commission > 0 ? ` · ${formatTRY(amount)} - ${formatTRY(commission)} komisyon` : ''),
      });
    }
    return { orderId: order.id, orderNumber: order.orderNumber, buyerId: order.userId, sellerId: order.sellerId, amount, sellerAmount, commission };
  },

  async refundInTx(db: Tx, orderId: string, reason: RefundReason, options: RefundOptions): Promise<EscrowResult> {
    const order = await loadOrder(db, orderId);
    const moved = await orderRepository.transition(db, orderId, options.from, {
      escrowStatus: 'REFUNDED_TO_BUYER',
      ...(options.cancelOrder ? { status: 'CANCELLED', deliveryStatus: 'FAILED' } : {}),
    });
    if (!moved) throw new ConflictError('Sipariş ödemesi zaten işlenmiş veya uygun durumda değil', 'ESCROW_STATE_CHANGED');

    const amount = toNumber(order.escrowAmount ?? order.totalAmount);
    await walletRepository.credit(db, {
      userId: order.userId,
      amount,
      type: 'REFUND',
      orderId: order.id,
      description: `#${order.orderNumber} iadesi (${REFUND_TEXT[reason]})`,
    });
    if (options.restock) {
      for (const item of order.items) await orderRepository.incrementStock(db, item.variantId, item.quantity);
    }
    return { orderId: order.id, orderNumber: order.orderNumber, buyerId: order.userId, sellerId: order.sellerId, amount, sellerAmount: 0, commission: 0 };
  },

  async notifyRelease(result: EscrowResult, reason: ReleaseReason) {
    if (!result.sellerId) return;
    await notificationService.send({
      userId: result.sellerId,
      type: 'WALLET',
      title: 'Ödeme Bakiyenize Aktarıldı',
      message: `#${result.orderNumber}: ${RELEASE_TEXT[reason]}. ${formatTRY(result.sellerAmount)} bakiyenize eklendi${result.commission > 0 ? ` (komisyon: ${formatTRY(result.commission)})` : ''}.`,
      link: '/hesabim/cuzdan',
    });
  },

  async notifyRefund(result: EscrowResult, reason: RefundReason) {
    await notificationService.send({
      userId: result.buyerId,
      type: 'WALLET',
      title: 'İade Bakiyenize Yüklendi',
      message: `#${result.orderNumber}: ${REFUND_TEXT[reason]}. ${formatTRY(result.amount)} cüzdanınıza iade edildi.`,
      link: `/hesabim/siparislerim/${result.orderId}`,
    });
    if (result.sellerId && reason !== 'SELLER_REFUND' && reason !== 'SELLER_CANCELLED') {
      await notificationService.send({
        userId: result.sellerId,
        type: 'ORDER',
        title: 'Sipariş Alıcıya İade Edildi',
        message: `#${result.orderNumber}: ${REFUND_TEXT[reason]}. Tutar alıcıya iade edildi.`,
        link: '/hesabim/pazar/satislar',
      });
    }
  },

  /** Kendi transaction'ını açan ve commit sonrası bildirim gönderen kısayollar */
  async release(orderId: string, reason: ReleaseReason, from: Prisma.OrderWhereInput) {
    const result = await withTransaction((tx) => this.releaseInTx(tx, orderId, reason, from));
    await this.notifyRelease(result, reason);
    return result;
  },

  async refund(orderId: string, reason: RefundReason, options: RefundOptions) {
    const result = await withTransaction((tx) => this.refundInTx(tx, orderId, reason, options));
    await this.notifyRefund(result, reason);
    return result;
  },
};
