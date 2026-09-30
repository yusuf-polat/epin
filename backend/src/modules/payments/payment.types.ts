import { PaymentProvider, PaymentStatus } from '@prisma/client';

export type GatewaySettings = Record<string, string>;
export type GatewaySecrets = Record<string, string>;

/** Sağlayıcı adaptörüne verilen, şifresi çözülmüş ayarlar */
export interface ResolvedGateway {
  provider: PaymentProvider;
  isEnabled: boolean;
  testMode: boolean;
  displayName: string;
  description: string | null;
  sortOrder: number;
  minAmount: number;
  maxAmount: number;
  feePercent: number;
  feeFixed: number;
  settings: GatewaySettings;
  secrets: GatewaySecrets;
  /** Veritabanında kaydı var mı (yoksa varsayılanlar kullanılıyor) */
  persisted: boolean;
}

export interface UpdateGatewayDTO {
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
  /** Boş bırakılan gizli alanlar korunur; null gönderilen alan silinir */
  secrets?: Record<string, string | null>;
}

export interface CheckoutDTO {
  provider: PaymentProvider;
  amount: number;
}

export interface AdminPaymentListQuery {
  page: number;
  limit: number;
  status?: PaymentStatus;
  provider?: PaymentProvider;
  search?: string;
}

export interface CryptoWallet {
  asset: string;
  network: string;
  address: string;
}
