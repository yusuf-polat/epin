import { Request, Response } from 'express';
import { AUTH_COOKIE_NAME, authCookieOptions, setAuthCookie } from '@/config/cookies';
import { sendSuccess } from '@/utils/apiResponse';
import { authService, AuthResult, LoginOutcome } from './auth.service';
import { twoFactorService } from './two-factor.service';

/** Token yalnızca HttpOnly cookie ile iletilir; response gövdesinde dönmez */
function respondWithSession(res: Response, result: AuthResult, message: string, statusCode = 200) {
  setAuthCookie(res, result.token);
  return sendSuccess(res, { user: result.user }, message, statusCode);
}

/** 2FA açık hesaplarda cookie verilmez; ikinci adım için kısa ömürlü challenge token döner */
function respondWithLogin(res: Response, outcome: LoginOutcome, message: string) {
  if (outcome.kind === 'challenge') {
    return sendSuccess(res, { twoFactorRequired: true, challengeToken: outcome.challengeToken }, 'Doğrulama kodunu giriniz');
  }
  return respondWithSession(res, outcome.result, message);
}

export const authController = {
  async register(req: Request, res: Response) {
    return respondWithSession(res, await authService.register(req.body), 'Kayıt işlemi başarıyla tamamlandı', 201);
  },

  async login(req: Request, res: Response) {
    return respondWithLogin(res, await authService.login(req.body), 'Giriş başarılı');
  },

  async google(req: Request, res: Response) {
    return respondWithLogin(res, await authService.googleAuth(req.body), 'Google ile giriş başarılı');
  },

  async twoFactorLogin(req: Request, res: Response) {
    return respondWithSession(res, await authService.completeTwoFactorLogin(req.body), 'Giriş başarılı');
  },

  async verifyEmail(req: Request, res: Response) {
    await authService.verifyEmail(req.body.token);
    return sendSuccess(res, null, 'E-posta adresiniz doğrulandı');
  },

  async resendVerification(req: Request, res: Response) {
    await authService.sendVerification(req.user!.id);
    return sendSuccess(res, null, 'Doğrulama bağlantısı e-posta adresinize gönderildi');
  },

  async twoFactorStatus(req: Request, res: Response) {
    return sendSuccess(res, await twoFactorService.status(req.user!.id));
  },

  async twoFactorSetup(req: Request, res: Response) {
    return sendSuccess(res, await twoFactorService.setup(req.user!.id));
  },

  async twoFactorEnable(req: Request, res: Response) {
    const result = await twoFactorService.enable(req.user!.id, req.body.setupToken, req.body.code);
    return sendSuccess(res, result, 'İki adımlı doğrulama açıldı. Kurtarma kodlarınızı güvenli bir yere kaydedin.');
  },

  async twoFactorDisable(req: Request, res: Response) {
    await twoFactorService.disable(req.user!.id, req.body.password, req.body.code);
    return sendSuccess(res, null, 'İki adımlı doğrulama kapatıldı');
  },

  async twoFactorRecoveryCodes(req: Request, res: Response) {
    return sendSuccess(res, await twoFactorService.regenerateRecoveryCodes(req.user!.id, req.body.code), 'Yeni kurtarma kodları oluşturuldu');
  },

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body.email);
    return sendSuccess(res, null, 'Bu e-posta adresine kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi.');
  },

  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(req.body);
    return sendSuccess(res, null, 'Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.');
  },

  async logout(_req: Request, res: Response) {
    const { maxAge: _maxAge, ...clearOptions } = authCookieOptions;
    res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
    return sendSuccess(res, null, 'Çıkış yapıldı');
  },

  async me(req: Request, res: Response) {
    return sendSuccess(res, await authService.me(req.user!.id));
  },
};
