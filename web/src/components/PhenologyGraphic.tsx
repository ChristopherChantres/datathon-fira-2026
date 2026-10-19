// "Lo que ve el satélite" graphic: the featured parcel's NDVI season, step by step.
// Drawn in CSS pixels (measured), so labels stay readable on phones.
import { scaleLinear, scaleUtc } from 'd3-scale';
import { line } from 'd3-shape';
import { forwardRef, useImperativeHandle, useMemo, useRef, type RefObject } from 'react';
import type { fenologiaCopy } from '../content/fenologia';
import { medianMilestones, type Story } from '../data/story';
import type { CurvePoint, CurvesData } from '../data/types';
import { formatNdvi, formatShortDate } from '../lib/format';
import { gsap, prefersReducedMotion, ScrollTrigger, useGSAP } from '../lib/gsap';
import { transition, type Move } from '../lib/motion';
import { useSize } from '../lib/useSize';
import type { StepGraphicHandle } from './Scrolly';
import './PhenologyGraphic.css';

type Copy = ReturnType<typeof fenologiaCopy>;

const SCRUB_STEP = 1;
const MILESTONES_STEP = 2;
const GREEN_STEP = 3;
const ALL_STEP = 4;
const MARGIN = { top: 34, right: 14, bottom: 30, left: 34 };

const toTime = (iso: string) => new Date(`${iso}T00:00:00Z`);

interface Props {
  story: Story;
  curves: CurvesData;
  copy: Copy;
}

