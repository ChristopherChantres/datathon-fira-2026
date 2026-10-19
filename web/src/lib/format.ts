// Display helpers for visitor-facing text (es-MX).
const LOWERCASE_WORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y']);

/** "NANACAMILPA DE MARIANO ARISTA" → "Nanacamilpa de Mariano Arista" */
export function placeName(upper: string): string {
  return upper
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => (i > 0 && LOWERCASE_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

const tonnes = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Yields in t/ha, shown with the two decimals the training labels have. */
export function formatYield(tPerHa: number): string {
  return `${tonnes.format(tPerHa)} t/ha`;
}

/** "Hidalgo, Puebla y Tlaxcala" */
export function joinSpanish(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}
