import { z } from 'zod';
import { emailField, passwordField, requiredText } from '@/lib/validations/common';

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'İsim en az 2 karakter olmalıdır').max(80),
  email: emailField,
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\s()-]*$/, 'Geçerli bir telefon numarası giriniz'),
  avatarUrl: z.string(),
});

export const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Mevcut şifrenizi giriniz'),
    newPassword: passwordField,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { message: 'Yeni şifreler eşleşmiyor', path: ['confirm'] });

export const banSchema = z.object({ reason: requiredText(3, 'Gerekçe', 500) });

export type ProfileValues = z.infer<typeof profileSchema>;
export type PasswordValues = z.infer<typeof passwordSchema>;
export type BanValues = z.infer<typeof banSchema>;
