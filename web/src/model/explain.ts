// Step-by-step decomposition of predict() for the narrative (waterfalls, prior, ensemble).
// Pure functions: every value is taken from predict() or the parcel's stored prior.
import type { ModelData, Neighbor, PredictParcel } from '../data/types';
import { predict, type Contribution, type PredictionBreakdown } from './predict';

export type WaterfallKind = 'start' | 'delta' | 'total';

export interface WaterfallStep {
  /** Stable key: a feature name, or 'prior' | 'base' | 'intercept' | 'others' | 'total'. */
  key: string;
  kind: WaterfallKind;
  /** Level before this step (equals `end` for start/total markers). */
  from: number;
  /** Level after this step. */
  to: number;
  /** to − from for deltas; the level itself for start/total. */
  value: number;
  /** Feature names folded into this step ('others' groups several). */
  features: string[];
}

function cumulate(start: { key: string; value: number }, deltas: { key: string; value: number; features: string[] }[], total: number): WaterfallStep[] {
  const steps: WaterfallStep[] = [{ key: start.key, kind: 'start', from: start.value, to: start.value, value: start.value, features: [] }];
  let level = start.value;
  for (const d of deltas) {
    steps.push({ key: d.key, kind: 'delta', from: level, to: level + d.value, value: d.value, features: d.features });
    level += d.value;
  }
  steps.push({ key: 'total', kind: 'total', from: total, to: total, value: total, features: [] });
  return steps;
}

/**
 * Model A: prior → (intercept + priorCoef·prior) → one step per phenology input → A.
 */
export function waterfallA(model: ModelData, r: PredictionBreakdown): WaterfallStep[] {
  return cumulate(
    { key: 'prior', value: r.prior },
    [
      { key: 'base', value: model.modelA.intercept + r.priorTermA, features: [] },
      ...r.contributionsA.map((c) => ({ key: c.name, value: c.contribution, features: [c.name] })),
    ],
    r.modelA,
  );
}

/**
 * Model B: intercept → the `top` largest contributions by |value| → the rest grouped → B.
 */
export function waterfallB(model: ModelData, r: PredictionBreakdown, top = 5): WaterfallStep[] {
  const ranked = [...r.contributionsB].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const head = ranked.slice(0, top);
  const rest = ranked.slice(top);
  const deltas = head.map((c) => ({ key: c.name, value: c.contribution, features: [c.name] }));
  if (rest.length > 0) {
    deltas.push({ key: 'others', value: sumContributions(rest), features: rest.map((c) => c.name) });
  }
  return cumulate({ key: 'intercept', value: model.modelB.intercept }, deltas, r.modelB);
}

function sumContributions(cs: Contribution[]): number {
  return cs.reduce((s, c) => s + c.contribution, 0);
}

export interface PriorExplanation {
  municipalMean: number;
  /** Plain mean of the municipality's known yields, before shrinking toward the global mean. */
  rawMunicipalMean: number | null;
  municipalN: number;
  globalMean: number;
  smoothing: number;
  neighborMean: number;
  municipalWeight: number;
  knnWeight: number;
  combined: number;
  neighbors: Neighbor[];
  nearest: Neighbor;
}

export function explainPrior(model: ModelData, parcel: PredictParcel): PriorExplanation {
  const { prior } = parcel;
  const nearest = [...prior.neighbors].sort((a, b) => a.distanceKm - b.distanceKm)[0];
  if (!nearest) throw new Error(`Parcel ${parcel.id} has no neighbors`);
  const known = model.parcels.filter((p) => p.set === 'train' && p.municipality === parcel.municipality);
  const rawMunicipalMean =
    known.length > 0 ? known.reduce((s, p) => s + (p.set === 'train' ? p.actualYield : 0), 0) / known.length : null;
  return {
    municipalMean: prior.municipalMean,
    rawMunicipalMean,
    municipalN: prior.municipalN,
    globalMean: model.modelA.globalMean,
    smoothing: model.modelA.smoothing,
    neighborMean: prior.neighborMean,
    municipalWeight: model.modelA.municipalWeight,
    knnWeight: model.modelA.knnWeight,
    combined: prior.combined,
    neighbors: prior.neighbors,
    nearest,
  };
}

export interface EnsembleExplanation {
  modelA: number;
  modelB: number;
  weightA: number;
  weightB: number;
  weightedA: number;
  weightedB: number;
  unclipped: number;
  clip: [number, number];
  clipped: boolean;
  prediction: number;
  level: number;
  halfWidth: number;
  interval: [number, number];
}

export function explainEnsemble(model: ModelData, parcel: PredictParcel, r: PredictionBreakdown): EnsembleExplanation {
  const { weightA, weightB, clip } = model.ensemble;
  return {
    modelA: r.modelA,
    modelB: r.modelB,
    weightA,
    weightB,
    weightedA: weightA * r.modelA,
    weightedB: weightB * r.modelB,
    unclipped: r.unclipped,
    clip,
    clipped: r.clipped,
    prediction: r.prediction,
    level: model.intervals.level,
    halfWidth: model.intervals.halfWidth[parcel.regime],
    interval: r.interval80,
  };
}

export interface Explanation {
  breakdown: PredictionBreakdown;
  prior: PriorExplanation;
  waterfallA: WaterfallStep[];
  waterfallB: WaterfallStep[];
  ensemble: EnsembleExplanation;
}

export function explain(model: ModelData, parcel: PredictParcel): Explanation {
  const breakdown = predict(model, parcel);
  return {
    breakdown,
    prior: explainPrior(model, parcel),
    waterfallA: waterfallA(model, breakdown),
    waterfallB: waterfallB(model, breakdown),
    ensemble: explainEnsemble(model, parcel, breakdown),
  };
}
