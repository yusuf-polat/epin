/** Yalnızca site içi yönlendirmelere izin verir (open redirect koruması) */
export function safeRedirect(value: string | null | undefined, fallback = '/hesabim'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}
