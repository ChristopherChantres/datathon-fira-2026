// The selected parcel's estimate: big number, 80 % band on the clip-range axis with the
// known yields behind it, and the facts that explain the band.
import { scaleLinear } from 'd3-scale';
import { useMemo, useRef } from 'react';
import type { ExplorerCopy } from '../../content/explorador';
import type { Story } from '../../data/story';
import type { PredictParcel } from '../../data/types';
import { isTrain } from '../../data/types';
import { beeswarm } from '../../lib/beeswarm';
import { formatYield, placeName } from '../../lib/format';
import { useCountUp } from '../../lib/useCountUp';
import { useSize } from '../../lib/useSize';
import type { Explanation } from '../../model/explain';
import { RichText } from '../RichText';

const HEIGHT = 92;
const AXIS_Y = 66;
const SIDE = 12;

export function ResultPanel({ story, parcel, e, copy }: { story: Story; parcel: PredictParcel; e: Explanation; copy: ExplorerCopy['result'] }) {
  const ens = e.ensemble;
  const valueRef = useCountUp<HTMLSpanElement>(ens.prediction, formatYield);
  const chartRef = useRef<HTMLDivElement>(null);
  const size = useSize(chartRef);
  const width = size?.width ?? 0;

  const chart = useMemo(() => {
    if (width < 40) return null;
    const [lo, hi] = story.model.ensemble.clip;
    const x = scaleLinear().domain([lo, hi]).range([SIDE, width - SIDE]);
    const known = story.model.parcels.filter(isTrain).map((p) => x(p.actualYield));
    const offsets = beeswarm(known, 2.2);
    const spread = Math.max(...offsets.map(Math.abs), 1);
    const squeeze = Math.min(1, 22 / spread);
    return { x, dots: known.map((px, i) => [px, 34 + (offsets[i] ?? 0) * squeeze] as const), ticks: x.ticks(5) };
  }, [width, story]);

  return (
    <div className="result" aria-live="polite">
      <p className="result__caption">{copy.caption(parcel.id)}</p>
      <p className="result__value">
        <span ref={valueRef}>{formatYield(ens.prediction)}</span>
      </p>
      <p className="result__interval">{copy.interval(ens.interval[0], ens.interval[1])}</p>

      <div ref={chartRef} className="result__chart" aria-hidden="true">
        {chart && (
          <svg width={width} height={HEIGHT}>
            {chart.dots.map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r={2} className="result__known" />
            ))}
            <g className="result__band" style={{ transform: `translateX(${chart.x(ens.interval[0])}px)` }}>
              <rect x={0} y={26} width={chart.x(ens.interval[1]) - chart.x(ens.interval[0])} height={16} rx={8} />
            </g>
            <g className="result__marker" style={{ transform: `translateX(${chart.x(ens.prediction)}px)` }}>
              <line x1={0} x2={0} y1={18} y2={50} />
              <circle cx={0} cy={34} r={6} />
            </g>
            <line x1={SIDE} x2={width - SIDE} y1={AXIS_Y} y2={AXIS_Y} className="result__axis" />
            {chart.ticks.map((t) => (
              <text key={t} x={chart.x(t)} y={AXIS_Y + 16} textAnchor="middle" className="result__tick">
                {t}
              </text>
            ))}
          </svg>
        )}
      </div>
      <p className="result__note">
        {copy.axis} · {copy.dots}
      </p>

      <dl className="result__facts">
        <div>
          <dt>{copy.municipality}</dt>
          <dd>{placeName(parcel.municipality)}</dd>
        </div>
        <div>
          <dt>{copy.state}</dt>
          <dd>{placeName(parcel.state)}</dd>
        </div>
        <div>
          <dt>{copy.area}</dt>
          <dd>{copy.areaValue(parcel.areaHa)}</dd>
        </div>
      </dl>
      <p className="result__regime">{copy.regime(parcel)}</p>
      {parcel.attentionFlag && (
        <p className="result__attention" role="note">
          <RichText text={copy.attention} />
        </p>
      )}
    </div>
  );
}
