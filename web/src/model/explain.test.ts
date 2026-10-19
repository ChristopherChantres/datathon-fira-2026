import { describe, expect, it } from 'vitest';
import { isPredict } from '../data/types';
import { model } from '../test/fixtures';
import { explain, waterfallB, type WaterfallStep } from './explain';
import { predict } from './predict';

const TOL = 1e-9;
const predictParcels = model.parcels.filter(isPredict);

/** Start level plus every delta must land on the total, and each delta must chain. */
function expectChained(steps: WaterfallStep[], total: number) {
  const [first, ...rest] = steps;
  const last = steps[steps.length - 1]!;
  expect(first!.kind).toBe('start');
  expect(last.kind).toBe('total');
  let level = first!.value;
  for (const step of rest.slice(0, -1)) {
    expect(step.kind).toBe('delta');
    expect(Math.abs(step.from - level)).toBeLessThan(TOL);
    level += step.value;
    expect(Math.abs(step.to - level)).toBeLessThan(TOL);
  }
  expect(Math.abs(level - total)).toBeLessThan(TOL);
  expect(last.value).toBe(total);
}

describe('explain() for every predict parcel', () => {
  it.each(predictParcels.map((p) => [p.id, p] as const))('%s', (_id, parcel) => {
    const e = explain(model, parcel);
    const r = predict(model, parcel);

    expectChained(e.waterfallA, r.modelA);
    expectChained(e.waterfallB, r.modelB);
    expect(Math.abs(e.waterfallA[e.waterfallA.length - 1]!.value - parcel.modelA)).toBeLessThan(TOL);
    expect(Math.abs(e.waterfallB[e.waterfallB.length - 1]!.value - parcel.modelB)).toBeLessThan(TOL);

    // Model A starts at the stored prior and has one step per phenology input.
    expect(e.waterfallA[0]!.value).toBe(parcel.prior.combined);
    expect(e.waterfallA).toHaveLength(model.modelA.features.length + 3);

    // Final ensemble step equals the prediction.
    const ens = e.ensemble;
    const [lo, hi] = ens.clip;
    expect(Math.abs(Math.min(hi, Math.max(lo, ens.weightedA + ens.weightedB)) - ens.prediction)).toBeLessThan(TOL);
    expect(Math.abs(ens.prediction - parcel.prediction)).toBeLessThan(TOL);
    expect(ens.interval[0]).toBeCloseTo(ens.prediction - ens.halfWidth, 12);
    expect(ens.interval[1]).toBeCloseTo(ens.prediction + ens.halfWidth, 12);

    // Prior pieces combine into the stored prior.
    const pr = e.prior;
    expect(pr.municipalWeight * pr.municipalMean + pr.knnWeight * pr.neighborMean).toBeCloseTo(pr.combined, 9);
  });
});

describe('waterfallB grouping', () => {
  it('top 5 plus "others" equals the sum of all 16 contributions', () => {
    for (const parcel of predictParcels) {
      const r = predict(model, parcel);
      const steps = waterfallB(model, r, 5);
      const deltas = steps.filter((s) => s.kind === 'delta');
      expect(deltas).toHaveLength(6);
      expect(deltas.at(-1)!.key).toBe('others');
      const grouped = deltas.reduce((s, d) => s + d.value, 0);
      const full = r.contributionsB.reduce((s, c) => s + c.contribution, 0);
      expect(Math.abs(grouped - full)).toBeLessThan(TOL);
      expect(deltas.flatMap((d) => d.features).sort()).toEqual(model.modelB.features.map((f) => f.name).sort());
      // The top 5 are ordered by |contribution| and dominate the rest.
      const top = deltas.slice(0, 5).map((d) => Math.abs(d.value));
      expect([...top].sort((a, b) => b - a)).toEqual(top);
      const restMax = Math.max(...r.contributionsB.filter((c) => !deltas.slice(0, 5).some((d) => d.key === c.name)).map((c) => Math.abs(c.contribution)));
      expect(Math.min(...top)).toBeGreaterThanOrEqual(restMax);
    }
  });

  it('omits "others" when every contribution is shown', () => {
    const r = predict(model, predictParcels[0]!);
    const steps = waterfallB(model, r, r.contributionsB.length);
    expect(steps.some((s) => s.key === 'others')).toBe(false);
    expectChained(steps, r.modelB);
  });
});
