import express, { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { env } from '@/config/env';
import { authenticate, requirePermission } from '@/middlewares/auth.middleware';
import { sensitiveLimiter } from '@/middlewares/rateLimit';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { logger } from '@/utils/logger';
import { paymentController } from './payment.controller';
import { paymentReturnUrl, paymentService } from './payment.service';
import { adminListPaymentsSchema, checkoutSchema, listMyPaymentsSchema, paymentIdSchema, updateGatewaySchema } from './payment.schema';

const router = Router();

router.use(authenticate);

router.get('/methods', asyncHandler(paymentController.methods));
router.post('/checkout', sensitiveLimiter, validateRequest(checkoutSchema), asyncHandler(paymentController.checkout));
router.get('/mine', validateRequest(listMyPaymentsSchema), asyncHandler(paymentController.listMine));

// Yönetim (/:id'den önce tanımlanmalı)
router.get('/admin/gateways', requirePermission('manage_payments'), asyncHandler(paymentController.listGateways));
router.put(
  '/admin/gateways/:provider',
  requirePermission('manage_payments'),
  validateRequest(updateGatewaySchema),
  audited('payment_gateway.update', 'PAYMENT_GATEWAY', 'Ödeme yöntemi ayarları güncellendi', { param: 'provider' }),
  asyncHandler(paymentController.updateGateway)
);
router.get('/admin', requirePermission('manage_finance'), validateRequest(adminListPaymentsSchema), asyncHandler(paymentController.listForAdmin));
router.post('/admin/:id/sync', requirePermission('manage_finance'), validateRequest(paymentIdSchema), asyncHandler(paymentController.adminSync));

router.get('/:id', validateRequest(paymentIdSchema), asyncHandler(paymentController.get));

export const paymentRoutes = router;

/**
 * Sağlayıcı bildirimleri. Oturum cookie'si ve Origin başlığı taşımadıkları için
 * originGuard'dan önce bağlanır; güvenlik her sağlayıcının imza/hash doğrulamasıyla sağlanır.
 */
const webhooks = Router();

// Stripe imzası ham gövde üzerinden hesaplanır
webhooks.post(
  '/stripe',
  express.raw({ type: '*/*', limit: '1mb' }),
  asyncHandler(async (req, res) => {
    await paymentService.handleStripeWebhook(req.body as Buffer, req.header('stripe-signature'));
    res.json({ received: true });
  })
);

// PayTR bildirimi form verisidir ve düz metin "OK" yanıtı bekler
webhooks.post(
  '/paytr',
  express.urlencoded({ extended: false, limit: '100kb' }),
  asyncHandler(async (req, res) => {
    const valid = await paymentService.handlePaytrCallback(req.body);
    if (!valid) return res.status(400).type('text/plain').send('PAYTR notification failed: bad hash');
    return res.type('text/plain').send('OK');
  })
);

// iyzico kullanıcının tarayıcısını token ile buraya POST eder; sonuç sayfasına yönlendirilir
webhooks.post(
  '/iyzico',
  express.urlencoded({ extended: false, limit: '100kb' }),
  asyncHandler(async (req, res) => {
    const paymentId = await paymentService.handleIyzicoCallback(typeof req.body?.token === 'string' ? req.body.token : undefined).catch((err) => {
      logger.error('[iyzico] Callback işlenemedi', err);
      return null;
    });
    res.redirect(303, paymentId ? paymentReturnUrl(paymentId) : `${env.frontendUrl}/hesabim/cuzdan?odeme=hata`);
  })
);

webhooks.post(
  '/nowpayments',
  express.json({ limit: '100kb' }),
  asyncHandler(async (req, res) => {
    await paymentService.handleNowpaymentsIpn(req.body, req.header('x-nowpayments-sig'));
    res.json({ received: true });
  })
);

export const paymentWebhookRoutes = webhooks;
