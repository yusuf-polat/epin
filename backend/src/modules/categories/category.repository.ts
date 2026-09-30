import { prisma } from '@/config/prisma';
import { CreateCategoryDTO, UpdateCategoryDTO } from './category.types';

export const categoryRepository = {
  findAll() {
    return prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: { where: { approvalStatus: 'APPROVED' } } } } },
    });
  },

  findBySlug(slug: string) {
    return prisma.category.findUnique({
      where: { slug },
      include: { _count: { select: { products: { where: { approvalStatus: 'APPROVED' } } } } },
    });
  },

  findById(id: string) {
    return prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  },

  create(data: CreateCategoryDTO) {
    return prisma.category.create({ data });
  },

  update(id: string, data: UpdateCategoryDTO) {
    return prisma.category.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.category.delete({ where: { id } });
  },
};
