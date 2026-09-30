import { z } from 'zod';

const percent = z.number().min(0, 'Oran negatif olamaz').max(50, 'Oran en fazla %50 olabilir').multipleOf(0.01);

export const updateCommissionSchema = z.object({
  body: z.object({
    defaultSalePercent: percent,
    withdrawalPercent: percent,
    withdrawalFixed: z.number().min(0).max(1000, 'Sabit ücret en fazla ₺1000 olabilir').multipleOf(0.01),
  }),
});

export const updateSmtpSchema = z.object({
  body: z
    .object({
      enabled: z.boolean(),
      host: z.string().trim().max(255),
      port: z.number().int().min(1).max(65535),
      secure: z.boolean(),
      user: z.string().trim().max(255),
      pass: z.string().max(500).nullable().optional(),
      fromName: z.string().trim().max(100),
      fromEmail: z.string().trim().email('Geçerli bir gönderen e-posta adresi giriniz').max(254),
    })
    .refine((d) => !d.enabled || d.host.length > 0, { message: 'SMTP sunucusu gereklidir', path: ['host'] }),
});

export const testSmtpSchema = z.object({
  body: z.object({ to: z.string().trim().email('Geçerli bir e-posta adresi giriniz').max(254) }),
});
