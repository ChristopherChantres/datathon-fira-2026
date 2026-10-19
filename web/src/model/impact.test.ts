import { describe, expect, it } from 'vitest';
import { isPredict } from '../data/types';
import { model } from '../test/fixtures';
import { forestRows } from './impact';

describe('forestRows', () => {
  const rows = forestRows(model);
  const predictParcels = model.parcels.filter(isPredict);

  it('has every predict parcel once', () => {
    expect(rows.map((r) => r.id).sort()).toEqual(predictParcels.map((p) => p.id).sort());
  });

  it('is ordered by the interval lower bound, highest first', () => {
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.lo).toBeGreaterThanOrEqual(rows[i]!.lo);
  });

  it('uses the stored predictions, intervals and attention flags', () => {
    for (const r of rows) {
      const p = predictParcels.find((x) => x.id === r.id)!;
      expect(Math.abs(r.prediction - p.prediction)).toBeLessThan(1e-9);
      expect(Number(r.lo.toFixed(4))).toBeCloseTo(p.interval80[0], 9);
      expect(Number(r.hi.toFixed(4))).toBeCloseTo(p.interval80[1], 9);
      expect(r.attention).toBe(p.attentionFlag);
      expect(r.lo).toBeLessThan(r.prediction);
      expect(r.hi).toBeGreaterThan(r.prediction);
    }
  });
});