export const PhenologyGraphic = forwardRef<StepGraphicHandle, Props>(function PhenologyGraphic({ story, curves, copy }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useSize(rootRef);
  const step = useRef(0);
  const curve = curves.curves[story.featured.id]!;
  const m = curve.milestones;
  const median = useMemo(() => medianMilestones(curves), [curves]);

  const refs = {
    raw: useRef<SVGGElement>(null),
    smooth: useRef<SVGPathElement>(null),
    base: useRef<SVGGElement>(null),
    sos: useRef<SVGGElement>(null),
    peak: useRef<SVGGElement>(null),
    eos: useRef<SVGGElement>(null),
    season: useRef<SVGGElement>(null),
    green: useRef<SVGGElement>(null),
    all: useRef<SVGGElement>(null),
    median: useRef<SVGGElement>(null),
  };

  const chart = useMemo(() => {
    if (!size || size.width < 10 || size.height < 10) return null;
    const { width, height } = size;
    const x = scaleUtc()
      .domain([toTime(curves.meta.window[0]), toTime(curves.meta.window[1])])
      .range([MARGIN.left, width - MARGIN.right]);
    const y = scaleLinear().domain([0, 1]).range([height - MARGIN.bottom, MARGIN.top]);
    const path = line<CurvePoint>()
      .x((p) => x(toTime(p[0])))
      .y((p) => y(p[1]));
    const allPaths = Object.entries(curves.curves)
      .filter(([id]) => id !== story.featured.id)
      .map(([id, c]) => ({ id, d: path(c.smooth) ?? '' }));
    const months = x.ticks(width < 520 ? 5 : 10);
    return { width, height, x, y, smooth: path(curve.smooth) ?? '', allPaths, months };
  }, [size, curves, curve, story.featured.id]);

  useImperativeHandle(
    ref,
    () => ({
      goTo(next, options) {
        const instant = options?.instant || prefersReducedMotion();
        step.current = next;
        const r = refs;
        const ms = [r.base, r.sos, r.peak, r.eos, r.season].map((x) => x.current);
        const moves: Move[] = [
          { targets: r.raw.current, vars: { opacity: next === 0 ? 1 : 0.55 }, duration: 0.6 },
          { targets: r.green.current, vars: { opacity: next === GREEN_STEP ? 1 : next === ALL_STEP ? 0.45 : 0 }, duration: 0.8 },
          { targets: r.all.current, vars: { opacity: next === ALL_STEP ? 1 : 0 }, duration: 1.2 },
          { targets: r.median.current, vars: { opacity: next === ALL_STEP ? 1 : 0 }, duration: 0.8, at: next === ALL_STEP ? 0.6 : 0 },
        ];
        // Milestones arrive one by one, then step back; with all curves shown only the base
        // stays (faint), so the medians are the only calendar on screen.
        ms.forEach((el, i) => {
          const isBase = el === r.base.current;
          const shown =
            next < MILESTONES_STEP ? 0
            : next === MILESTONES_STEP ? 1
            : next === GREEN_STEP ? (isBase ? 1 : 0.35)
            : isBase ? 0.35 : 0;
          moves.push({ targets: el, vars: { opacity: shown }, duration: 0.6, at: next === MILESTONES_STEP ? i * 0.3 : 0 });
        });
        // The smooth curve: hidden before, scrubbed during, complete after its step.
        if (next < SCRUB_STEP) moves.push({ targets: r.smooth.current, vars: { drawSVG: '0%' }, duration: 0.5 });
        if (next > SCRUB_STEP || (next === SCRUB_STEP && instant)) moves.push({ targets: r.smooth.current, vars: { drawSVG: '100%' }, duration: 0.6 });
        transition(moves, { instant, owner: rootRef });
      },
      setProgress(index, progress) {
        if (index !== SCRUB_STEP || step.current !== SCRUB_STEP || !refs.smooth.current) return;
        gsap.to(refs.smooth.current, { drawSVG: `0% ${Math.min(100, progress * 115)}%`, duration: 0.25, ease: 'none', overwrite: 'auto' });
      },
    }),
    // The refs are stable; the handle only needs rebuilding when the chart changes.
    [chart],
  );

  // The raw points appear the first time the graphic scrolls into view.
  useGSAP(
    () => {
      if (!chart || prefersReducedMotion()) return;
      const dots = rootRef.current?.querySelectorAll('.phenology__raw circle');
      if (!dots?.length) return;
      ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          if (step.current === 0) gsap.from(dots, { opacity: 0, attr: { r: 0 }, duration: 0.4, stagger: { amount: 0.9 } });
        },
      });
    },
    { scope: rootRef, dependencies: [chart !== null] },
  );

  return (
    <div ref={rootRef} className="phenology">
      {chart && (
        <svg width={chart.width} height={chart.height} viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={copy.chartSummary}>
          <Axes chart={chart} label={copy.labels.yAxis} />

          <g ref={refs.all} className="phenology__all" opacity={0}>
            {chart.allPaths.map((p) => (
              <path key={p.id} d={p.d} />
            ))}
          </g>
          <g ref={refs.median} className="phenology__median" opacity={0}>
            {(
              [
                [median.sosDate, copy.labels.sos],
                [median.peakDate, copy.labels.peak],
                [median.eosDate, copy.labels.eos],
              ] as const
            ).map(([date, name], i) => {
              const px = chart.x(toTime(date));
              const right = px > chart.width * 0.6;
              return (
                <g key={date}>
                  <line x1={px} x2={px} y1={chart.y(0)} y2={MARGIN.top - 4} />
                  <text x={px + (right ? -4 : 4)} y={MARGIN.top + 10 + i * 14} textAnchor={right ? 'end' : 'start'}>
                    {`${name} · ${copy.labels.median} · ${formatShortDate(date)}`}
                  </text>
                </g>
              );
            })}
          </g>

          <g ref={refs.green} className="phenology__green" opacity={0}>
            <rect
              x={chart.x.range()[0]}
              y={chart.y(m.base)}
              width={Math.max(0, chart.x(toTime(m.sosDate)) - chart.x.range()[0]!)}
              height={chart.y(0) - chart.y(m.base)}
            />
            <text x={chart.x.range()[0]! + 6} y={chart.y(m.base) + 16}>
              {copy.labels.initialGreen}
            </text>
          </g>

          <g ref={refs.raw} className="phenology__raw">
            {curve.raw.map(([date, v]) => (
              <circle key={date} cx={chart.x(toTime(date))} cy={chart.y(v)} r={2.6} />
            ))}
          </g>
          <path ref={refs.smooth} className="phenology__smooth" d={chart.smooth} />

          <g ref={refs.base} className="phenology__milestone" opacity={0}>
            <line x1={chart.x.range()[0]} x2={chart.x(toTime(m.sosDate))} y1={chart.y(m.base)} y2={chart.y(m.base)} className="dashed" />
            <text x={chart.x.range()[0]! + 6} y={chart.y(m.base) - 6}>
              {`${copy.labels.base} ${formatNdvi(m.base)}`}
            </text>
          </g>
          <VerticalMarker refEl={refs.sos} chart={chart} date={m.sosDate} label={`${copy.labels.sos} · ${formatShortDate(m.sosDate)}`} anchor="end" />
          <g ref={refs.peak} className="phenology__milestone" opacity={0}>
            <circle cx={chart.x(toTime(m.peakDate))} cy={chart.y(m.peak)} r={5} />
            <text x={chart.x(toTime(m.peakDate))} y={chart.y(m.peak) - 12} textAnchor="middle">
              {`${copy.labels.peak} ${formatNdvi(m.peak)} · ${formatShortDate(m.peakDate)}`}
            </text>
          </g>
          <VerticalMarker refEl={refs.eos} chart={chart} date={m.eosDate} label={`${copy.labels.eos} · ${formatShortDate(m.eosDate)}`} anchor="start" />
          <g ref={refs.season} className="phenology__milestone" opacity={0}>
            {(() => {
              const x0 = chart.x(toTime(m.sosDate));
              const x1 = chart.x(toTime(m.eosDate));
              const yb = chart.y(0) - 14;
              return (
                <>
                  <path d={`M${x0},${yb - 6}V${yb}H${x1}V${yb - 6}`} className="bracket" />
                  <text x={(x0 + x1) / 2} y={yb - 6} textAnchor="middle">
                    {copy.labels.season}
                  </text>
                </>
              );
            })()}
          </g>
        </svg>
      )}
    </div>
  );
});

