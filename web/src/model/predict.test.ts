// Proves the browser model equals the Python model, using the original files in /data.
import { describe, expect, it } from 'vitest';
import type { PredictParcel } from '../data/types';
import { isPredict, isTrain } from '../data/types';
import { curves, model, polygons } from '../test/fixtures';
import { featureRange, predict, withArea, withFeature, type Contribution } from './predict';

const predictParcels = model.parcels.filter(isPredict);
const trainParcels = model.parcels.filter(isTrain);
const TOL = 1e-9;

const total = (cs: Contribution[]) => cs.reduce((s, c) => s + c.contribution, 0);
// export_web_data.py stores interval80 rounded to 4 decimals (Python round(x, 4)).
const round4 = (x: number) => Number(x.toFixed(4));

function firstPredict(): PredictParcel {
  const parcel = predictParcels[0];
  if (!parcel) throw new Error('no predict parcels');
  return parcel;
}

describe('dataset', () => {
  it('has exactly 138 train and 59 predict parcels, matching meta', () => {
    expect(trainParcels).toHaveLength(138);
    expect(predictParcels).toHaveLength(59);
    expect(trainParcels.length).toBe(model.meta.nTrain);
    expect(predictParcels.length).toBe(model.meta.nPredict);
  });

  it('never gives a predict parcel a known yield', () => {
    for (const p of predictParcels) {
      expect(p).not.toHaveProperty('actualYield');
      expect(p).not.toHaveProperty('oofPrediction');
    }
  });

  it('has a curve and a polygon for every parcel id, with matching set', () => {
    const polygonSet = new Map(polygons.features.map((f) => [f.properties.id, f.properties.set]));
    expect(polygonSet.size).toBe(model.parcels.length);
    for (const p of model.parcels) {
      expect(curves.curves[p.id], `curve for ${p.id}`).toBeDefined();
      expect(polygonSet.get(p.id), `polygon for ${p.id}`).toBe(p.set);
    }
  });
});

describe('predict() reproduces Python for all predict parcels', () => {
  it.each(predictParcels.map((p) => [p.id, p] as const))('%s', (_id, parcel) => {
    const r = predict(model, parcel);
    expect(Math.abs(r.prediction - parcel.prediction)).toBeLessThan(TOL);
    expect(Math.abs(r.modelA - parcel.modelA)).toBeLessThan(TOL);
    expect(Math.abs(r.modelB - parcel.modelB)).toBeLessThan(TOL);
    // The stored interval is rounded to 4 decimals; the exact one must round to it.
    expect(Math.abs(round4(r.interval80[0]) - parcel.interval80[0])).toBeLessThan(TOL);
    expect(Math.abs(round4(r.interval80[1]) - parcel.interval80[1])).toBeLessThan(TOL);
    expect(r.prior).toBe(parcel.prior.combined);
  });
});

describe('breakdown', () => {
  it('contributions add up to the model outputs', () => {
    for (const parcel of predictParcels) {
      const r = predict(model, parcel);
      expect(r.contributionsA).toHaveLength(model.modelA.features.length);
      expect(r.contributionsB).toHaveLength(model.modelB.features.length);
      expect(Math.abs(model.modelA.intercept + r.priorTermA + total(r.contributionsA) - r.correctionA)).toBeLessThan(TOL);
      expect(Math.abs(r.prior + r.correctionA - r.modelA)).toBeLessThan(TOL);
      expect(Math.abs(model.modelB.intercept + total(r.contributionsB) - r.modelB)).toBeLessThan(TOL);
      expect(Math.abs(model.ensemble.weightA * r.modelA + model.ensemble.weightB * r.modelB - r.unclipped)).toBeLessThan(TOL);
    }
  });

  it('none of the stored predictions is clipped', () => {
    for (const parcel of predictParcels) {
      const r = predict(model, parcel);
      expect(r.clipped).toBe(false);
      expect(r.prediction).toBe(r.unclipped);
    }
  });
});

