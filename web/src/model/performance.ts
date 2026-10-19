// Figures for "¿Qué tan bien funciona?", read from model.json → validation / intervals.
import type { LabelRegime, ModelData } from '../data/types';
import { isTrain } from '../data/types';

export type LadderKey = 'globalMean' | 'municipalMean' | 'model';

export interface LadderRung {
  key: LadderKey;
  rmse: number;
  /** Spread across the 10 repeats (model only). */
  sd?: number;
}

/** From the naive reference to our model, worst first. */
export function ladder(model: ModelData): LadderRung[] {
  const v = model.validation;
  const rungs: LadderRung[] = [
    { key: 'globalMean', rmse: v.baselines.globalMeanRmse },
    { key: 'municipalMean', rmse: v.baselines.municipalMeanRmse },
    { key: 'model', rmse: v.rmse, sd: v.rmseSd },
  ];
  return rungs.sort((a, b) => b.rmse - a.rmse);
}

export interface Repeat {
  repeat: number;
  rmse: number;
  mae: number;
  r2: number;
}

/** The per-repeat metrics; the export uses Spanish keys (repeticion, RMSE, MAE, R2). */
export function repeats(model: ModelData): Repeat[] {
  return model.validation.perRepeat.map((r) => ({ repeat: r.repeticion, rmse: r.RMSE, mae: r.MAE, r2: r.R2 }));
}

export interface ValidationScheme {
  folds: number;
  repeats: number;
  stratifiedBy: string | null;
}

/** Parses e.g. "5-fold x 10 repeats, stratified by municipality, …". */
export function validationScheme(model: ModelData): ValidationScheme {
  const scheme = model.validation.scheme ?? '';
  const counts = /(\d+)\s*-?\s*fold\s*x\s*(\d+)\s*repeat/i.exec(scheme);
  const strat = /stratified by ([a-z ]+?)(?:,|$)/i.exec(scheme);
  return {
    folds: counts ? Number(counts[1]) : NaN,
    repeats: counts ? Number(counts[2]) : model.validation.perRepeat.length,
    stratifiedBy: strat ? strat[1]!.trim() : null,
  };
}

export interface ScatterPoint {
  id: string;
  municipality: string;
  state: string;
  regime: LabelRegime;
  actual: number;
  /** Average of the parcel's 10 out-of-fold predictions. */
  estimate: number;
}

export function observedVsEstimated(model: ModelData): ScatterPoint[] {
  return model.parcels.filter(isTrain).map((p) => ({
    id: p.id,
    municipality: p.municipality,
    state: p.state,
    regime: p.regime,
    actual: p.actualYield,
    estimate: p.oofPrediction,
  }));
}

export interface Coverage {
  regime: LabelRegime;
  coverage: number;
  halfWidth: number;
  municipalities: string[];
}

export function intervalCoverage(model: ModelData): Coverage[] {
  return (['measured', 'rounded'] as const).map((regime) => ({
    regime,
    coverage: model.intervals.cvCoverage[regime],
    halfWidth: model.intervals.halfWidth[regime],
    municipalities: model.municipalities.filter((m) => m.regime === regime).map((m) => m.name),
  }));
}
