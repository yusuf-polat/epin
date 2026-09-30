import crypto from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/config/prisma';
import { api, balanceOf, createListing, createUser } from './helpers';

let admin: Awaited<ReturnType<typeof createUser>>;
const IBAN = 'TR330006100519786457841326';

beforeAll(async () => {
  admin = await createUser({ role: 'ADMIN' });
});

afterAll(async () => {
  // Diğer test dosyaları varsayılan (.env) ayarlarla çalışır
  await prisma.systemSetting.deleteMany();
  await prisma.$disconnect();
});

const setCommission = (body: object) => api().put('/api/settings/commission').set('Cookie', admin.cookie).send(body);

describe('Komisyon ayarları', () => {
  it('varsayılanlar .env değerinden gelir; yalnızca yetkili değiştirir', async () => {
    expect((await api().get('/api/settings/public')).body.data).toEqual({ defaultSalePercent: 8, withdrawalPercent: 0, withdrawalFixed: 0 });
    const user = await createUser();
    expect((await api().put('/api/settings/commission').set('Cookie', user.cookie).send({ defaultSalePercent: 1, withdrawalPercent: 0, withdrawalFixed: 0 })).status).toBe(403);
    expect((await setCommission({ defaultSalePercent: 60, withdrawalPercent: 0, withdrawalFixed: 0 })).status).toBe(422);
  });

  it('kategoride oran yoksa panelde ayarlanan varsayılan satış komisyonu uygulanır', async () => {
    expect((await setCommission({ defaultSalePercent: 5, withdrawalPercent: 0, withdrawalFixed: 0 })).status).toBe(200);
    const listing = await createListing({ price: 200, codes: ['KOM-1'] });
    // Kategori özel oranı kaldırılır → varsayılan geçerli olur
    const category = await prisma.category.create({ data: { name: `Oransız ${crypto.randomUUID().slice(0, 6)}`, slug: `oransiz-${crypto.randomUUID().slice(0, 6)}`, imageUrl: '/c.png' } });
    await prisma.product.update({ where: { id: listing.product.id }, data: { categoryId: category.id } });

    const buyer = await createUser({ balance: 500 });
    const checkout = await api()
      .post('/api/orders/checkout')
      .set('Cookie', buyer.cookie)
      .send({ paymentMethod: 'WALLET', acceptTerms: true, items: [{ variantId: listing.variantId, quantity: 1 }] });
    expect(checkout.status).toBe(201);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: checkout.body.data.orders[0].id } });
    expect(Number(order.commissionAmount)).toBe(10);
  });

  it('para çekme komisyonu talep anında hesaplanır; red/iptalde tutarın tamamı iade edilir', async () => {
    await setCommission({ defaultSalePercent: 8, withdrawalPercent: 2, withdrawalFixed: 1.5 });
    const seller = await createUser({ canSell: true, balance: 300 });

    const created = await api().post('/api/withdrawals').set('Cookie', seller.cookie).send({ amount: 200, iban: IBAN, accountHolder: 'Satıcı Test' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ amount: 200, fee: 5.5, netAmount: 194.5 });
    expect(await balanceOf(seller.user.id)).toBe(100);

    // Sonradan ayar değişse de talepteki ücret sabit kalır
    await setCommission({ defaultSalePercent: 8, withdrawalPercent: 0, withdrawalFixed: 0 });
    const mine = await api().get('/api/withdrawals/mine').set('Cookie', seller.cookie);
    expect(mine.body.data[0]).toMatchObject({ fee: 5.5, netAmount: 194.5 });

    await api().post(`/api/withdrawals/${created.body.data.id}/cancel`).set('Cookie', seller.cookie);
    expect(await balanceOf(seller.user.id)).toBe(300);
  });

  it('ücret tutarı aşıyorsa talep açılmaz', async () => {
    await setCommission({ defaultSalePercent: 8, withdrawalPercent: 0, withdrawalFixed: 60 });
    const seller = await createUser({ canSell: true, balance: 300 });
    const res = await api().post('/api/withdrawals').set('Cookie', seller.cookie).send({ amount: 50, iban: IBAN, accountHolder: 'Satıcı Test' });
    expect(res.body.error.code).toBe('AMOUNT_BELOW_FEE');
    expect(await balanceOf(seller.user.id)).toBe(300);
    await setCommission({ defaultSalePercent: 8, withdrawalPercent: 0, withdrawalFixed: 0 });
  });
});

describe('SMTP ayarları', () => {
  it('parola şifreli saklanır ve hiçbir yanıtta dönmez; boş parola mevcut değeri korur', async () => {
    const body = { enabled: true, host: 'smtp.example.com', port: 587, secure: false, user: 'mailer@example.com', pass: 'cok-gizli-parola', fromName: 'NexusPin', fromEmail: 'no-reply@example.com' };
    const saved = await api().put('/api/settings/smtp').set('Cookie', admin.cookie).send(body);
    expect(saved.status).toBe(200);
    expect(saved.body.data).toMatchObject({ enabled: true, host: 'smtp.example.com', hasPassword: true });
    expect(JSON.stringify(saved.body)).not.toContain('cok-gizli-parola');

    const stored = await prisma.systemSetting.findUniqueOrThrow({ where: { key: 'smtp' } });
    expect(JSON.stringify(stored.value)).not.toContain('cok-gizli-parola');

    const kept = await api().put('/api/settings/smtp').set('Cookie', admin.cookie).send({ ...body, pass: '', port: 465, secure: true });
    expect(kept.body.data).toMatchObject({ port: 465, hasPassword: true });
    const cleared = await api().put('/api/settings/smtp').set('Cookie', admin.cookie).send({ ...body, enabled: false, pass: null });
    expect(cleared.body.data.hasPassword).toBe(false);

    expect(await prisma.auditLog.count({ where: { action: 'settings.smtp' } })).toBeGreaterThan(0);
    const user = await createUser();
    expect((await api().get('/api/settings/smtp').set('Cookie', user.cookie)).status).toBe(403);
  });

  it('SMTP kapalıyken test e-postası açıklayıcı hata döner', async () => {
    const res = await api().post('/api/settings/smtp/test').set('Cookie', admin.cookie).send({ to: 'test@example.com' });
    expect(res.body.error.code).toBe('SMTP_NOT_CONFIGURED');
  });
});

