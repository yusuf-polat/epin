import crypto from 'crypto';
import { env } from '@/config/env';

const VERSION = 'v1';

/** Veritabanında saklanan gizli değerler (ödeme anahtarları, 2FA secret) için AES-256-GCM */
const key = crypto
  .createHash('sha256')
  .update(env.DATA_ENCRYPTION_KEY ?? `nexuspin-data-key:${env.JWT_SECRET}`)
  .digest();

export function encryptJson(value: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

export function decryptJson<T>(payload: string): T {
  const [version, iv, tag, data] = payload.split(':');
  if (version !== VERSION || !iv || !tag || !data) throw new Error('Geçersiz şifreli veri');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const plain = Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]);
  return JSON.parse(plain.toString('utf8')) as T;
}

/** Zamanlama saldırılarına karşı sabit süreli karşılaştırma */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