describe('clipping', () => {
  // Push model B's strongest input far out so the ensemble leaves the clip range.
  const strongest = [...model.modelB.features].sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef))[0]!;
  const extreme = (direction: 1 | -1) => ({
    [strongest.name]: strongest.mean + direction * Math.sign(strongest.coef) * 1e4 * strongest.scale,
  });
  const [lo, hi] = model.ensemble.clip;

  it('clips at the upper end', () => {
    const parcel = firstPredict();
    const r = predict(model, parcel, extreme(1));
    expect(r.unclipped).toBeGreaterThan(hi);
    expect(r.prediction).toBe(hi);
    expect(r.clipped).toBe(true);
    const half = model.intervals.halfWidth[parcel.regime];
    expect(r.interval80[0]).toBeCloseTo(hi - half, 12);
    expect(r.interval80[1]).toBeCloseTo(hi + half, 12);
  });

  it('clips at the lower end', () => {
    const r = predict(model, firstPredict(), extreme(-1));
    expect(r.unclipped).toBeLessThan(lo);
    expect(r.prediction).toBe(lo);
    expect(r.clipped).toBe(true);
  });

  it('does not let overrides change the prior', () => {
    const parcel = firstPredict();
    expect(predict(model, parcel, extreme(1)).prior).toBe(parcel.prior.combined);
  });
});

describe('withArea / withFeature / featureRange', () => {
  it('withArea sets the area and derives its log, leaving the original untouched', () => {
    const parcel = firstPredict();
    const before = { ...parcel.features };
    const changed = withArea(parcel, 42);
    expect(changed.features.ubi_area_ha).toBe(42);
    expect(changed.features.ubi_log_area).toBe(Math.log(42));
    expect(changed.areaHa).toBe(42);
    expect(parcel.features).toEqual(before);
    for (const name of Object.keys(before)) {
      if (name !== 'ubi_area_ha' && name !== 'ubi_log_area') expect(changed.features[name]).toBe(before[name]);
    }
  });

  it('stored features already satisfy ubi_log_area = ln(ubi_area_ha)', () => {
    for (const p of predictParcels) {
      expect(Math.abs(Math.log(p.features.ubi_area_ha!) - p.features.ubi_log_area!)).toBeLessThan(TOL);
    }
  });

  it('withArea at the stored area reproduces the stored prediction', () => {
    for (const p of predictParcels) {
      expect(Math.abs(predict(model, withArea(p, p.areaHa)).prediction - p.prediction)).toBeLessThan(TOL);
    }
  });

  it('withArea changes only model B', () => {
    const parcel = firstPredict();
    const base = predict(model, parcel);
    const changed = predict(model, withArea(parcel, parcel.areaHa * 2));
    expect(changed.modelA).toBe(base.modelA);
    expect(changed.modelB).not.toBe(base.modelB);
  });

  it('rejects non-positive or non-finite areas', () => {
    const parcel = firstPredict();
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => withArea(parcel, bad)).toThrow(RangeError);
    }
  });

  it('withFeature changes one input, routes area through withArea and rejects the derived log', () => {
    const parcel = firstPredict();
    const name = model.modelA.features[0]!.name;
    expect(withFeature(parcel, name, 1.23).features[name]).toBe(1.23);
    expect(withFeature(parcel, 'ubi_area_ha', 10).features.ubi_log_area).toBe(Math.log(10));
    expect(() => withFeature(parcel, 'ubi_log_area', 1)).toThrow();
    expect(() => withFeature(parcel, 'not_a_feature', 1)).toThrow();
    expect(() => withFeature(parcel, 'ubi_area_ha', 0)).toThrow(RangeError);
  });

  it('featureRange returns the model A min/max', () => {
    for (const f of model.modelA.features) {
      expect(featureRange(model, f.name)).toEqual({ min: f.min, max: f.max });
    }
    expect(() => featureRange(model, 'ubi_lon')).toThrow();
  });
});
