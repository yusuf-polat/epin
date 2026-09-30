import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Geçerli bir e-posta adresi giriniz').max(254);
const password = z.string().min(8, 'Şifre en az 8 karakter olmalıdır').max(128);

export const registerSchema = z.object({
  body: z.object({
    email,
    name: z.string().trim().min(2, 'İsim en az 2 karakter olmalıdır').max(80),
    password,
    // Kullanım koşulları ve KVKK aydınlatma metni onayı
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Kullanım koşullarını ve KVKK metnini onaylamanız gerekir' }) }),
  }),
});

export const forgotPasswordSchema = z.object({ body: z.object({ email }) });

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/, 'Geçersiz veya süresi dolmuş bağlantı'),
    password,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email,
    password: z.string().min(1, 'Şifre gereklidir').max(128),
  }),
});

export const googleAuthSchema = z.object({
  body: z
    .object({
      credential: z.string().min(10).optional(),
      accessToken: z.string().min(10).optional(),
    })
    .refine((b) => b.credential || b.accessToken, 'Google kimlik bilgisi gereklidir'),
});

/** 6 haneli uygulama kodu veya XXXXX-XXXXX kurtarma kodu */
const twoFactorCode = z
  .string()
  .trim()
  .min(6, 'Doğrulama kodunu giriniz')
  .max(20)
  .regex(/^[0-9A-Za-z\s-]+$/, 'Geçersiz doğrulama kodu');

export const verifyEmailSchema = z.object({
  body: z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'Geçersiz veya süresi dolmuş bağlantı') }),
});

export const twoFactorLoginSchema = z.object({
  body: z.object({ challengeToken: z.string().min(20).max(2000), code: twoFactorCode }),
});

export const twoFactorEnableSchema = z.object({
  body: z.object({ setupToken: z.string().min(20).max(4000), code: z.string().trim().regex(/^\d{6}$/, '6 haneli kodu giriniz') }),
});

export const twoFactorDisableSchema = z.object({
  body: z.object({ password: z.string().min(1, 'Şifre gereklidir').max(128), code: twoFactorCode }),
});

export const twoFactorCodeSchema = z.object({ body: z.object({ code: twoFactorCode }) });
