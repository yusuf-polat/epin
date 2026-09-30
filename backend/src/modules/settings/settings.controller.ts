import { Request, Response } from 'express';
import { sendMailStrict } from '@/config/mailer';
import { sendError, sendSuccess } from '@/utils/apiResponse';
import { settingsService } from './settings.service';

export const settingsController = {
  /** Kullanıcı arayüzünde gösterilen ücretler (ör. para çekme komisyonu önizlemesi) */
  async publicSettings(_req: Request, res: Response) {
    return sendSuccess(res, await settingsService.getCommission());
  },

  async updateCommission(req: Request, res: Response) {
    return sendSuccess(res, await settingsService.updateCommission(req.user!.id, req.body), 'Komisyon ayarları kaydedildi');
  },

  async getSmtp(_req: Request, res: Response) {
    return sendSuccess(res, await settingsService.getSmtpForAdmin());
  },

  async updateSmtp(req: Request, res: Response) {
    return sendSuccess(res, await settingsService.updateSmtp(req.user!.id, req.body), 'E-posta ayarları kaydedildi');
  },

  /** Kayıtlı ayarla test e-postası gönderir; SMTP hatası olduğu gibi gösterilir */
  async testSmtp(req: Request, res: Response) {
    try {
      const sent = await sendMailStrict({
        to: req.body.to,
        subject: 'NexusPin test e-postası',
        text: 'Bu e-posta, yönetim panelindeki SMTP ayarlarını doğrulamak için gönderildi. Bu mesajı aldıysanız ayarlar çalışıyor.',
      });
      if (!sent) return sendError(res, 400, 'SMTP_NOT_CONFIGURED', 'SMTP ayarı yok veya kapalı. Önce ayarları kaydedip etkinleştiriniz.');
      return sendSuccess(res, { sent: true }, `Test e-postası ${req.body.to} adresine gönderildi`);
    } catch (err) {
      return sendError(res, 400, 'SMTP_FAILED', `E-posta gönderilemedi: ${(err as Error).message}`);
    }
  },
};
