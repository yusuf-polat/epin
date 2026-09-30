import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/disputes/dispute.repository', () => ({
  disputeRepository: { findOrderForDispute: vi.fn(), upsertForOrder: vi.fn(), findById: vi.fn(), transition: vi.fn() },
}));
vi.mock('@/modules/orders/order.repository', () => ({ orderRepository: { transition: vi.fn() } }));
vi.mock('@/modules/orders/escrow.service', () => ({
  autoReleaseDate: () => new Date('2030-01-01'),
  escrowService: { refundInTx: vi.fn(), releaseInTx: vi.fn(), notifyRefund: vi.fn(), notifyRelease: vi.fn() },
}));
vi.mock('@/modules/notifications/notification.service', () => ({ notificationService: { send: vi.fn(), notifyStaff: vi.fn() } }));
vi.mock('@/modules/permissions/permission.service', () => ({ hasPermission: vi.fn().mockResolvedValue(false) }));
vi.mock('@/database/transaction', () => ({ withTransaction: (fn: (tx: unknown) => unknown) => fn({}) }));

import { disputeService } from '@/modules/disputes/dispute.service';
import { disputeRepository } from '@/modules/disputes/dispute.repository';
import { orderRepository } from '@/modules/orders/order.repository';
import { escrowService } from '@/modules/orders/escrow.service';
import { notificationService } from '@/modules/notifications/notification.service';
import { AppError } from '@/utils/errors';

const disputes = vi.mocked(disputeRepository);
const orders = vi.mocked(orderRepository);

const dto = { orderId: 'o1', reason: 'INVALID_CODE' as const, description: 'Kod aktivasyonda hata verdi, video ekte.', videoUrl: 'https://youtu.be/dQw4w9WgXcQ' };
const order = (overrides: Record<string, unknown> = {}) => ({
  id: 'o1',
  orderNumber: 'NP-1',
  userId: 'buyer',
  sellerId: 'seller',
  escrowStatus: 'HELD_IN_ESCROW',
  deliveryStatus: 'DELIVERED',
  dispute: null,
  ...overrides,
});

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'NO_ERROR';
  } catch (err) {
    return (err as AppError).code;
  }
};

beforeEach(() => vi.clearAllMocks());

describe('disputeService.create', () => {
  it('başka birinin siparişine itiraz açılamaz', async () => {
    disputes.findOrderForDispute.mockResolvedValue(order({ userId: 'other' }) as never);
    expect(await codeOf(disputeService.create('buyer', dto))).toBe('ORDER_NOT_FOUND');
  });

  it('teslim edilmemiş siparişe itiraz açılamaz', async () => {
    disputes.findOrderForDispute.mockResolvedValue(order({ deliveryStatus: 'PENDING' }) as never);
    expect(await codeOf(disputeService.create('buyer', dto))).toBe('NOT_DELIVERED');
  });

  it('ödemesi işlenmiş siparişe itiraz açılamaz', async () => {
    disputes.findOrderForDispute.mockResolvedValue(order({ escrowStatus: 'RELEASED_TO_SELLER' }) as never);
    expect(await codeOf(disputeService.create('buyer', dto))).toBe('ESCROW_NOT_HELD');
  });

  it('aktif itiraz varken ikinci itiraz açılamaz', async () => {
    disputes.findOrderForDispute.mockResolvedValue(order({ dispute: { status: 'WAITING_SELLER', sellerAction: null } }) as never);
    expect(await codeOf(disputeService.create('buyer', dto))).toBe('DISPUTE_EXISTS');
  });

  it('escrow dondurulur ve satıcıya bildirim gider', async () => {
    disputes.findOrderForDispute.mockResolvedValue(order() as never);
    orders.transition.mockResolvedValue(true);
    disputes.upsertForOrder.mockResolvedValue({ id: 'd1' } as never);

    await disputeService.create('buyer', dto);

    expect(orders.transition).toHaveBeenCalledWith({}, 'o1', expect.objectContaining({ escrowStatus: 'HELD_IN_ESCROW' }), { escrowStatus: 'DISPUTED' });
    expect(disputes.upsertForOrder).toHaveBeenCalledWith({}, 'o1', expect.objectContaining({ status: 'WAITING_SELLER', sellerId: 'seller' }));
    expect(notificationService.send).toHaveBeenCalledWith(expect.objectContaining({ userId: 'seller', type: 'DISPUTE' }));
  });

  it('platform siparişinin itirazı doğrudan hakeme gider', async () => {
    disputes.findOrderForDispute.mockResolvedValue(order({ sellerId: null }) as never);
    orders.transition.mockResolvedValue(true);
    disputes.upsertForOrder.mockResolvedValue({ id: 'd1' } as never);

    await disputeService.create('buyer', dto);
    expect(disputes.upsertForOrder).toHaveBeenCalledWith({}, 'o1', expect.objectContaining({ status: 'WAITING_SUPPORT' }));
    expect(notificationService.notifyStaff).toHaveBeenCalled();
  });
});

describe('disputeService.resolve', () => {
  const record = { id: 'd1', orderId: 'o1', buyerId: 'buyer', sellerId: 'seller', status: 'WAITING_SUPPORT', order: { orderNumber: 'NP-1', items: [] } };

  it('karar bekleyen itiraz değilse işlem yapmaz', async () => {
    disputes.findById.mockResolvedValue({ ...record, status: 'RESOLVED_BUYER' } as never);
    expect(await codeOf(disputeService.resolve('admin', 'd1', 'BUYER', 'Kanıt yeterli'))).toBe('NOT_ACTIVE');
    expect(escrowService.refundInTx).not.toHaveBeenCalled();
  });

  it('eşzamanlı ikinci karar escrow işlemi yapmadan reddedilir', async () => {
    disputes.findById.mockResolvedValue(record as never);
    disputes.transition.mockResolvedValue(false);
    expect(await codeOf(disputeService.resolve('admin', 'd1', 'BUYER', 'Kanıt yeterli'))).toBe('DISPUTE_STATE_CHANGED');
    expect(escrowService.refundInTx).not.toHaveBeenCalled();
  });
});
