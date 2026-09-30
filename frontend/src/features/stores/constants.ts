export const storeKeys = {
  all: ['stores'] as const,
  mine: () => [...storeKeys.all, 'mine'] as const,
  admin: (params: { page: number; search?: string }) => [...storeKeys.all, 'admin', params] as const,
};

export const STORE_PRODUCTS_PAGE_SIZE = 12;
