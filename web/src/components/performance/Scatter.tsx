// Reported vs. out-of-fold estimate for the 138 known parcels. No metric is computed here:
// the official figures are validation.rmse/mae/r2 (per repeat, not on averaged estimates).
import { scaleLinear } from 'd3-scale';
import { useMemo, useRef } from 'react';
import type { DesempenoCopy } from '../../content/desempeno';
import type { ModelData } from '../../data/types';
import { useRovingIndex } from '../../lib/useRovingIndex';
import { useSize } from '../../lib/useSize';
import { observedVsEstimated } from '../../model/performance';
import { RichText } from '../RichText';

const M = { top: 12, right: 12, bottom: 44, left: 48 };

export function Scatter({ model, copy }: { model: ModelData; copy: DesempenoCopy['scatter'] }) {
  const ref = useRef<HTMLDivElement>(null);
  const width = Math.min(useSize(ref)?.width ?? 0, 520);
  const points = useMemo(() => observedVsEstimated(model).sort((a, b) => a.estimate - b.estimate), [model]);
  const { index, setIndex, onKeyDown } = useRovingIndex(points.length);
  const [lo, hi] = model.ensemble.clip;
  const size = width;
  const x = scaleLinear().domain([lo, hi]).nice().range([M.left, size - M.right]);
  const y = scaleLinear().domain([lo, hi]).nice().range([size - M.bottom, M.top]);
  const active = index !== null ? points[index] : undefined;
  const tip = active ? copy.tip(active.id, active.municipality, active.actual, active.estimate) : '';

  return (
    <figure className="scatter">
      <h3>{copy.title}</h3>
      <div ref={ref} className="scatter__box">
        {size > 60 && (
          <svg
            width={size}
            height={size}
            tabIndex={0}
            role="group"
            aria-label={copy.label}
            onKeyDown={onKeyDown}
            onBlur={() => setIndex(null)}
            onPointerLeave={() => setIndex(null)}
          >
            {x.ticks(4).map((t) => (
              <g key={`x${t}`} className="scatter__grid">
                <line x1={x(t)} x2={x(t)} y1={M.top} y2={size - M.bottom} />
                <text x={x(t)} y={size - M.bottom + 16} textAnchor="middle">
                  {t}
                </text>
              </g>
            ))}
            {y.ticks(4).map((t) => (
              <g key={`y${t}`} className="scatter__grid">
                <line x1={M.left} x2={size - M.right} y1={y(t)} y2={y(t)} />
                <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
                  {t}
                </text>
              </g>
            ))}
            <line x1={x(x.domain()[0]!)} y1={y(x.domain()[0]!)} x2={x(x.domain()[1]!)} y2={y(x.domain()[1]!)} className="scatter__diagonal" />
            <text x={x(x.domain()[1]!) - 4} y={y(x.domain()[1]!) + 14} textAnchor="end" className="scatter__diagonal-label">
              {copy.diagonal}
            </text>
            {points.map((p, i) => (
              <circle
                key={p.id}
                cx={x(p.estimate)}
                cy={y(p.actual)}
                r={i === index ? 6 : 3.5}
                className={`scatter__dot scatter__dot--${p.regime}${i === index ? ' is-active' : ''}`}
                onPointerEnter={() => setIndex(i)}
              />
            ))}
            <text x={(M.left + size - M.right) / 2} y={size - 6} textAnchor="middle" className="scatter__axis-label">
              {copy.x}
            </text>
            <text transform={`translate(12 ${(M.top + size - M.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="scatter__axis-label">
              {copy.y}
            </text>
          </svg>
        )}
        {active && (
          <div className="scatter__tip" style={{ left: x(active.estimate), top: y(active.actual) }} aria-hidden="true">
            {tip}
          </div>
        )}
      </div>
      <p className="scatter__legend">
        <span className="scatter__key scatter__key--measured">{copy.measured}</span>
        <span className="scatter__key scatter__key--rounded">{copy.rounded}</span>
      </p>
      <figcaption className="muted">
        <RichText text={copy.caption} /> {copy.rows}
      </figcaption>
      <p className="visually-hidden" aria-live="polite">
        {tip}
      </p>
    </figure>
  );
}
