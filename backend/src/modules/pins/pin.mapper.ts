/** Kodun yalnızca başını ve sonunu gösterir; tam kod sadece reveal endpoint'inden alınır */
export function maskCode(code: string): string {
  if (code.length <= 6) return '•'.repeat(code.length);
  const visible = Math.min(4, Math.floor(code.length / 4));
  return `${code.slice(0, visible)}${'•'.repeat(Math.max(4, code.length - visible * 2))}${code.slice(-visible)}`;
}
