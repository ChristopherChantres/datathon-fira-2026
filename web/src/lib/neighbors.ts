import { geoPath } from 'd3-geo';
import type { ParcelCollection, PredictParcel } from '../data/types';
import { fitProjection } from './geo';

export interface NeighborLine {
  id: string;
  x2: number;
  y2: number;
  /** Stroke width proportional to the neighbour's weight. */
  width: number;
  weight: number;
  distanceKm: number;
  nearest: boolean;
}

/** Zoomed map of a parcel and its prior neighbours, in pixel space. Lines nearest first. */
export function neighborLayout(
  collection: ParcelCollection,
  parcel: PredictParcel,
  box: { width: number; height: number; padding: number },
  maxStroke = 7,
) {
  const neighbors = parcel.prior.neighbors;
  const ids = new Set([parcel.id, ...neighbors.map((n) => n.id)]);
  const focus = collection.features.filter((f) => ids.has(f.properties.id));
  const path = geoPath(fitProjection(focus, box));
  const centroid = new Map(focus.map((f) => [f.properties.id, path.centroid(f)]));
  const context = collection.features
    .filter((f) => !ids.has(f.properties.id))
    .map((f) => ({ id: f.properties.id, d: path(f) ?? '', b: path.bounds(f) }))
    .filter(({ b: [[a0, b0], [a1, b1]] }) => a1 >= 0 && b1 >= 0 && a0 <= box.width && b0 <= box.height);
  const maxWeight = Math.max(...neighbors.map((n) => n.weight));
  const nearestId = [...neighbors].sort((a, b) => a.distanceKm - b.distanceKm)[0]?.id;
  const [fx, fy] = centroid.get(parcel.id) ?? [box.width / 2, box.height / 2];
  const lines: NeighborLine[] = [...neighbors]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map((n) => {
      const [x2, y2] = centroid.get(n.id) ?? [fx, fy];
      return { id: n.id, x2, y2, width: Math.max(0.75, (maxStroke * n.weight) / maxWeight), weight: n.weight, distanceKm: n.distanceKm, nearest: n.id === nearestId };
    });
  const featured = focus.find((f) => f.properties.id === parcel.id);
  return {
    fx,
    fy,
    lines,
    context,
    neighborShapes: focus.filter((f) => f.properties.id !== parcel.id).map((f) => ({ id: f.properties.id, d: path(f) ?? '' })),
    featured: featured ? (path(featured) ?? '') : '',
  };
}
