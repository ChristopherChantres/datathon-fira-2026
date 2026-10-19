// "El modelo" graphic: the featured parcel's estimate built step by step. Five scenes in
// one pixel-space SVG (means → neighbours → waterfall A → waterfall B → ensemble) plus
// HTML overlays for the formulas and the final number. Values come from explain().
import { scaleLinear, type ScaleLinear } from 'd3-scale';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState, type RefObject } from 'react';
import { ensembleCaption, ensembleTex, priorTex, type modeloCopy } from '../content/modelo';
import type { Story } from '../data/story';
import type { ParcelCollection } from '../data/types';
import { isTrain } from '../data/types';
import type { Explanation, WaterfallStep } from '../model/explain';
import { beeswarm } from '../lib/beeswarm';
import { formatDelta, formatNumber, formatYield } from '../lib/format';
import { neighborLayout } from '../lib/neighbors';
import { gsap, prefersReducedMotion } from '../lib/gsap';
import { transition, type Move } from '../lib/motion';
import { useSize } from '../lib/useSize';
import { Formula } from './Formula';
import { RichText } from './RichText';
import type { StepGraphicHandle } from './Scrolly';
import './ModelGraphic.css';

type Copy = ReturnType<typeof modeloCopy>;

const STEP = { global: 0, municipal: 1, neighbors: 2, prior: 3, waterfallA: 4, waterfallB: 5, prediction: 6, formula: 7 } as const;
const SIDE = 16;

interface Props {
  story: Story;
  explanation: Explanation;
  collection: ParcelCollection;
  copy: Copy;
}

