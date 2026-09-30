export const pinKeys = {
  all: ['pins'] as const,
  mine: (page: number) => [...pinKeys.all, 'mine', page] as const,
};
