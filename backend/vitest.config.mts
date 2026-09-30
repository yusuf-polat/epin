import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Unit testler: veritabanı gerektirmez, repository'ler mock'lanır */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://unit:unit@localhost:5432/unit',
      JWT_SECRET: 'unit-test-secret-unit-test-secret-1234',
    },
  },
});
