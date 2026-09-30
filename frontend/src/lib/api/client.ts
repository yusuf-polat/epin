import { ApiError } from './errors';
import { ApiEnvelope, Paginated, PaginationMeta, QueryParams } from './types';

/** Tarayıcıda public API adresi, sunucuda (SSR) Docker iç ağ adresi kullanılır */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
}

export interface RequestOptions {
  params?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
}

function buildUrl(path: string, params?: QueryParams) {
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  if (!params) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: PaginationMeta; message?: string }> {
  const hasBody = options.body !== undefined;
  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.params), {
      method,
      // Oturum HttpOnly cookie ile taşınır
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      cache: options.next ? undefined : options.cache ?? 'no-store',
      next: options.next,
    });
  } catch {
    throw new ApiError('Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol ediniz.', 0, 'NETWORK_ERROR');
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // JSON olmayan yanıt
  }

  if (!res.ok || !payload || payload.success === false) {
    const error = payload && payload.success === false ? payload.error : undefined;
    throw new ApiError(error?.message || 'İstek başarısız oldu', res.status, error?.code, error?.details);
  }
  return { data: payload.data, meta: payload.meta, message: payload.message };
}

/**
 * Backend ile konuşan tek HTTP soyutlaması. Feature servisleri
 * (features/x/services/x.api.ts) bu client'ı kullanır.
 */
export const apiClient = {
  async get<T>(path: string, options?: RequestOptions) {
    return (await request<T>('GET', path, options)).data;
  },
  async getPage<T>(path: string, options?: RequestOptions): Promise<Paginated<T>> {
    const { data, meta } = await request<T[]>('GET', path, options);
    return { items: data, meta: meta ?? { page: 1, limit: data.length, total: data.length, totalPages: 1 } };
  },
  async post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return (await request<T>('POST', path, { ...options, body })).data;
  },
  /** Başarı mesajına da ihtiyaç duyulan istekler için */
  postWithMessage<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>('POST', path, { ...options, body });
  },
  async put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return (await request<T>('PUT', path, { ...options, body })).data;
  },
  async patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return (await request<T>('PATCH', path, { ...options, body })).data;
  },
  async delete<T>(path: string, options?: RequestOptions) {
    return (await request<T>('DELETE', path, options)).data;
  },
};
