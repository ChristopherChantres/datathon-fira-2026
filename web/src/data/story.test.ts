import { describe, expect, it } from 'vitest';
import { FEATURED_PARCEL_ID } from '../content/featured';
import { curves, model } from '../test/fixtures';
import { doyToIsoDate, median, medianMilestones, resolveFeaturedParcel, stateYieldStats } from './story';
import { isPredict, isTrain } from './types';

describe('stateYieldStats', () => {
  const stats = stateYieldStats(model);

  it('covers every train parcel exactly once, one group per state', () => {
    expect(stats.reduce((s, g) => s + g.n, 0)).toBe(model.parcels.filter(isTrain).length);
    expect(new Set(stats.map((g) => g.state)).size).toBe(stats.length);
    expect(new Set(stats.map((g) => g.state))).toEqual(new Set(model.municipalities.map((m) => m.state)));
  });

  it('computes each mean from the known yields and sorts high to low', () => {
    for (const g of stats) {
      const ys = model.parcels.filter(isTrain).filter((p) => p.state === g.state).map((p) => p.actualYield);
      expect(g.mean).toBeCloseTo(ys.reduce((a, b) => a + b, 0) / ys.length, 12);
      expect(g.parcels.every((p) => p.set === 'train')).toBe(true);
    }
    expect(stats.map((g) => g.mean)).toEqual([...stats.map((g) => g.mean)].sort((a, b) => b - a));
  });
});

describe('median helpers', () => {
  it('median handles odd and even lengths', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(() => median([])).toThrow();
  });

  it('doyToIsoDate maps day-of-year to a calendar date', () => {
    expect(doyToIsoDate(2025, 1)).toBe('2025-01-01');
    expect(doyToIsoDate(2025, 166)).toBe('2025-06-15');
  });

  it('medianMilestones agrees with every curve\'s own date convention', () => {
    // Each curve stores both a day-of-year and a date; they must use the same convention.
    for (const c of Object.values(curves.curves)) {
      const m = c.milestones;
      expect(doyToIsoDate(2025, m.sosDoy)).toBe(m.sosDate);
      expect(doyToIsoDate(2025, m.peakDoy)).toBe(m.peakDate);
      expect(doyToIsoDate(2025, m.eosDoy)).toBe(m.eosDate);
    }
    const med = medianMilestones(curves);
    const all = Object.values(curves.curves).map((c) => c.milestones);
    for (const key of ['sosDoy', 'peakDoy', 'eosDoy'] as const) {
      const below = all.filter((m) => m[key] < med[key]).length;
      const above = all.filter((m) => m[key] > med[key]).length;
      expect(below).toBeLessThanOrEqual(all.length / 2);
      expect(above).toBeLessThanOrEqual(all.length / 2);
    }
    expect(med.sosDoy).toBeLessThan(med.peakDoy);
    expect(med.peakDoy).toBeLessThan(med.eosDoy);
  });
});

describe('featured parcel', () => {
  it('FEATURED_PARCEL_ID is a predict parcel with a curve', () => {
    const p = resolveFeaturedParcel(model, FEATURED_PARCEL_ID, true);
    expect(p.id).toBe(FEATURED_PARCEL_ID);
    expect(p.set).toBe('predict');
    expect(curves.curves[p.id]).toBeDefined();
  });

  it('fails loudly in strict mode and falls back otherwise', () => {
    const train = model.parcels.find(isTrain)!;
    const firstPredict = model.parcels.find(isPredict)!;
    for (const bad of ['NOPE', train.id]) {
      expect(() => resolveFeaturedParcel(model, bad, true)).toThrow(/FEATURED_PARCEL_ID/);
      expect(resolveFeaturedParcel(model, bad, false).id).toBe(firstPredict.id);
    }
  });
});
