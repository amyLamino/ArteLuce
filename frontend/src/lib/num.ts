export function toNumberSafe(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim().replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}
