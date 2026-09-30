import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { sendMail } from '@/config/mailer';
import { withTransaction } from '@/database/transaction';
import { BadRequestError, NotFoundError, UnauthorizedError } from '@/utils/errors';
import { signPurposeToken, verifyPurposeToken } from '@/utils/jwt';
import { decryptJson, encryptJson, sha256 } from '@/utils/secretBox';
import { generateTotpSecret, otpauthUrl, verifyTotp } from '@/utils/totp';
import { logger } from '@/utils/logger';
import { notificationService } from '@/modules/notifications/notification.service';
import { twoFactorRepository } from './two-factor.repository';
import { twoFactorChangedMail } from './auth.mail';
import { RECOVERY_CODE_ALPHABET, RECOVERY_CODE_COUNT, TWO_FACTOR_ISSUER, TWO_FACTOR_LOGIN_TTL, TWO_FACTOR_SETUP_TTL } from './auth.constants';

const SETUP_PURPOSE = '2fa-setup';
const LOGIN_PURPOSE = '2fa-login';

/** XXXXX-XXXXX biçiminde, karıştırılması zor karakterlerden oluşan kod */
function generateRecoveryCode() {
  const chars = Array.from(crypto.randomBytes(10), (b) => RECOVERY_CODE_ALPHABET[b % RECOVERY_CODE_ALPHABET.length]).join('');
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
}

const normalizeRecovery = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');
const hashRecovery = (code: string) => sha256(normalizeRecovery(code));

function newRecoveryCodes() {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
  return { codes, hashes: codes.map(hashRecovery) };
}

async function getUserWithSecret(userId: string) {
  const user = await twoFactorRepository.findSecret(userId);
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
  return user;
}

function readSecret(encrypted: string) {
  return decryptJson<{ secret: string }>(encrypted).secret;
}

