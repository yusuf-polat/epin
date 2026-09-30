export const BCRYPT_ROUNDS = 10;
export const GOOGLE_REQUEST_TIMEOUT_MS = 8000;

/** Şifre sıfırlama token'ı (32 bayt → 64 hex karakter) */
export const RESET_TOKEN_BYTES = 32;

/** E-posta doğrulama token'ı */
export const VERIFY_TOKEN_BYTES = 32;

// İki adımlı doğrulama
export const TWO_FACTOR_ISSUER = 'NexusPin';
export const TWO_FACTOR_SETUP_TTL = '10m';
export const TWO_FACTOR_LOGIN_TTL = '5m';
export const RECOVERY_CODE_COUNT = 10;
/** Karışabilecek 0/O, 1/I harfleri içermez */
export const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
