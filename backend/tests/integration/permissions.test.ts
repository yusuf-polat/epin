import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/config/prisma';
import { api, createUser } from './helpers';

afterAll(() => prisma.$disconnect());

describe('Yetkilendirme', () => {
  it('oturumsuz istek 401 döner', async () => {
    expect((await api().get('/api/orders')).status).toBe(401);
  });

  it('normal kullanıcı yönetim endpointlerine erişemez', async () => {
    const { cookie } = await createUser();
    const res = await api().get('/api/users/admin').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PERMISSION_DENIED');
  });

  it('DESTEK rolü yalnızca verilen izinleri kullanabilir', async () => {
    await prisma.rolePermission.deleteMany({ where: { role: 'DESTEK' } });
    await prisma.rolePermission.create({ data: { role: 'DESTEK', permission: 'approve_listings' } });
    const { cookie } = await createUser({ role: 'DESTEK' });

    expect((await api().get('/api/products/admin').set('Cookie', cookie)).status).toBe(200);
    expect((await api().get('/api/users/admin').set('Cookie', cookie)).status).toBe(403);
  });

  it('ADMIN her zaman yetkilidir ve kendi rolünü değiştiremez', async () => {
    const { cookie, user } = await createUser({ role: 'ADMIN' });
    expect((await api().get('/api/users/admin').set('Cookie', cookie)).status).toBe(200);
    const res = await api().patch(`/api/users/admin/${user.id}/role`).set('Cookie', cookie).send({ role: 'USER' });
    expect(res.body.error.code).toBe('SELF_ROLE_CHANGE');
  });

  it('bedava bakiye yükleme kapalıyken reddedilir', async () => {
    const { cookie } = await createUser();
    const res = await api().post('/api/wallet/topup').set('Cookie', cookie).send({ amount: 100 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('WALLET_TOPUP_DISABLED');
  });
});
