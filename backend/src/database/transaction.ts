import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma';

/** Transaction içinde repository'lere iletilen istemci */
export type Tx = Prisma.TransactionClient;

export interface TransactionOptions {
  timeout?: number;
  maxWait?: number;
}

/**
 * Service katmanının Prisma'ya doğrudan bağımlı olmadan birden fazla repository
 * işlemini atomik çalıştırmasını sağlar. Callback'e verilen `tx` yalnızca
 * repository fonksiyonlarına iletilir.
 */
export function withTransaction<T>(fn: (tx: Tx) => Promise<T>, options?: TransactionOptions): Promise<T> {
  return prisma.$transaction(fn, options);
}
