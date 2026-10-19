// "El reto" graphic: the parcel map that turns into a dot plot of known yields by state
// and back. Built on ParcelMap so tooltips and keyboard access keep working.
import { scaleLinear } from 'd3-scale';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { problemaCopy } from '../content/problema';
import type { Story } from '../data/story';
import type { ParcelCollection } from '../data/types';
import { isTrain } from '../data/types';
import { beeswarm } from '../lib/beeswarm';
import { gsap, prefersReducedMotion } from '../lib/gsap';
import { transition, type Move } from '../lib/motion';
import { useSize } from '../lib/useSize';
import { mapGeometry, ParcelMap, type MapItem } from './ParcelMap';
import type { StepGraphicHandle } from './Scrolly';
import './ProblemGraphic.css';

const SWARM_STEP = 2;
const RETURN_STEP = 3;
const SWARM_RADIUS = 4.2;

type Copy = ReturnType<typeof problemaCopy>;

interface Props {
  story: Story;
  collection: ParcelCollection;
  copy: Copy;
}

export const ProblemGraphic = forwardRef<StepGraphicHandle, Props>(function ProblemGraphic({ story, collection, copy }, ref) {
  const { model, states } = story;
  const geometry = useMemo(() => mapGeometry(model, collection), [model, collection]);
  const { width: W, height: H } = geometry;
  const [step, setStep] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useSize(rootRef);
  // SVG units per CSS pixel, so labels keep a readable size at any width.
  const frameWidth = size ? Math.min(size.width, (size.height * W) / H) : W;
  const k = W / Math.max(frameWidth, 1);

  const dotRefs = useRef(new Map<string, SVGGElement>());
  const shapeRefs = useRef(new Map<string, SVGPathElement>());
  const swarmRef = useRef<SVGGElement>(null);
  const labelsRef = useRef<SVGGElement>(null);
  const legendRef = useRef<SVGGElement>(null);

  // Dot plot: one row per state (highest mean first), yield on x.
  const swarm = useMemo(() => {
    const train = model.parcels.filter(isTrain);
    const ys = train.map((p) => p.actualYield);
    const x = scaleLinear()
      .domain([Math.floor(Math.min(...ys)), Math.ceil(Math.max(...ys))])
      .range([W * 0.2, W - 32]);
    const top = H * 0.14;
    const bottom = H * 0.84;
    const rowH = (bottom - top) / states.length;
    const positions = new Map<string, [number, number]>();
    const rows = states.map((s, r) => {
      const y = top + rowH * (r + 0.5);
      const offsets = beeswarm(s.parcels.map((p) => x(p.actualYield)), SWARM_RADIUS);
      const limit = rowH * 0.42;
      const spread = Math.max(...offsets.map(Math.abs), 1);
      const squeeze = spread > limit ? limit / spread : 1;
      s.parcels.forEach((p, i) => positions.set(p.id, [x(p.actualYield), y + (offsets[i] ?? 0) * squeeze]));
      return { state: s.state, mean: s.mean, y, half: rowH * 0.42 };
    });
    return { x, rows, positions, axisY: bottom + 12 };
  }, [model, states, W, H]);

  const municipalityLabels = useMemo(() => {
    const groups = new Map<string, MapItem[]>();
    for (const item of geometry.items) {
      const list = groups.get(item.parcel.municipality) ?? [];
      list.push(item);
      groups.set(item.parcel.municipality, list);
    }
    return [...groups.entries()].map(([name, list]) => ({
      name,
      x: list.reduce((s, i) => s + i.cx, 0) / list.length,
      y: Math.min(...list.map((i) => i.cy)) - 10,
    }));
  }, [geometry]);

  const predictIds = useMemo(
    () => new Set(geometry.items.filter((i) => i.parcel.set === 'predict').map((i) => i.parcel.id)),
    [geometry],
  );
  const anchors = step === SWARM_STEP ? swarm.positions : undefined;
  const hidden = step === SWARM_STEP ? predictIds : undefined;

  useImperativeHandle(
    ref,
    () => ({
      goTo(next, options) {
        setStep(next);
        const toSwarm = next === SWARM_STEP;
        const trainItems = geometry.items
          .filter((i) => i.parcel.set === 'train')
          .sort((a, b) => (a.parcel.set === 'train' && b.parcel.set === 'train' ? a.parcel.actualYield - b.parcel.actualYield : 0));
        const moves: Move[] = trainItems.map((item, i) => {
          const target = swarm.positions.get(item.parcel.id);
          const dx = toSwarm && target ? target[0] - item.cx : 0;
          const dy = toSwarm && target ? target[1] - item.cy : 0;
          return { targets: dotRefs.current.get(item.parcel.id), vars: { x: dx, y: dy }, at: i * 0.004, duration: 1.1 };
        });
        const predictDots = [...predictIds].map((id) => dotRefs.current.get(id));
        moves.push(
          { targets: predictDots, vars: { opacity: toSwarm ? 0 : 1 }, duration: 0.5, at: toSwarm ? 0 : 0.6 },
          { targets: [...shapeRefs.current.values()], vars: { opacity: toSwarm ? 0 : 1 }, duration: 0.5 },
          { targets: swarmRef.current, vars: { opacity: toSwarm ? 1 : 0 }, duration: 0.6, at: toSwarm ? 0.6 : 0 },
          { targets: labelsRef.current, vars: { opacity: next === 0 ? 1 : 0 }, duration: 0.5 },
          { targets: legendRef.current, vars: { opacity: next === 1 || next === RETURN_STEP ? 1 : 0 }, duration: 0.5 },
        );
        const tl = transition(moves, { ...options, owner: rootRef });

        // The parcels to predict pulse once when they come back.
        if (tl && next === RETURN_STEP && !prefersReducedMotion()) {
          const markers = predictDots.map((g) => g?.querySelector('.parcel-map__marker')).filter((m): m is SVGCircleElement => !!m);
          tl.add(
            gsap.fromTo(
              markers,
              { scale: 1 },
              { scale: 2.6, duration: 0.35, ease: 'power2.out', yoyo: true, repeat: 1, transformOrigin: '50% 50%', stagger: { amount: 0.4 } },
            ),
            1.1,
          );
        }
      },
    }),
    [geometry, swarm, predictIds],
  );

  const fs = (px: number) => px * k;

  return (
    <div ref={rootRef} className="problem-graphic" data-step={step}>
      <ParcelMap
        model={model}
        collection={collection}
        geometry={geometry}
        showLegend={false}
        dotRefs={dotRefs}
        shapeRefs={shapeRefs}
        anchors={anchors}
        hiddenIds={hidden}
        label={copy.graphicLabel}
        dotExtra={(item) =>
          item.parcel.set === 'predict' ? (
            <text className="problem-graphic__q" x={item.cx + fs(4)} y={item.cy - fs(4)} fontSize={fs(11)}>
              ?
            </text>
          ) : null
        }
        underlay={
          <g ref={labelsRef} className="problem-graphic__municipalities" aria-hidden="true">
            {municipalityLabels.map((m) => (
              <text key={m.name} x={m.x} y={m.y} fontSize={fs(11)} textAnchor="middle">
                {copy.municipalityLabel(m.name)}
              </text>
            ))}
          </g>
        }
        overlay={
          <>
            <g ref={swarmRef} className="problem-graphic__swarm" aria-hidden="true" opacity={0}>
              {swarm.rows.map((row) => (
                <g key={row.state}>
                  <text x={16} y={row.y} fontSize={fs(13)} dominantBaseline="middle" className="problem-graphic__row">
                    {copy.stateLabel(row.state)}
                  </text>
                  <line x1={swarm.x(row.mean)} x2={swarm.x(row.mean)} y1={row.y - row.half} y2={row.y + row.half} className="problem-graphic__mean" />
                  <text x={swarm.x(row.mean)} y={row.y - row.half - fs(4)} fontSize={fs(11)} textAnchor="middle" className="problem-graphic__mean-label">
                    {copy.meanLabel(row.mean)}
                  </text>
                </g>
              ))}
              <line x1={swarm.x.range()[0]} x2={swarm.x.range()[1]} y1={swarm.axisY} y2={swarm.axisY} className="problem-graphic__axis" />
              {swarm.x.ticks(swarm.x.domain()[1]! - swarm.x.domain()[0]!).map((t) => (
                <g key={t}>
                  <line x1={swarm.x(t)} x2={swarm.x(t)} y1={swarm.axisY} y2={swarm.axisY + fs(5)} className="problem-graphic__axis" />
                  <text x={swarm.x(t)} y={swarm.axisY + fs(18)} fontSize={fs(11)} textAnchor="middle" className="problem-graphic__tick">
                    {t}
                  </text>
                </g>
              ))}
              <text x={(swarm.x.range()[0]! + swarm.x.range()[1]!) / 2} y={swarm.axisY + fs(36)} fontSize={fs(12)} textAnchor="middle" className="problem-graphic__tick">
                {copy.axisLabel}
              </text>
            </g>
            <g ref={legendRef} className="problem-graphic__legend" aria-hidden="true" opacity={0}>
              <circle cx={16 + fs(5)} cy={16 + fs(8)} r={fs(4)} className="problem-graphic__key--train" />
              <text x={16 + fs(14)} y={16 + fs(8)} fontSize={fs(12)} dominantBaseline="middle">
                {copy.legendKnown}
              </text>
              <text x={16 + fs(5)} y={16 + fs(28)} fontSize={fs(13)} textAnchor="middle" dominantBaseline="middle" className="problem-graphic__key--predict">
                ?
              </text>
              <text x={16 + fs(14)} y={16 + fs(28)} fontSize={fs(12)} dominantBaseline="middle">
                {copy.legendUnknown}
              </text>
            </g>
          </>
        }
      />
    </div>
  );
});
