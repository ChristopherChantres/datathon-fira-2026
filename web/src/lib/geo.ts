import { geoMercator, geoPath, type GeoProjection } from 'd3-geo';
import type { ParcelCollection, ParcelFeature } from '../data/types';

export interface Box {
  width: number;
  height: number;
  padding: number;
}

/** Mercator projection fitting the collection inside the box. */
export function fitProjection(collection: ParcelCollection | ParcelFeature[], box: Box): GeoProjection {
  const fc: ParcelCollection = Array.isArray(collection) ? { type: 'FeatureCollection', features: collection } : collection;
  return geoMercator().fitExtent(
    [
      [box.padding, box.padding],
      [box.width - box.padding, box.height - box.padding],
    ],
    fc,
  );
}

/** Height a box of the given width needs to fit the collection without distortion. */
export function naturalHeight(collection: ParcelCollection, width: number, padding: number): number {
  const projection = geoMercator().fitWidth(width - 2 * padding, collection);
  const [[, y0], [, y1]] = geoPath(projection).bounds(collection);
  return Math.ceil(y1 - y0) + 2 * padding;
}

export interface ProjectedParcel {
  id: string;
  d: string;
  cx: number;
  cy: number;
  bounds: [[number, number], [number, number]];
}

export function projectParcels(collection: ParcelCollection, projection: GeoProjection): Map<string, ProjectedParcel> {
  const path = geoPath(projection);
  const out = new Map<string, ProjectedParcel>();
  for (const feature of collection.features) {
    const [cx, cy] = path.centroid(feature);
    out.set(feature.properties.id, { id: feature.properties.id, d: path(feature) ?? '', cx, cy, bounds: path.bounds(feature) });
  }
  return out;
}

/** An SVG path for a circle, so it can be morphed into a polygon. */
export function circlePath(cx: number, cy: number, r: number): string {
  return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
}
