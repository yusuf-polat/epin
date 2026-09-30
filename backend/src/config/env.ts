import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/** docker-compose boş değişkenleri "" olarak iletir; tanımsız sayılır */
const emptyAsUndefined = <T extends z.ZodTypeAny>(schema: T) => z.preprocess((v) => (v === '' ? undefined : v), schema);

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET en az 32 karakter olmalıdır'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  APP_URL: z.string().default('http://localhost:5000'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  // Cookie ayarları
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.enum(['true', 'false', 'auto']).default('auto'),
  // Gerçek ödeme altyapısı olmadığı için cüzdana doğrudan bakiye yükleme yalnızca açıkça izin verilirse çalışır
  ENABLE_WALLET_TOPUP: z.enum(['true', 'false']).optional(),
  // Escrow: teslimattan sonra alıcı onayı için beklenecek süre
  ESCROW_AUTO_RELEASE_HOURS: z.coerce.number().int().positive().default(48),
  // Seed (yalnızca kullanıcı yoksa oluşturulur, mevcut şifreler ezilmez)
  SEED_ADMIN_EMAIL: z.string().email().default('admin@nexuspin.com'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Admin123!'),
  SEED_DESTEK_EMAIL: z.string().email().default('destek@nexuspin.com'),
  SEED_DESTEK_PASSWORD: z.string().min(8).default('Destek123!'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  // E-postadaki bağlantılar için frontend adresi (boşsa CORS_ORIGIN'in ilki)
  FRONTEND_URL: emptyAsUndefined(z.string().url().optional()),
  // Komisyon ve Havale/EFT
  PLATFORM_COMMISSION_PERCENT: z.coerce.number().min(0).max(50).default(8),
  PLATFORM_BANK_NAME: z.string().default(''),
  PLATFORM_BANK_HOLDER: z.string().default(''),
  PLATFORM_BANK_IBAN: z.string().default(''),
  // E-posta (SMTP_HOST yoksa e-postalar log'a yazılır)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('NexusPin <no-reply@nexuspin.com>'),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(24 * 60).default(30),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 14).default(48),
  // Ödeme sağlayıcı anahtarları ve 2FA gizli anahtarlarını şifreleyen anahtar (boşsa JWT_SECRET'tan türetilir)
  DATA_ENCRYPTION_KEY: emptyAsUndefined(z.string().min(32, 'DATA_ENCRYPTION_KEY en az 32 karakter olmalıdır').optional()),
  // Ödeme sağlayıcılarının webhook/callback için ulaşacağı herkese açık backend adresi (boşsa APP_URL)
  PUBLIC_API_URL: emptyAsUndefined(z.string().url().optional()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Logger bu noktada env'e bağımlı olduğu için doğrudan stderr kullanılır
  console.error('Environment validation error:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  isDevelopment: raw.NODE_ENV === 'development',
  corsOrigins: raw.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
  cookieSecure: raw.COOKIE_SECURE === 'auto' ? raw.NODE_ENV === 'production' : raw.COOKIE_SECURE === 'true',
  walletTopupEnabled:
    raw.ENABLE_WALLET_TOPUP !== undefined ? raw.ENABLE_WALLET_TOPUP === 'true' : raw.NODE_ENV !== 'production',
  trustProxy: raw.TRUST_PROXY === 'true',
  frontendUrl: (raw.FRONTEND_URL ?? raw.CORS_ORIGIN.split(',')[0].trim()).replace(/\/$/, ''),
  publicApiUrl: (raw.PUBLIC_API_URL ?? raw.APP_URL).replace(/\/$/, ''),
  bankAccount: raw.PLATFORM_BANK_IBAN
    ? { bankName: raw.PLATFORM_BANK_NAME, accountHolder: raw.PLATFORM_BANK_HOLDER, iban: raw.PLATFORM_BANK_IBAN.replace(/\s/g, '') }
    : null,
};
