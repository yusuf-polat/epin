import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, generateTotpSecret, hotp, otpauthUrl, totpCounter, verifyTotp } from '@/utils/totp';

// RFC 6238 Ek B: SHA-1 anahtarı "12345678901234567890"
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('TOTP (RFC 6238)', () => {
  it('base32 gidiş-dönüş', () => {
    expect(RFC_SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(base32Decode(RFC_SECRET).toString()).toBe('12345678901234567890');
    expect(base32Decode('gezd gnbv-gy3t')).toEqual(base32Decode('GEZDGNBVGY3T'));
  });

  it('RFC test vektörleri (8 haneli değerlerin son 6 hanesi)', () => {
    expect(hotp(RFC_SECRET, totpCounter(59_000))).toBe('287082'); // 94287082
    expect(hotp(RFC_SECRET, totpCounter(1_111_111_109_000))).toBe('081804'); // 07081804
    expect(hotp(RFC_SECRET, totpCounter(1_234_567_890_000))).toBe('005924'); // 89005924
    expect(hotp(RFC_SECRET, totpCounter(20_000_000_000_000))).toBe('353130'); // 65353130
  });

  it('±1 adım saat kaymasını kabul eder, daha fazlasını reddeder', () => {
    const now = 1_700_000_000_000;
    const counter = totpCounter(now);
    expect(verifyTotp(RFC_SECRET, hotp(RFC_SECRET, counter), 1, now)).toBe(counter);
    expect(verifyTotp(RFC_SECRET, hotp(RFC_SECRET, counter - 1), 1, now)).toBe(counter - 1);
    expect(verifyTotp(RFC_SECRET, hotp(RFC_SECRET, counter + 2), 1, now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, '12345', 1, now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, 'abcdef', 1, now)).toBeNull();
  });

  it('rastgele anahtar 160 bit ve otpauth adresi', () => {
    const secret = generateTotpSecret();
    expect(base32Decode(secret)).toHaveLength(20);
    expect(otpauthUrl(secret, 'a@b.c', 'NexusPin')).toBe(`otpauth://totp/NexusPin%3Aa%40b.c?secret=${secret}&issuer=NexusPin&algorithm=SHA1&digits=6&period=30`);
  });
});
