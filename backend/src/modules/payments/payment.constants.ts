import { PaymentProvider } from '@prisma/client';

/** manual: yönetici onayı · redirect: sağlayıcının ödeme sayfası · iframe: sitede gömülü ödeme formu */
export type GatewayKind = 'manual' | 'redirect' | 'iframe';

export interface GatewayField {
  key: string;
  label: string;
  /** Gizli alanlar şifreli saklanır ve API yanıtlarında yalnızca maskeli gösterilir */
  secret: boolean;
  required: boolean;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
}

export interface GatewayDefinition {
  label: string;
  description: string;
  kind: GatewayKind;
  fields: GatewayField[];
  docsUrl?: string;
  /** Sağlayıcı panelinde tanımlanacak bildirim adresinin yolu (PUBLIC_API_URL'e eklenir) */
  webhookPath?: string;
}

export const GATEWAYS: Record<PaymentProvider, GatewayDefinition> = {
  BANK_TRANSFER: {
    label: 'Havale / EFT',
    description: 'Referans koduyla banka havalesi; finans ekibi onaylayınca bakiye yüklenir.',
    kind: 'manual',
    fields: [
      { key: 'bankName', label: 'Banka adı', secret: false, required: true, placeholder: 'Örn: Ziraat Bankası' },
      { key: 'accountHolder', label: 'Hesap sahibi', secret: false, required: true },
      { key: 'iban', label: 'IBAN', secret: false, required: true, placeholder: 'TR00 0000 0000 0000 0000 0000 00' },
    ],
  },
  CRYPTO_MANUAL: {
    label: 'Kripto (Cüzdan Adresi)',
    description: 'Kullanıcı belirtilen adrese kripto gönderir ve işlem özetini (TX hash) bildirir; finans ekibi onaylar.',
    kind: 'manual',
    fields: [
      {
        key: 'wallets',
        label: 'Cüzdan adresleri',
        secret: false,
        required: true,
        multiline: true,
        placeholder: 'USDT | TRC20 | TXYZ...\nUSDT | ERC20 | 0xabc...\nBTC | Bitcoin | bc1q...',
        hint: 'Her satıra bir adres: VARLIK | AĞ | ADRES',
      },
      { key: 'instructions', label: 'Kullanıcıya not', secret: false, required: false, multiline: true, placeholder: 'Örn: Kur, onay anındaki piyasa fiyatından hesaplanır.' },
    ],
  },
  STRIPE: {
    label: 'Stripe',
    description: 'Kredi/banka kartı ile Stripe Checkout üzerinden anında yükleme.',
    kind: 'redirect',
    docsUrl: 'https://dashboard.stripe.com/apikeys',
    webhookPath: '/api/payments/webhooks/stripe',
    fields: [
      { key: 'secretKey', label: 'Secret key', secret: true, required: true, placeholder: 'sk_live_... / sk_test_...' },
      {
        key: 'webhookSecret',
        label: 'Webhook signing secret',
        secret: true,
        required: true,
        placeholder: 'whsec_...',
        hint: 'Webhook olayları: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired',
      },
    ],
  },
  PAYTR: {
    label: 'PayTR',
    description: 'PayTR iFrame API ile kartla anında yükleme (Türk kartları, 3D Secure).',
    kind: 'iframe',
    docsUrl: 'https://dev.paytr.com/iframe-api',
    webhookPath: '/api/payments/webhooks/paytr',
    fields: [
      { key: 'merchantId', label: 'Mağaza no (merchant_id)', secret: false, required: true },
      { key: 'merchantKey', label: 'Mağaza parola (merchant_key)', secret: true, required: true },
      { key: 'merchantSalt', label: 'Mağaza gizli anahtar (merchant_salt)', secret: true, required: true },
    ],
  },
  IYZICO: {
    label: 'iyzico',
    description: 'iyzico Checkout Form ile kart veya iyzico bakiyesiyle yükleme.',
    kind: 'redirect',
    // Dönüş adresi her ödemede isteğe eklenir; panelde ayrıca tanımlamak gerekmez
    docsUrl: 'https://docs.iyzico.com',
    fields: [
      { key: 'apiKey', label: 'API anahtarı', secret: true, required: true },
      { key: 'secretKey', label: 'Güvenlik anahtarı (secret key)', secret: true, required: true },
    ],
  },
  NOWPAYMENTS: {
    label: 'Kripto (NOWPayments)',
    description: 'BTC, ETH, USDT ve 150+ kripto para ile otomatik onaylı yükleme.',
    kind: 'redirect',
    docsUrl: 'https://account.nowpayments.io/store-settings',
    webhookPath: '/api/payments/webhooks/nowpayments',
    fields: [
      { key: 'apiKey', label: 'API anahtarı', secret: true, required: true },
      { key: 'ipnSecret', label: 'IPN gizli anahtarı', secret: true, required: true },
    ],
  },
};

/** Ödeme sayfalarının listelenme sırası */
export const PROVIDER_ORDER: PaymentProvider[] = ['PAYTR', 'IYZICO', 'STRIPE', 'NOWPAYMENTS', 'BANK_TRANSFER', 'CRYPTO_MANUAL'];

/** Tamamlanmayan kart ödemeleri bu süreden sonra zaman aşımına düşer */
export const PENDING_PAYMENT_TTL_MINUTES = 120;
/** Kripto ağ onayları uzun sürebildiği için NOWPayments ödemeleri daha geç zaman aşımına düşer */
export const PENDING_CRYPTO_TTL_MINUTES = 24 * 60;
/** Son 1 saatte açılabilecek azami bekleyen online ödeme */
export const MAX_RECENT_PENDING_PAYMENTS = 5;
/** Sağlayıcı API çağrıları için zaman aşımı */
export const PROVIDER_TIMEOUT_MS = 15_000;
