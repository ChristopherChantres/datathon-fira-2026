// Fetches the generated data once per file and caches the promise.
import type { CurvesData, ModelData, ParcelCollection } from './types';

const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`;

async function fetchJson<T>(file: string, isValid: (value: unknown) => boolean): Promise<T> {
  const response = await fetch(dataUrl(file));
  if (!response.ok) {
    throw new Error(`Could not load ${file} (HTTP ${response.status})`);
  }
  const value: unknown = await response.json();
  if (!isValid(value)) {
    throw new Error(`${file} does not match the expected shape`);
  }
  return value as T;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Wraps a loader so it runs at most once; a failed load is forgotten so it can be retried. */
function cached<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => {
    promise ??= load().catch((error: unknown) => {
      promise = null;
      throw error;
    });
    return promise;
  };
}

export const loadModel = cached(() =>
  fetchJson<ModelData>(
    'model.json',
    (v) => isObject(v) && Array.isArray(v.parcels) && isObject(v.ensemble) && isObject(v.modelA) && isObject(v.modelB),
  ),
);

export const loadCurves = cached(() =>
  fetchJson<CurvesData>('ndvi_curves.json', (v) => isObject(v) && isObject(v.curves)),
);

export const loadParcels = cached(() =>
  fetchJson<ParcelCollection>(
    'parcels.geojson',
    (v) => isObject(v) && v.type === 'FeatureCollection' && Array.isArray(v.features),
  ),
);
