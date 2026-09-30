import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma';

export const settingsRepository = {
  async get<T>(key: string): Promise<T | null> {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    return row ? (row.value as T) : null;
  },

  set(key: string, value: unknown, updatedById: string) {
    const json = value as Prisma.InputJsonValue;
    return prisma.systemSetting.upsert({ where: { key }, create: { key, value: json, updatedById }, update: { value: json, updatedById } });
  },
};
