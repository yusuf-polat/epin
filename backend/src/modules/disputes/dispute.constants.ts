import { DisputeStatus } from '@prisma/client';

/** Karar bekleyen (escrow'u donduran) itiraz durumları */
export const ACTIVE_DISPUTE_STATUSES: DisputeStatus[] = ['WAITING_SELLER', 'WAITING_SUPPORT'];

/** Satıcının itiraza yanıt verme süresi; aşılırsa itiraz hakeme aktarılır */
export const SELLER_RESPONSE_HOURS = 48;
