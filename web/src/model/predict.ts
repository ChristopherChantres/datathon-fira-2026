// Browser implementation of the validated ensemble (model/modelo_final.py).
// It must reproduce the Python predictions stored in data/model.json to 1e-9;
// see predict.test.ts. All parameters come from ModelData, none are hardcoded.
import type { ModelData, PredictParcel } from '../data/types';

export const AREA_FEATURE = 'ubi_area_ha';
export const LOG_AREA_FEATURE = 'ubi_log_area';

/** One feature's share of a linear model's output. */
export interface Contribution {
  name: string;
  /** Raw input value x. */
  value: number;
  /** Standardized value: z = (x − mean) / sd (model A) or u = (x − mean) / scale (model B). */
  standardized: number;
  coef: number;
  /** coef · standardized */
  contribution: number;
}

export interface PredictionBreakdown {
  /** Final prediction after clipping, t/ha. */
  prediction: number;
  /** weightA · A + weightB · B before clipping. */
  unclipped: number;
  modelA: number;
  modelB: number;
  /** Location prior of model A (fixed per parcel). */
  prior: number;
  /** modelA − prior = intercept + priorCoef · prior + Σ contributionsA. */
  correctionA: number;
  /** modelA.priorCoef · prior, the part of the correction driven by the prior itself. */
  priorTermA: number;
  contributionsA: Contribution[];
  contributionsB: Contribution[];
  interval80: [number, number];
  clipped: boolean;
}

/** Feature overrides applied on top of `parcel.features`. */
export type FeatureOverrides = Readonly<Record<string, number>>;

function inputValue(features: FeatureOverrides, name: string, parcelId: string): number {
  const value = features[name];
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`Parcel ${parcelId} has no finite value for feature ${name}`);
  }
  return value;
}

export function predict(model: ModelData, parcel: PredictParcel, overrides?: FeatureOverrides): PredictionBreakdown {
  const x: FeatureOverrides = overrides ? { ...parcel.features, ...overrides } : parcel.features;
  const { modelA: specA, modelB: specB, ensemble } = model;

  const contributionsA = specA.features.map((f): Contribution => {
    const value = inputValue(x, f.name, parcel.id);
    const standardized = (value - f.mean) / f.sd;
    return { name: f.name, value, standardized, coef: f.coef, contribution: f.coef * standardized };
  });

  const contributionsB = specB.features.map((f): Contribution => {
    const value = inputValue(x, f.name, parcel.id);
    const standardized = (value - f.mean) / f.scale;
    return { name: f.name, value, standardized, coef: f.coef, contribution: f.coef * standardized };
  });

  const prior = parcel.prior.combined;
  const priorTermA = specA.priorCoef * prior;
  const correctionA = specA.intercept + sum(contributionsA) + priorTermA;
  const modelA = prior + correctionA;
  const modelB = specB.intercept + sum(contributionsB);

  const unclipped = ensemble.weightA * modelA + ensemble.weightB * modelB;
  const [lo, hi] = ensemble.clip;
  const prediction = Math.min(hi, Math.max(lo, unclipped));
  const halfWidth = model.intervals.halfWidth[parcel.regime];

  return {
    prediction,
    unclipped,
    modelA,
    modelB,
    prior,
    correctionA,
    priorTermA,
    contributionsA,
    contributionsB,
    interval80: [prediction - halfWidth, prediction + halfWidth],
    clipped: prediction !== unclipped,
  };
}

function sum(contributions: Contribution[]): number {
  return contributions.reduce((total, c) => total + c.contribution, 0);
}

/** Returns a copy of the parcel with a new area; the log-area feature is derived from it. */
export function withArea(parcel: PredictParcel, areaHa: number): PredictParcel {
  if (!Number.isFinite(areaHa) || areaHa <= 0) {
    throw new RangeError(`Area must be a positive number of hectares, got ${areaHa}`);
  }
  return {
    ...parcel,
    areaHa,
    features: { ...parcel.features, [AREA_FEATURE]: areaHa, [LOG_AREA_FEATURE]: Math.log(areaHa) },
  };
}

/** Returns a copy of the parcel with one input changed. Area goes through `withArea`. */
export function withFeature(parcel: PredictParcel, name: string, value: number): PredictParcel {
  if (name === AREA_FEATURE) return withArea(parcel, value);
  if (name === LOG_AREA_FEATURE) {
    throw new Error(`${LOG_AREA_FEATURE} is derived from ${AREA_FEATURE}; change the area instead`);
  }
  if (!(name in parcel.features)) throw new Error(`Unknown feature ${name}`);
  if (!Number.isFinite(value)) throw new RangeError(`Feature ${name} must be finite, got ${value}`);
  return { ...parcel, features: { ...parcel.features, [name]: value } };
}

/** Observed range of a model-A (phenology) input, for sliders. */
export function featureRange(model: ModelData, name: string): { min: number; max: number } {
  const feature = model.modelA.features.find((f) => f.name === name);
  if (!feature) throw new Error(`${name} is not a model A feature`);
  return { min: feature.min, max: feature.max };
}
