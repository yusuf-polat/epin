import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Integration testler gerçek bir PostgreSQL test veritabanına karşı çalışır.
 * DATABASE_URL mutlaka "_test" ile biten bir veritabanını göstermelidir
 * (docker compose --profile test run --rm backend-test).
 */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/integration/global-setup.ts'],
    // Testler aynı veritabanını paylaştığı için sıralı çalışır
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
