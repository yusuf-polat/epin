export const userKeys = {
  all: ['users'] as const,
  admin: (params: { page: number; search?: string }) => ['users', 'admin', params] as const,
};

export const ADMIN_USERS_PAGE_SIZE = 30;
