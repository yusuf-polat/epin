import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { authLimiter } from '@/middlewares/rateLimit';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { authController } from './auth.controller';
import {
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  twoFactorCodeSchema,
  twoFactorDisableSchema,
  twoFactorEnableSchema,
  twoFactorLoginSchema,
  verifyEmailSchema,
} from './auth.schema';

const router = Router();

router.post('/register', authLimiter, validateRequest(registerSchema), asyncHandler(authController.register));
router.post('/login', authLimiter, validateRequest(loginSchema), asyncHandler(authController.login));
router.post('/google', authLimiter, validateRequest(googleAuthSchema), asyncHandler(authController.google));
router.post('/forgot-password', authLimiter, validateRequest(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
router.post('/reset-password', authLimiter, validateRequest(resetPasswordSchema), asyncHandler(authController.resetPassword));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', authenticate, asyncHandler(authController.me));

// E-posta doğrulama
router.post('/verify-email', authLimiter, validateRequest(verifyEmailSchema), asyncHandler(authController.verifyEmail));
router.post('/resend-verification', authenticate, authLimiter, asyncHandler(authController.resendVerification));

// İki adımlı doğrulama
router.post('/2fa/login', authLimiter, validateRequest(twoFactorLoginSchema), asyncHandler(authController.twoFactorLogin));
router.get('/2fa', authenticate, asyncHandler(authController.twoFactorStatus));
router.post('/2fa/setup', authenticate, authLimiter, asyncHandler(authController.twoFactorSetup));
router.post('/2fa/enable', authenticate, authLimiter, validateRequest(twoFactorEnableSchema), asyncHandler(authController.twoFactorEnable));
router.post('/2fa/disable', authenticate, authLimiter, validateRequest(twoFactorDisableSchema), asyncHandler(authController.twoFactorDisable));
router.post('/2fa/recovery-codes', authenticate, authLimiter, validateRequest(twoFactorCodeSchema), asyncHandler(authController.twoFactorRecoveryCodes));

export const authRoutes = router;
