import cron, { ScheduledTask } from 'node-cron';
import { redis } from '@/config/redis';
import { logger } from '@/utils/logger';
import { orderService } from '@/modules/orders/order.service';
import { disputeService } from '@/modules/disputes/dispute.service';
import { paymentService } from '@/modules/payments/payment.service';

const tasks: ScheduledTask[] = [];

/**
 * Birden fazla backend instance'ı çalışırsa aynı işin paralel koşmaması için
 * Redis üzerinde kısa süreli kilit alınır. Redis yoksa (tek instance) iş doğrudan çalışır.
 */
async function withLock(name: string, ttlSeconds: number, fn: () => Promise<void>) {
  if (redis.status === 'ready') {
    const acquired = await redis.set(`lock:job:${name}`, process.pid.toString(), 'EX', ttlSeconds, 'NX').catch(() => null);
    if (!acquired) return;
  }
  await fn();
}

function schedule(name: string, expression: string, fn: () => Promise<void>) {
  const task = cron.schedule(expression, () => {
    withLock(name, 240, fn).catch((err) => logger.error(`[Job:${name}] failed`, err));
  });
  tasks.push(task);
}

export function startScheduledJobs() {
  // Alıcı onay süresi dolan siparişlerin ödemesini satıcıya aktarır
  schedule('escrow-auto-release', '*/5 * * * *', async () => {
    const released = await orderService.autoReleaseDue();
    if (released > 0) logger.info(`[Job] ${released} escrow released to sellers`);
  });

  // Teslim süresi içinde teslim edilmeyen manuel siparişleri iade eder
  schedule('overdue-delivery-refund', '*/10 * * * *', async () => {
    const refunded = await orderService.refundOverdueDeliveries();
    if (refunded > 0) logger.info(`[Job] ${refunded} overdue manual orders refunded`);
  });

  // Satıcının yanıt vermediği itirazları destek ekibine aktarır
  schedule('dispute-escalation', '*/15 * * * *', async () => {
    const escalated = await disputeService.escalateUnanswered();
    if (escalated > 0) logger.info(`[Job] ${escalated} disputes escalated to support`);
  });

  // Tamamlanmayan online ödemeleri zaman aşımına düşürür (geç gelen başarılı bildirim yine işlenir)
  schedule('payment-expiry', '*/15 * * * *', async () => {
    const expired = await paymentService.expireStale();
    if (expired > 0) logger.info(`[Job] ${expired} pending payments expired`);
  });

  logger.info('Scheduled jobs started (escrow release, overdue refunds, dispute escalation, payment expiry)');
}

export function stopScheduledJobs() {
  for (const task of tasks) task.stop();
}
