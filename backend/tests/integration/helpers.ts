import request from 'supertest';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import app from '@/app';
import { prisma } from '@/config/prisma';

export const api = () => request(app);

const uid = () => randomUUID().slice(0, 8);

/** Kullanıcı oluşturur ve oturum cookie'si döner */
export async function createUser(options: { role?: 'USER' | 'DESTEK' | 'ADMIN'; canSell?: boolean; balance?: number; verified?: boolean } = {}) {
  const email = `u-${uid()}@test.dev`;
  const password = 'Sifre1234';
  const user = await prisma.user.create({
    data: {
      email,
      name: `Test ${email}`,
      password: await bcrypt.hash(password, 4),
      role: options.role ?? 'USER',
      canSell: options.canSell ?? false,
      walletBalance: options.balance ?? 0,
      emailVerifiedAt: options.verified === false ? null : new Date(),
    },
  });
  const res = await api().post('/api/auth/login').send({ email, password });
  const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []).map((c) => c.split(';')[0]).join('; ');
  return { user, cookie };
}

/** Onaylı satıcı + mağaza + stoklu anında teslim ilanı oluşturur (varsayılan komisyon %0) */
export async function createListing(options: { price: number; codes?: string[]; deliveryType?: 'INSTANT' | 'MANUAL'; stock?: number; commissionRate?: number }) {
  const seller = await createUser({ canSell: true });
  const slug = `magaza-${uid()}`;
  await prisma.store.create({ data: { userId: seller.user.id, name: slug, slug, logoUrl: '/l.png', coverUrl: '/c.png' } });
  const rate = options.commissionRate ?? 0;
  const category = await prisma.category.upsert({
    where: { slug: `test-kategori-${rate}` },
    update: {},
    create: { name: `Test %${rate}`, slug: `test-kategori-${rate}`, imageUrl: '/c.png', commissionRate: rate },
  });
  const deliveryType = options.deliveryType ?? 'INSTANT';
  const codes = options.codes ?? [];
  const product = await prisma.product.create({
    data: {
      title: `İlan ${uid()}`,
      slug: `ilan-${uid()}`,
      description: 'Test ilanı',
      categoryId: category.id,
      imageUrl: '/p.png',
      brand: 'Test',
      isMarketplace: true,
      sellerId: seller.user.id,
      approvalStatus: 'APPROVED',
      deliveryType,
      instantDelivery: deliveryType === 'INSTANT',
      deliveryDeadlineHours: 2,
      variants: {
        create: {
          title: 'Paket',
          denomination: 'Paket',
          price: options.price,
          stockCount: deliveryType === 'INSTANT' ? codes.length : options.stock ?? 1,
          pins: { create: codes.map((code) => ({ code })) },
        },
      },
    },
    include: { variants: true },
  });
  return { seller, product, variantId: product.variants[0].id };
}

export const balanceOf = async (userId: string) => Number((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).walletBalance);

/** Oturum cookie'sini Set-Cookie başlığından ayıklar */
export const cookieFrom = (res: { headers: Record<string, unknown> }) =>
  ([] as string[]).concat((res.headers['set-cookie'] as string[] | undefined) ?? []).map((c) => c.split(';')[0]).join('; ');
