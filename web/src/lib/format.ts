// Display helpers for visitor-facing text (es-MX).
const LOWERCASE_WORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y']);

/** "NANACAMILPA DE MARIANO ARISTA" → "Nanacamilpa de Mariano Arista" */
export function placeName(upper: string): string {
  return upper
    .toLowerCase()
    .split(/[\s_]+/)
    .map((word, i) => (i > 0 && LOWERCASE_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

const fixed = (digits: number) =>
  new Intl.NumberFormat('es-MX', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const two = fixed(2);
const three = fixed(3);

/** Yields in t/ha, shown with the two decimals the training labels have. */
export function formatYield(tPerHa: number): string {
  return `${two.format(tPerHa)} t/ha`;
}

/** A yield without the unit, e.g. for axis ticks and formulas. */
export function formatNumber(value: number, digits = 2): string {
  return fixed(digits).format(value);
}

/** Signed small changes in t/ha, e.g. "+0.015" / "−0.007" (true minus sign). */
export function formatDelta(value: number): string {
  const text = three.format(Math.abs(value));
  return `${value < 0 ? '−' : '+'}${text}`;
}

export function formatNdvi(value: number): string {
  return two.format(value);
}

/** 0.1818 → "18 %" (non-breaking space, so the sign never wraps alone) */
export function formatPercent(share: number): string {
  return `${Math.round(share * 100)}\u00a0%`;
}

/** Distances below 1 km in meters (nearest 10 m), otherwise km with one decimal. */
export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${fixed(1).format(km)} km`;
}

/**
 * A round distance that is never below `km`, for "todas a menos de X": below 1 km it
 * rounds up to the next 100 m, otherwise up to the next whole kilometer.
 */
export function distanceUpperBound(km: number): { km: number; text: string } {
  if (km < 1) {
    const meters = Math.ceil((km * 1000) / 100) * 100;
    return meters >= 1000 ? { km: 1, text: '1 km' } : { km: meters / 1000, text: `${meters} m` };
  }
  const whole = Math.ceil(km);
  return { km: whole, text: `${whole} km` };
}

/** Rounds like the displayed text, so arithmetic on shown numbers matches what is read. */
export const roundTo = (value: number, digits: number) => Number(value.toFixed(digits));

const longDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const shortMonth = new Intl.DateTimeFormat('es-MX', { month: 'short', timeZone: 'UTC' });

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "2025-06-15" → "15 de junio" */
export function formatDate(iso: string): string {
  return longDate.format(toDate(iso));
}

/** "2025-06-15" → "15 jun" */
export function formatShortDate(iso: string): string {
  return `${toDate(iso).getUTCDate()} ${formatMonth(iso)}`;
}

/** "2025-06-15" → "jun" (no trailing period) */
export function formatMonth(iso: string): string {
  return shortMonth.format(toDate(iso)).replace('.', '');
}

/** "Hidalgo, Puebla y Tlaxcala" */
export function joinSpanish(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}
