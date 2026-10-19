import { describe, expect, it } from 'vitest';
import { isTrain } from '../data/types';
import { model } from '../test/fixtures';
import { intervalCoverage, ladder, observedVsEstimated, repeats, validationScheme } from './performance';

describe('performance helpers', () => {
  it('ladder goes from the naive mean to our model, worst first', () => {
    const rungs = ladder(model);
    expect(rungs.map((r) => r.key)).toEqual(['globalMean', 'municipalMean', 'model']);
    expect(rungs.map((r) => r.rmse)).toEqual([
      model.validation.baselines.globalMeanRmse,
      model.validation.baselines.municipalMeanRmse,
      model.validation.rmse,
    ]);
    expect(rungs[2]!.sd).toBe(model.validation.rmseSd);
  });

  it('reads the per-repeat metrics from the Spanish keys', () => {
    const r = repeats(model);
    expect(r).toHaveLength(model.validation.perRepeat.length);
    r.forEach((rep, i) => {
      const raw = model.validation.perRepeat[i]!;
      expect(rep).toEqual({ repeat: raw.repeticion, rmse: raw.RMSE, mae: raw.MAE, r2: raw.R2 });
      expect(Number.isFinite(rep.rmse) && Number.isFinite(rep.mae) && Number.isFinite(rep.r2)).toBe(true);
    });
    // The official RMSE is the mean of the per-repeat values (to the stored precision).
    const mean = r.reduce((s, x) => s + x.rmse, 0) / r.length;
    expect(Math.abs(mean - model.validation.rmse)).toBeLessThan(5e-4);
  });

  it('parses the validation scheme and agrees with the number of repeats', () => {
    const s = validationScheme(model);
    expect(s.folds).toBe(5);
    expect(s.repeats).toBe(model.validation.perRepeat.length);
    expect(s.stratifiedBy).toBe('municipality');
  });

  it('scatter uses only train parcels and their out-of-fold estimates', () => {
    const points = observedVsEstimated(model);
    const train = model.parcels.filter(isTrain);
    expect(points).toHaveLength(train.length);
    points.forEach((pt, i) => {
      expect(pt.actual).toBe(train[i]!.actualYield);
      expect(pt.estimate).toBe(train[i]!.oofPrediction);
    });
  });

  it('coverage per regime comes from intervals', () => {
    for (const c of intervalCoverage(model)) {
      expect(c.coverage).toBe(model.intervals.cvCoverage[c.regime]);
      expect(c.halfWidth).toBe(model.intervals.halfWidth[c.regime]);
      expect(c.municipalities.length).toBeGreaterThan(0);
    }
  });
});
