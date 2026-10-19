// The 10 per-repeat RMSE values as dots around their mean.
import { scaleLinear } from 'd3-scale';
import { useRef } from 'react';
import type { DesempenoCopy } from '../../content/desempeno';
import type { ModelData } from '../../data/types';
import { useSize } from '../../lib/useSize';
import { repeats } from '../../model/performance';

const HEIGHT = 74;

export function RepeatStrip({ model, copy }: { model: ModelData; copy: DesempenoCopy['stability'] }) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useSize(ref)?.width ?? 0;
  const values = repeats(model).map((r) => r.rmse);
  const mean = model.validation.rmse;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.25;
  const x = scaleLinear().domain([lo - pad, hi + pad]).range([14, Math.max(15, width - 14)]);
  const format = x.tickFormat(4);
  return (
    <div className="strip">
      <h3>{copy.title}</h3>
      <div ref={ref} className="strip__box">
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={copy.label}>
            <line x1={x(mean)} x2={x(mean)} y1={8} y2={44} className="strip__mean" />
            <text x={x(mean)} y={6} textAnchor="middle" className="strip__mean-label">
              {copy.mean}
            </text>
            {values.map((v, i) => (
              <circle key={i} cx={x(v)} cy={28 + ((i % 3) - 1) * 6} r={5} className="strip__dot" />
            ))}
            <line x1={x.range()[0]} x2={x.range()[1]} y1={50} y2={50} className="strip__axis" />
            {x.ticks(4).map((t) => (
              <text key={t} x={x(t)} y={66} textAnchor="middle" className="strip__tick">
                {format(t)}
              </text>
            ))}
          </svg>
        )}
      </div>
      <p className="muted">{copy.text}</p>
    </div>
  );
}
