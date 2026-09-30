import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/config/prisma';
import { api, createUser } from './helpers';

afterAll(() => prisma.$disconnect());

describe('Auth API', () => {
  it('kayıt olunca HttpOnly cookie set edilir, token gövdede dönmez', async () => {
    const res = await api().post('/api/auth/register').send({ email: `kayit-${Date.now()}@test.dev`, name: 'Kayıt', password: 'Sifre1234', acceptTerms: true });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toContain('@test.dev');
    expect(res.body.data.token).toBeUndefined();
    const cookie = ([] as string[]).concat(res.headers['set-cookie'])[0];
    expect(cookie).toMatch(/nexuspin_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('cookie ile /auth/me çalışır, çıkış sonrası çalışmaz', async () => {
    const { cookie, user } = await createUser();
    const me = await api().get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.id).toBe(user.id);
    expect(me.body.data.password).toBeUndefined();

    const logout = await api().post('/api/auth/logout').set('Cookie', cookie);
    const cleared = ([] as string[]).concat(logout.headers['set-cookie'])[0];
    expect(cleared).toMatch(/nexuspin_token=;/);
  });

  it('hatalı şifrede standart hata formatı döner', async () => {
    const { user } = await createUser();
    const res = await api().post('/api/auth/login').send({ email: user.email, password: 'yanlis-sifre' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, error: { code: 'INVALID_CREDENTIALS', message: expect.any(String) } });
  });

  it('askıya alınmış kullanıcı giriş yapamaz', async () => {
    const { user } = await createUser();
    await prisma.user.update({ where: { id: user.id }, data: { isBanned: true, banReason: 'test' } });
    const res = await api().post('/api/auth/login').send({ email: user.email, password: 'Sifre1234' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_BANNED');
  });

  it('geçersiz istek 422 ve alan detaylarıyla reddedilir', async () => {
    const res = await api().post('/api/auth/register').send({ email: 'gecersiz', name: 'x', password: '1' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('email');
    expect(res.body.error.details).toHaveProperty('acceptTerms');
  });

  it('izinli olmayan origin ile durum değiştiren istek reddedilir (CSRF)', async () => {
    const res = await api().post('/api/auth/logout').set('Origin', 'https://evil.example');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
  });
});
