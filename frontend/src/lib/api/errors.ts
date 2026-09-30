export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code = 'UNKNOWN_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const isApiError = (err: unknown): err is ApiError => err instanceof ApiError;

/** Hata nesnesinden kullanıcıya gösterilebilir mesaj çıkarır */
export function getErrorMessage(err: unknown, fallback = 'Beklenmeyen bir hata oluştu'): string {
  if (err instanceof ApiError || err instanceof Error) return err.message || fallback;
  return fallback;
}
