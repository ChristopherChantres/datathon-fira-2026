import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type MutableRefObject, type ReactNode } from 'react';
import type { ModelData, Parcel, ParcelCollection } from '../data/types';
import { formatYield, placeName } from '../lib/format';
import { fitProjection, naturalHeight, projectParcels } from '../lib/geo';
import './ParcelMap.css';

// Internal SVG coordinate system; the SVG scales to its container through viewBox.
export const MAP_WIDTH = 800;
const PADDING = 24;
const MARKER_RADIUS = 3.5;

export interface MapItem {
  parcel: Parcel;
  d: string;
  cx: number;
  cy: number;
  label: string;
}

export interface MapGeometry {
  width: number;
  height: number;
  /** West to east (keyboard order). */
  items: MapItem[];
}

function parcelLabel(parcel: Parcel): string {
  const place = `${placeName(parcel.municipality)}, ${placeName(parcel.state)}`;
  return parcel.set === 'train'
    ? `Parcela ${parcel.id}, ${place}. Rendimiento real: ${formatYield(parcel.actualYield)}.`
    : `Parcela ${parcel.id}, ${place}. Por predecir: rendimiento desconocido.`;
}

export function mapGeometry(model: ModelData, collection: ParcelCollection): MapGeometry {
  const height = naturalHeight(collection, MAP_WIDTH, PADDING);
  const projected = projectParcels(collection, fitProjection(collection, { width: MAP_WIDTH, height, padding: PADDING }));
  const byId = new Map(model.parcels.map((p) => [p.id, p]));
  const items: MapItem[] = [];
  for (const [id, p] of projected) {
    const parcel = byId.get(id);
    if (parcel) items.push({ parcel, d: p.d, cx: p.cx, cy: p.cy, label: parcelLabel(parcel) });
  }
  items.sort((a, b) => a.parcel.lon - b.parcel.lon);
  return { width: MAP_WIDTH, height, items };
}

interface ParcelMapProps {
  model: ModelData;
  collection: ParcelCollection;
  geometry?: MapGeometry;
  /** Accessible name of the map. */
  label?: string;
  showLegend?: boolean;
  className?: string;
  /** Filled with each parcel's movable dot group (marker, hit area, extras). */
  dotRefs?: MutableRefObject<Map<string, SVGGElement>>;
  /** Filled with each parcel's polygon path. */
  shapeRefs?: MutableRefObject<Map<string, SVGPathElement>>;
  /** Where each parcel's dot currently is (tooltip anchor); defaults to its map position. */
  anchors?: ReadonlyMap<string, [number, number]>;
  /** Parcels currently not shown: removed from keyboard order and hit testing. */
  hiddenIds?: ReadonlySet<string>;
  /** Extra SVG inside each parcel's dot group (moves with the dot). */
  dotExtra?: (item: MapItem) => ReactNode;
  /** SVG drawn below / above the parcels. */
  underlay?: ReactNode;
  overlay?: ReactNode;
  /** Makes visible parcels selectable (click, Enter or Space). */
  onSelect?: (id: string) => void;
  selectedId?: string;
}

