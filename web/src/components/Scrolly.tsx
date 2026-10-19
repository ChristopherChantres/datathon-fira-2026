// Scrollytelling: a sticky graphic beside (desktop) or above (mobile) a column of text
// steps. The step crossing the activation line drives the graphic through `goTo(step)`.
// Steps are plain text in the DOM, so the story reads fine without any animation.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { StepCopy } from '../content/types';
import { prefersReducedMotion, ScrollTrigger, useGSAP } from '../lib/gsap';
import { RichText } from './RichText';
import './Scrolly.css';

export interface StepGraphicHandle {
  goTo(step: number, options?: { instant?: boolean }): void;
  /** Scroll progress (0–1) through a scrubbed step. */
  setProgress?(step: number, progress: number): void;
}

interface ScrollyProps {
  id: string;
  steps: StepCopy[];
  graphic: ReactNode;
  graphicRef: RefObject<StepGraphicHandle | null>;
  graphicLabel: string;
  side?: 'left' | 'right';
  /** Steps whose scroll progress is reported to the graphic. */
  scrubSteps?: number[];
}

const MOBILE_QUERY = '(max-width: 767px)';
/** Activation line, as a fraction of the viewport height from the top. */
// On phones the line sits just below the 55svh sticky graphic, where step cards pin.
const lineFor = (mobile: boolean) => (mobile ? 0.66 : 0.5);

export function Scrolly({ id, steps, graphic, graphicRef, graphicLabel, side = 'right', scrubSteps = [] }: ScrollyProps) {
  const [active, setActive] = useState(0);
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setMobile(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Drive the graphic; the first call snaps so nothing animates before it is seen.
  useLayoutEffect(() => {
    graphicRef.current?.goTo(active, { instant: !initialized.current });
    initialized.current = true;
  }, [active, graphicRef]);

  // Activation: the step that crosses a thin band at the activation line.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const line = lineFor(mobile);
    const top = `${-Math.round(line * 100)}%`;
    const bottom = `${-Math.round((1 - line) * 100 - 1)}%`;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = stepRefs.current.indexOf(entry.target as HTMLLIElement);
          if (index >= 0) setActive(index);
        }
      },
      { rootMargin: `${top} 0px ${bottom} 0px` },
    );
    for (const el of stepRefs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [mobile, steps.length]);

  // Scrubbed steps report how far the activation line is through them.
  useGSAP(
    () => {
      if (scrubSteps.length === 0 || prefersReducedMotion()) return;
      const line = `${Math.round(lineFor(mobile) * 100)}%`;
      for (const index of scrubSteps) {
        const el = stepRefs.current[index];
        if (!el) continue;
        ScrollTrigger.create({
          trigger: el,
          start: `top ${line}`,
          end: `bottom ${line}`,
          onUpdate: (self) => graphicRef.current?.setProgress?.(index, self.progress),
        });
      }
    },
    { scope: rootRef, dependencies: [mobile, scrubSteps.join(','), steps.length], revertOnUpdate: true },
  );

  const onFocusStep = useCallback((index: number) => setActive(index), []);

  return (
    <div ref={rootRef} className={`scrolly scrolly--${side}`} data-active-step={active}>
      <figure className="scrolly__graphic" aria-label={graphicLabel}>
        {graphic}
      </figure>
      <ol className="scrolly__steps">
        {steps.map((step, i) => (
          <li
            key={`${id}-${i}`}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            className={`scrolly__step${i === active ? ' is-active' : ''}`}
            tabIndex={0}
            aria-current={i === active ? 'step' : undefined}
            onFocus={() => onFocusStep(i)}
          >
            <div className="scrolly__card">
              <h3>{step.title}</h3>
              {step.body.map((paragraph, j) => (
                <p key={j}>
                  <RichText text={paragraph} />
                </p>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
