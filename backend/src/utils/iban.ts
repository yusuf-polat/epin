/** Boşlukları kaldırıp büyük harfe çevirir */
export const normalizeIban = (value: string) => value.replace(/\s+/g, '').toUpperCase();

/** TR IBAN: "TR" + 2 kontrol hanesi + 22 hane, ISO 13616 mod-97 doğrulaması */
export function isValidTrIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^TR\d{24}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  // Büyük sayıyı parça parça mod alarak hesapla
  let remainder = 0;
  for (const ch of digits) remainder = (remainder * 10 + Number(ch)) % 97;
  return remainder === 1;
}

/** IBAN'ı 4'lü gruplar halinde gösterir; maskelenirse yalnızca son 4 hane görünür */
export function formatIban(value: string, mask = false): string {
  const iban = normalizeIban(value);
  const shown = mask ? `${iban.slice(0, 4)}${'•'.repeat(iban.length - 8)}${iban.slice(-4)}` : iban;
  return shown.replace(/(.{4})/g, '$1 ').trim();
}
