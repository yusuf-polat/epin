import { roundMoney, toNumber } from '@/utils/money';
import { maskCode } from '@/modules/pins/pin.mapper';
import { OrderDetailRecord } from './order.repository';

/**
 * Sipariş görünümü. Kodlar maskelenir; tam kod yalnızca alıcıya
 * /pins/:id/reveal üzerinden verilir.
 */
export function toOrderView(order: OrderDetailRecord) {
  const { pins, items, totalAmount, escrowAmount, commissionAmount, user, ...rest } = order;
  return {
    ...rest,
    totalAmount: toNumber(totalAmount),
    escrowAmount: toNumber(escrowAmount ?? totalAmount),
    commissionAmount: toNumber(commissionAmount),
    sellerAmount: roundMoney(toNumber(escrowAmount ?? totalAmount) - toNumber(commissionAmount)),
    buyer: user,
    items: items.map((i) => ({
      ...i,
      unitPrice: toNumber(i.unitPrice),
      totalPrice: toNumber(i.totalPrice),
    })),
    pins: pins.map((p) => ({ id: p.id, maskedCode: maskCode(p.code), serialNumber: p.serialNumber, variantId: p.variantId, soldAt: p.soldAt })),
  };
}

export type OrderView = ReturnType<typeof toOrderView>;
