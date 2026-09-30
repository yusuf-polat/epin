import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { env } from '@/config/env';
import { prisma } from '@/config/prisma';
import { logger } from '@/utils/logger';
import { DEFAULT_ROLE_PERMISSIONS } from '@/modules/permissions/permission.constants';

const CATEGORIES = [
  { name: 'Oyunlar & CD-Key', slug: 'oyunlar', description: 'Steam, Epic Games, EA, Ubisoft ve PC oyun anahtarları', icon: 'sports_esports', imageUrl: '/30_sprite_yeni/01_oyunlar.png' },
  { name: 'Hediye Kartları', slug: 'hediye-kartlari', description: 'Steam Wallet, PSN, Xbox, Google Play, Apple & Amazon Gift Card', icon: 'card_giftcard', imageUrl: '/30_sprite_yeni/02_hediye_kartlari.png' },
  { name: 'Oyun İçi Bakiye / Para', slug: 'oyun-ici-bakiye', description: 'Valorant VP, LoL RP, PUBG UC, Roblox Robux, EA FC Points', icon: 'toll', imageUrl: '/30_sprite_yeni/03_oyun_ici_bakiye_para.png' },
  { name: 'Mobil Oyunlar', slug: 'mobil-oyunlar', description: 'PUBG Mobile, Brawl Stars, Clash of Clans, Free Fire, Genshin Impact', icon: 'smartphone', imageUrl: '/30_sprite_yeni/04_mobil_oyunlar.png' },
  { name: 'Dijital Abonelikler', slug: 'dijital-abonelikler', description: 'Netflix, Spotify, YouTube Premium, Disney+, Xbox Game Pass', icon: 'subscriptions', imageUrl: '/30_sprite_yeni/05_dijital_abonelikler.png' },
  { name: 'Ödeme & Dijital Cüzdan', slug: 'odeme-dijital-cuzdan', description: 'Razer Gold, Paysafecard, Skrill, Neteller bakiye kartları', icon: 'account_balance_wallet', imageUrl: '/30_sprite_yeni/06_odeme_dijital_cuzdan.png' },
  { name: 'Yazılım & Lisanslar', slug: 'yazilim-lisanslar', description: 'Windows 11 Pro, Office 365, Visual Studio, Adobe, Antivirüs', icon: 'terminal', imageUrl: '/30_sprite_yeni/07_yazilim_lisanslar.png' },
  { name: 'Yapay Zekâ & AI', slug: 'yapay-zeka', description: 'ChatGPT Plus, Midjourney, Claude Pro, AI API kredileri', icon: 'smart_toy', imageUrl: '/30_sprite_yeni/08_yapay_zeka.png' },
  { name: 'Müzik Platformları', slug: 'muzik', description: 'Spotify Premium, Apple Music, Deezer, Tidal dijital kodları', icon: 'headphones', imageUrl: '/30_sprite_yeni/09_muzik.png' },
  { name: 'Film & Dizi', slug: 'film-dizi', description: 'Netflix, Prime Video, Disney+, MUBI, BluTV üyelik kodları', icon: 'movie', imageUrl: '/30_sprite_yeni/10_film_dizi.png' },
  { name: 'TV & IPTV', slug: 'tv-iptv', description: 'Dijital TV platformları, spor ve film yayın paketleri', icon: 'tv', imageUrl: '/30_sprite_yeni/11_tv_iptv.png' },
  { name: 'Spor Yayınları', slug: 'spor', description: 'beIN, S Sport Plus, Formula 1, NBA League Pass', icon: 'sports_soccer', imageUrl: '/30_sprite_yeni/12_spor.png' },
  { name: 'Eğitim & Kurslar', slug: 'egitim', description: 'Udemy, Coursera, Skillshare, Duolingo Plus', icon: 'school', imageUrl: '/30_sprite_yeni/13_egitim.png' },
  { name: 'İnternet & VPN', slug: 'internet-vpn', description: 'ExpressVPN, NordVPN, Surfshark, VPS ve SSL lisansları', icon: 'vpn_lock', imageUrl: '/30_sprite_yeni/14_internet_vpn.png' },
  { name: 'Cloud & Depolama', slug: 'cloud-depolama', description: 'Google One, iCloud+, OneDrive, Dropbox depolama alanları', icon: 'cloud', imageUrl: '/30_sprite_yeni/15_cloud_depolama.png' },
  { name: 'Sosyal Medya & İletişim', slug: 'sosyal-medya', description: 'Discord Nitro, Telegram Premium, X Premium, Snapchat+', icon: 'forum', imageUrl: '/30_sprite_yeni/16_sosyal_medya_iletisim.png' },
];

/** Kullanıcı yoksa oluşturur; varsa parolasına ve bakiyesine dokunmaz */
async function ensureStaffUser(email: string, password: string, name: string, role: Role) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.info(`Staff user exists, skipped: ${email}`);
    return;
  }
  await prisma.user.create({
    data: { email, name, role, canSell: true, password: await bcrypt.hash(password, 10) },
  });
  logger.info(`Staff user created: ${email}`);
}

async function main() {
  logger.info('Seeding database...');

  // Kategoriler yalnızca yoksa oluşturulur; panelden yapılan düzenlemeler ezilmez
  for (const [index, category] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: { ...category, sortOrder: index + 1 },
    });
  }
  logger.info(`${CATEGORIES.length} categories ensured`);

  await ensureStaffUser(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD, 'Nexus Admin', 'ADMIN');
  await ensureStaffUser(env.SEED_DESTEK_EMAIL, env.SEED_DESTEK_PASSWORD, 'Nexus Destek', 'DESTEK');

  // Varsayılan izinler yalnızca rol için hiç izin tanımlanmamışsa eklenir
  for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS) as [Role, string[]][]) {
    const count = await prisma.rolePermission.count({ where: { role } });
    if (count === 0) {
      await prisma.rolePermission.createMany({ data: permissions.map((permission) => ({ role, permission })), skipDuplicates: true });
    }
  }
  // Yeni eklenen izinler ADMIN rolüne her zaman eklenir
  await prisma.rolePermission.createMany({
    data: DEFAULT_ROLE_PERMISSIONS.ADMIN.map((permission) => ({ role: 'ADMIN' as Role, permission })),
    skipDuplicates: true,
  });
  logger.info('Role permissions ensured');
  logger.info('Seeding completed');
}

main()
  .catch((err) => {
    logger.error('Seeding failed', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
