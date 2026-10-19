// "¿Y si…?" simulations: re-run predict() with changed phenology inputs or area.
// The prior (location) never changes; nothing here alters the stored data.
import type { ModelData, PredictParcel } from '../data/types';
import { featureRange, predict, withArea, withFeature, type PredictionBreakdown } from './predict';

export interface PhenologyInput {
  name: string;
  label: string;
  min: number;
  max: number;
  /** The parcel's stored value. */
  original: number;
}

export function phenologyInputs(model: ModelData, parcel: PredictParcel): PhenologyInput[] {
  return model.modelA.features.map((f) => {
    const original = parcel.features[f.name];
    if (original === undefined) throw new Error(`Parcel ${parcel.id} has no ${f.name}`);
    return { name: f.name, label: f.label.es, ...featureRange(model, f.name), original };
  });
}

/** Observed area range over all parcels (train and predict), in hectares. */
export function areaRange(model: ModelData): { min: number; max: number } {
  const areas = model.parcels.map((p) => p.areaHa);
  return { min: Math.min(...areas), max: Math.max(...areas) };
}

export interface WhatIfInputs {
  phenology: Record<string, number>;
  areaHa: number;
}

export function originalInputs(model: ModelData, parcel: PredictParcel): WhatIfInputs {
  return {
    phenology: Object.fromEntries(phenologyInputs(model, parcel).map((i) => [i.name, i.original])),
    areaHa: parcel.areaHa,
  };
}

export interface WhatIfResult {
  original: PredictionBreakdown;
  simulated: PredictionBreakdown;
  /** simulated.prediction − original.prediction */
  delta: number;
  movedA: boolean;
  movedB: boolean;
  /** True when every input equals the stored one. */
  isOriginal: boolean;
}

export function simulate(model: ModelData, parcel: PredictParcel, inputs: WhatIfInputs): WhatIfResult {
  const original = predict(model, parcel);
  const base = originalInputs(model, parcel);
  let changed = parcel;
  if (inputs.areaHa !== base.areaHa) changed = withArea(changed, inputs.areaHa);
  for (const [name, value] of Object.entries(inputs.phenology)) {
    if (value !== base.phenology[name]) changed = withFeature(changed, name, value);
  }
  const simulated = changed === parcel ? original : predict(model, changed);
  return {
    original,
    simulated,
    delta: simulated.prediction - original.prediction,
    movedA: simulated.modelA !== original.modelA,
    movedB: simulated.modelB !== original.modelB,
    isOriginal: changed === parcel,
  };
}

/** Log-scale slider mapping for the area: position in [0, 1] ↔ hectares. */
export function areaFromPosition(position: number, range: { min: number; max: number }): number {
  const lo = Math.log(range.min);
  const hi = Math.log(range.max);
  return Math.exp(lo + Math.min(1, Math.max(0, position)) * (hi - lo));
}

export function positionFromArea(areaHa: number, range: { min: number; max: number }): number {
  const lo = Math.log(range.min);
  const hi = Math.log(range.max);
  return (Math.log(areaHa) - lo) / (hi - lo);
}
