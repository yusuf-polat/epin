import { WithdrawalRequest } from '@prisma/client';
import { withTransaction } from '@/database/transaction';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@/utils/errors';
import { formatIban } from '@/utils/iban';
import { formatTRY, roundMoney, toNumber } from '@/utils/money';
import { PageParams } from '@/utils/pagination';
import { walletRepository } from '@/modules/wallet/wallet.repository';
import { userRepository } from '@/modules/users/user.repository';
import { notificationService } from '@/modules/notifications/notification.service';
import { calculateWithdrawalFee, settingsService } from '@/modules/settings/settings.service';
import { withdrawalRepository } from './withdrawal.repository';
import { AdminWithdrawalListQuery, CreateWithdrawalDTO } from './withdrawal.types';
import { MAX_PENDING_WITHDRAWALS } from './withdrawal.constants';

const toView = <T extends WithdrawalRequest>(w: T) => {
  const amount = toNumber(w.amount);
  const fee = toNumber(w.fee);
  // netAmount: kullanıcının banka hesabına gönderilecek tutar
  return { ...w, amount, fee, netAmount: roundMoney(amount - fee), iban: formatIban(w.iban) };
};

async function getPending(id: string) {
  const request = await withdrawalRepository.findById(id);
  if (!request) throw new NotFoundError('Para çekme talebi bulunamadı', 'WITHDRAWAL_NOT_FOUND');
  if (request.status !== 'PENDING') throw new ConflictError('Bu talep zaten sonuçlandırılmış', 'WITHDRAWAL_PROCESSED');
  return request;
}

/**
 * Para çekme: talep açıldığında tutar bakiyeden düşülerek bloke edilir (satıcı
 * aynı parayı başka bir alışverişte kullanamaz). Talep reddedilir veya iptal
 * edilirse tutar WITHDRAWAL_REFUND hareketiyle iade edilir.
 */
export const withdrawalService = {
  async create(userId: string, dto: CreateWithdrawalDTO) {
    const user = await userRepository.findById(userId);
    if (!user?.emailVerifiedAt) {
      throw new ForbiddenError('Para çekebilmek için önce e-posta adresinizi doğrulayınız', 'EMAIL_NOT_VERIFIED');
    }
    if ((await withdrawalRepository.countPending(userId)) >= MAX_PENDING_WITHDRAWALS) {
      throw new BadRequestError(`Aynı anda en fazla ${MAX_PENDING_WITHDRAWALS} bekleyen talebiniz olabilir`, 'TOO_MANY_PENDING');
    }

    // Komisyon talep anındaki ayarla hesaplanır ve talebe yazılır; sonradan ayar değişse de etkilenmez
    const fee = calculateWithdrawalFee(dto.amount, await settingsService.getCommission());
    if (fee >= dto.amount) {
      throw new BadRequestError(`Para çekme ücreti (${formatTRY(fee)}) tutardan büyük; daha yüksek bir tutar giriniz`, 'AMOUNT_BELOW_FEE');
    }

    const request = await withTransaction(async (tx) => {
      const created = await withdrawalRepository.create(tx, { userId, amount: dto.amount, fee, iban: dto.iban, accountHolder: dto.accountHolder });
      const debited = await walletRepository.debitIfSufficient(tx, {
        userId,
        amount: dto.amount,
        type: 'WITHDRAWAL',
        description: `Para çekme talebi (${formatIban(dto.iban, true)})${fee > 0 ? ` · ${formatTRY(fee)} işlem ücreti dahil` : ''}`,
      });
      if (!debited) throw new BadRequestError('Çekmek istediğiniz tutar bakiyenizden fazla', 'INSUFFICIENT_BALANCE');
      return created;
    });

    await notificationService.notifyStaff({
      type: 'WALLET',
      title: 'Yeni Para Çekme Talebi',
      message: `${formatTRY(roundMoney(dto.amount - fee))} gönderilecek para çekme talebi onay bekliyor (${formatTRY(dto.amount)} - ${formatTRY(fee)} ücret).`,
      link: '/panel/finans',
    });
    return toView(request);
  },

  async listMine(userId: string, page: PageParams) {
    const { items, total } = await withdrawalRepository.findByUser(userId, page);
    return { items: items.map(({ user: _user, ...w }) => toView(w)), total };
  },

  async cancel(userId: string, id: string) {
    const request = await getPending(id);
    if (request.userId !== userId) throw new NotFoundError('Para çekme talebi bulunamadı', 'WITHDRAWAL_NOT_FOUND');
    await this.refund(request, 'CANCELLED', { adminNote: 'Kullanıcı tarafından iptal edildi' });
    return { id, status: 'CANCELLED' as const };
  },

  // ─── Yönetim ────────────────────────────────────────────────────────────────

  async listForAdmin(query: AdminWithdrawalListQuery) {
    const { items, total } = await withdrawalRepository.findForAdmin(query);
    return { items: items.map(toView), total };
  },

  /** Banka transferi yapıldıktan sonra talep ödendi olarak işaretlenir (bakiye zaten bloke) */
  async markPaid(adminId: string, id: string, transferRef: string) {
    const request = await getPending(id);
    const moved = await withdrawalRepository.transitionFromPending(id, 'PAID', {
      transferRef,
      processedById: adminId,
      processedAt: new Date(),
    });
    if (!moved) throw new ConflictError('Bu talep zaten sonuçlandırılmış', 'WITHDRAWAL_PROCESSED');
    await notificationService.send({
      userId: request.userId,
      type: 'WALLET',
      title: 'Para Çekme Talebiniz Ödendi',
      message: `${formatTRY(roundMoney(toNumber(request.amount) - toNumber(request.fee)))} tutarı ${formatIban(request.iban, true)} hesabınıza gönderildi. Referans: ${transferRef}`,
      link: '/hesabim/cuzdan',
    });
    return { id, status: 'PAID' as const };
  },

  async reject(adminId: string, id: string, reason: string) {
    const request = await getPending(id);
    await this.refund(request, 'REJECTED', { adminNote: reason, processedById: adminId, processedAt: new Date() });
    await notificationService.send({
      userId: request.userId,
      type: 'WALLET',
      title: 'Para Çekme Talebiniz Reddedildi',
      message: `${formatTRY(toNumber(request.amount))} bakiyenize iade edildi. Gerekçe: ${reason}`,
      link: '/hesabim/cuzdan',
    });
    return { id, status: 'REJECTED' as const };
  },

  /** Talebi kapatır ve bloke tutarı iade eder (koşullu geçiş ile tek sefer) */
  async refund(
    request: WithdrawalRequest,
    status: 'REJECTED' | 'CANCELLED',
    data: { adminNote: string; processedById?: string; processedAt?: Date }
  ) {
    await withTransaction(async (tx) => {
      const moved = await withdrawalRepository.transitionFromPending(request.id, status, data, tx);
      if (!moved) throw new ConflictError('Bu talep zaten sonuçlandırılmış', 'WITHDRAWAL_PROCESSED');
      await walletRepository.credit(tx, {
        userId: request.userId,
        amount: toNumber(request.amount),
        type: 'WITHDRAWAL_REFUND',
        description: status === 'CANCELLED' ? 'Para çekme talebi iptal edildi (iade)' : 'Para çekme talebi reddedildi (iade)',
      });
    });
  },
};
