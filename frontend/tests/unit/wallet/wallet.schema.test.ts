import { describe, expect, it } from 'vitest';
import { formatIbanInput, isValidTrIban } from '@/lib/utils/iban';
import { depositSchema, withdrawalSchema } from '@/features/wallet/schemas/wallet.schema';

const IBAN = 'TR330006100519786457841326';

describe('IBAN yardımcıları', () => {
  it('mod-97 kontrol hanesini doğrular', () => {
    expect(isValidTrIban(IBAN)).toBe(true);
    expect(isValidTrIban('TR33 0006 1005 1978 6457 8413 26')).toBe(true);
    expect(isValidTrIban('TR330006100519786457841327')).toBe(false);
  });

  it('yazarken 4\'lü gruplar ve en fazla 26 karakter', () => {
    expect(formatIbanInput('tr3300061005197864578413269999')).toBe('TR33 0006 1005 1978 6457 8413 26');
  });
});

describe('withdrawalSchema', () => {
  it('IBAN\'ı normalize eder ve tutar sınırlarını uygular', () => {
    const ok = withdrawalSchema.safeParse({ amount: '150.50', iban: 'tr33 0006 1005 1978 6457 8413 26', accountHolder: 'Ayşe Yılmaz' });
    expect(ok.success && ok.data).toMatchObject({ amount: 150.5, iban: IBAN });

    const tooSmall = withdrawalSchema.safeParse({ amount: 10, iban: IBAN, accountHolder: 'Ayşe Yılmaz' });
    expect(tooSmall.success).toBe(false);

    const threeDecimals = withdrawalSchema.safeParse({ amount: 100.123, iban: IBAN, accountHolder: 'Ayşe Yılmaz' });
    expect(threeDecimals.success).toBe(false);
  });
});

describe('depositSchema', () => {
  it('gönderen adı ve minimum tutar ister', () => {
    expect(depositSchema.safeParse({ amount: 250, senderName: 'Ali Veli' }).success).toBe(true);
    expect(depositSchema.safeParse({ amount: 5, senderName: 'Ali Veli' }).success).toBe(false);
    expect(depositSchema.safeParse({ amount: 250, senderName: 'Ali' }).success).toBe(false);
  });
});
