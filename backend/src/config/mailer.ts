import nodemailer, { Transporter } from 'nodemailer';
import { env } from './env';
import { logger } from '@/utils/logger';
import { settingsService } from '@/modules/settings/settings.service';
import { SmtpConfig } from '@/modules/settings/settings.types';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Ayar değişmedikçe aynı bağlantı havuzu kullanılır */
let current: { key: string; transporter: Transporter } | null = null;

function transporterFor(config: SmtpConfig): Transporter {
  const key = JSON.stringify(config);
  if (current?.key !== key) {
    current?.transporter.close();
    current = {
      key,
      transporter: nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.user ? { user: config.user, pass: config.pass } : undefined,
        connectionTimeout: 15_000,
        greetingTimeout: 10_000,
      }),
    };
  }
  return current.transporter;
}

/**
 * E-posta gönderir. SMTP ayarı panelden (Ayarlar → E-posta) veya .env'den gelir.
 * Hiçbiri yoksa development/test ortamında içerik log'a yazılır; production'da
 * içerik (ör. sıfırlama bağlantısı) asla loglanmaz. Gönderim hatası çağıranın akışını bozmaz.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  try {
    return await sendMailStrict(message);
  } catch (err) {
    logger.error('E-posta gönderilemedi', { subject: message.subject, err });
    return false;
  }
}

/** Hata durumunda istisna fırlatır (panelden test e-postası için) */
export async function sendMailStrict(message: MailMessage): Promise<boolean> {
  const config = await settingsService.getSmtpConfig();
  if (!config) {
    if (env.isProduction) {
      logger.warn('SMTP yapılandırılmadığı için e-posta gönderilemedi', { subject: message.subject });
    } else {
      logger.info(`[mail] ${message.to} · ${message.subject}\n${message.text}`);
    }
    return false;
  }
  await transporterFor(config).sendMail({ from: config.from, ...message });
  return true;
}
