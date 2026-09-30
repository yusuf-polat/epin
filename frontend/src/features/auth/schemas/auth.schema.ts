import { z } from 'zod';
import { emailField, passwordField } from '@/lib/validations/common';

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Şifre gereklidir'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'İsim en az 2 karakter olmalıdır').max(80),
  email: emailField,
  password: passwordField,
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Devam etmek için sözleşmeleri onaylamanız gerekir' }) }),
});

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, { message: 'Şifreler eşleşmiyor', path: ['passwordConfirm'] });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
