import type { ModelData } from '../data/types';
import { isPredict } from '../data/types';
import { predictionsCsv } from '../model/csv';

/** e.g. "predicciones_59_agrocebada.csv", with the count taken from the data. */
export const csvFilename = (model: ModelData) => `predicciones_${model.parcels.filter(isPredict).length}_agrocebada.csv`;

/** Builds the CSV in the browser and saves it. */
export function downloadPredictionsCsv(model: ModelData) {
  const url = URL.createObjectURL(new Blob([predictionsCsv(model)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = csvFilename(model);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
