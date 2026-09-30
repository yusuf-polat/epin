import { withTransaction } from '@/database/transaction';
import { userRepository } from '@/modules/users/user.repository';
import { env } from '@/config/env';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/utils/errors';
import { formatTRY, toNumber } from '@/utils/money';
import { PageParams } from '@/utils/pagination';
import { notificationService } from '@/modules/notifications/notification.service';
import { gatewayService } from '@/modules/payments/gateway.service';
import { walletRepository } from './wallet.repository';
import { AdminLedgerQuery, WalletSummary } from './wallet.types';

export const walletService = {
  async getSummary(userId: string): Promise<WalletSummary> {
    const [user, pending] = await Promise.all([walletRepository.getBalance(userId), walletRepository.pendingWithdrawalTotal(userId)]);
    if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
    return {
      walletBalance: toNumber(user.walletBalance),
      pendingWithdrawal: toNumber(pending),
      topupEnabled: env.walletTopupEnabled,
      bankTransferEnabled: (await gatewayService.getBankAccount()) !== null,
    };
  },

  async listTransactions(userId: string, page: PageParams) {
    const { items, total } = await walletRepository.findTransactions(userId, page);
    return { items: items.map((t) => ({ ...t, amount: toNumber(t.amount) })), total };
  },

  async listAllTransactions(query: AdminLedgerQuery) {
    const { items, total } = await walletRepository.findAllTransactions(query);
    return { items: items.map((t) => ({ ...t, amount: toNumber(t.amount) })), total };
  },

  /**
   * Doğrudan bakiye yükleme. Gerçek bir ödeme sağlayıcısı entegre edilene kadar
   * yalnızca ENABLE_WALLET_TOPUP açıkken (varsayılan: development) çalışır.
   */
  async topup(userId: string, amount: number) {
    if (!env.walletTopupEnabled) {
      throw new ForbiddenError(
        'Online bakiye yükleme şu anda aktif değil. Bakiye yüklemek için destek ekibiyle iletişime geçiniz.',
        'WALLET_TOPUP_DISABLED'
      );
    }
    await withTransaction((tx) =>
      walletRepository.credit(tx, { userId, amount, type: 'TOPUP', description: 'Cüzdana bakiye yükleme' })
    );
    return this.getSummary(userId);
  },

  /** Yetkili personelin manuel bakiye düzeltmesi (pozitif: ekleme, negatif: düşme) */
  async adminAdjust(userId: string, amount: number, note: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('Kullanıcı bulunamadı');

    const description = `Yönetici bakiye düzenlemesi: ${note}`;
    await withTransaction(async (tx) => {
      if (amount > 0) {
        await walletRepository.credit(tx, { userId, amount, type: 'ADMIN_ADJUSTMENT', description });
      } else {
        const ok = await walletRepository.debitIfSufficient(tx, {
          userId,
          amount: Math.abs(amount),
          type: 'ADMIN_ADJUSTMENT',
          description,
        });
        if (!ok) throw new BadRequestError('Kullanıcının bakiyesi bu düşüm için yetersiz', 'INSUFFICIENT_BALANCE');
      }
    });

    await notificationService.send({
      userId,
      type: 'WALLET',
      title: amount > 0 ? 'Bakiyenize Yükleme Yapıldı' : 'Bakiyenizden Düşüm Yapıldı',
      message: `${formatTRY(Math.abs(amount))} tutarında bakiye düzenlemesi yapıldı. Not: ${note}`,
      link: '/hesabim/cuzdan',
    });

    return this.getSummary(userId);
  },
};
