export interface CommissionSettings {
  defaultSalePercent: number;
  withdrawalPercent: number;
  withdrawalFixed: number;
}

export interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  hasPassword: boolean;
  fromName: string;
  fromEmail: string;
  envConfigured: boolean;
}

export interface UpdateSmtpInput {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  /** Boş: mevcut parola korunur · null: silinir */
  pass?: string | null;
  fromName: string;
  fromEmail: string;
}
