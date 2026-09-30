import { Request, Response } from 'express';
import { setAuthCookie } from '@/config/cookies';
import { sendPaginated, sendSuccess } from '@/utils/apiResponse';
import { buildMeta } from '@/utils/pagination';
import { userService } from './user.service';
import { AdminUserListQuery } from './user.types';

export const userController = {
  async getProfile(req: Request, res: Response) {
    return sendSuccess(res, await userService.getProfile(req.user!.id));
  },

  async updateProfile(req: Request, res: Response) {
    return sendSuccess(res, await userService.updateProfile(req.user!.id, req.body), 'Profil güncellendi');
  },

  async changePassword(req: Request, res: Response) {
    const token = await userService.changePassword(req.user!.id, req.body);
    // Diğer oturumlar kapandı; bu cihazın oturumu yeni token ile sürer
    setAuthCookie(res, token);
    return sendSuccess(res, null, 'Şifreniz güncellendi, diğer cihazlardaki oturumlar kapatıldı');
  },

  // ─── Yönetim ────────────────────────────────────────────────────────────────

  async listForAdmin(req: Request, res: Response) {
    const { page, limit, search } = req.query as unknown as AdminUserListQuery;
    const { items, total } = await userService.listForAdmin({ page, limit }, search);
    return sendPaginated(res, items, buildMeta({ page, limit }, total));
  },

  async setRole(req: Request, res: Response) {
    return sendSuccess(res, await userService.setRole(req.user!.id, req.params.id, req.body.role), 'Kullanıcı rolü güncellendi');
  },

  async setSellerPermission(req: Request, res: Response) {
    const result = await userService.setSellerPermission(req.params.id, req.body.canSell);
    return sendSuccess(res, result, `Satıcı yetkisi ${req.body.canSell ? 'verildi' : 'kaldırıldı'}`);
  },

  async ban(req: Request, res: Response) {
    return sendSuccess(res, await userService.ban(req.user!.id, req.params.id, req.body.reason), 'Kullanıcı hesabı askıya alındı');
  },

  async unban(req: Request, res: Response) {
    return sendSuccess(res, await userService.unban(req.params.id), 'Kullanıcı askıdan çıkarıldı');
  },
};
