import { geoMercator, geoPath } from 'd3-geo';
import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ModelData, Parcel, ParcelCollection, ParcelFeature } from '../data/types';
import { formatYield, placeName } from '../lib/format';
import './ParcelMap.css';

interface ParcelMapProps {
  model: ModelData;
  collection: ParcelCollection;
}

// Internal SVG coordinate system; the SVG scales to its container through viewBox.
const WIDTH = 800;
const PADDING = 24;
const MARKER_RADIUS = 3.5;

interface MapParcel {
  feature: ParcelFeature;
  parcel: Parcel;
  d: string;
  cx: number;
  cy: number;
  label: string;
}

function parcelLabel(parcel: Parcel): string {
  const place = `${placeName(parcel.municipality)}, ${placeName(parcel.state)}`;
  return parcel.set === 'train'
    ? `Parcela ${parcel.id}, ${place}. Rendimiento real: ${formatYield(parcel.actualYield)}.`
    : `Parcela ${parcel.id}, ${place}. Por predecir: rendimiento desconocido.`;
}

export function ParcelMap({ model, collection }: ParcelMapProps) {
  const { items, height } = useMemo(() => {
    const projection = geoMercator().fitWidth(WIDTH - 2 * PADDING, collection);
    const path = geoPath(projection);
    const [[, y0], [, y1]] = path.bounds(collection);
    const mapHeight = Math.ceil(y1 - y0) + 2 * PADDING;
    projection.translate([projection.translate()[0] + PADDING, projection.translate()[1] + PADDING - y0]);

    const byId = new Map(model.parcels.map((p) => [p.id, p]));
    const list: MapParcel[] = [];
    for (const feature of collection.features) {
      const parcel = byId.get(feature.properties.id);
      if (!parcel) continue;
      const [cx, cy] = path.centroid(feature);
      list.push({ feature, parcel, d: path(feature) ?? '', cx, cy, label: parcelLabel(parcel) });
    }
    // Keyboard order runs west to east; predict parcels are drawn last so they sit on top.
    list.sort((a, b) => a.parcel.lon - b.parcel.lon);
    return { items: list, height: mapHeight };
  }, [model, collection]);

  const drawOrder = useMemo(
    () => [...items].sort((a, b) => Number(a.parcel.set === 'predict') - Number(b.parcel.set === 'predict')),
    [items],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const nodes = useRef(new Map<string, SVGGElement>());

  const focusAt = useCallback(
    (index: number) => {
      const item = items[(index + items.length) % items.length];
      if (!item) return;
      setFocusIndex(items.indexOf(item));
      nodes.current.get(item.parcel.id)?.focus();
    },
    [items],
  );

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => focusAt(focusIndex + 1),
      ArrowDown: () => focusAt(focusIndex + 1),
      ArrowLeft: () => focusAt(focusIndex - 1),
      ArrowUp: () => focusAt(focusIndex - 1),
      Home: () => focusAt(0),
      End: () => focusAt(items.length - 1),
      Escape: () => setActiveId(null),
    };
    const action = keys[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  const nTrain = items.filter((i) => i.parcel.set === 'train').length;
  const nPredict = items.length - nTrain;
  const active = items.find((i) => i.parcel.id === activeId);
  const tabStopId = items[focusIndex]?.parcel.id;

  return (
    <figure className="parcel-map">
      <div
        className="parcel-map__frame"
        // At most 75% of the viewport tall; the box keeps the SVG's aspect so tooltip percentages stay exact.
        style={{ aspectRatio: `${WIDTH} / ${height}`, width: `min(100%, calc(75svh * ${WIDTH / height}))` }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          role="group"
          aria-label={`Mapa de ${items.length} parcelas: ${nTrain} con rendimiento conocido y ${nPredict} por predecir. Usa las flechas para recorrerlas.`}
          onKeyDown={onKeyDown}
          onPointerLeave={() => setActiveId(null)}
        >
          {drawOrder.map((item) => {
            const { id, set } = item.parcel;
            return (
              <g
                key={id}
                ref={(node) => {
                  if (node) nodes.current.set(id, node);
                  else nodes.current.delete(id);
                }}
                className={`parcel-map__parcel parcel-map__parcel--${set}${activeId === id ? ' is-active' : ''}`}
                role="img"
                aria-label={item.label}
                tabIndex={id === tabStopId ? 0 : -1}
                onPointerEnter={() => setActiveId(id)}
                onPointerDown={() => setActiveId(id)}
                onFocus={() => {
                  setActiveId(id);
                  setFocusIndex(items.indexOf(item));
                }}
                onBlur={() => setActiveId((current) => (current === id ? null : current))}
              >
                <path d={item.d} />
                <circle cx={item.cx} cy={item.cy} r={MARKER_RADIUS} />
                <circle className="parcel-map__hit" cx={item.cx} cy={item.cy} r={MARKER_RADIUS * 3} />
              </g>
            );
          })}
        </svg>

        {active && (
          // The focused parcel's aria-label already carries this text, so screen readers skip it.
          <div
            className={`parcel-map__tooltip${active.cx > WIDTH / 2 ? ' parcel-map__tooltip--left' : ''}`}
            aria-hidden="true"
            style={{ left: `${(active.cx / WIDTH) * 100}%`, top: `${(active.cy / height) * 100}%` }}
          >
            <strong>{active.parcel.id}</strong>
            <span>
              {placeName(active.parcel.municipality)}, {placeName(active.parcel.state)}
            </span>
            {active.parcel.set === 'train' ? (
              <span>Rendimiento real: {formatYield(active.parcel.actualYield)}</span>
            ) : (
              <span className="parcel-map__unknown">Por predecir</span>
            )}
          </div>
        )}
      </div>

      <figcaption className="parcel-map__legend">
        <span className="parcel-map__key parcel-map__key--train">{nTrain} con rendimiento conocido</span>
        <span className="parcel-map__key parcel-map__key--predict">{nPredict} por predecir</span>
      </figcaption>
    </figure>
  );
}