type Chart = {
  width: number;
  height: number;
  x: ReturnType<typeof scaleUtc<number>>;
  y: ReturnType<typeof scaleLinear<number>>;
  months: Date[];
};

function Axes({ chart, label }: { chart: Chart; label: string }) {
  const { x, y } = chart;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return (
    <g className="phenology__axes" aria-hidden="true">
      <line x1={x.range()[0]} x2={x.range()[1]} y1={y(0)} y2={y(0)} />
      {chart.months.map((d) => (
        <text key={d.toISOString()} x={x(d)} y={y(0) + 18} textAnchor="middle">
          {formatShortDate(iso(d)).split(' ')[1]}
        </text>
      ))}
      {y.ticks(5).map((t) => (
        <g key={t}>
          <line x1={x.range()[0]} x2={x.range()[1]} y1={y(t)} y2={y(t)} className="grid" />
          <text x={x.range()[0]! - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">
            {formatNdvi(t)}
          </text>
        </g>
      ))}
      <text x={x.range()[0]} y={14} className="axis-label">
        {label}
      </text>
    </g>
  );
}

function VerticalMarker({
  refEl,
  chart,
  date,
  label,
  anchor,
}: {
  refEl: RefObject<SVGGElement>;
  chart: Chart;
  date: string;
  label: string;
  anchor: 'start' | 'end';
}) {
  const px = chart.x(toTime(date));
  return (
    <g ref={refEl} className="phenology__milestone" opacity={0}>
      <line x1={px} x2={px} y1={chart.y(0)} y2={chart.y(0.95)} className="dashed" />
      <text x={px + (anchor === 'start' ? 5 : -5)} y={chart.y(0.95) + 4} textAnchor={anchor}>
        {label}
      </text>
    </g>
  );
}
