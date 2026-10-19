// Rows for the forest plot in "Por qué importa": the 59 predictions ordered by the
// conservative end of their interval.
import type { ModelData } from '../data/types';
import { isPredict } from '../data/types';
import { predict } from './predict';

export interface ForestRow {
  id: string;
  prediction: number;
  lo: number;
  hi: number;
  attention: boolean;
}

/** Highest lower bound first; ties by id so the order is stable. */
export function forestRows(model: ModelData): ForestRow[] {
  return model.parcels
    .filter(isPredict)
    .map((p) => {
      const r = predict(model, p);
      return { id: p.id, prediction: r.prediction, lo: r.interval80[0], hi: r.interval80[1], attention: p.attentionFlag };
    })
    .sort((a, b) => b.lo - a.lo || a.id.localeCompare(b.id));
}
