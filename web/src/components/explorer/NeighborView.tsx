// The selected parcel and its 40 prior neighbours; hover or arrow keys show each one.
import { useMemo, useRef } from 'react';
import type { ExplorerCopy } from '../../content/explorador';
import type { ModelData, ParcelCollection, PredictParcel } from '../../data/types';
import { formatDistance, formatPercent } from '../../lib/format';
import { neighborLayout } from '../../lib/neighbors';
import { useRovingIndex } from '../../lib/useRovingIndex';
import { useSize } from '../../lib/useSize';

const HEIGHT = 240;

export function NeighborView({ model, collection, parcel, copy }: { model: ModelData; collection: ParcelCollection; parcel: PredictParcel; copy: ExplorerCopy['breakdown'] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const size = useSize(boxRef);
  const width = size?.width ?? 0;
  const layout = useMemo(
    () => (width > 40 ? neighborLayout(collection, parcel, { width, height: HEIGHT, padding: 16 }, 6) : null),
    [collection, parcel, width],
  );
  const known = useMemo(() => new Map(model.parcels.map((p) => [p.id, p.set === 'train' ? p.actualYield : null])), [model]);
  const { index, setIndex, onKeyDown } = useRovingIndex(layout?.lines.length ?? 0);
  const active = layout && index !== null ? layout.lines[index] : undefined;
  const yieldOf = active ? known.get(active.id) : null;
  const tip = active && yieldOf != null ? copy.neighborTip(active.id, formatDistance(active.distanceKm), yieldOf, formatPercent(active.weight)) : null;

  return (
    <figure className="neighbors">
      <div ref={boxRef} className="neighbors__box">
        {layout && (
          <svg
            width={width}
            height={HEIGHT}
            tabIndex={0}
            role="group"
            aria-label={copy.neighbors}
            onKeyDown={onKeyDown}
            onBlur={() => setIndex(null)}
            onPointerLeave={() => setIndex(null)}
          >
            {layout.context.map((c) => (
              <path key={c.id} d={c.d} className="neighbors__context" />
            ))}
            {layout.neighborShapes.map((s) => (
              <path key={s.id} d={s.d} className="neighbors__shape" />
            ))}
            {layout.lines.map((l, i) => (
              <g key={l.id} className={i === index ? 'is-active' : undefined} onPointerEnter={() => setIndex(i)}>
                <line x1={layout.fx} y1={layout.fy} x2={l.x2} y2={l.y2} strokeWidth={l.width} className="neighbors__line" />
                <circle cx={l.x2} cy={l.y2} r={3} className="neighbors__dot" />
                <circle cx={l.x2} cy={l.y2} r={9} className="neighbors__hit" />
              </g>
            ))}
            <path d={layout.featured} className="neighbors__featured" />
            <circle cx={layout.fx} cy={layout.fy} r={4} className="neighbors__center" />
          </svg>
        )}
        {active && tip && (
          <div
            className={`neighbors__tip${active.x2 > width / 2 ? ' is-left' : ''}`}
            style={{ left: active.x2, top: active.y2 }}
            aria-hidden="true"
          >
            {tip.map((line, i) => (i === 0 ? <strong key={i}>{line}</strong> : <span key={i}>{line}</span>))}
          </div>
        )}
      </div>
      <figcaption className="neighbors__caption">{copy.neighbors}</figcaption>
      <p className="visually-hidden" aria-live="polite">
        {tip?.join(', ') ?? ''}
      </p>
    </figure>
  );
}
