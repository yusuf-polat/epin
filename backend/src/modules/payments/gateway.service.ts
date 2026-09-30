import { PaymentGateway, PaymentProvider } from '@prisma/client';
import { env } from '@/config/env';
import { BadRequestError } from '@/utils/errors';
import { formatIban, isValidTrIban, normalizeIban } from '@/utils/iban';
import { roundMoney, toNumber } from '@/utils/money';
import { decryptJson, encryptJson } from '@/utils/secretBox';
import { logger } from '@/utils/logger';
import { gatewayRepository } from './payment.repository';
import { GATEWAYS, PROVIDER_ORDER } from './payment.constants';
import { CryptoWallet, GatewaySecrets, GatewaySettings, ResolvedGateway, UpdateGatewayDTO } from './payment.types';

const DEFAULT_MIN = 20;
const DEFAULT_MAX = 50_000;

function readSecrets(row: PaymentGateway): GatewaySecrets {
  if (!row.secrets) return {};
  try {
    return decryptJson<GatewaySecrets>(row.secrets);
  } catch (err) {
    // Şifreleme anahtarı değiştiyse kayıtlı anahtarlar çözülemez; yeniden girilmeleri gerekir
    logger.error(`Ödeme sağlayıcısı anahtarları çözülemedi: ${row.provider}`, err);
    return {};
  }
}

/** Kayıt yoksa kullanılan varsayılanlar (Havale/EFT için .env'deki banka bilgisi) */
function defaults(provider: PaymentProvider): ResolvedGateway {
  const def = GATEWAYS[provider];
  const bank = provider === 'BANK_TRANSFER' ? env.bankAccount : null;
  return {
    provider,
    isEnabled: bank !== null,
    testMode: provider !== 'BANK_TRANSFER' && provider !== 'CRYPTO_MANUAL',
    displayName: def.label,
    description: def.description,
    sortOrder: PROVIDER_ORDER.indexOf(provider),
    minAmount: DEFAULT_MIN,
    maxAmount: DEFAULT_MAX,
    feePercent: 0,
    feeFixed: 0,
    settings: bank ? { bankName: bank.bankName, accountHolder: bank.accountHolder, iban: bank.iban } : {},
    secrets: {},
    persisted: false,
  };
}

function resolveRow(row: PaymentGateway): ResolvedGateway {
  return {
    provider: row.provider,
    isEnabled: row.isEnabled,
    testMode: row.testMode,
    displayName: row.displayName,
    description: row.description,
    sortOrder: row.sortOrder,
    minAmount: toNumber(row.minAmount),
    maxAmount: toNumber(row.maxAmount),
    feePercent: toNumber(row.feePercent),
    feeFixed: toNumber(row.feeFixed),
    settings: (row.settings ?? {}) as GatewaySettings,
    secrets: readSecrets(row),
    persisted: true,
  };
}

/** Zorunlu alanların tamamı dolu mu */
export function missingFields(gateway: Pick<ResolvedGateway, 'provider' | 'settings' | 'secrets'>): string[] {
  return GATEWAYS[gateway.provider].fields
    .filter((f) => f.required && !(f.secret ? gateway.secrets[f.key] : gateway.settings[f.key])?.trim())
    .map((f) => f.label);
}

/** "VARLIK | AĞ | ADRES" satırlarını ayrıştırır; hatalı satırlar atlanır */
export function parseCryptoWallets(text: string | undefined): CryptoWallet[] {
  return (text ?? '')
    .split('\n')
    .map((line) => line.split('|').map((p) => p.trim()))
    .filter((parts) => parts.length === 3 && parts.every(Boolean))
    .map(([asset, network, address]) => ({ asset: asset.toUpperCase(), network, address }));
}

export const walletLabel = (w: Pick<CryptoWallet, 'asset' | 'network'>) => `${w.asset} · ${w.network}`;

/** Hizmet bedeli: tutar × yüzde + sabit (kuruşa yuvarlanır) */
export const calculateFee = (amount: number, g: Pick<ResolvedGateway, 'feePercent' | 'feeFixed'>) =>
  roundMoney((amount * g.feePercent) / 100 + g.feeFixed);

const mask = (value: string) => (value.length <= 4 ? '••••' : `••••${value.slice(-4)}`);

function validateSettings(provider: PaymentProvider, settings: GatewaySettings) {
  if (provider === 'BANK_TRANSFER' && settings.iban && !isValidTrIban(normalizeIban(settings.iban))) {
    throw new BadRequestError('Geçerli bir TR IBAN giriniz', 'INVALID_IBAN');
  }
  if (provider === 'CRYPTO_MANUAL' && settings.wallets?.trim() && parseCryptoWallets(settings.wallets).length === 0) {
    throw new BadRequestError('Cüzdan adresleri "VARLIK | AĞ | ADRES" biçiminde olmalıdır', 'INVALID_WALLETS');
  }
}

