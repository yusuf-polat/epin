import { prisma } from '@/config/prisma';

/**
 * Migration'lara geçmeden önce `prisma db push` ile oluşturulmuş mevcut bir
 * veritabanını tespit eder. Tablolar var fakat migration geçmişi yoksa
 * "baseline" gerektiğini exit code 10 ile bildirir.
 */
async function main() {
  const [row] = await prisma.$queryRaw<{ has_users: boolean; has_migrations: boolean }[]>`
    SELECT
      to_regclass('public.users') IS NOT NULL AS has_users,
      to_regclass('public._prisma_migrations') IS NOT NULL AS has_migrations`;
  await prisma.$disconnect();
  process.exit(row.has_users && !row.has_migrations ? 10 : 0);
}

main().catch(async (err) => {
  console.error('Baseline check failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
