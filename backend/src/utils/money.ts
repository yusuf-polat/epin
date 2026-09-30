import { Prisma } from '@prisma/client';

type Numeric = Prisma.Decimal | number | string | null | undefined;

/** Prisma Decimal alanlarını JSON için number'a çevirir */
export const toNumber = (value: Numeric): number => (value === null || value === undefined ? 0 : Number(value));

export const toNullableNumber = (value: Numeric): number | null =>
  value === null || value === undefined ? null : Number(value);

/** Kuruş hassasiyetine yuvarlar (float toplama hatalarını önler) */
export const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const formatTRY = (value: number): string => `₺${value.toFixed(2)}`;