export const ModelGraphic = forwardRef<StepGraphicHandle, Props>(function ModelGraphic({ story, explanation: e, collection, copy }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useSize(rootRef);
  const [step, setStep] = useState(0);
  const current = useRef(-1);
  const countUp = useRef<gsap.core.Tween | null>(null);

  const scene = {
    means: useRef<SVGGElement>(null),
    neighbors: useRef<SVGGElement>(null),
    waterfallA: useRef<SVGGElement>(null),
    waterfallB: useRef<SVGGElement>(null),
    ensemble: useRef<SVGGElement>(null),
  };
  const el = {
    municipalLine: useRef<SVGGElement>(null),
    neighborLine: useRef<SVGGElement>(null),
    priorLine: useRef<SVGGElement>(null),
    priorFormula: useRef<HTMLDivElement>(null),
    number: useRef<HTMLDivElement>(null),
    numberValue: useRef<HTMLSpanElement>(null),
    ensembleFormula: useRef<HTMLDivElement>(null),
  };

  const layout = useMemo(() => (size && size.width > 40 && size.height > 40 ? buildLayout(story, e, collection, size.width, size.height) : null), [story, e, collection, size]);

  useImperativeHandle(
    ref,
    () => ({
      goTo(next, options) {
        const prev = current.current;
        current.current = next;
        setStep(next);
        if (!layout) return;
        const snap = options?.instant || prefersReducedMotion();
        const entering = (...steps: number[]) => !snap && steps.includes(next) && !steps.includes(prev);
        const q = (selector: string) => [...(rootRef.current?.querySelectorAll(selector) ?? [])];
        const show = (on: boolean) => ({ opacity: on ? 1 : 0 });

        const inMeans = next === STEP.global || next === STEP.municipal || next === STEP.prior;
        const moves: Move[] = [
          { targets: scene.means.current, vars: show(inMeans), duration: 0.7 },
          { targets: scene.neighbors.current, vars: show(next === STEP.neighbors), duration: 0.7 },
          { targets: scene.waterfallA.current, vars: show(next === STEP.waterfallA), duration: 0.7 },
          { targets: scene.waterfallB.current, vars: show(next === STEP.waterfallB), duration: 0.7 },
          { targets: scene.ensemble.current, vars: show(next >= STEP.prediction), duration: 0.7 },
          { targets: el.municipalLine.current, vars: show(next >= STEP.municipal), duration: 0.6, at: 0.3 },
          { targets: [el.neighborLine.current, el.priorLine.current], vars: show(next === STEP.prior), duration: 0.6, at: 0.3, stagger: 0.4 },
          { targets: el.priorFormula.current, vars: show(next === STEP.prior), duration: next === STEP.prior ? 0.01 : 0.4 },
          { targets: el.number.current, vars: show(next >= STEP.prediction), duration: 0.6 },
          { targets: el.ensembleFormula.current, vars: show(next === STEP.formula), duration: next === STEP.formula ? 0.01 : 0.4 },
        ];

        // Neighbour lines draw outward, nearest first.
        const lines = q('.model__neighbor-line');
        if (entering(STEP.neighbors)) gsap.set(lines, { drawSVG: '0%' });
        moves.push({ targets: lines, vars: { drawSVG: '100%' }, duration: 0.8, at: 0.4, stagger: 0.035 });
        moves.push({ targets: q('.model__neighbor-result'), vars: show(next === STEP.neighbors), duration: 0.5, at: next === STEP.neighbors ? 1.6 : 0 });

        // Waterfalls build row by row.
        for (const [name, s] of [['a', STEP.waterfallA], ['b', STEP.waterfallB]] as const) {
          const rows = q(`.model__wf--${name} .model__wf-row`);
          const bars = q(`.model__wf--${name} .model__wf-bar`);
          if (entering(s)) {
            gsap.set(rows, { opacity: 0 });
            gsap.set(bars, { scaleX: 0 });
          }
          moves.push({ targets: rows, vars: { opacity: 1 }, duration: 0.4, at: 0.5, stagger: 0.35 });
          for (const [i, bar] of bars.entries()) {
            moves.push({ targets: bar, vars: { scaleX: 1, transformOrigin: bar.getAttribute('data-origin') ?? '0% 50%' }, duration: 0.6, at: 0.5 + i * 0.35 });
          }
        }

        // A and B travel into ŷ; then the interval opens around it.
        const ghosts = q('.model__ghost');
        const yhat = q('.model__yhat');
        const band = q('.model__band');
        const bandLabels = q('.model__band-label');
        if (entering(STEP.prediction, STEP.formula)) {
          gsap.set(ghosts, { x: 0, y: 0, opacity: 1 });
          gsap.set(yhat, { scale: 0, transformOrigin: '50% 50%' });
          gsap.set(band, { scaleX: 0, transformOrigin: '50% 50%' });
          gsap.set(bandLabels, { opacity: 0 });
        }
        for (const g of ghosts) {
          moves.push({ targets: g, vars: { x: Number(g.getAttribute('data-dx')), y: Number(g.getAttribute('data-dy')), opacity: 0 }, duration: 1.1, at: 0.5 });
        }
        moves.push(
          { targets: yhat, vars: { scale: 1, transformOrigin: '50% 50%' }, duration: 0.5, at: 1.4, ease: 'back.out(2)' },
          { targets: band, vars: { scaleX: 1, transformOrigin: '50% 50%' }, duration: 0.9, at: 1.8 },
          { targets: bandLabels, vars: { opacity: 1 }, duration: 0.5, at: 2.5 },
        );

        // Formulas are "written" left to right.
        for (const [box, s] of [[el.priorFormula.current, STEP.prior], [el.ensembleFormula.current, STEP.formula]] as const) {
          if (entering(s)) gsap.set(box, { clipPath: 'inset(0% 100% 0% 0%)' });
          moves.push({ targets: box, vars: { clipPath: 'inset(0% 0% 0% 0%)' }, duration: 1.2, at: 0.3, ease: 'power1.inOut' });
        }

        transition(moves, { instant: snap, owner: rootRef });

        // The answer counts up the first time it appears.
        const value = el.numberValue.current;
        countUp.current?.kill();
        countUp.current = null;
        if (value) {
          if (entering(STEP.prediction, STEP.formula)) {
            const counter = { v: 0 };
            countUp.current = gsap.to(counter, {
              v: e.ensemble.prediction,
              duration: 1.6,
              delay: 1.2,
              ease: 'power2.out',
              onUpdate: () => {
                value.textContent = formatYield(counter.v);
              },
            });
          } else {
            value.textContent = formatYield(e.ensemble.prediction);
          }
        }
      },
    }),
    // Element refs are stable; rebuild only when the layout changes.
    [layout, e],
  );

  return (
    <div ref={rootRef} className="model" data-step={step}>
      {layout && (
        <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
          <MeansScene layout={layout} copy={copy} sceneRef={scene.means} lines={el} prior={e.prior} />
          <NeighborsScene layout={layout} copy={copy} sceneRef={scene.neighbors} />
          <Waterfall
            name="a"
            sceneRef={scene.waterfallA}
            steps={e.waterfallA}
            label={copy.stepLabelA}
            tones={{ start: 'location', delta: 'phenology', base: 'muted', total: 'phenology' }}
            layout={layout}
            axisLabel={`${copy.labels.axis} · ${copy.labels.zoomed}`}
          />
          <Waterfall
            name="b"
            sceneRef={scene.waterfallB}
            steps={e.waterfallB}
            label={copy.stepLabelB}
            tones={{ start: 'muted', delta: 'location', base: 'muted', total: 'location' }}
            layout={layout}
            axisLabel={`${copy.labels.axis} · ${copy.labels.zoomed}`}
          />
          <EnsembleScene layout={layout} copy={copy} sceneRef={scene.ensemble} e={e} />
        </svg>
      )}

      <div ref={el.priorFormula} className="model__overlay model__overlay--prior" style={{ opacity: 0 }}>
        <Formula tex={priorTex(e)} block />
      </div>
      <div ref={el.number} className="model__overlay model__number" style={{ opacity: 0 }}>
        <span className="model__number-caption">
          {story.featured.id} · {copy.labels.estimate}
        </span>
        <span ref={el.numberValue} className="model__number-value">
          {formatYield(e.ensemble.prediction)}
        </span>
        <span className="model__number-caption">
          {copy.labels.interval}: {formatNumber(e.ensemble.interval[0])} – {formatYield(e.ensemble.interval[1])}
        </span>
      </div>
      <div
        ref={el.ensembleFormula}
        className="model__overlay model__overlay--ensemble"
        style={{ opacity: 0, top: layout ? layout.ensemble.formulaTop : undefined }}
      >
        <Formula tex={ensembleTex(story)} block />
        <p className="model__formula-caption">
          <RichText text={ensembleCaption()} />
        </p>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------------------
// Layout (pure, pixel space)

type Layout = ReturnType<typeof buildLayout>;

function buildLayout(story: Story, e: Explanation, collection: ParcelCollection, width: number, height: number) {
  const train = story.model.parcels.filter(isTrain);
  const ys = train.map((p) => p.actualYield);
  const compact = width < 520;

  // Means scene: yield on x; label rows on top, a band for the prior formula, then the dots.
  const means = (() => {
    const x = scaleLinear()
      .domain([Math.floor(Math.min(...ys)), Math.ceil(Math.max(...ys))])
      .range([SIDE + 8, width - SIDE - 8]);
    const labelTop = 20;
    const rowGap = 17;
    const axisY = height - 34;
    const formulaBottom = labelTop + rowGap * 4 + (compact ? 70 : 90);
    const stripY = Math.max(formulaBottom + 40, (formulaBottom + axisY) / 2);
    const limit = Math.max(12, Math.min(axisY - stripY - 14, stripY - formulaBottom - 6));
    const r = compact ? 2.4 : 3.2;
    const offsets = beeswarm(train.map((p) => x(p.actualYield)), r + 0.3);
    const spread = Math.max(...offsets.map(Math.abs), 1);
    const squeeze = spread > limit ? limit / spread : 1;
    const dots = train.map((p, i) => ({
      id: p.id,
      x: x(p.actualYield),
      y: stripY + (offsets[i] ?? 0) * squeeze,
      local: p.municipality === story.featured.municipality,
    }));
    return { x, r, dots, axisY, labelRow: (row: number) => labelTop + row * rowGap, stripY };
  })();

  // Neighbours scene: zoomed map around the featured parcel and its neighbours.
  const neighbors = (() => {
    const base = neighborLayout(collection, story.featured, { width, height: height - 34, padding: compact ? 18 : 30 });
    const { fx, fy, lines } = base;
    // The callout sits beyond the nearest neighbour; the parcel's tag on the opposite side.
    const near = lines.find((l) => l.nearest);
    const dx = near ? near.x2 - fx : 1;
    const dy = near ? near.y2 - fy : 0;
    const len = Math.hypot(dx, dy) || 1;
    const [ux, uy] = [dx / len, dy / len];
    const anchorFor = (vx: number) => (vx >= 0 ? 'start' : 'end') as 'start' | 'end';
    const callout = { x: (near?.x2 ?? fx) + ux * 14, y: (near?.y2 ?? fy) + uy * 14 + 4, anchor: anchorFor(ux) };
    const tag = { x: fx - ux * 14, y: fy - uy * 14 + 4, anchor: anchorFor(-ux) };
    return { ...base, resultY: height - 12, callout, tag };
  })();

  // Waterfalls share the row layout; each gets its own zoomed x domain.
  const waterfall = (steps: WaterfallStep[]) => {
    const levels = steps.flatMap((s) => [s.from, s.to]);
    const lo = Math.min(...levels);
    const hi = Math.max(...levels);
    const pad = Math.max((hi - lo) * 0.18, 0.004);
    const valueSpace = 64;
    const x = scaleLinear().domain([lo - pad, hi + pad]).range([SIDE, width - SIDE - valueSpace]);
    const top = 58;
    const rowH = Math.min(54, (height - top - 10) / steps.length);
    return { x, top, rowH };
  };

  // Ensemble scene: A, B and ŷ rows under the big number.
  const ensemble = (() => {
    const ens = e.ensemble;
    const values = [ens.modelA, ens.modelB, ens.interval[0], ens.interval[1]];
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = (hi - lo) * 0.12;
    const x = scaleLinear().domain([lo - pad, hi + pad]).range([SIDE + 8, width - SIDE - 8]);
    const top = compact ? 112 : 150;
    const formulaSpace = compact ? 140 : 120;
    const usable = height - top - formulaSpace;
    const gap = Math.max(34, Math.min(64, usable / 3));
    const rowY = top + gap * 2.2;
    return { x, rowA: top, rowB: top + gap, rowY, formulaTop: rowY + 62 };
  })();

  return { width, height, compact, means, neighbors, waterfallA: waterfall(e.waterfallA), waterfallB: waterfall(e.waterfallB), ensemble };
}

// ---------------------------------------------------------------------------------------
// Scenes

function Ticks({ x, y, count, label, width, above = false }: { x: ScaleLinear<number, number>; y: number; count: number; label: string; width: number; above?: boolean }) {
  // d3 picks the decimals the tick step needs, so zoomed axes never repeat a label.
  const format = x.tickFormat(count);
  return (
    <g className="model__axis">
      <line x1={x.range()[0]} x2={x.range()[1]} y1={y} y2={y} />
      {x.ticks(count).map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={y} y2={above ? y - 4 : y + 4} />
          <text x={x(t)} y={above ? y - 8 : y + 16} textAnchor="middle">
            {format(t)}
          </text>
        </g>
      ))}
      {label && (
        <text x={width / 2} y={y + 30} textAnchor="middle" className="model__axis-label">
          {label}
        </text>
      )}
    </g>
  );
}

/** A vertical line at a yield with its label in one of the top rows. */
function LevelLine({ x, value, row, layout, label, tone, dashed, bold }: { x: ScaleLinear<number, number>; value: number; row: number; layout: Layout; label: string; tone: string; dashed?: boolean; bold?: boolean }) {
  const px = x(value);
  const y = layout.means.labelRow(row);
  const right = px > layout.width * 0.6;
  return (
    <g className={`model__level tone-${tone}${dashed ? ' is-dashed' : ''}${bold ? ' is-bold' : ''}`}>
      <line x1={px} x2={px} y1={y + 4} y2={layout.means.axisY} />
      <text x={px + (right ? -5 : 5)} y={y} textAnchor={right ? 'end' : 'start'}>
        {label} {formatNumber(value)}
      </text>
    </g>
  );
}

type LineRefs = { municipalLine: RefObject<SVGGElement>; neighborLine: RefObject<SVGGElement>; priorLine: RefObject<SVGGElement> };

function MeansScene({ layout, copy, sceneRef, lines, prior }: { layout: Layout; copy: Copy; sceneRef: RefObject<SVGGElement>; lines: LineRefs; prior: Explanation['prior'] }) {
  const m = layout.means;
  return (
    <g ref={sceneRef} className="model__scene model__means" opacity={0}>
      {m.dots.map((d) => (
        <circle key={d.id} className={`model__train${d.local ? ' is-local' : ''}`} cx={d.x} cy={d.y} r={m.r} />
      ))}
      <Ticks x={m.x} y={m.axisY} count={4} label={copy.labels.axis} width={layout.width} />
      <MeansLines layout={layout} copy={copy} lines={lines} p={prior} />
    </g>
  );
}

function MeansLines({ layout, copy, lines, p }: { layout: Layout; copy: Copy; lines: LineRefs; p: Explanation['prior'] }) {
  const { x } = layout.means;
  return (
    <>
      <LevelLine x={x} value={p.globalMean} row={0} layout={layout} label={copy.labels.globalMean} tone="ink" />
      <g ref={lines.municipalLine} opacity={0}>
        <LevelLine x={x} value={p.municipalMean} row={1} layout={layout} label={copy.labels.municipalMean} tone="location" />
      </g>
      <g ref={lines.neighborLine} opacity={0}>
        <LevelLine x={x} value={p.neighborMean} row={2} layout={layout} label={copy.labels.neighborMean} tone="location" dashed />
      </g>
      <g ref={lines.priorLine} opacity={0}>
        <LevelLine x={x} value={p.combined} row={3} layout={layout} label={copy.labels.prior} tone="location" bold />
      </g>
    </>
  );
}

function NeighborsScene({ layout, copy, sceneRef }: { layout: Layout; copy: Copy; sceneRef: RefObject<SVGGElement> }) {
  const n = layout.neighbors;
  const nearest = n.lines.find((l) => l.nearest);
  return (
    <g ref={sceneRef} className="model__scene model__neighbors" opacity={0}>
      {n.context.map((c) => (
        <path key={c.id} d={c.d} className="model__context" />
      ))}
      {n.neighborShapes.map((s) => (
        <path key={s.id} d={s.d} className="model__neighbor-shape" />
      ))}
      {n.lines.map((l) => (
        <line key={l.id} className="model__neighbor-line" x1={n.fx} y1={n.fy} x2={l.x2} y2={l.y2} strokeWidth={l.width} />
      ))}
      <path d={n.featured} className="model__featured-shape" />
      <circle cx={n.fx} cy={n.fy} r={4} className="model__featured-dot" />
      {nearest && (
        <text x={n.callout.x} y={n.callout.y} textAnchor={n.callout.anchor} className="model__callout">
          {copy.labels.nearest}
        </text>
      )}
      <text x={n.tag.x} y={n.tag.y} textAnchor={n.tag.anchor} className="model__featured-tag">
        {copy.labels.featuredTag} · ?
      </text>
      <text x={layout.width / 2} y={n.resultY} textAnchor="middle" className="model__neighbor-result" opacity={0}>
        {copy.labels.neighborResult} t/ha
      </text>
    </g>
  );
}

type Tone = 'location' | 'phenology' | 'muted' | 'prediction';

function Waterfall({
  name,
  sceneRef,
  steps,
  label,
  tones,
  layout,
  axisLabel,
}: {
  name: 'a' | 'b';
  sceneRef: RefObject<SVGGElement>;
  steps: WaterfallStep[];
  label: (s: WaterfallStep) => string;
  tones: Record<'start' | 'delta' | 'base' | 'total', Tone>;
  layout: Layout;
  axisLabel: string;
}) {
  const geo = name === 'a' ? layout.waterfallA : layout.waterfallB;
  const { x, top, rowH } = geo;
  const barH = Math.max(6, Math.min(14, rowH - 26));
  const toneOf = (s: WaterfallStep): Tone =>
    s.kind === 'start' ? tones.start : s.kind === 'total' ? tones.total : s.key === 'base' || s.key === 'others' ? tones.base : tones.delta;
  return (
    <g ref={sceneRef} className={`model__scene model__wf model__wf--${name}`} opacity={0}>
      <text x={SIDE} y={2} className="model__axis-label" dominantBaseline="hanging">
        {axisLabel}
      </text>
      <Ticks x={x} y={top - 12} count={layout.compact ? 3 : 5} label="" width={layout.width} above />
      {steps.map((s, i) => {
        const y = top + i * rowH;
        const barY = y + 18;
        const tone = toneOf(s);
        const isLevel = s.kind !== 'delta';
        const x0 = x(Math.min(s.from, s.to));
        const x1 = x(Math.max(s.from, s.to));
        const valueText = isLevel ? formatNumber(s.value) : formatDelta(s.value);
        return (
          <g key={s.key} className={`model__wf-row tone-${tone}${isLevel ? ' is-level' : ''}`}>
            <text x={SIDE} y={y + 10} className="model__wf-label">
              {label(s)}
            </text>
            {isLevel ? (
              <>
                <line x1={x(s.value)} x2={x(s.value)} y1={barY - 3} y2={barY + barH + 3} className="model__wf-level" />
                <circle cx={x(s.value)} cy={barY + barH / 2} r={4.5} className="model__wf-dot" />
              </>
            ) : (
              <rect
                className="model__wf-bar"
                data-origin={s.value >= 0 ? '0% 50%' : '100% 50%'}
                x={x0}
                y={barY}
                width={Math.max(1.5, x1 - x0)}
                height={barH}
              />
            )}
            {i > 0 && <line x1={x(s.from)} x2={x(s.from)} y1={y - rowH + 18 + barH} y2={barY} className="model__wf-connector" />}
            <text x={Math.max(x1, x(s.value)) + 8} y={barY + barH / 2} dominantBaseline="middle" className="model__wf-value">
              {valueText}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function EnsembleScene({ layout, copy, sceneRef, e }: { layout: Layout; copy: Copy; sceneRef: RefObject<SVGGElement>; e: Explanation }) {
  const g = layout.ensemble;
  const ens = e.ensemble;
  const yx = g.x(ens.prediction);
  const ax = g.x(ens.modelA);
  const bx = g.x(ens.modelB);
  const [lo, hi] = ens.interval;
  return (
    <g ref={sceneRef} className="model__scene model__ensemble" opacity={0}>
      <g className="tone-phenology">
        <circle cx={ax} cy={g.rowA} r={6} className="model__marker" />
        <text x={ax} y={g.rowA - 12} textAnchor="middle">{`A ${formatNumber(ens.modelA)} · × ${formatNumber(ens.weightA, 4)}`}</text>
      </g>
      <g className="tone-location">
        <circle cx={bx} cy={g.rowB} r={6} className="model__marker" />
        <text x={bx} y={g.rowB - 12} textAnchor="middle">{`B ${formatNumber(ens.modelB)} · × ${formatNumber(ens.weightB, 4)}`}</text>
      </g>
      <circle className="model__ghost tone-phenology" cx={ax} cy={g.rowA} r={6} data-dx={yx - ax} data-dy={g.rowY - g.rowA} opacity={0} />
      <circle className="model__ghost tone-location" cx={bx} cy={g.rowB} r={6} data-dx={yx - bx} data-dy={g.rowY - g.rowB} opacity={0} />

      <rect className="model__band" x={g.x(lo)} y={g.rowY - 9} width={g.x(hi) - g.x(lo)} height={18} rx={9} />
      <text className="model__band-label" x={g.x(lo)} y={g.rowY + 26} textAnchor="middle">
        {formatNumber(lo)}
      </text>
      <text className="model__band-label" x={g.x(hi)} y={g.rowY + 26} textAnchor="middle">
        {formatNumber(hi)}
      </text>
      <circle className="model__yhat" cx={yx} cy={g.rowY} r={8} />
      <text className="model__yhat-label" x={yx} y={g.rowY - 16} textAnchor="middle">
        ŷ {formatNumber(ens.prediction)}
      </text>
      <text className="model__band-label" x={layout.width / 2} y={g.rowY + 44} textAnchor="middle">
        {copy.labels.interval}
      </text>
    </g>
  );
}
