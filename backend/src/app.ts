import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from '@/config/env';
import { errorHandler } from '@/middlewares/errorHandler';
import { notFound } from '@/middlewares/notFound';
import { originGuard } from '@/middlewares/originGuard';
import { apiLimiter, webhookLimiter } from '@/middlewares/rateLimit';
import { UPLOADS_DIR } from '@/modules/uploads/upload.storage';
import { authRoutes } from '@/modules/auth/auth.routes';
import { userRoutes } from '@/modules/users/user.routes';
import { walletRoutes } from '@/modules/wallet/wallet.routes';
import { sellerRequestRoutes } from '@/modules/seller-requests/seller-request.routes';
import { permissionRoutes } from '@/modules/permissions/permission.routes';
import { categoryRoutes } from '@/modules/categories/category.routes';
import { productRoutes } from '@/modules/products/product.routes';
import { cartRoutes } from '@/modules/cart/cart.routes';
import { orderRoutes } from '@/modules/orders/order.routes';
import { pinRoutes } from '@/modules/pins/pin.routes';
import { disputeRoutes } from '@/modules/disputes/dispute.routes';
import { notificationRoutes } from '@/modules/notifications/notification.routes';
import { storeRoutes } from '@/modules/stores/store.routes';
import { supportRoutes } from '@/modules/support/support.routes';
import { messageRoutes } from '@/modules/messages/message.routes';
import { uploadRoutes } from '@/modules/uploads/upload.routes';
import { withdrawalRoutes } from '@/modules/withdrawals/withdrawal.routes';
import { depositRoutes } from '@/modules/deposits/deposit.routes';
import { reportRoutes } from '@/modules/reports/report.routes';
import { paymentRoutes, paymentWebhookRoutes } from '@/modules/payments/payment.routes';
import { auditRoutes } from '@/modules/audit/audit.routes';
import { reviewAdminRoutes } from '@/modules/reviews/review.routes';
import { complaintRoutes } from '@/modules/complaints/complaint.routes';
import { settingsRoutes } from '@/modules/settings/settings.routes';

const app: Application = express();

if (env.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    // Yüklenen görseller frontend origin'inden gösterilir
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Origin'siz istekler (server-to-server, curl) serbest; tarayıcı istekleri listede olmalı
      if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(cookieParser());
// Ödeme sağlayıcı bildirimleri kendi gövde ayrıştırıcıları ve imza doğrulamalarıyla CSRF katmanından önce
app.use('/api/payments/webhooks', webhookLimiter, paymentWebhookRoutes);
app.use('/api', originGuard, apiLimiter);

// Görsel yükleme kendi gövde limitiyle genel JSON parser'dan önce bağlanır
app.use('/api/upload', uploadRoutes);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', index: false, dotfiles: 'deny' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok', service: 'nexuspin-backend', timestamp: new Date().toISOString(), uptime: process.uptime() },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/seller-requests', sellerRequestRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pins', pinRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/reviews', reviewAdminRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/settings', settingsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
