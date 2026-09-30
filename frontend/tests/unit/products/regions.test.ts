import { describe, expect, it } from 'vitest';
import { isGlobalRegion, REGION_CODES, regionLabel, regionShort } from '@/features/products/regions';
import { smtpSchema, withdrawalFee } from '@/features/settings/schemas/settings.schema';

describe('Bölgeler', () => {
  it('kodları okunur ada çevirir, eski serbest metni olduğu gibi gösterir', () => {
    expect(regionLabel('TR')).toBe('Türkiye');
    expect(regionShort('RU_CIS')).toBe('RU/CIS');
    expect(regionLabel('TR / Global')).toBe('TR / Global');
    expect(regionLabel(null)).toBe('Global');
  });

  it('backend ile aynı kod listesi', () => {
    expect(REGION_CODES).toEqual(['GLOBAL', 'TR', 'EU', 'EMEA', 'UK', 'US', 'LATAM', 'ASIA', 'RU_CIS']);
    expect(isGlobalRegion('GLOBAL')).toBe(true);
    expect(isGlobalRegion('TR')).toBe(false);
  });
});

describe('Sistem ayarları', () => {
  it('para çekme ücretini backend ile aynı hesaplar', () => {
    expect(withdrawalFee(200, { withdrawalPercent: 2, withdrawalFixed: 1.5 })).toBe(5.5);
    expect(withdrawalFee(500, { withdrawalPercent: 0, withdrawalFixed: 0 })).toBe(0);
  });

  it('SMTP etkinse sunucu zorunludur', () => {
    const base = { enabled: true, host: '', port: '587', secure: false, user: '', pass: '', fromName: 'NexusPin', fromEmail: 'no-reply@nexuspin.com' };
    expect(smtpSchema.safeParse(base).success).toBe(false);
    expect(smtpSchema.safeParse({ ...base, enabled: false }).success).toBe(true);
    expect(smtpSchema.safeParse({ ...base, host: 'smtp.gmail.com' }).data?.port).toBe(587);
  });
});
