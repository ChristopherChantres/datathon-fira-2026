import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isPredict } from '../data/types';
import { model } from '../test/fixtures';
import { CSV_HEADER, predictionRows, predictionsCsv } from './csv';

// model/ is not in the Docker build context, so this comparison only runs locally.
const referencePath = fileURLToPath(new URL('../../../model/reference/predictions_59_intervals.csv', import.meta.url));

describe('predictions CSV', () => {
  it('has the documented header and one row per predict parcel', () => {
    const lines = predictionsCsv(model).trim().split('\n');
    expect(lines[0]).toBe(CSV_HEADER.join(','));
    expect(lines).toHaveLength(model.parcels.filter(isPredict).length + 1);
  });

  it.skipIf(!existsSync(referencePath))('equals model/reference/predictions_59_intervals.csv', () => {
    const [header, ...lines] = readFileSync(referencePath, 'utf8').trim().split(/\r?\n/);
    expect(header).toBe('ID_POLIGONO,RENDIMIENTO_T_HA,inf_80,sup_80');
    const reference = new Map(lines.map((l) => {
      const [id, y, lo, hi] = l.split(',');
      return [id!, [Number(y), Number(lo), Number(hi)]] as const;
    }));
    const rows = predictionRows(model);
    expect(rows.map((r) => r[0]).sort()).toEqual([...reference.keys()].sort());
    for (const [id, y, lo, hi] of rows) {
      expect([Number(y), Number(lo), Number(hi)], id).toEqual(reference.get(id!));
    }
  });
});