export const gatewayService = {
  async resolve(provider: PaymentProvider): Promise<ResolvedGateway> {
    const row = await gatewayRepository.find(provider);
    return row ? resolveRow(row) : defaults(provider);
  },

  async resolveAll(): Promise<ResolvedGateway[]> {
    const rows = new Map((await gatewayRepository.findAll()).map((r) => [r.provider, r]));
    return PROVIDER_ORDER.map((p) => {
      const row = rows.get(p);
      return row ? resolveRow(row) : defaults(p);
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  /** Açık ve eksiksiz yapılandırılmış mı */
  isUsable(g: ResolvedGateway) {
    return g.isEnabled && missingFields(g).length === 0;
  },

  /** Kullanıcıya gösterilen bakiye yükleme yöntemleri (gizli bilgi içermez) */
  async listPublic() {
    const all = await this.resolveAll();
    return all
      .filter((g) => this.isUsable(g))
      .map((g) => ({
        provider: g.provider,
        kind: GATEWAYS[g.provider].kind,
        displayName: g.displayName,
        description: g.description,
        testMode: g.testMode && GATEWAYS[g.provider].kind !== 'manual',
        minAmount: g.minAmount,
        maxAmount: g.maxAmount,
        feePercent: g.feePercent,
        feeFixed: g.feeFixed,
        ...(g.provider === 'BANK_TRANSFER' ? { bankName: g.settings.bankName } : {}),
        ...(g.provider === 'CRYPTO_MANUAL'
          ? { wallets: parseCryptoWallets(g.settings.wallets), instructions: g.settings.instructions || null }
          : {}),
      }));
  },

  /** Yönetim ekranı: gizli alanlar maskeli, bildirim adresleri hazır */
  async listForAdmin() {
    const all = await this.resolveAll();
    return all.map((g) => {
      const def = GATEWAYS[g.provider];
      return {
        provider: g.provider,
        kind: def.kind,
        label: def.label,
        docsUrl: def.docsUrl ?? null,
        webhookUrl: def.webhookPath ? `${env.publicApiUrl}${def.webhookPath}` : null,
        fields: def.fields,
        isEnabled: g.isEnabled,
        testMode: g.testMode,
        displayName: g.displayName,
        description: g.description,
        sortOrder: g.sortOrder,
        minAmount: g.minAmount,
        maxAmount: g.maxAmount,
        feePercent: g.feePercent,
        feeFixed: g.feeFixed,
        settings: g.settings,
        secrets: Object.fromEntries(def.fields.filter((f) => f.secret).map((f) => [f.key, g.secrets[f.key] ? mask(g.secrets[f.key]) : null])),
        missingFields: missingFields(g),
        persisted: g.persisted,
      };
    });
  },

  async update(provider: PaymentProvider, adminId: string, dto: UpdateGatewayDTO) {
    const current = await this.resolve(provider);
    const def = GATEWAYS[provider];
    const allowed = new Set(def.fields.map((f) => f.key));

    const settings = { ...current.settings };
    for (const [key, value] of Object.entries(dto.settings ?? {})) {
      if (allowed.has(key) && !def.fields.find((f) => f.key === key)?.secret) settings[key] = value.trim();
    }
    if (provider === 'BANK_TRANSFER' && settings.iban) settings.iban = normalizeIban(settings.iban);
    validateSettings(provider, settings);

    const secrets = { ...current.secrets };
    for (const [key, value] of Object.entries(dto.secrets ?? {})) {
      if (!def.fields.find((f) => f.key === key && f.secret)) continue;
      if (value === null) delete secrets[key];
      else if (value.trim()) secrets[key] = value.trim();
    }

    const next = {
      isEnabled: dto.isEnabled ?? current.isEnabled,
      testMode: dto.testMode ?? current.testMode,
      displayName: dto.displayName?.trim() || current.displayName,
      description: dto.description === undefined ? current.description : dto.description?.trim() || null,
      sortOrder: dto.sortOrder ?? current.sortOrder,
      minAmount: dto.minAmount ?? current.minAmount,
      maxAmount: dto.maxAmount ?? current.maxAmount,
      feePercent: dto.feePercent ?? current.feePercent,
      feeFixed: dto.feeFixed ?? current.feeFixed,
    };
    if (next.minAmount > next.maxAmount) throw new BadRequestError('En düşük tutar en yüksek tutardan büyük olamaz', 'INVALID_LIMITS');
    const missing = missingFields({ provider, settings, secrets });
    if (next.isEnabled && missing.length) {
      throw new BadRequestError(`Yöntemi açmadan önce şu alanları doldurunuz: ${missing.join(', ')}`, 'GATEWAY_INCOMPLETE');
    }

    const data = { ...next, settings, secrets: Object.keys(secrets).length ? encryptJson(secrets) : null, updatedById: adminId };
    await gatewayRepository.upsert(provider, { provider, ...data }, data);
    return (await this.listForAdmin()).find((g) => g.provider === provider)!;
  },

  /** Havale/EFT hesap bilgisi; yöntem kapalıysa null */
  async getBankAccount() {
    const g = await this.resolve('BANK_TRANSFER');
    if (!this.isUsable(g)) return null;
    return { bankName: g.settings.bankName, accountHolder: g.settings.accountHolder, iban: formatIban(g.settings.iban) };
  },
};
