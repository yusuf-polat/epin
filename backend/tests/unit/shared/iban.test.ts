import { describe, expect, it } from 'vitest';
import { formatIban, isValidTrIban, normalizeIban } from '@/utils/iban';

describe('TR IBAN', () => {
  it('geçerli IBAN\'ı boşluk ve küçük harfe rağmen kabul eder', () => {
    expect(isValidTrIban('TR33 0006 1005 1978 6457 8413 26')).toBe(true);
    expect(isValidTrIban('tr330006100519786457841326')).toBe(true);
  });

  it('kontrol hanesi hatalı, eksik veya yabancı IBAN\'ı reddeder', () => {
    expect(isValidTrIban('TR330006100519786457841327')).toBe(false);
    expect(isValidTrIban('TR33000610051978645784132')).toBe(false);
    expect(isValidTrIban('DE89370400440532013000')).toBe(false);
  });

  it('biçimlendirir ve maskeler', () => {
    expect(normalizeIban(' tr33 0006 ')).toBe('TR330006');
    expect(formatIban('TR330006100519786457841326')).toBe('TR33 0006 1005 1978 6457 8413 26');
    expect(formatIban('TR330006100519786457841326', true)).toBe('TR33 •••• •••• •••• •••• ••13 26');
  });
});
