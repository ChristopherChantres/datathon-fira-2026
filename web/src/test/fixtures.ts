// Test-only access to the original generated files in /data (never the copies in public/).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { CurvesData, ModelData, ParcelCollection } from '../data/types';

const readData = <T>(file: string): T =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../../data/${file}`, import.meta.url)), 'utf8')) as T;

export const model = readData<ModelData>('model.json');
export const curves = readData<CurvesData>('ndvi_curves.json');
export const polygons = readData<ParcelCollection>('parcels.geojson');
