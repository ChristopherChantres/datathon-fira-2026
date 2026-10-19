// Explorer deep links: #explorador?parcela=AGC_016
import type { ModelData } from '../data/types';
import { isPredict } from '../data/types';

export const EXPLORER_SECTION = 'explorador';
const PARAM = 'parcela';

/** The section id a hash points at, ignoring any query ("#explorador?parcela=…" → "explorador"). */
export function sectionFromHash(hash: string): string {
  return decodeURIComponent(hash.replace(/^#/, '').split('?')[0] ?? '');
}

/** The predict parcel a hash selects; anything else (missing, unknown, train) → fallback. */
export function parcelFromHash(hash: string, model: ModelData, fallbackId: string): string {
  const [section, query = ''] = hash.replace(/^#/, '').split('?');
  if (section !== EXPLORER_SECTION) return fallbackId;
  const id = new URLSearchParams(query).get(PARAM);
  const parcel = id ? model.parcels.find((p) => p.id === id) : undefined;
  return parcel && isPredict(parcel) ? parcel.id : fallbackId;
}

export function explorerHash(id: string): string {
  return `#${EXPLORER_SECTION}?${PARAM}=${encodeURIComponent(id)}`;
}