export const twoFactorService = {
  /** Kurulum: gizli anahtar ve QR kodu üretir; anahtar doğrulanana kadar yalnızca imzalı kurulum token'ında taşınır */
  async setup(userId: string) {
    const user = await getUserWithSecret(userId);
    if (user.twoFactorSecret) throw new BadRequestError('İki adımlı doğrulama zaten açık', 'TWO_FACTOR_ENABLED');
    const secret = generateTotpSecret();
    const url = otpauthUrl(secret, user.email, TWO_FACTOR_ISSUER);
    return {
      secret: secret.match(/.{1,4}/g)!.join(' '),
      otpauthUrl: url,
      qrDataUrl: await QRCode.toDataURL(url, { margin: 1, width: 220 }),
      setupToken: signPurposeToken(userId, SETUP_PURPOSE, TWO_FACTOR_SETUP_TTL, { s: encryptJson({ secret }) }),
    };
  },

  async enable(userId: string, setupToken: string, code: string) {
    const payload = verifyPurposeToken<{ s: string }>(setupToken, SETUP_PURPOSE);
    if (!payload || payload.sub !== userId) throw new BadRequestError('Kurulum süresi doldu, lütfen yeniden başlayınız', 'SETUP_EXPIRED');
    const user = await getUserWithSecret(userId);
    if (user.twoFactorSecret) throw new BadRequestError('İki adımlı doğrulama zaten açık', 'TWO_FACTOR_ENABLED');

    const { secret } = decryptJson<{ secret: string }>(payload.s);
    const step = verifyTotp(secret, code);
    if (step === null) throw new BadRequestError('Doğrulama kodu hatalı. Uygulamadaki güncel kodu giriniz.', 'INVALID_TWO_FACTOR_CODE');

    const { codes, hashes } = newRecoveryCodes();
    // Kurulumda kullanılan kod, girişte tekrar kullanılamaz
    await withTransaction((tx) => twoFactorRepository.enable(tx, userId, encryptJson({ secret }), hashes, step));
    await sendMail(twoFactorChangedMail(user.email, user.name, true));
    await notificationService.send({
      userId,
      type: 'SYSTEM',
      title: 'İki Adımlı Doğrulama Açıldı',
      message: 'Hesabınıza girişte artık doğrulama uygulamanızdaki kod istenecek.',
      link: '/hesabim/ayarlar',
    });
    return { recoveryCodes: codes };
  },

  /** Giriş adımı veya hassas işlem için kodu doğrular (TOTP ya da tek kullanımlık kurtarma kodu) */
  async verifyCode(userId: string, code: string, encryptedSecret?: string | null) {
    const stored = encryptedSecret ?? (await getUserWithSecret(userId)).twoFactorSecret;
    if (!stored) return false;
    const trimmed = code.replace(/\s/g, '');
    if (/^\d{6}$/.test(trimmed)) {
      let secret: string;
      try {
        secret = readSecret(stored);
      } catch (err) {
        logger.error(`2FA anahtarı çözülemedi: ${userId}`, err);
        return false;
      }
      const step = verifyTotp(secret, trimmed);
      return step !== null && (await twoFactorRepository.claimStep(userId, step));
    }
    return twoFactorRepository.consumeRecoveryCode(userId, hashRecovery(trimmed));
  },

  async disable(userId: string, password: string, code: string) {
    const user = await getUserWithSecret(userId);
    if (!user.twoFactorSecret) throw new BadRequestError('İki adımlı doğrulama zaten kapalı', 'TWO_FACTOR_DISABLED');
    if (!(await bcrypt.compare(password, user.password))) throw new BadRequestError('Şifre hatalı', 'WRONG_PASSWORD');
    if (!(await this.verifyCode(userId, code, user.twoFactorSecret))) {
      throw new BadRequestError('Doğrulama kodu hatalı', 'INVALID_TWO_FACTOR_CODE');
    }
    await withTransaction((tx) => twoFactorRepository.disable(tx, userId));
    await sendMail(twoFactorChangedMail(user.email, user.name, false));
    await notificationService.send({
      userId,
      type: 'SYSTEM',
      title: 'İki Adımlı Doğrulama Kapatıldı',
      message: 'Hesabınızda iki adımlı doğrulama kapatıldı. Bu işlemi siz yapmadıysanız hemen şifrenizi değiştiriniz.',
      link: '/hesabim/ayarlar',
    });
  },

  async regenerateRecoveryCodes(userId: string, code: string) {
    const user = await getUserWithSecret(userId);
    if (!user.twoFactorSecret) throw new BadRequestError('İki adımlı doğrulama kapalı', 'TWO_FACTOR_DISABLED');
    if (!(await this.verifyCode(userId, code, user.twoFactorSecret))) {
      throw new BadRequestError('Doğrulama kodu hatalı', 'INVALID_TWO_FACTOR_CODE');
    }
    const { codes, hashes } = newRecoveryCodes();
    await withTransaction((tx) => twoFactorRepository.replaceRecoveryCodes(tx, userId, hashes));
    return { recoveryCodes: codes };
  },

  async status(userId: string) {
    const user = await getUserWithSecret(userId);
    return {
      enabled: !!user.twoFactorSecret,
      recoveryCodesLeft: user.twoFactorSecret ? await twoFactorRepository.countUnusedRecoveryCodes(userId) : 0,
    };
  },

  // ─── Giriş adımı ────────────────────────────────────────────────────────────

  issueChallenge: (userId: string) => signPurposeToken(userId, LOGIN_PURPOSE, TWO_FACTOR_LOGIN_TTL),

  /** @returns doğrulanan kullanıcının id'si */
  async completeChallenge(challengeToken: string, code: string) {
    const payload = verifyPurposeToken(challengeToken, LOGIN_PURPOSE);
    if (!payload) throw new UnauthorizedError('Giriş adımının süresi doldu, lütfen tekrar giriş yapınız', 'CHALLENGE_EXPIRED');
    if (!(await this.verifyCode(payload.sub, code))) {
      throw new UnauthorizedError('Doğrulama kodu hatalı', 'INVALID_TWO_FACTOR_CODE');
    }
    return payload.sub;
  },
};
