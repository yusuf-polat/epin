import { RefundReason, ReleaseReason } from './order.types';

/** Büyük sepetlerde checkout transaction'ı için süre sınırları (ms) */
export const CHECKOUT_TX_OPTIONS = { timeout: 20_000, maxWait: 5_000 };

/** Zamanlanmış işlerin tek çalışmada işleyeceği azami sipariş sayısı */
export const JOB_BATCH_SIZE = 50;

export const ORDER_NUMBER_PREFIX = 'NP';

export const RELEASE_TEXT: Record<ReleaseReason, string> = {
  BUYER_CONFIRMED: 'Alıcı teslimatı onayladı',
  AUTO_RELEASE: 'Onay süresi doldu, ödeme otomatik aktarıldı',
  DISPUTE_RESOLVED: 'İtiraz satıcı lehine sonuçlandı',
  DISPUTE_REPLACED: 'Değişim kodu sonrası onay süresi doldu',
};

export const REFUND_TEXT: Record<RefundReason, string> = {
  SELLER_REFUND: 'Satıcı iadeyi kabul etti',
  DISPUTE_RESOLVED: 'İtiraz alıcı lehine sonuçlandı',
  DELIVERY_OVERDUE: 'Satıcı teslimat süresi içinde teslim etmedi',
  SELLER_CANCELLED: 'Satıcı siparişi iptal etti',
};
