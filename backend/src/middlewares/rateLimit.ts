import rateLimit from 'express-rate-limit';

const limitMessage = (message: string) => ({
  success: false,
  error: { code: 'RATE_LIMITED', message },
});

// Genel API limiti
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyiniz.'),
});

// Giriş / kayıt (brute force ve credential stuffing koruması)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: limitMessage('Çok fazla giriş veya kayıt denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyiniz.'),
});

// Checkout, bakiye, upload gibi hassas işlemler
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('İşlem sınırı aşıldı. Lütfen bir süre bekleyip tekrar deneyiniz.'),
});

// Ödeme sağlayıcı bildirimleri (sağlayıcılar yeniden deneme yapar; yalnızca kötüye kullanımı sınırlar)
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Çok fazla bildirim alındı.'),
});