describe('Toplu sistem bildirimi', () => {
  it('seçilen kitleye gönderilir, yasaklı kullanıcılar dahil edilmez, geçmişe yazılır', async () => {
    const seller = await createUser({ canSell: true });
    const buyer = await createUser();
    const banned = await createUser({ canSell: true });
    await prisma.user.update({ where: { id: banned.user.id }, data: { isBanned: true } });
    const expected = await prisma.user.count({ where: { canSell: true, isBanned: false } });

    const count = await api().get('/api/notifications/admin/recipient-count?audience=SELLERS').set('Cookie', admin.cookie);
    expect(count.body.data.count).toBe(expected);

    const title = `Bakım duyurusu ${crypto.randomUUID().slice(0, 6)}`;
    const sent = await api()
      .post('/api/notifications/admin/broadcast')
      .set('Cookie', admin.cookie)
      .send({ audience: 'SELLERS', title, message: 'Pazar gecesi 02:00-03:00 arası bakım yapılacaktır.', link: '/sss', sendEmail: false });
    expect(sent.status).toBe(201);
    expect(sent.body.data.recipientCount).toBe(expected);

    const inbox = async (userId: string) => prisma.notification.count({ where: { userId, title } });
    expect(await inbox(seller.user.id)).toBe(1);
    expect(await inbox(buyer.user.id)).toBe(0);
    expect(await inbox(banned.user.id)).toBe(0);

    const history = await api().get('/api/notifications/admin/broadcasts').set('Cookie', admin.cookie);
    expect(history.body.data[0]).toMatchObject({ title, audience: 'SELLERS', recipientCount: expected, sentBy: { id: admin.user.id } });
  });

  it('tek kullanıcıya e-posta ile gönderilir; dış bağlantı ve bilinmeyen kullanıcı reddedilir', async () => {
    const target = await createUser();
    const ok = await api()
      .post('/api/notifications/admin/broadcast')
      .set('Cookie', admin.cookie)
      .send({ audience: 'USER', email: target.user.email, title: 'Hesabınız hakkında', message: 'Destek talebinize yanıt verdik.', sendEmail: true });
    expect(ok.body.data).toMatchObject({ recipientCount: 1, emailQueued: true });

    const external = await api()
      .post('/api/notifications/admin/broadcast')
      .set('Cookie', admin.cookie)
      .send({ audience: 'ALL', title: 'Kampanya', message: 'Yeni kampanya başladı!', link: '//evil.example/phish' });
    expect(external.status).toBe(422);

    const unknown = await api()
      .post('/api/notifications/admin/broadcast')
      .set('Cookie', admin.cookie)
      .send({ audience: 'USER', email: 'yok-boyle-biri@test.dev', title: 'Merhaba', message: 'Test mesajı' });
    expect(unknown.body.error.code).toBe('USER_NOT_FOUND');

    const user = await createUser();
    expect((await api().post('/api/notifications/admin/broadcast').set('Cookie', user.cookie).send({ audience: 'ALL', title: 'x', message: 'y' })).status).toBe(403);
  });
});

describe('Bölge', () => {
  it('ilanlarda yalnızca tanımlı bölge kodları kabul edilir; bölge filtresi GLOBAL ilanları da içerir', async () => {
    const { seller, product } = await createListing({ price: 10, codes: ['REG-1'] });
    const base = { title: product.title, description: product.description, categoryId: product.categoryId, price: 10, originalPrice: null, brand: 'Test', galleryUrls: [], deliveryInstructions: null };
    const bad = await api().put(`/api/products/${product.id}`).set('Cookie', seller.cookie).send({ ...base, region: 'Mars' });
    expect(bad.status).toBe(422);
    expect((await api().put(`/api/products/${product.id}`).set('Cookie', seller.cookie).send({ ...base, region: 'TR' })).status).toBe(200);
    await prisma.product.update({ where: { id: product.id }, data: { approvalStatus: 'APPROVED' } });

    const global = await createListing({ price: 10, codes: ['REG-2'] });
    const us = await createListing({ price: 10, codes: ['REG-3'] });
    await prisma.product.update({ where: { id: us.product.id }, data: { region: 'US' } });

    const ids = async (region: string) => (await api().get(`/api/products?region=${region}&limit=100`)).body.data.map((p: { id: string }) => p.id);
    const tr = await ids('TR');
    expect(tr).toEqual(expect.arrayContaining([product.id, global.product.id]));
    expect(tr).not.toContain(us.product.id);
    expect((await api().get('/api/products?region=Mars')).status).toBe(422);
  });
});
