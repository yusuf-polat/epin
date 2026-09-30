import { z } from 'zod';

const percent = z.coerce
  .number({ invalid_type_error: 'Sayı giriniz' })
  .min(0, 'Negatif olamaz')
  .max(50, 'En fazla %50')
  .refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, 'En fazla 2 ondalık basamak');

export const commissionSchema = z.object({
  defaultSalePercent: percent,
  withdrawalPercent: percent,
  withdrawalFixed: z.coerce.number({ invalid_type_error: 'Sayı giriniz' }).min(0, 'Negatif olamaz').max(1000, 'En fazla ₺1000'),
});
export type CommissionFormInput = z.input<typeof commissionSchema>;
export type CommissionValues = z.output<typeof commissionSchema>;

export const smtpSchema = z
  .object({
    enabled: z.boolean(),
    host: z.string().trim().max(255),
    port: z.coerce.number({ invalid_type_error: 'Port sayı olmalıdır' }).int().min(1).max(65535),
    secure: z.boolean(),
    user: z.string().trim().max(255),
    pass: z.string().max(500),
    fromName: z.string().trim().max(100),
    fromEmail: z.string().trim().email('Geçerli bir e-posta adresi giriniz'),
  })
  .refine((d) => !d.enabled || d.host.length > 0, { message: 'SMTP sunucusu gereklidir', path: ['host'] });
export type SmtpFormInput = z.input<typeof smtpSchema>;
export type SmtpValues = z.output<typeof smtpSchema>;

/** Para çekme ücreti (backend ile aynı formül) */
export const withdrawalFee = (amount: number, c: { withdrawalPercent: number; withdrawalFixed: number }) =>
  Math.round(((amount * c.withdrawalPercent) / 100 + c.withdrawalFixed) * 100) / 100;
