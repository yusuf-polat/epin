type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isProduction = process.env.NODE_ENV === 'production';
// Parola, token, cookie ve dijital kodlar loglara yazılmaz
const SENSITIVE_KEYS = /password|token|secret|authorization|cookie|^code$|codes|replacementCode/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: isProduction ? undefined : value.stack };
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.test(k) ? '[REDACTED]' : redact(v, depth + 1),
    ])
  );
}

function write(level: LogLevel, message: string, meta?: unknown) {
  if (level === 'debug' && isProduction) return;
  const timestamp = new Date().toISOString();
  const safeMeta = meta === undefined ? undefined : redact(meta);
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (isProduction) {
    out(JSON.stringify({ level, timestamp, message, ...(safeMeta !== undefined ? { meta: safeMeta } : {}) }));
  } else {
    out(`[${level.toUpperCase()}] ${timestamp} - ${message}`, ...(safeMeta !== undefined ? [safeMeta] : []));
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta),
};
