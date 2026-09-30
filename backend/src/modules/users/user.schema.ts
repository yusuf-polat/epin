import { z } from 'zod';
import { paginationQuery } from '@/utils/pagination';

const idParams = z.object({ id: z.string().uuid('Geçersiz kullanıcı ID') });

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'İsim en az 2 karakter olmalıdır').max(80).optional(),
    email: z.string().trim().toLowerCase().email('Geçerli bir e-posta adresi giriniz').optional(),
    phone: z
      .string()
      .trim()
      .max(20)
      .regex(/^[0-9+\s()-]*$/, 'Geçerli bir telefon numarası giriniz')
      .nullable()
      .optional(),
    avatarUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//.test(v), 'Geçerli bir resim linki giriniz')
      .nullable()
      .optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, 'Mevcut şifrenizi girmelisiniz'),
    newPassword: z.string().min(8, 'Yeni şifre en az 8 karakter olmalıdır').max(128),
  }),
});

export const adminListUsersSchema = z.object({
  query: z.object({
    ...paginationQuery(30),
    search: z.string().trim().max(100).optional(),
  }),
});

export const setRoleSchema = z.object({
  params: idParams,
  body: z.object({ role: z.enum(['USER', 'DESTEK', 'ADMIN']) }),
});

export const setSellerSchema = z.object({
  params: idParams,
  body: z.object({ canSell: z.boolean() }),
});

export const banUserSchema = z.object({
  params: idParams,
  body: z.object({ reason: z.string().trim().min(3, 'Gerekçe en az 3 karakter olmalıdır').max(500) }),
});

export const userIdParamSchema = z.object({ params: idParams });
