// The 59 estimates with their 80 % intervals, ordered by the lower bound. Rows open the
// parcel in the explorer (click, or arrows + Enter).
import { scaleLinear } from 'd3-scale';
import { useMemo, useRef, type KeyboardEvent } from 'react';
import type { impactoCopy } from '../../content/impacto';
import type { ModelData } from '../../data/types';
import { openInExplorer } from '../../lib/deepLink';
import { prefersReducedMotion } from '../../lib/gsap';
import { useRovingIndex } from '../../lib/useRovingIndex';
import { useSize } from '../../lib/useSize';
import { forestRows } from '../../model/impact';
import { RichText } from '../RichText';

const ROW = 11;
const TOP = 8;
const AXIS = 34;
const SIDE = 14;

type Copy = ReturnType<typeof impactoCopy>['forest'];

export function ForestPlot({ model, copy }: { model: ModelData; copy: Copy }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useSize(boxRef)?.width ?? 0;
  const rows = useMemo(() => forestRows(model), [model]);
  const { index, setIndex, onKeyDown } = useRovingIndex(rows.length);
  const height = TOP + rows.length * ROW + AXIS;
  const [lo, hi] = model.ensemble.clip;
  const x = scaleLinear().domain([lo, hi]).nice().range([SIDE, Math.max(SIDE + 1, width - SIDE)]);
  const active = index !== null ? rows[index] : undefined;
  const open = (i: number) => {
    const row = rows[i];
    if (row) openInExplorer(row.id, !prefersReducedMotion());
  };
  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if ((event.key === 'Enter' || event.key === ' ') && index !== null) {
      event.preventDefault();
      open(index);
    } else onKeyDown(event);
  };
  const tip = active ? copy.tip(active.id, active.prediction, active.lo, active.hi, active.attention) : '';

  return (
    <figure className="forest">
      <h3>{copy.title}</h3>
      <div ref={boxRef} className="forest__box">
        {width > 40 && (
          <svg
            width={width}
            height={height}
            tabIndex={0}
            role="group"
            aria-label={copy.label}
            onKeyDown={onKey}
            onBlur={() => setIndex(null)}
            onPointerLeave={() => setIndex(null)}
          >
            {x.ticks(5).map((t) => (
              <g key={t} className="forest__grid">
                <line x1={x(t)} x2={x(t)} y1={TOP} y2={height - AXIS + 4} />
                <text x={x(t)} y={height - AXIS + 18} textAnchor="middle">
                  {t}
                </text>
              </g>
            ))}
            <text x={width / 2} y={height - 4} textAnchor="middle" className="forest__axis">
              {copy.axis}
            </text>
            {rows.map((r, i) => {
              const y = TOP + i * ROW + ROW / 2;
              return (
                <g
                  key={r.id}
                  className={`forest__row${r.attention ? ' is-flagged' : ''}${i === index ? ' is-active' : ''}`}
                  onPointerEnter={() => setIndex(i)}
                  onClick={() => open(i)}
                >
                  <rect x={0} y={y - ROW / 2} width={width} height={ROW} className="forest__hit" />
                  <line x1={x(r.lo)} x2={x(r.hi)} y1={y} y2={y} className="forest__bar" />
                  <circle cx={x(r.prediction)} cy={y} r={2.8} className="forest__dot" />
                </g>
              );
            })}
          </svg>
        )}
        {active && (
          <div
            className={`forest__tip${x(active.prediction) > width / 2 ? ' is-left' : ''}`}
            style={{ left: x(active.prediction), top: TOP + rows.indexOf(active) * ROW }}
            aria-hidden="true"
          >
            {tip}
          </div>
        )}
      </div>
      <figcaption>
        {copy.caption.map((line) => (
          <p key={line}>
            <RichText text={line} />
          </p>
        ))}
      </figcaption>
      <p className="visually-hidden" aria-live="polite">
        {tip}
      </p>
    </figure>
  );
}
