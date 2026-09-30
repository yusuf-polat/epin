import { z } from 'zod';
import { requiredText } from '@/lib/validations/common';
import { isValidTrIban, normalizeIban } from '@/lib/utils/iban';
import { MAX_DEPOSIT, MAX_TOPUP, MAX_WITHDRAWAL, MIN_DEPOSIT, MIN_TOPUP, MIN_WITHDRAWAL } from '../constants';

const money = (min: number, max: number) =>
  z.coerce
    .number({ invalid_type_error: 'Tutar sayı olmalıdır' })
    .min(min, `Tutar en az ₺${min} olmalıdır`)
    .max(max, `Tek seferde en fazla ₺${max.toLocaleString('tr-TR')} olabilir`)
    .refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, 'En fazla 2 ondalık basamak');

export const topupSchema = z.object({ amount: money(MIN_TOPUP, MAX_TOPUP) });

export const depositSchema = z.object({
  amount: money(MIN_DEPOSIT, MAX_DEPOSIT),
  senderName: requiredText(5, 'Gönderen adı soyadı', 120),
});

/** Kripto yükleme bildirimi; tutar sınırları seçilen yöntemin ayarlarından gelir */
export const cryptoDepositSchema = (min: number, max: number) =>
  z.object({
    amount: money(min, max),
    network: z.string().min(1, 'Ağ seçiniz'),
    txHash: z
      .string()
      .trim()
      .min(10, 'Geçerli bir işlem özeti (TX hash) giriniz')
      .max(150)
      .regex(/^[A-Za-z0-9:_-]+$/, 'İşlem özeti yalnızca harf ve rakam içerebilir'),
  });
export type CryptoDepositValues = z.infer<ReturnType<typeof cryptoDepositSchema>>;

/** Online ödeme tutarı */
export const onlineTopupSchema = (min: number, max: number) => z.object({ amount: money(min, max) });
export type OnlineTopupValues = z.infer<ReturnType<typeof onlineTopupSchema>>;

export const withdrawalSchema = z.object({
  amount: money(MIN_WITHDRAWAL, MAX_WITHDRAWAL),
  iban: z.string().transform(normalizeIban).refine(isValidTrIban, 'Geçerli bir TR IBAN giriniz'),
  accountHolder: requiredText(5, 'Hesap sahibi', 120),
});

export const adminAdjustSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: 'Tutar sayı olmalıdır' })
    .refine((v) => v !== 0, 'Tutar 0 olamaz')
    .refine((v) => Math.abs(v) <= 1_000_000, 'Tutar çok büyük'),
  note: requiredText(3, 'Açıklama', 300),
});

export const approveDepositSchema = z.object({ approvedAmount: money(MIN_DEPOSIT, MAX_DEPOSIT) });
export const markPaidSchema = z.object({ transferRef: requiredText(3, 'Transfer referansı', 100) });
export const financeRejectSchema = z.object({ reason: requiredText(3, 'Red gerekçesi', 500) });

export type TopupValues = z.infer<typeof topupSchema>;
export type DepositValues = z.infer<typeof depositSchema>;
export type WithdrawalFormInput = z.input<typeof withdrawalSchema>;
export type WithdrawalValues = z.output<typeof withdrawalSchema>;
export type AdminAdjustValues = z.infer<typeof adminAdjustSchema>;
export type ApproveDepositValues = z.infer<typeof approveDepositSchema>;
export type MarkPaidValues = z.infer<typeof markPaidSchema>;
export type FinanceRejectValues = z.infer<typeof financeRejectSchema>;
