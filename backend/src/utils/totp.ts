import crypto from 'crypto';

/**
 * RFC 6238 TOTP (Google Authenticator, Authy, 1Password uyumlu):
 * SHA-1, 6 hane, 30 saniyelik adım.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Geçersiz base32 karakteri');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** 160 bit rastgele gizli anahtar (base32) */
export const generateTotpSecret = () => base32Encode(crypto.randomBytes(20));

export const totpCounter = (timeMs = Date.now()) => Math.floor(timeMs / 1000 / STEP_SECONDS);

export function hotp(secret: string, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return code.toString().padStart(DIGITS, '0');
}

/**
 * Kodu doğrular; saat kaymasına karşı ±`window` adım kabul edilir.
 * @returns eşleşen adım sayacı (tekrar kullanım kontrolü için) veya null
 */
export function verifyTotp(secret: string, code: string, window = 1, timeMs = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = totpCounter(timeMs);
  for (let offset = -window; offset <= window; offset++) {
    const candidate = hotp(secret, current + offset);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(code))) return current + offset;
  }
  return null;
}

export const otpauthUrl = (secret: string, account: string, issuer: string) =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
