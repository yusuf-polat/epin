import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '@/config/env';
import { sendMail } from '@/config/mailer';
import { withTransaction } from '@/database/transaction';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '@/utils/errors';
import { notificationService } from '@/modules/notifications/notification.service';
import { signAccessToken } from '@/utils/jwt';
import { userRepository } from '@/modules/users/user.repository';
import { toPublicUser, PublicUser } from '@/modules/users/user.mapper';
import { GoogleAuthDTO, LoginDTO, RegisterDTO, ResetPasswordDTO, TwoFactorLoginDTO } from './auth.types';
import { passwordResetRepository } from './password-reset.repository';
import { emailVerificationRepository } from './email-verification.repository';
import { twoFactorService } from './two-factor.service';
import { emailVerificationMail, passwordChangedMail, passwordResetMail } from './auth.mail';
import { verifyGoogleIdentity } from './google.client';
import { BCRYPT_ROUNDS, RESET_TOKEN_BYTES, VERIFY_TOKEN_BYTES } from './auth.constants';

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

// Kullanıcı bulunamadığında da bcrypt çalıştırılarak zamanlama saldırısı engellenir
const DUMMY_HASH = bcrypt.hashSync('timing-attack-guard', BCRYPT_ROUNDS);

export interface AuthResult {
  user: PublicUser;
  token: string;
}

/** Parola doğrulandıktan sonra: 2FA açıksa ikinci adım istenir, değilse oturum açılır */
export type LoginOutcome = { kind: 'session'; result: AuthResult } | { kind: 'challenge'; challengeToken: string };

async function issue(userId: string): Promise<AuthResult> {
  const user = await userRepository.findPublicById(userId);
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
  return { user: toPublicUser(user), token: signAccessToken({ id: user.id, role: user.role }) };
}

function assertNotBanned(user: { isBanned: boolean; banReason: string | null }) {
  if (user.isBanned) {
    throw new ForbiddenError(`Hesabınız askıya alınmıştır. Sebep: ${user.banReason ?? 'Belirtilmedi'}`, 'ACCOUNT_BANNED');
  }
}

async function startSession(user: { id: string; twoFactorSecret: string | null }): Promise<LoginOutcome> {
  if (user.twoFactorSecret) return { kind: 'challenge', challengeToken: twoFactorService.issueChallenge(user.id) };
  return { kind: 'session', result: await issue(user.id) };
}

export const authService = {
  async register(dto: RegisterDTO): Promise<AuthResult> {
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) throw new ConflictError('Bu e-posta adresi ile kayıtlı kullanıcı zaten mevcut', 'EMAIL_TAKEN');

    const created = await userRepository.create({
      email: dto.email,
      name: dto.name,
      password: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      termsAcceptedAt: new Date(),
    });
    await this.sendVerification(created.id);
    return issue(created.id);
  },

  /** Doğrulama bağlantısı gönderir; önceki bağlantılar geçersiz olur */
  async sendVerification(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
    if (user.emailVerifiedAt) throw new BadRequestError('E-posta adresiniz zaten doğrulanmış', 'ALREADY_VERIFIED');
    const token = crypto.randomBytes(VERIFY_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_TTL_HOURS * 60 * 60_000);
    await emailVerificationRepository.replaceToken(user.id, hashToken(token), expiresAt);
    await sendMail(emailVerificationMail(user.email, user.name, token));
  },

  async verifyEmail(token: string) {
    const record = await emailVerificationRepository.findValid(hashToken(token));
    if (!record) throw new BadRequestError('Doğrulama bağlantısı geçersiz veya süresi dolmuş', 'INVALID_VERIFY_TOKEN');
    await withTransaction(async (tx) => {
      if (!(await emailVerificationRepository.consume(tx, record.id))) {
        throw new BadRequestError('Doğrulama bağlantısı zaten kullanılmış', 'INVALID_VERIFY_TOKEN');
      }
      await emailVerificationRepository.markVerified(tx, record.userId);
    });
  },

  /**
   * Şifre sıfırlama bağlantısı gönderir. Hesap olup olmadığını sızdırmamak için
   * çağıran her durumda aynı yanıtı döner.
   */
  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user || user.isBanned) return;

    const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000);
    await passwordResetRepository.replaceToken(user.id, hashToken(token), expiresAt);
    await sendMail(passwordResetMail(user.email, user.name, token));
  },

  async resetPassword(dto: ResetPasswordDTO) {
    const record = await passwordResetRepository.findValid(hashToken(dto.token));
    if (!record) throw new BadRequestError('Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş', 'INVALID_RESET_TOKEN');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await withTransaction(async (tx) => {
      if (!(await passwordResetRepository.consume(tx, record.id))) {
        throw new BadRequestError('Şifre sıfırlama bağlantısı zaten kullanılmış', 'INVALID_RESET_TOKEN');
      }
      await userRepository.setPassword(record.userId, passwordHash, new Date(), tx);
      await passwordResetRepository.deleteForUser(tx, record.userId);
    });

    const user = await userRepository.findById(record.userId);
    if (user) {
      await sendMail(passwordChangedMail(user.email, user.name));
      await notificationService.send({
        userId: user.id,
        type: 'SYSTEM',
        title: 'Şifreniz Sıfırlandı',
        message: 'Hesabınızın şifresi sıfırlandı ve açık oturumlarınız kapatıldı.',
      });
    }
  },

  async login(dto: LoginDTO): Promise<LoginOutcome> {
    const user = await userRepository.findByEmail(dto.email);
    const isMatch = await bcrypt.compare(dto.password, user?.password ?? DUMMY_HASH);
    if (!user || !isMatch) throw new UnauthorizedError('Geçersiz e-posta veya şifre', 'INVALID_CREDENTIALS');
    assertNotBanned(user);
    return startSession(user);
  },

  /** 2FA'lı girişin ikinci adımı */
  async completeTwoFactorLogin(dto: TwoFactorLoginDTO): Promise<AuthResult> {
    const userId = await twoFactorService.completeChallenge(dto.challengeToken, dto.code);
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
    assertNotBanned(user);
    return issue(user.id);
  },

  async googleAuth(dto: GoogleAuthDTO): Promise<LoginOutcome> {
    const profile = await verifyGoogleIdentity(dto);
    let user = await userRepository.findByEmail(profile.email);

    if (!user) {
      const created = await userRepository.create({
        email: profile.email,
        name: profile.name || profile.email.split('@')[0],
        // Google hesapları parola ile giriş yapamaz; tahmin edilemez rastgele hash
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), BCRYPT_ROUNDS),
        avatarUrl: profile.picture,
        // Google ile kayıt ekranında sözleşmeler onaylanarak devam edilir
        termsAcceptedAt: new Date(),
        // Google e-posta adresini doğrulamış olarak iletir
        emailVerifiedAt: new Date(),
      });
      return { kind: 'session', result: await issue(created.id) };
    }

    assertNotBanned(user);
    const updates = {
      ...(profile.picture && !user.avatarUrl ? { avatarUrl: profile.picture } : {}),
      ...(!user.emailVerifiedAt ? { emailVerifiedAt: new Date() } : {}),
    };
    if (Object.keys(updates).length) await userRepository.update(user.id, updates);
    return startSession(user);
  },

  async me(userId: string): Promise<PublicUser> {
    const user = await userRepository.findPublicById(userId);
    if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
    return toPublicUser(user);
  },
};
