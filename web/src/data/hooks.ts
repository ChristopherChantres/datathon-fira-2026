import { useEffect, useState } from 'react';
import { loadCurves, loadModel, loadParcels } from './load';
import type { CurvesData, ModelData, ParcelCollection } from './types';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; data: T };

function useAsync<T>(load: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    load().then(
      (data) => active && setState({ status: 'ready', data }),
      (error: unknown) =>
        active && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      active = false;
    };
  }, [load]);

  return state;
}

export const useModel = (): AsyncState<ModelData> => useAsync(loadModel);
export const useCurves = (): AsyncState<CurvesData> => useAsync(loadCurves);
export const useParcels = (): AsyncState<ParcelCollection> => useAsync(loadParcels);
