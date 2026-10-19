// The 59 predictions as CSV, matching model/reference/predictions_59_intervals.csv
// (estimate to 3 decimals, interval bounds to 2) plus municipality and state.
import type { ModelData } from '../data/types';
import { isPredict } from '../data/types';
import { predict } from './predict';

export const CSV_HEADER = ['ID_POLIGONO', 'RENDIMIENTO_T_HA', 'inf_80', 'sup_80', 'municipio', 'estado'] as const;

/** Rounds like Python's round() for display (no trailing zeros: 4.540 → "4.54"). */
const fixed = (value: number, digits: number) => String(Number(value.toFixed(digits)));

const escape = (cell: string) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);

export function predictionRows(model: ModelData): string[][] {
  return model.parcels
    .filter(isPredict)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((parcel) => {
      const r = predict(model, parcel);
      return [parcel.id, fixed(r.prediction, 3), fixed(r.interval80[0], 2), fixed(r.interval80[1], 2), parcel.municipality, parcel.state];
    });
}

export function predictionsCsv(model: ModelData): string {
  return [[...CSV_HEADER], ...predictionRows(model)].map((row) => row.map(escape).join(',')).join('\n') + '\n';
}
