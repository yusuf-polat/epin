import { PrismaClient, Prisma } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Development ortamında hot-reload sırasında birden fazla client oluşmasını engeller
export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

/** Repository fonksiyonları hem ana client'ı hem transaction client'ı kabul eder */
export type DbClient = PrismaClient | Prisma.TransactionClient;
