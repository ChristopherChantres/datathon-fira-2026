// Hero: every parcel appears west→east, the view zooms onto the featured parcel and its
// dot morphs into the real outline. React renders the final frame; GSAP plays the way there.
import { geoMercator, geoPath } from 'd3-geo';
import { useMemo, useRef } from 'react';
import { heroCopy } from '../content/hero';
import { videoCopy, videoId } from '../content/video';
import type { Story } from '../data/story';
import type { ParcelCollection } from '../data/types';
import { circlePath, fitProjection, projectParcels } from '../lib/geo';
import { gsap, prefersReducedMotion, SplitText, useGSAP } from '../lib/gsap';
import { useSize } from '../lib/useSize';
import { RichText } from './RichText';
import './Hero.css';

const DOT_RADIUS = 3;
const PADDING = 24;
/** Share of the shorter side the featured parcel fills at the end of the zoom. */
const FINAL_FILL = 0.5;

interface HeroGeometry {
  width: number;
  height: number;
  dots: { id: string; set: 'train' | 'predict'; x: number; y: number }[];
  focus: [number, number];
  center: [number, number];
  zoom: number;
  featuredDot: string;
  featuredShape: string;
  context: { id: string; d: string }[];
  label: [number, number];
}

function heroGeometry(story: Story, collection: ParcelCollection, width: number, height: number): HeroGeometry | null {
  const projection = fitProjection(collection, { width, height, padding: PADDING });
  const projected = projectParcels(collection, projection);
  const featured = projected.get(story.featured.id);
  if (!featured) return null;

  const [[x0, y0], [x1, y1]] = featured.bounds;
  const zoom = (FINAL_FILL * Math.min(width, height)) / Math.max(x1 - x0, y1 - y0, 1e-6);
  const focus: [number, number] = [featured.cx, featured.cy];
  const center: [number, number] = [width / 2, height / 2];

  // The same view as the end of the zoom, as a projection: p ↦ center + (p − focus)·zoom.
  const [tx, ty] = projection.translate();
  const final = geoMercator()
    .scale(projection.scale() * zoom)
    .translate([center[0] + (tx - focus[0]) * zoom, center[1] + (ty - focus[1]) * zoom]);
  const finalPath = geoPath(final);

  const setOf = new Map(story.model.parcels.map((p) => [p.id, p.set]));
  const context: { id: string; d: string }[] = [];
  let featuredShape = '';
  for (const feature of collection.features) {
    const d = finalPath(feature) ?? '';
    if (feature.properties.id === story.featured.id) {
      featuredShape = d;
      continue;
    }
    const [[a0, b0], [a1, b1]] = finalPath.bounds(feature);
    if (a1 >= 0 && b1 >= 0 && a0 <= width && b0 <= height) context.push({ id: feature.properties.id, d });
  }
  const [[, fy0], [fx1]] = finalPath.bounds({ type: 'FeatureCollection', features: collection.features.filter((f) => f.properties.id === story.featured.id) });

  return {
    width,
    height,
    dots: [...projected.values()]
      .map((p) => ({ id: p.id, set: setOf.get(p.id) ?? 'train', x: p.cx, y: p.cy }))
      .sort((a, b) => a.x - b.x),
    focus,
    center,
    zoom,
    featuredDot: circlePath(center[0], center[1], DOT_RADIUS * 2),
    featuredShape,
    context,
    label: [Math.min(fx1 + 12, width - 8), Math.max(fy0, 20)],
  };
}

/** Position of a base point at zoom progress t ∈ [0, 1] (log-linear zoom about the focus). */
function zoomedPosition(g: HeroGeometry, x: number, y: number, t: number): [number, number] {
  const s = Math.pow(g.zoom, t);
  const u = g.zoom === 1 ? t : (s - 1) / (g.zoom - 1);
  const fx = g.focus[0] + (g.center[0] - g.focus[0]) * u;
  const fy = g.focus[1] + (g.center[1] - g.focus[1]) * u;
  return [fx + (x - g.focus[0]) * s, fy + (y - g.focus[1]) * s];
}

