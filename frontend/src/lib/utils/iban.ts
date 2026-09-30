/** Backend ile aynı TR IBAN kuralları (kullanıcı deneyimi için; backend yeniden doğrular) */
export const normalizeIban = (value: string) => value.replace(/\s+/g, '').toUpperCase();

export function isValidTrIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^TR\d{24}$/.test(iban)) return false;
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of digits) remainder = (remainder * 10 + Number(ch)) % 97;
  return remainder === 1;
}

/** Yazarken 4'lü gruplar halinde gösterir */
export const formatIbanInput = (value: string) =>
  normalizeIban(value)
    .slice(0, 26)
    .replace(/(.{4})/g, '$1 ')
    .trim();
