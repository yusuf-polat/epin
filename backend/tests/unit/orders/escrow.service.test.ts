import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('@/modules/orders/order.repository', () => ({
  orderRepository: { findEscrowInfo: vi.fn(), transition: vi.fn(), incrementStock: vi.fn() },
}));
vi.mock('@/modules/wallet/wallet.repository', () => ({ walletRepository: { credit: vi.fn() } }));
vi.mock('@/modules/notifications/notification.service', () => ({ notificationService: { send: vi.fn() } }));
vi.mock('@/database/transaction', () => ({ withTransaction: (fn: (tx: unknown) => unknown) => fn({}) }));

import { escrowService } from '@/modules/orders/escrow.service';
import { orderRepository } from '@/modules/orders/order.repository';
import { walletRepository } from '@/modules/wallet/wallet.repository';
import { notificationService } from '@/modules/notifications/notification.service';
import { ConflictError } from '@/utils/errors';

const repo = vi.mocked(orderRepository);
const wallet = vi.mocked(walletRepository);
const tx = {} as never;

const order = (sellerId: string | null = 'seller-1', commission = 0) => ({
  id: 'order-1',
  orderNumber: 'NP-1',
  userId: 'buyer-1',
  sellerId,
  escrowAmount: new Prisma.Decimal(150),
  totalAmount: new Prisma.Decimal(150),
  commissionAmount: new Prisma.Decimal(commission),
  items: [{ variantId: 'v1', quantity: 2 }],
});

beforeEach(() => vi.clearAllMocks());

describe('escrowService.releaseInTx', () => {
  it('havuzdaki tutarı satıcıya aktarır ve ledger kaydı oluşturur', async () => {
    repo.findEscrowInfo.mockResolvedValue(order() as never);
    repo.transition.mockResolvedValue(true);

    const result = await escrowService.releaseInTx(tx, 'order-1', 'BUYER_CONFIRMED', { escrowStatus: 'HELD_IN_ESCROW' });

    expect(repo.transition).toHaveBeenCalledWith(tx, 'order-1', { escrowStatus: 'HELD_IN_ESCROW' }, { escrowStatus: 'RELEASED_TO_SELLER' });
    expect(wallet.credit).toHaveBeenCalledWith(tx, expect.objectContaining({ userId: 'seller-1', amount: 150, type: 'SALE_RELEASE', orderId: 'order-1' }));
    expect(result).toMatchObject({ sellerId: 'seller-1', buyerId: 'buyer-1', amount: 150 });
  });

  it('sipariş beklenen durumda değilse (eşzamanlı işlem) çift ödeme yapmaz', async () => {
    repo.findEscrowInfo.mockResolvedValue(order() as never);
    repo.transition.mockResolvedValue(false);

    await expect(escrowService.releaseInTx(tx, 'order-1', 'AUTO_RELEASE', { escrowStatus: 'HELD_IN_ESCROW' })).rejects.toBeInstanceOf(ConflictError);
    expect(wallet.credit).not.toHaveBeenCalled();
  });

  it('komisyonu düşerek satıcıya net tutarı aktarır', async () => {
    repo.findEscrowInfo.mockResolvedValue(order('seller-1', 12) as never);
    repo.transition.mockResolvedValue(true);

    const result = await escrowService.releaseInTx(tx, 'order-1', 'BUYER_CONFIRMED', { escrowStatus: 'HELD_IN_ESCROW' });
    expect(wallet.credit).toHaveBeenCalledWith(tx, expect.objectContaining({ userId: 'seller-1', amount: 138 }));
    expect(result).toMatchObject({ amount: 150, sellerAmount: 138, commission: 12 });
  });

  it('platform siparişinde (satıcısız) kimseye ödeme yapmaz', async () => {
    repo.findEscrowInfo.mockResolvedValue(order(null) as never);
    repo.transition.mockResolvedValue(true);

    await escrowService.releaseInTx(tx, 'order-1', 'AUTO_RELEASE', { escrowStatus: 'HELD_IN_ESCROW' });
    expect(wallet.credit).not.toHaveBeenCalled();
  });
});

describe('escrowService.refundInTx', () => {
  it('alıcıya iade eder, istenirse siparişi iptal edip stoğu geri verir', async () => {
    repo.findEscrowInfo.mockResolvedValue(order() as never);
    repo.transition.mockResolvedValue(true);

    await escrowService.refundInTx(tx, 'order-1', 'DELIVERY_OVERDUE', { from: { deliveryStatus: 'PENDING' }, cancelOrder: true, restock: true });

    expect(repo.transition).toHaveBeenCalledWith(tx, 'order-1', { deliveryStatus: 'PENDING' }, {
      escrowStatus: 'REFUNDED_TO_BUYER',
      status: 'CANCELLED',
      deliveryStatus: 'FAILED',
    });
    expect(wallet.credit).toHaveBeenCalledWith(tx, expect.objectContaining({ userId: 'buyer-1', amount: 150, type: 'REFUND' }));
    expect(repo.incrementStock).toHaveBeenCalledWith(tx, 'v1', 2);
  });

  it('zaten işlenmiş siparişte çift iade yapmaz', async () => {
    repo.findEscrowInfo.mockResolvedValue(order() as never);
    repo.transition.mockResolvedValue(false);

    await expect(escrowService.refundInTx(tx, 'order-1', 'SELLER_REFUND', { from: { escrowStatus: 'DISPUTED' } })).rejects.toBeInstanceOf(ConflictError);
    expect(wallet.credit).not.toHaveBeenCalled();
  });
});

describe('escrowService.release (commit sonrası bildirim)', () => {
  it('işlem başarılıysa satıcıya bildirim gönderir', async () => {
    repo.findEscrowInfo.mockResolvedValue(order() as never);
    repo.transition.mockResolvedValue(true);

    await escrowService.release('order-1', 'BUYER_CONFIRMED', { escrowStatus: 'HELD_IN_ESCROW' });
    expect(notificationService.send).toHaveBeenCalledWith(expect.objectContaining({ userId: 'seller-1', type: 'WALLET' }));
  });
});