export function Hero({ story, collection }: { story: Story; collection: ParcelCollection }) {
  const copy = heroCopy(story);
  const rootRef = useRef<HTMLElement>(null);
  const graphicRef = useRef<HTMLDivElement>(null);
  const size = useSize(graphicRef);
  const played = useRef(false);

  const geometry = useMemo(
    () => (size && size.width > 0 && size.height > 0 ? heroGeometry(story, collection, size.width, size.height) : null),
    [story, collection, size],
  );

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const q = gsap.utils.selector(root);

      // The intro plays once; a later geometry change (resize) reverts to the final frame
      // React rendered. `played` is set on completion so StrictMode's double run still plays it.
      if (!geometry || played.current || prefersReducedMotion()) return;

      const g = geometry;
      const dots = q<SVGCircleElement>('.hero__dot');
      const setPositions = (t: number) => {
        dots.forEach((el, i) => {
          const dot = g.dots[i];
          if (!dot) return;
          const [x, y] = zoomedPosition(g, dot.x, dot.y, t);
          el.setAttribute('cx', String(x));
          el.setAttribute('cy', String(y));
        });
      };

      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onComplete: () => {
          played.current = true;
        },
      });
      gsap.set(q('.hero__morph'), { opacity: 0 });
      const title = q('.hero__title')[0];
      if (title) {
        const split = SplitText.create(title, { type: 'words' });
        tl.from(split.words, { opacity: 0, y: 24, duration: 0.8, stagger: 0.06, ease: 'power2.out' }, 0);
      }
      tl.from(q('.hero__subtitle, .hero__cue'), { opacity: 0, y: 12, duration: 0.8, stagger: 0.2 }, 0.5);

      // 1 · dots appear west → east, at their map positions.
      setPositions(0);
      tl.fromTo(dots, { opacity: 0, attr: { r: 0 } }, { opacity: 1, attr: { r: DOT_RADIUS }, duration: 0.4, stagger: { amount: 1.4 } }, 0.2);

      // 2 · smooth zoom onto the featured parcel.
      const zoom = { t: 0 };
      tl.to(zoom, { t: 1, duration: 2.4, onUpdate: () => setPositions(zoom.t) }, 2);

      // 3 · its dot becomes its real outline; neighbours' outlines appear for scale.
      tl.set(q('.hero__morph'), { opacity: 1, attr: { d: g.featuredDot } }, 4.4)
        .to(dots, { opacity: 0, duration: 0.6 }, 4.4)
        .to(q('.hero__morph'), { morphSVG: g.featuredShape, duration: 1 }, 4.4)
        .fromTo(q('.hero__context'), { opacity: 0 }, { opacity: 1, duration: 1 }, 4.6)
        .fromTo(q('.hero__outline'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.2 }, 5)
        .fromTo(q('.hero__tag'), { opacity: 0 }, { opacity: 1, duration: 0.6 }, 5.6);
    },
    { scope: rootRef, dependencies: [geometry], revertOnUpdate: true },
  );

  return (
    <section id="hero" ref={rootRef} className="hero" aria-labelledby="hero-title">
      <div className="hero__text">
        <h1 id="hero-title" className="hero__title">
          {copy.title}
        </h1>
        <p className="hero__subtitle">
          <RichText text={copy.subtitle} />
        </p>
        <div className="hero__actions">
          {/* Not part of the intro timeline. html's scroll-behavior makes the jump smooth,
              or instant with reduced motion. */}
          {videoId && (
            <a className="hero__video" href="#video">
              {videoCopy().heroButton}
            </a>
          )}
          <a className="hero__cue" href="#problema">
            {copy.cue}
            <span aria-hidden="true" className="hero__chevron">
              ↓
            </span>
          </a>
        </div>
      </div>
      <div className="hero__graphic" ref={graphicRef} aria-hidden="true">
        {geometry && (
          <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} width={geometry.width} height={geometry.height}>
            <g className="hero__context">
              {geometry.context.map((c) => (
                <path key={c.id} d={c.d} />
              ))}
            </g>
            {/* Final frame: dots zoomed out of view (and faded), the outline drawn. */}
            <g className="hero__dots">
              {geometry.dots.map((d) => {
                const [x, y] = zoomedPosition(geometry, d.x, d.y, 1);
                return <circle key={d.id} className={`hero__dot hero__dot--${d.set}`} cx={x} cy={y} r={DOT_RADIUS} opacity={0} />;
              })}
            </g>
            <path className="hero__morph" d={geometry.featuredShape} />
            <path className="hero__outline" d={geometry.featuredShape} />
            <text className="hero__tag" x={geometry.label[0]} y={geometry.label[1]}>
              {story.featured.id} · ?
            </text>
          </svg>
        )}
      </div>
    </section>
  );
}
