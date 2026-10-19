// Pure helpers that derive the figures the narrative shows. Everything comes from the data.
import type { CurvesData, ModelData, PredictParcel, TrainParcel } from './types';
import { isPredict, isTrain } from './types';

export interface StateYields {
  state: string;
  n: number;
  mean: number;
  parcels: TrainParcel[];
}

/** Known yields grouped by state, sorted by mean yield, highest first. */
export function stateYieldStats(model: ModelData): StateYields[] {
  const groups = new Map<string, TrainParcel[]>();
  for (const p of model.parcels.filter(isTrain)) {
    const list = groups.get(p.state) ?? [];
    list.push(p);
    groups.set(p.state, list);
  }
  return [...groups.entries()]
    .map(([state, parcels]) => ({
      state,
      n: parcels.length,
      mean: parcels.reduce((s, p) => s + p.actualYield, 0) / parcels.length,
      parcels,
    }))
    .sort((a, b) => b.mean - a.mean);
}

export function median(values: number[]): number {
  if (values.length === 0) throw new Error('median of an empty list');
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** ISO date (UTC) of a day-of-year in the given year; day 1 is January 1. */
export function doyToIsoDate(year: number, doy: number): string {
  return new Date(Date.UTC(year, 0, doy)).toISOString().slice(0, 10);
}

export interface MedianMilestones {
  sosDoy: number;
  peakDoy: number;
  eosDoy: number;
  sosDate: string;
  peakDate: string;
  eosDate: string;
}

/**
 * Median start, peak and end of season over all curves. With an even number of curves
 * the median can fall between two days; it is then rounded to the nearest day.
 */
export function medianMilestones(curves: CurvesData): MedianMilestones {
  const all = Object.values(curves.curves).map((c) => c.milestones);
  const year = Number(curves.meta.window[0].slice(0, 4));
  const day = (key: 'sosDoy' | 'peakDoy' | 'eosDoy') => Math.round(median(all.map((m) => m[key])));
  const sosDoy = day('sosDoy');
  const peakDoy = day('peakDoy');
  const eosDoy = day('eosDoy');
  return {
    sosDoy,
    peakDoy,
    eosDoy,
    sosDate: doyToIsoDate(year, sosDoy),
    peakDate: doyToIsoDate(year, peakDoy),
    eosDate: doyToIsoDate(year, eosDoy),
  };
}

/**
 * The featured parcel must exist and be a predict parcel. In strict mode (development)
 * anything else throws; otherwise the first predict parcel is used.
 */
export function resolveFeaturedParcel(model: ModelData, id: string, strict: boolean): PredictParcel {
  const parcel = model.parcels.find((p) => p.id === id);
  if (parcel && isPredict(parcel)) return parcel;
  const problem = parcel ? `${id} is a ${parcel.set} parcel, not a predict parcel` : `${id} does not exist`;
  if (strict) throw new Error(`FEATURED_PARCEL_ID: ${problem}`);
  const fallback = model.parcels.find(isPredict);
  if (!fallback) throw new Error('The data has no predict parcels');
  return fallback;
}

export interface Story {
  model: ModelData;
  featured: PredictParcel;
  states: StateYields[];
  counts: { total: number; train: number; predict: number; municipalities: number; states: number };
}

export function buildStory(model: ModelData, featuredId: string, strict: boolean): Story {
  const states = stateYieldStats(model);
  return {
    model,
    featured: resolveFeaturedParcel(model, featuredId, strict),
    states,
    counts: {
      total: model.parcels.length,
      train: model.parcels.filter(isTrain).length,
      predict: model.parcels.filter(isPredict).length,
      municipalities: model.municipalities.length,
      states: new Set(model.municipalities.map((m) => m.state)).size,
    },
  };
}
