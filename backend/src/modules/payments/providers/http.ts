import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { PROVIDER_TIMEOUT_MS } from '../payment.constants';

/** Sağlayıcıya ulaşılamadığında veya isteği reddettiğinde kullanıcıya gösterilen hata */
export class PaymentProviderError extends AppError {
  constructor(message: string) {
    super(message, 502, 'PAYMENT_PROVIDER_ERROR');
  }
}

export async function requestJson<T>(provider: string, url: string, init: RequestInit): Promise<{ status: number; body: T }> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
  } catch (err) {
    logger.error(`[${provider}] istek gönderilemedi`, err);
    throw new PaymentProviderError(`${provider} ödeme servisine şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyiniz.`);
  }
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) as T };
  } catch {
    logger.error(`[${provider}] beklenmeyen yanıt (${res.status})`, { body: text.slice(0, 500) });
    throw new PaymentProviderError(`${provider} ödeme servisinden beklenmeyen bir yanıt alındı.`);
  }
}

/** TL tutarı kuruşa çevirir (sağlayıcılar tam sayı ister) */
export const toMinor = (amount: number) => Math.round(amount * 100);
export const fromMinor = (minor: number | string) => Number(minor) / 100;
