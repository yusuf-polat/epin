import { env } from '@/config/env';
import { BadRequestError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { roundMoney } from '@/utils/money';
import { decryptJson, encryptJson } from '@/utils/secretBox';
import { settingsRepository } from './settings.repository';
import { CommissionSettings, SmtpConfig, StoredSmtpSettings, UpdateSmtpDTO } from './settings.types';

const KEYS = { commission: 'commission', smtp: 'smtp' } as const;
/** Ayarlar her istekte veritabanından okunmaz; birden fazla instance'da en geç bu sürede güncellenir */
const CACHE_TTL_MS = 30_000;

const cache = new Map<string, { value: unknown; at: number }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  const value = await load();
  cache.set(key, { value, at: Date.now() });
  return value;
}

const commissionDefaults = (): CommissionSettings => ({
  defaultSalePercent: env.PLATFORM_COMMISSION_PERCENT,
  withdrawalPercent: 0,
  withdrawalFixed: 0,
});

/** "Ad <adres>" biçimindeki MAIL_FROM'u parçalara ayırır */
function parseFrom(from: string) {
  const match = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  return match ? { fromName: match[1].trim(), fromEmail: match[2].trim() } : { fromName: '', fromEmail: from.trim() };
}

const formatFrom = (name: string, email: string) => (name ? `${name.replace(/"/g, '')} <${email}>` : email);

/** Para çekme komisyonu: tutar × yüzde + sabit (kuruşa yuvarlanır) */
export const calculateWithdrawalFee = (amount: number, c: Pick<CommissionSettings, 'withdrawalPercent' | 'withdrawalFixed'>) =>
  roundMoney((amount * c.withdrawalPercent) / 100 + c.withdrawalFixed);

export const settingsService = {
  // ─── Komisyon ───────────────────────────────────────────────────────────────

  getCommission(): Promise<CommissionSettings> {
    return cached(KEYS.commission, async () => ({ ...commissionDefaults(), ...(await settingsRepository.get<Partial<CommissionSettings>>(KEYS.commission)) }));
  },

  async updateCommission(adminId: string, dto: CommissionSettings) {
    await settingsRepository.set(KEYS.commission, dto, adminId);
    cache.delete(KEYS.commission);
    return this.getCommission();
  },

  // ─── SMTP ───────────────────────────────────────────────────────────────────

  async getStoredSmtp(): Promise<StoredSmtpSettings | null> {
    return settingsRepository.get<StoredSmtpSettings>(KEYS.smtp);
  },

  /**
   * Mailer'ın kullanacağı ayar: panelden girilen ayar açıksa o, yoksa .env'deki SMTP_* değerleri.
   * Hiçbiri yoksa null (e-postalar geliştirme ortamında log'a yazılır).
   */
  getSmtpConfig(): Promise<SmtpConfig | null> {
    return cached(KEYS.smtp, async () => {
      const stored = await this.getStoredSmtp();
      if (stored?.enabled && stored.host) {
        let pass: string | undefined;
        try {
          pass = stored.passEncrypted ? decryptJson<{ pass: string }>(stored.passEncrypted).pass : undefined;
        } catch (err) {
          logger.error('SMTP parolası çözülemedi; panelden yeniden giriniz', err);
        }
        return { host: stored.host, port: stored.port, secure: stored.secure, user: stored.user || undefined, pass, from: formatFrom(stored.fromName, stored.fromEmail) };
      }
      if (!env.SMTP_HOST) return null;
      return { host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE === 'true', user: env.SMTP_USER, pass: env.SMTP_PASS, from: env.MAIL_FROM };
    });
  },

  /** Yönetim ekranı: parola hiçbir zaman dönmez, yalnızca kayıtlı olup olmadığı */
  async getSmtpForAdmin() {
    const stored = await this.getStoredSmtp();
    const envFrom = parseFrom(env.MAIL_FROM);
    return {
      enabled: stored?.enabled ?? false,
      host: stored?.host ?? env.SMTP_HOST ?? '',
      port: stored?.port ?? env.SMTP_PORT,
      secure: stored?.secure ?? env.SMTP_SECURE === 'true',
      user: stored?.user ?? env.SMTP_USER ?? '',
      hasPassword: !!stored?.passEncrypted,
      fromName: stored?.fromName ?? envFrom.fromName,
      fromEmail: stored?.fromEmail ?? envFrom.fromEmail,
      /** Panel ayarı kapalıyken .env'de SMTP tanımlı mı */
      envConfigured: !!env.SMTP_HOST,
    };
  },

  async updateSmtp(adminId: string, dto: UpdateSmtpDTO) {
    const current = await this.getStoredSmtp();
    let passEncrypted = current?.passEncrypted ?? null;
    if (dto.pass === null) passEncrypted = null;
    else if (dto.pass) passEncrypted = encryptJson({ pass: dto.pass });
    if (dto.enabled && !dto.host) throw new BadRequestError('SMTP sunucusu gereklidir', 'SMTP_INCOMPLETE');

    const value: StoredSmtpSettings = {
      enabled: dto.enabled,
      host: dto.host,
      port: dto.port,
      secure: dto.secure,
      user: dto.user,
      passEncrypted,
      fromName: dto.fromName,
      fromEmail: dto.fromEmail,
    };
    await settingsRepository.set(KEYS.smtp, value, adminId);
    cache.delete(KEYS.smtp);
    return this.getSmtpForAdmin();
  },
};
