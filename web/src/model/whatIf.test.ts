import { describe, expect, it } from 'vitest';
import { isPredict } from '../data/types';
import { model } from '../test/fixtures';
import { areaFromPosition, areaRange, originalInputs, phenologyInputs, positionFromArea, simulate } from './whatIf';

const parcels = model.parcels.filter(isPredict);

describe('what-if for every predict parcel', () => {
  it.each(parcels.map((p) => [p.id, p] as const))('%s', (_id, parcel) => {
    const base = originalInputs(model, parcel);

    // Reset (the stored inputs) returns exactly the stored prediction.
    const reset = simulate(model, parcel, base);
    expect(reset.isOriginal).toBe(true);
    expect(reset.delta).toBe(0);
    expect(Math.abs(reset.simulated.prediction - parcel.prediction)).toBeLessThan(1e-9);

    // Each phenology input moves only model A.
    for (const input of phenologyInputs(model, parcel)) {
      const value = input.original === input.max ? input.min : input.max;
      const r = simulate(model, parcel, { ...base, phenology: { ...base.phenology, [input.name]: value } });
      expect(r.movedA).toBe(true);
      expect(r.movedB).toBe(false);
      expect(r.simulated.modelB).toBe(r.original.modelB);
      expect(r.simulated.prior).toBe(parcel.prior.combined);
    }

    // The area moves only model B.
    const range = areaRange(model);
    const area = parcel.areaHa === range.max ? range.min : range.max;
    const r = simulate(model, parcel, { ...base, areaHa: area });
    expect(r.movedB).toBe(true);
    expect(r.movedA).toBe(false);
    expect(r.simulated.modelA).toBe(r.original.modelA);
  });
});

describe('slider bounds', () => {
  it('phenology bounds are modelA.features min/max', () => {
    const inputs = phenologyInputs(model, parcels[0]!);
    expect(inputs.map((i) => [i.name, i.min, i.max])).toEqual(model.modelA.features.map((f) => [f.name, f.min, f.max]));
    expect(inputs.map((i) => i.label)).toEqual(model.modelA.features.map((f) => f.label.es));
  });

  it('every stored phenology value lies inside its bounds (features are exported to 10 decimals)', () => {
    for (const p of parcels) {
      for (const i of phenologyInputs(model, p)) {
        expect(i.original).toBeGreaterThanOrEqual(i.min - 1e-9);
        expect(i.original).toBeLessThanOrEqual(i.max + 1e-9);
      }
    }
  });

  it('area bounds are the observed min/max over all 197 parcels', () => {
    const areas = model.parcels.map((p) => p.areaHa);
    expect(areaRange(model)).toEqual({ min: Math.min(...areas), max: Math.max(...areas) });
  });

  it('the log-scale area mapping round-trips and hits both ends', () => {
    const range = areaRange(model);
    expect(areaFromPosition(0, range)).toBeCloseTo(range.min, 12);
    expect(areaFromPosition(1, range)).toBeCloseTo(range.max, 12);
    for (const p of parcels) expect(areaFromPosition(positionFromArea(p.areaHa, range), range)).toBeCloseTo(p.areaHa, 9);
  });
});
