/** Satış ve para çekme komisyonları */
export interface CommissionSettings {
  /** Kategoride özel oran yoksa satışlarda uygulanan yüzde */
  defaultSalePercent: number;
  /** Para çekme talebinden kesilen yüzde */
  withdrawalPercent: number;
  /** Para çekme talebinden kesilen sabit tutar (₺) */
  withdrawalFixed: number;
}

/** Veritabanında saklanan SMTP ayarı (parola şifreli) */
export interface StoredSmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  /** secretBox ile şifrelenmiş parola */
  passEncrypted: string | null;
  fromName: string;
  fromEmail: string;
}

/** Mailer'ın kullandığı çözülmüş SMTP ayarı */
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

export interface UpdateSmtpDTO {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  /** Boş: mevcut parola korunur · null: parola silinir */
  pass?: string | null;
  fromName: string;
  fromEmail: string;
}
