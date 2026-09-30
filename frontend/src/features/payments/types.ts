export type PaymentProvider = 'BANK_TRANSFER' | 'CRYPTO_MANUAL' | 'STRIPE' | 'PAYTR' | 'IYZICO' | 'NOWPAYMENTS';
export type OnlineProvider = Exclude<PaymentProvider, 'BANK_TRANSFER' | 'CRYPTO_MANUAL'>;

/** manual: yönetici onayı · redirect: sağlayıcı sayfası · iframe: sitede gömülü form */
export type GatewayKind = 'manual' | 'redirect' | 'iframe';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export interface CryptoWallet {
  asset: string;
  network: string;
  address: string;
}

/** Kullanıcıya sunulan bakiye yükleme yöntemi */
export interface PaymentMethod {
  provider: PaymentProvider;
  kind: GatewayKind;
  displayName: string;
  description: string | null;
  testMode: boolean;
  minAmount: number;
  maxAmount: number;
  feePercent: number;
  feeFixed: number;
  bankName?: string;
  wallets?: CryptoWallet[];
  instructions?: string | null;
}

export interface Payment {
  id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  fee: number;
  chargeAmount: number;
  currency: string;
  failureReason: string | null;
  testMode: boolean;
  checkoutUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CheckoutResult extends Payment {
  redirectUrl: string | null;
  iframeUrl: string | null;
}

export interface AdminPayment extends Payment {
  providerRef: string | null;
  user: { id: string; name: string; email: string };
}

export interface GatewayField {
  key: string;
  label: string;
  secret: boolean;
  required: boolean;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
}

export interface AdminGateway {
  provider: PaymentProvider;
  kind: GatewayKind;
  label: string;
  docsUrl: string | null;
  webhookUrl: string | null;
  fields: GatewayField[];
  isEnabled: boolean;
  testMode: boolean;
  displayName: string;
  description: string | null;
  sortOrder: number;
  minAmount: number;
  maxAmount: number;
  feePercent: number;
  feeFixed: number;
  settings: Record<string, string>;
  /** Kayıtlı gizli alanların maskeli hali (ör. ••••1234); kayıtlı değilse null */
  secrets: Record<string, string | null>;
  missingFields: string[];
  persisted: boolean;
}

export interface UpdateGatewayInput {
  isEnabled?: boolean;
  testMode?: boolean;
  displayName?: string;
  description?: string | null;
  sortOrder?: number;
  minAmount?: number;
  maxAmount?: number;
  feePercent?: number;
  feeFixed?: number;
  settings?: Record<string, string>;
  secrets?: Record<string, string | null>;
}
