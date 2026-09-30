import { describe, expect, it } from 'vitest';
import { calculateFee, feeLabel, walletLabel } from '@/features/payments/constants';
import { cryptoDepositSchema, onlineTopupSchema } from '@/features/wallet/schemas/wallet.schema';

describe('Ödeme yardımcıları', () => {
  it('hizmet bedelini backend ile aynı formülle hesaplar', () => {
    expect(calculateFee(100, { feePercent: 2.49, feeFixed: 0.25 })).toBe(2.74);
    expect(calculateFee(250, { feePercent: 0, feeFixed: 0 })).toBe(0);
  });

  it('bedel etiketi', () => {
    expect(feeLabel({ feePercent: 0, feeFixed: 0 })).toBe('Ücretsiz');
    expect(feeLabel({ feePercent: 2.5, feeFixed: 0 })).toBe('Hizmet bedeli %2.5');
    expect(feeLabel({ feePercent: 1, feeFixed: 0.5 })).toBe('Hizmet bedeli %1 + ₺0.50');
  });

  it('kripto ağ etiketi backend ile eşleşir', () => {
    expect(walletLabel({ asset: 'USDT', network: 'TRC20' })).toBe('USDT · TRC20');
  });
});

describe('Bakiye yükleme şemaları', () => {
  it('yöntemin tutar sınırlarını uygular', () => {
    const schema = onlineTopupSchema(50, 1000);
    expect(schema.safeParse({ amount: '49.99' }).success).toBe(false);
    expect(schema.safeParse({ amount: '1000' }).success).toBe(true);
    expect(schema.safeParse({ amount: '1000.01' }).success).toBe(false);
  });

  it('kripto bildirimi geçerli bir TX hash ister', () => {
    const schema = cryptoDepositSchema(20, 50_000);
    const base = { amount: 500, network: 'USDT · TRC20' };
    expect(schema.safeParse({ ...base, txHash: '0x' + 'a'.repeat(64) }).success).toBe(true);
    expect(schema.safeParse({ ...base, txHash: 'kısa' }).success).toBe(false);
    expect(schema.safeParse({ ...base, txHash: '<script>alert(1)</script>' }).success).toBe(false);
  });
});
