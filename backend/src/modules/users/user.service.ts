import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { BadRequestError, ConflictError, NotFoundError } from '@/utils/errors';
import { toNumber } from '@/utils/money';
import { PageParams } from '@/utils/pagination';
import { notificationService } from '@/modules/notifications/notification.service';
import { userRepository } from './user.repository';
import { toPublicUser } from './user.mapper';
import { ChangePasswordDTO, UpdateProfileDTO } from './user.types';
import { BCRYPT_ROUNDS } from '@/modules/auth/auth.constants';
import { passwordChangedMail } from '@/modules/auth/auth.mail';
import { sendMail } from '@/config/mailer';
import { signAccessToken } from '@/utils/jwt';

async function ensureUser(id: string) {
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
  return user;
}

export const userService = {
  async getProfile(userId: string) {
    const user = await userRepository.findPublicById(userId);
    if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
    return toPublicUser(user);
  },

  async updateProfile(userId: string, dto: UpdateProfileDTO) {
    if (dto.email) {
      const existing = await userRepository.findByEmail(dto.email);
      if (existing && existing.id !== userId) {
        throw new ConflictError('Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor', 'EMAIL_TAKEN');
      }
    }
    const updated = await userRepository.update(userId, {
      ...dto,
      avatarUrl: dto.avatarUrl === '' ? null : dto.avatarUrl,
    });
    return toPublicUser(updated);
  },

  async changePassword(userId: string, dto: ChangePasswordDTO) {
    const user = await ensureUser(userId);
    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) throw new BadRequestError('Mevcut şifre hatalı', 'WRONG_PASSWORD');
    // Yeni token'ın iat değeri (saniye) değişiklik anından küçük olamaz; bu cihazın oturumu geçerli kalır
    await userRepository.setPassword(userId, await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS));
    await sendMail(passwordChangedMail(user.email, user.name));
    // Diğer cihazlardaki oturumlar kapanır; bu cihaz için yeni token üretilir
    return signAccessToken({ id: user.id, role: user.role });
  },

  // ─── Yönetim ────────────────────────────────────────────────────────────────

  async listForAdmin(page: PageParams, search?: string) {
    const { items, total } = await userRepository.findManyForAdmin(page, search);
    return { items: items.map((u) => ({ ...u, walletBalance: toNumber(u.walletBalance) })), total };
  },

  async setRole(actorId: string, userId: string, role: Role) {
    if (actorId === userId) throw new BadRequestError('Kendi rolünüzü değiştiremezsiniz', 'SELF_ROLE_CHANGE');
    await ensureUser(userId);
    return userRepository.setRole(userId, role);
  },

  async setSellerPermission(userId: string, canSell: boolean) {
    await ensureUser(userId);
    return userRepository.setSeller(userId, canSell);
  },

  async ban(actorId: string, userId: string, reason: string) {
    if (actorId === userId) throw new BadRequestError('Kendi hesabınızı askıya alamazsınız', 'SELF_BAN');
    const user = await ensureUser(userId);
    if (user.role === 'ADMIN') throw new BadRequestError('Yönetici hesabı askıya alınamaz', 'ADMIN_BAN');

    const updated = await userRepository.setBan(userId, true, reason);
    await notificationService.send({
      userId,
      type: 'SYSTEM',
      title: 'Hesabınız Askıya Alındı',
      message: `Hesabınız şu gerekçeyle askıya alınmıştır: ${reason}`,
    });
    return updated;
  },

  async unban(userId: string) {
    await ensureUser(userId);
    const updated = await userRepository.setBan(userId, false);
    await notificationService.send({
      userId,
      type: 'SYSTEM',
      title: 'Hesabınız Yeniden Aktif',
      message: 'Hesabınızın askıya alınma durumu kaldırılmıştır. Giriş yapabilirsiniz.',
    });
    return updated;
  },
};
