import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/config/prisma';
import { orderService } from '@/modules/orders/order.service';
import { api, balanceOf, createListing, createUser } from './helpers';

afterAll(() => prisma.$disconnect());

const checkout = (cookie: string, items: { variantId: string; quantity: number }[]) =>
  api().post('/api/orders/checkout').set('Cookie', cookie).send({ paymentMethod: 'WALLET', acceptTerms: true, items });

describe('Checkout ve escrow', () => {
  it('cüzdan dışı ödeme yöntemi reddedilir', async () => {
    const buyer = await createUser({ balance: 100 });
    const res = await api().post('/api/orders/checkout').set('Cookie', buyer.cookie).send({ paymentMethod: 'CREDIT_CARD' });
    expect(res.status).toBe(422);
  });

  it('mesafeli satış sözleşmesi onaylanmadan ödeme yapılamaz', async () => {
    const listing = await createListing({ price: 10, codes: ['T-1'] });
    const buyer = await createUser({ balance: 100 });
    const res = await api()
      .post('/api/orders/checkout')
      .set('Cookie', buyer.cookie)
      .send({ paymentMethod: 'WALLET', items: [{ variantId: listing.variantId, quantity: 1 }] });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toHaveProperty('acceptTerms');
  });

  it('komisyon satışta sabitlenir, onayda satıcıya net tutar geçer', async () => {
    const listing = await createListing({ price: 200, codes: ['K-1'], commissionRate: 10 });
    const buyer = await createUser({ balance: 200 });
    const res = await checkout(buyer.cookie, [{ variantId: listing.variantId, quantity: 1 }]);
    const orderId = res.body.data.orders[0].id;
    expect(Number((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).commissionAmount)).toBe(20);

    // Oran sonradan değişse bile satış anındaki komisyon uygulanır
    await prisma.category.update({ where: { slug: 'test-kategori-10' }, data: { commissionRate: 30 } });
    const confirm = await api().post(`/api/orders/${orderId}/confirm`).set('Cookie', buyer.cookie);
    expect(confirm.status).toBe(200);
    expect(await balanceOf(listing.seller.user.id)).toBe(180);

    const sale = await api().get('/api/orders/sales').set('Cookie', listing.seller.cookie);
    expect(sale.body.meta).toMatchObject({ page: 1, total: 1 });
    expect(sale.body.data[0]).toMatchObject({ commissionAmount: 20, sellerAmount: 180 });
  });

  it('farklı satıcıların ürünleri ayrı siparişlere bölünür ve ledger kaydı tutulur', async () => {
    const a = await createListing({ price: 40, codes: ['A-1', 'A-2'] });
    const b = await createListing({ price: 25, codes: ['B-1'] });
    const buyer = await createUser({ balance: 200 });

    const res = await checkout(buyer.cookie, [
      { variantId: a.variantId, quantity: 2 },
      { variantId: b.variantId, quantity: 1 },
    ]);
    expect(res.status).toBe(201);
    expect(res.body.data.orders).toHaveLength(2);
    expect(res.body.data.totalAmount).toBe(105);
    expect(await balanceOf(buyer.user.id)).toBe(95);

    const ledger = await prisma.walletTransaction.findMany({ where: { userId: buyer.user.id } });
    expect(ledger.map((l) => Number(l.amount)).sort((x, y) => x - y)).toEqual([-80, -25]);
    const sellers = await prisma.order.findMany({ where: { userId: buyer.user.id }, select: { sellerId: true } });
    expect(new Set(sellers.map((s) => s.sellerId))).toEqual(new Set([a.seller.user.id, b.seller.user.id]));
  });

  it('eşzamanlı checkout aynı kodu iki kez satamaz ve cüzdan eksiye düşmez', async () => {
    const listing = await createListing({ price: 10, codes: ['X-1', 'X-2', 'X-3'] });
    const buyers = await Promise.all([createUser({ balance: 20 }), createUser({ balance: 20 }), createUser({ balance: 20 })]);

    const results = await Promise.all(buyers.map((b) => checkout(b.cookie, [{ variantId: listing.variantId, quantity: 2 }])));
    const succeeded = results.filter((r) => r.status === 201);
    expect(succeeded).toHaveLength(1);

    const sold = await prisma.digitalPin.findMany({ where: { variantId: listing.variantId, status: 'SOLD' } });
    expect(sold).toHaveLength(2);
    expect(new Set(sold.map((p) => p.userId)).size).toBe(1);
    for (const b of buyers) expect(await balanceOf(b.user.id)).toBeGreaterThanOrEqual(0);
  });

  it('yetersiz bakiyede sipariş oluşmaz ve stok ayrılmaz', async () => {
    const listing = await createListing({ price: 50, codes: ['Y-1'] });
    const buyer = await createUser({ balance: 10 });
    const res = await checkout(buyer.cookie, [{ variantId: listing.variantId, quantity: 1 }]);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(await prisma.digitalPin.count({ where: { variantId: listing.variantId, status: 'AVAILABLE' } })).toBe(1);
    expect(await prisma.order.count({ where: { userId: buyer.user.id } })).toBe(0);
  });

  it('eşzamanlı onaylarda satıcıya yalnızca bir kez ödeme yapılır', async () => {
    const listing = await createListing({ price: 30, codes: ['Z-1'] });
    const buyer = await createUser({ balance: 30 });
    const orderId = (await checkout(buyer.cookie, [{ variantId: listing.variantId, quantity: 1 }])).body.data.orders[0].id;

    const results = await Promise.all([1, 2, 3].map(() => api().post(`/api/orders/${orderId}/confirm`).set('Cookie', buyer.cookie)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await balanceOf(listing.seller.user.id)).toBe(30);
  });

  it('süresi dolan manuel teslimat otomatik iade edilir', async () => {
    const listing = await createListing({ price: 15, deliveryType: 'MANUAL', stock: 3 });
    const buyer = await createUser({ balance: 15 });
    const orderId = (await checkout(buyer.cookie, [{ variantId: listing.variantId, quantity: 1 }])).body.data.orders[0].id;
    expect(await balanceOf(buyer.user.id)).toBe(0);

    await prisma.order.update({ where: { id: orderId }, data: { deliveryDeadlineAt: new Date(Date.now() - 1000) } });
    await orderService.refundOverdueDeliveries();

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order).toMatchObject({ status: 'CANCELLED', escrowStatus: 'REFUNDED_TO_BUYER', deliveryStatus: 'FAILED' });
    expect(await balanceOf(buyer.user.id)).toBe(15);
  });

  it('itiraz → satıcı iadesi alıcıya parayı geri verir', async () => {
    const listing = await createListing({ price: 20, codes: ['D-1'] });
    const buyer = await createUser({ balance: 20 });
    const orderId = (await checkout(buyer.cookie, [{ variantId: listing.variantId, quantity: 1 }])).body.data.orders[0].id;

    const dispute = await api()
      .post('/api/disputes')
      .set('Cookie', buyer.cookie)
      .send({ orderId, reason: 'INVALID_CODE', description: 'Kod aktivasyonda hata veriyor, kanıt videoda.', videoUrl: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(dispute.status).toBe(201);

    const confirm = await api().post(`/api/orders/${orderId}/confirm`).set('Cookie', buyer.cookie);
    expect(confirm.status).toBe(409);

    const refund = await api()
      .post(`/api/disputes/${dispute.body.data.id}/seller-respond`)
      .set('Cookie', listing.seller.cookie)
      .send({ action: 'REFUND', response: 'Haklısınız, iade ediyorum.' });
    expect(refund.status).toBe(200);
    expect(await balanceOf(buyer.user.id)).toBe(20);
    expect(await balanceOf(listing.seller.user.id)).toBe(0);
  });
});
