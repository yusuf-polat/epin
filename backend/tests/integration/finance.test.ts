import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/config/prisma';
import { api, balanceOf, createUser } from './helpers';

afterAll(() => prisma.$disconnect());

const IBAN = 'TR330006100519786457841326';

describe('Para çekme (satıcı)', () => {
  it('talep tutarı bloke eder; red edilince iade edilir, tekrar işlenemez', async () => {
    const seller = await createUser({ canSell: true, balance: 500 });
    const admin = await createUser({ role: 'ADMIN' });

    const created = await api().post('/api/withdrawals').set('Cookie', seller.cookie).send({ amount: 200, iban: IBAN, accountHolder: 'Satıcı Test' });
    expect(created.status).toBe(201);
    expect(await balanceOf(seller.user.id)).toBe(300);

    const summary = await api().get('/api/wallet').set('Cookie', seller.cookie);
    expect(summary.body.data).toMatchObject({ walletBalance: 300, pendingWithdrawal: 200 });

    const id = created.body.data.id;
    const results = await Promise.all([1, 2].map(() => api().post(`/api/withdrawals/${id}/reject`).set('Cookie', admin.cookie).send({ reason: 'IBAN adı eşleşmiyor' })));
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await balanceOf(seller.user.id)).toBe(500);

    const ledger = await prisma.walletTransaction.findMany({ where: { userId: seller.user.id }, orderBy: { createdAt: 'asc' } });
    expect(ledger.map((l) => [l.type, Number(l.amount)])).toEqual([
      ['WITHDRAWAL', -200],
      ['WITHDRAWAL_REFUND', 200],
    ]);
  });

  it('ödendi olarak işaretlenen talepte bakiye iade edilmez; satıcı olmayan çekemez', async () => {
    const seller = await createUser({ canSell: true, balance: 100 });
    const admin = await createUser({ role: 'ADMIN' });
    const id = (await api().post('/api/withdrawals').set('Cookie', seller.cookie).send({ amount: 100, iban: IBAN, accountHolder: 'Satıcı Test' })).body.data.id;

    const paid = await api().post(`/api/withdrawals/${id}/paid`).set('Cookie', admin.cookie).send({ transferRef: 'EFT-123' });
    expect(paid.status).toBe(200);
    const cancel = await api().post(`/api/withdrawals/${id}/cancel`).set('Cookie', seller.cookie);
    expect(cancel.status).toBe(409);
    expect(await balanceOf(seller.user.id)).toBe(0);

    const buyer = await createUser({ balance: 100 });
    const denied = await api().post('/api/withdrawals').set('Cookie', buyer.cookie).send({ amount: 60, iban: IBAN, accountHolder: 'Alıcı Test' });
    expect(denied.status).toBe(403);
  });

  it('bakiyeden fazla tutar ve geçersiz IBAN reddedilir', async () => {
    const seller = await createUser({ canSell: true, balance: 80 });
    const over = await api().post('/api/withdrawals').set('Cookie', seller.cookie).send({ amount: 90, iban: IBAN, accountHolder: 'Satıcı Test' });
    expect(over.body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(await prisma.withdrawalRequest.count({ where: { userId: seller.user.id } })).toBe(0);

    const bad = await api().post('/api/withdrawals').set('Cookie', seller.cookie).send({ amount: 60, iban: 'TR000000000000000000000000', accountHolder: 'Satıcı Test' });
    expect(bad.status).toBe(422);
    expect(bad.body.error.details).toHaveProperty('iban');
  });
});

describe('Havale/EFT ile yükleme', () => {
  it('onaylanınca bakiye yüklenir; aynı talep iki kez onaylanamaz', async () => {
    const user = await createUser();
    const admin = await createUser({ role: 'ADMIN' });

    const info = await api().get('/api/deposits/bank-info').set('Cookie', user.cookie);
    expect(info.body.data.iban).toMatch(/^TR/);

    const created = await api().post('/api/deposits').set('Cookie', user.cookie).send({ amount: 250, senderName: 'Test Kullanıcı' });
    expect(created.status).toBe(201);
    expect(created.body.data.referenceCode).toMatch(/^NP-[A-Z2-9]{8}$/);

    const id = created.body.data.id;
    const results = await Promise.all([1, 2].map(() => api().post(`/api/deposits/${id}/approve`).set('Cookie', admin.cookie).send({ approvedAmount: 240 })));
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await balanceOf(user.user.id)).toBe(240);
  });

  it('finans yetkisi olmayan personel talepleri göremez', async () => {
    const destek = await createUser({ role: 'DESTEK' });
    const res = await api().get('/api/deposits').set('Cookie', destek.cookie);
    expect(res.status).toBe(403);
  });
});

describe('Yönetim', () => {
  it('admin tüm siparişleri ve panel istatistiklerini görür', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const orders = await api().get('/api/orders/admin?limit=5').set('Cookie', admin.cookie);
    expect(orders.status).toBe(200);
    expect(orders.body.meta).toMatchObject({ page: 1, limit: 5 });

    const dash = await api().get('/api/reports/dashboard').set('Cookie', admin.cookie);
    expect(dash.status).toBe(200);
    expect(dash.body.data.pending).toHaveProperty('withdrawals');
    expect(dash.body.data.finance.daily).toHaveLength(14);

    const user = await createUser();
    expect((await api().get('/api/orders/admin').set('Cookie', user.cookie)).status).toBe(403);
  });
});
