import crypto from 'crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/config/prisma';
import { api, cookieFrom, createListing, createUser } from './helpers';

afterAll(() => prisma.$disconnect());

/** Test ortamında e-posta gönderilmez; token'ı doğrudan kaydedip ham halini döner */
async function issueResetToken(userId: string, expiresInMs = 60_000) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt: new Date(Date.now() + expiresInMs) } });
  return token;
}

describe('Şifre sıfırlama', () => {
  it('kayıtlı olup olmamasından bağımsız aynı yanıtı döner, kayıtlıysa token üretir', async () => {
    const { user } = await createUser();
    const known = await api().post('/api/auth/forgot-password').send({ email: user.email });
    const unknown = await api().post('/api/auth/forgot-password').send({ email: 'yok@test.dev' });
    expect(known.status).toBe(200);
    expect(unknown.body.message).toBe(known.body.message);
    expect(await prisma.passwordResetToken.count({ where: { userId: user.id } })).toBe(1);
  });

  it('şifreyi değiştirir, token tek kullanımlıktır ve eski oturumlar kapanır', async () => {
    const { user, cookie } = await createUser();
    // Eski token'ın iat değeri şifre değişikliğinden önceki saniyede kalsın
    await new Promise((r) => setTimeout(r, 1100));
    const token = await issueResetToken(user.id);

    const reset = await api().post('/api/auth/reset-password').send({ token, password: 'YeniSifre123' });
    expect(reset.status).toBe(200);

    const reuse = await api().post('/api/auth/reset-password').send({ token, password: 'BaskaSifre123' });
    expect(reuse.body.error.code).toBe('INVALID_RESET_TOKEN');

    expect((await api().get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
    const login = await api().post('/api/auth/login').send({ email: user.email, password: 'YeniSifre123' });
    expect(login.status).toBe(200);
    expect((await api().get('/api/auth/me').set('Cookie', cookieFrom(login))).status).toBe(200);
  });

  it('süresi dolmuş token reddedilir', async () => {
    const { user } = await createUser();
    const token = await issueResetToken(user.id, -1000);
    const res = await api().post('/api/auth/reset-password').send({ token, password: 'YeniSifre123' });
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('şifre değiştiren kullanıcının mevcut oturumu yeni cookie ile sürer', async () => {
    const { cookie } = await createUser();
    await new Promise((r) => setTimeout(r, 1100));
    const res = await api().put('/api/users/password').set('Cookie', cookie).send({ oldPassword: 'Sifre1234', newPassword: 'YeniSifre123' });
    expect(res.status).toBe(200);
    expect((await api().get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
    expect((await api().get('/api/auth/me').set('Cookie', cookieFrom(res))).status).toBe(200);
  });
});

describe('İlan düzenleme', () => {
  const body = (over: Record<string, unknown> = {}) => ({
    title: 'Düzenlenmiş İlan',
    description: 'Yeni açıklama metni',
    price: 55,
    originalPrice: null,
    brand: 'Test',
    region: 'GLOBAL',
    galleryUrls: [],
    deliveryInstructions: null,
    ...over,
  });

  it('içerik değişikliği yeniden onaya düşürür, yalnızca fiyat değişikliği düşürmez', async () => {
    const listing = await createListing({ price: 40, codes: ['E-1'] });
    const { seller, product } = listing;

    const priceOnly = await api()
      .put(`/api/products/${product.id}`)
      .set('Cookie', seller.cookie)
      .send(body({ title: product.title, description: product.description, categoryId: product.categoryId, region: product.region }));
    expect(priceOnly.status).toBe(200);
    expect(priceOnly.body.data).toMatchObject({ approvalStatus: 'APPROVED', requiresApproval: false });
    expect(Number((await prisma.productVariant.findUniqueOrThrow({ where: { id: listing.variantId } })).price)).toBe(55);

    const content = await api().put(`/api/products/${product.id}`).set('Cookie', seller.cookie).send(body({ categoryId: product.categoryId }));
    expect(content.body.data).toMatchObject({ approvalStatus: 'PENDING', requiresApproval: true });
  });

  it('başkasının ilanı düzenlenemez', async () => {
    const { product } = await createListing({ price: 40, codes: ['E-2'] });
    const other = await createUser({ canSell: true });
    const res = await api().put(`/api/products/${product.id}`).set('Cookie', other.cookie).send(body({ categoryId: product.categoryId }));
    expect(res.status).toBe(403);
  });
});

describe('İlanı yayından kaldırma', () => {
  const setListed = (id: string, cookie: string, isListed: boolean) =>
    api().patch(`/api/products/${id}/visibility`).set('Cookie', cookie).send({ isListed });

  it('yayından kaldırılan ilan vitrinden gizlenir, stok korunur ve tek tuşla geri alınır', async () => {
    const { seller, product, variantId } = await createListing({ price: 40, codes: ['V-1', 'V-2'] });

    expect((await setListed(product.id, seller.cookie, false)).body.data).toEqual({ isListed: false });
    expect((await api().get(`/api/products/${product.slug}`)).status).toBe(404);
    expect((await api().get(`/api/products/${product.slug}`).set('Cookie', seller.cookie)).status).toBe(200);
    expect(await prisma.digitalPin.count({ where: { variantId, status: 'AVAILABLE' } })).toBe(2);

    const mine = await api().get('/api/products/mine').set('Cookie', seller.cookie);
    expect(mine.body.data.find((l: { id: string }) => l.id === product.id)).toMatchObject({ isListed: false, isActive: true, totalAvailable: 2 });

    expect((await setListed(product.id, seller.cookie, true)).body.data).toEqual({ isListed: true });
    expect((await api().get(`/api/products/${product.slug}`)).status).toBe(200);
  });

  it('başkasının ilanı yayından kaldırılamaz', async () => {
    const { product } = await createListing({ price: 40, codes: ['V-3'] });
    const other = await createUser({ canSell: true });
    expect((await setListed(product.id, other.cookie, false)).status).toBe(403);
  });
});