export function ParcelMap({
  model,
  collection,
  geometry: given,
  label,
  showLegend = true,
  className,
  dotRefs,
  shapeRefs,
  anchors,
  hiddenIds,
  dotExtra,
  underlay,
  overlay,
  onSelect,
  selectedId,
}: ParcelMapProps) {
  const computed = useMemo(() => given ?? mapGeometry(model, collection), [given, model, collection]);
  const { width: WIDTH, height } = computed;
  const items = useMemo(
    () => (hiddenIds ? computed.items.filter((i) => !hiddenIds.has(i.parcel.id)) : computed.items),
    [computed, hiddenIds],
  );

  const drawOrder = useMemo(
    () => [...computed.items].sort((a, b) => Number(a.parcel.set === 'predict') - Number(b.parcel.set === 'predict')),
    [computed],
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
    } else if (onSelect && (event.key === 'Enter' || event.key === ' ')) {
      const focused = items[focusIndex];
      if (focused) {
        event.preventDefault();
        onSelect(focused.parcel.id);
      }
    }
  };

  const nTrain = computed.items.filter((i) => i.parcel.set === 'train').length;
  const nPredict = computed.items.length - nTrain;
  const active = items.find((i) => i.parcel.id === activeId);
  const tabStopId = (items[focusIndex] ?? items[0])?.parcel.id;
  const selectedIndex = selectedId ? items.findIndex((i) => i.parcel.id === selectedId) : -1;
  const [lastSelected, setLastSelected] = useState(selectedId);
  if (selectedId !== lastSelected) {
    // Keep the keyboard tab stop on the current selection when it changes elsewhere.
    setLastSelected(selectedId);
    if (selectedIndex >= 0) setFocusIndex(selectedIndex);
  }
  const [ax, ay] = active ? (anchors?.get(active.parcel.id) ?? [active.cx, active.cy]) : [0, 0];

  return (
    <figure className={`parcel-map${className ? ` ${className}` : ''}`}>
      <div
        className="parcel-map__frame"
        // Never taller than the available height; the box keeps the SVG's aspect so tooltip percentages stay exact.
        style={{ aspectRatio: `${WIDTH} / ${height}`, width: `min(100%, calc(var(--graphic-h, 75svh) * ${WIDTH / height}))` }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          role="group"
          aria-label={
            label ??
            `Mapa de ${computed.items.length} parcelas: ${nTrain} con rendimiento conocido y ${nPredict} por predecir. Usa las flechas para recorrerlas.`
          }
          onKeyDown={onKeyDown}
          onPointerLeave={() => setActiveId(null)}
        >
          {underlay}
          {drawOrder.map((item) => {
            const { id, set } = item.parcel;
            const hidden = hiddenIds?.has(id) ?? false;
            return (
              <g
                key={id}
                ref={(node) => {
                  if (node) nodes.current.set(id, node);
                  else nodes.current.delete(id);
                }}
                className={`parcel-map__parcel parcel-map__parcel--${set}${activeId === id ? ' is-active' : ''}${hidden ? ' is-hidden' : ''}${selectedId === id ? ' is-selected' : ''}`}
                role={onSelect && !hidden ? 'button' : 'img'}
                aria-label={item.label}
                aria-pressed={onSelect && !hidden ? selectedId === id : undefined}
                aria-hidden={hidden || undefined}
                tabIndex={!hidden && id === tabStopId ? 0 : -1}
                onPointerEnter={() => !hidden && setActiveId(id)}
                onPointerDown={() => !hidden && setActiveId(id)}
                onClick={() => !hidden && onSelect?.(id)}
                onFocus={() => {
                  setActiveId(id);
                  setFocusIndex(Math.max(0, items.indexOf(item)));
                }}
                onBlur={() => setActiveId((current) => (current === id ? null : current))}
              >
                <path
                  className="parcel-map__shape"
                  d={item.d}
                  ref={(node) => {
                    if (!shapeRefs) return;
                    if (node) shapeRefs.current.set(id, node);
                    else shapeRefs.current.delete(id);
                  }}
                />
                <g
                  className="parcel-map__dot"
                  ref={(node) => {
                    if (!dotRefs) return;
                    if (node) dotRefs.current.set(id, node);
                    else dotRefs.current.delete(id);
                  }}
                >
                  <circle className="parcel-map__marker" cx={item.cx} cy={item.cy} r={MARKER_RADIUS} />
                  <circle className="parcel-map__hit" cx={item.cx} cy={item.cy} r={MARKER_RADIUS * 3} />
                  {dotExtra?.(item)}
                </g>
              </g>
            );
          })}
          {overlay}
        </svg>

        {active && (
          // The focused parcel's aria-label already carries this text, so screen readers skip it.
          <div
            className={`parcel-map__tooltip${ax > WIDTH / 2 ? ' parcel-map__tooltip--left' : ''}`}
            aria-hidden="true"
            style={{ left: `${(ax / WIDTH) * 100}%`, top: `${(ay / height) * 100}%` }}
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

      {showLegend && (
        <figcaption className="parcel-map__legend">
          <span className="parcel-map__key parcel-map__key--train">{nTrain} con rendimiento conocido</span>
          <span className="parcel-map__key parcel-map__key--predict">{nPredict} por predecir</span>
        </figcaption>
      )}
    </figure>
  );
}
