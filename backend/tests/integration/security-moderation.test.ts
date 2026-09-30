import crypto from 'crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/config/prisma';
import { hotp, totpCounter } from '@/utils/totp';
import { api, cookieFrom, createListing, createUser } from './helpers';

afterAll(() => prisma.$disconnect());

const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
const IBAN = 'TR330006100519786457841326';

describe('E-posta doğrulama', () => {
  it('yeni kayıt doğrulanmamış başlar; bağlantı bir kez kullanılır; para çekme doğrulama ister', async () => {
    const email = `kayit-${crypto.randomUUID().slice(0, 8)}@test.dev`;
    const reg = await api().post('/api/auth/register').send({ email, name: 'Yeni Üye', password: 'Sifre1234', acceptTerms: true });
    expect(reg.body.data.user).toMatchObject({ emailVerified: false, twoFactorEnabled: false });
    const cookie = cookieFrom(reg);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(await prisma.emailVerificationToken.count({ where: { userId: user.id } })).toBe(1);

    await prisma.user.update({ where: { id: user.id }, data: { canSell: true, walletBalance: 100 } });
    const blocked = await api().post('/api/withdrawals').set('Cookie', cookie).send({ amount: 50, iban: IBAN, accountHolder: 'Yeni Üye Test' });
    expect(blocked.body.error.code).toBe('EMAIL_NOT_VERIFIED');

    // Ham token yalnızca e-postada olduğundan test, özetini doğrudan kaydeder
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    await prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60_000) } });

    expect((await api().post('/api/auth/verify-email').send({ token })).status).toBe(200);
    expect((await api().post('/api/auth/verify-email').send({ token })).body.error.code).toBe('INVALID_VERIFY_TOKEN');
    expect((await api().get('/api/auth/me').set('Cookie', cookie)).body.data.emailVerified).toBe(true);
    expect((await api().post('/api/auth/resend-verification').set('Cookie', cookie)).body.error.code).toBe('ALREADY_VERIFIED');

    const ok = await api().post('/api/withdrawals').set('Cookie', cookie).send({ amount: 50, iban: IBAN, accountHolder: 'Yeni Üye Test' });
    expect(ok.status).toBe(201);
  });
});

describe('İki adımlı doğrulama (TOTP)', () => {
  it('kurulum → giriş ikinci adım ister → kod ve kurtarma koduyla giriş → kapatma', async () => {
    const { user, cookie } = await createUser();
    const setup = await api().post('/api/auth/2fa/setup').set('Cookie', cookie);
    expect(setup.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    const secret = setup.body.data.secret.replace(/\s/g, '');
    const now = totpCounter();

    const wrong = await api().post('/api/auth/2fa/enable').set('Cookie', cookie).send({ setupToken: setup.body.data.setupToken, code: '000000' === hotp(secret, now) ? '111111' : '000000' });
    expect(wrong.body.error.code).toBe('INVALID_TWO_FACTOR_CODE');

    const enabled = await api().post('/api/auth/2fa/enable').set('Cookie', cookie).send({ setupToken: setup.body.data.setupToken, code: hotp(secret, now) });
    expect(enabled.status).toBe(200);
    const recoveryCodes: string[] = enabled.body.data.recoveryCodes;
    expect(recoveryCodes).toHaveLength(10);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.twoFactorSecret).not.toContain(secret);

    // Parola doğru olsa da cookie verilmez
    const login = await api().post('/api/auth/login').send({ email: user.email, password: 'Sifre1234' });
    expect(login.body.data.twoFactorRequired).toBe(true);
    expect(login.headers['set-cookie']).toBeUndefined();
    const challengeToken = login.body.data.challengeToken;

    // Challenge token oturum yerine kullanılamaz
    expect((await api().get('/api/auth/me').set('Cookie', `nexuspin_token=${challengeToken}`)).status).toBe(401);

    // Kurulumda kullanılan kod tekrar kullanılamaz; sonraki adımın kodu geçerlidir
    expect((await api().post('/api/auth/2fa/login').send({ challengeToken, code: hotp(secret, now) })).body.error.code).toBe('INVALID_TWO_FACTOR_CODE');
    const second = await api().post('/api/auth/2fa/login').send({ challengeToken, code: hotp(secret, now + 1) });
    expect(second.status).toBe(200);
    expect((await api().get('/api/auth/me').set('Cookie', cookieFrom(second))).body.data.twoFactorEnabled).toBe(true);

    // Kurtarma kodu tek kullanımlıktır
    const again = (await api().post('/api/auth/login').send({ email: user.email, password: 'Sifre1234' })).body.data.challengeToken;
    expect((await api().post('/api/auth/2fa/login').send({ challengeToken: again, code: recoveryCodes[0].toLowerCase() })).status).toBe(200);
    const third = (await api().post('/api/auth/login').send({ email: user.email, password: 'Sifre1234' })).body.data.challengeToken;
    expect((await api().post('/api/auth/2fa/login').send({ challengeToken: third, code: recoveryCodes[0] })).status).toBe(401);
    expect((await api().get('/api/auth/2fa').set('Cookie', cookie)).body.data).toEqual({ enabled: true, recoveryCodesLeft: 9 });

    const badPass = await api().post('/api/auth/2fa/disable').set('Cookie', cookie).send({ password: 'yanlis', code: recoveryCodes[1] });
    expect(badPass.body.error.code).toBe('WRONG_PASSWORD');
    expect((await api().post('/api/auth/2fa/disable').set('Cookie', cookie).send({ password: 'Sifre1234', code: recoveryCodes[1] })).status).toBe(200);
    const plain = await api().post('/api/auth/login').send({ email: user.email, password: 'Sifre1234' });
    expect(plain.body.data.user.id).toBe(user.id);
  });
});

