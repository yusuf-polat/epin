import express, { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { sensitiveLimiter } from '@/middlewares/rateLimit';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { uploadController } from './upload.controller';
import { uploadImageSchema } from './upload.schema';

const router = Router();

// Görsel yükleme, genel 1MB limitinden bağımsız olarak kendi gövde limitini kullanır
router.post(
  '/',
  express.json({ limit: '8mb' }),
  authenticate,
  sensitiveLimiter,
  validateRequest(uploadImageSchema),
  asyncHandler(uploadController.uploadImage)
);

export const uploadRoutes = router;
