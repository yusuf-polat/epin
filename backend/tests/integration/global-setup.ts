import { execSync } from 'child_process';

/**
 * Test veritabanını sıfırlayıp tüm migration'ları uygular.
 * Yanlışlıkla gerçek veritabanının silinmesini önlemek için adı "_test" ile bitmelidir.
 */
export default function setup() {
  const url = process.env.DATABASE_URL ?? '';
  const dbName = new URL(url).pathname.replace('/', '');
  if (!dbName.endsWith('_test')) {
    throw new Error(`Integration testleri yalnızca *_test veritabanında çalışır (verilen: "${dbName}")`);
  }
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', { stdio: 'inherit', env: process.env });
}