describe('Şikâyetler', () => {
  it('ilan şikâyet edilir, tekrar ve kendi içeriği şikâyet edilemez; haklı bulunursa ilan yayından kalkar', async () => {
    const { seller, product } = await createListing({ price: 10, codes: ['S-1'] });
    const reporter = await createUser();
    const reporter2 = await createUser();
    const body = { targetType: 'PRODUCT', targetId: product.id, reason: 'FRAUD', details: 'Kod çalışmıyor' };

    const created = await api().post('/api/complaints').set('Cookie', reporter.cookie).send(body);
    expect(created.status).toBe(201);
    expect((await api().post('/api/complaints').set('Cookie', reporter.cookie).send(body)).body.error.code).toBe('ALREADY_REPORTED');
    expect((await api().post('/api/complaints').set('Cookie', seller.cookie).send(body)).body.error.code).toBe('OWN_CONTENT');
    expect((await api().post('/api/complaints').set('Cookie', reporter2.cookie).send({ ...body, reason: 'OTHER', details: 'kısa' })).status).toBe(422);
    await api().post('/api/complaints').set('Cookie', reporter2.cookie).send(body);

    const destek = await createUser({ role: 'DESTEK' });
    await prisma.rolePermission.upsert({
      where: { role_permission: { role: 'DESTEK', permission: 'moderate_content' } },
      update: {},
      create: { role: 'DESTEK', permission: 'moderate_content' },
    });
    const list = await api().get('/api/complaints/admin?status=OPEN').set('Cookie', destek.cookie);
    const row = list.body.data.find((c: { id: string }) => c.id === created.body.data.id);
    expect(row).toMatchObject({ reasonLabel: 'Dolandırıcılık / çalışmayan kod', openCountForTarget: 2, target: { title: product.title } });
    expect((await api().get('/api/complaints/admin').set('Cookie', reporter.cookie)).status).toBe(403);

    const resolved = await api().post(`/api/complaints/admin/${created.body.data.id}/resolve`).set('Cookie', destek.cookie).send({ status: 'RESOLVED', note: 'Satıcı uyarıldı', takeDown: true });
    expect(resolved.body.data).toMatchObject({ closedCount: 2, takenDown: true });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).isListed).toBe(false);
    expect(await prisma.complaint.count({ where: { targetId: product.id, status: 'OPEN' } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: 'complaint.resolve', actorId: destek.user.id } })).toBe(1);
  });
});

describe('Yorum yanıtı ve denetimi', () => {
  async function reviewedListing() {
    const listing = await createListing({ price: 10, codes: ['R-1'] });
    const buyer = await createUser();
    const order = await prisma.order.create({
      data: {
        orderNumber: `T-${crypto.randomUUID().slice(0, 8)}`,
        userId: buyer.user.id,
        sellerId: listing.seller.user.id,
        totalAmount: 10,
        deliveryStatus: 'DELIVERED',
        items: { create: { variantId: listing.variantId, quantity: 1, unitPrice: 10, totalPrice: 10 } },
      },
    });
    const review = await prisma.review.create({ data: { userId: buyer.user.id, productId: listing.product.id, orderId: order.id, rating: 2, comment: 'Kod geç geldi' } });
    return { ...listing, buyer, review };
  }

  it('yalnızca ilan sahibi yanıt verebilir; yanıt herkese açık listede görünür', async () => {
    const { seller, product, buyer, review } = await reviewedListing();
    const path = `/api/products/${product.slug}/reviews/${review.id}/reply`;
    expect((await api().put(path).set('Cookie', buyer.cookie).send({ reply: 'Merhaba' })).body.error.code).toBe('NOT_PRODUCT_OWNER');
    expect((await api().put(path).set('Cookie', seller.cookie).send({ reply: 'Yoğunluk için özür dileriz' })).status).toBe(200);
    const list = await api().get(`/api/products/${product.slug}/reviews`);
    expect(list.body.data[0]).toMatchObject({ sellerReply: 'Yoğunluk için özür dileriz' });
    await api().delete(path).set('Cookie', seller.cookie);
    expect((await api().get(`/api/products/${product.slug}/reviews`)).body.data[0].sellerReply).toBeNull();
  });

  it('yetkili yorum kaldırır, işlem geçmişine yazılır', async () => {
    const { review } = await reviewedListing();
    const admin = await createUser({ role: 'ADMIN' });
    const user = await createUser();
    expect((await api().delete(`/api/reviews/admin/${review.id}`).set('Cookie', user.cookie).send({ reason: 'Hakaret' })).status).toBe(403);
    expect((await api().delete(`/api/reviews/admin/${review.id}`).set('Cookie', admin.cookie).send({ reason: 'Hakaret içeriyor' })).status).toBe(200);
    expect(await prisma.review.findUnique({ where: { id: review.id } })).toBeNull();

    const logs = await api().get(`/api/audit-logs?action=review.delete`).set('Cookie', admin.cookie);
    const entry = logs.body.data.find((l: { targetId: string }) => l.targetId === review.id);
    expect(entry).toMatchObject({ actor: { id: admin.user.id }, metadata: { reason: 'Hakaret içeriyor' } });
    expect((await api().get('/api/audit-logs').set('Cookie', user.cookie)).status).toBe(403);
  });
});
