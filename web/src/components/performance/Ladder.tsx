// From "always guess the mean" to our model: RMSE bars that grow when they scroll in.
import { useRef } from 'react';
import type { DesempenoCopy } from '../../content/desempeno';
import type { ModelData } from '../../data/types';
import { gsap, prefersReducedMotion, ScrollTrigger, useGSAP } from '../../lib/gsap';
import { ladder } from '../../model/performance';
import { RichText } from '../RichText';

export function Ladder({ model, copy }: { model: ModelData; copy: DesempenoCopy['ladder'] }) {
  const ref = useRef<HTMLDivElement>(null);
  const rungs = ladder(model);
  const max = rungs[0]!.rmse;

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const bars = gsap.utils.toArray<HTMLElement>('.ladder__bar', ref.current);
      // Hidden only once the trigger exists, so a GSAP failure leaves full bars.
      gsap.set(bars, { scaleX: 0, transformOrigin: '0% 50%' });
      ScrollTrigger.create({
        trigger: ref.current,
        start: 'top 80%',
        once: true,
        onEnter: () => gsap.to(bars, { scaleX: 1, duration: 1, ease: 'power2.inOut', stagger: 0.25 }),
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="ladder">
      <h3>{copy.title}</h3>
      <p className="ladder__metric">{copy.metric}</p>
      <ol className="ladder__rungs">
        {rungs.map((r) => (
          <li key={r.key} className={`ladder__rung ladder__rung--${r.key}`}>
            <span className="ladder__label">{copy.labels[r.key]}</span>
            <span className="ladder__track" aria-hidden="true">
              <span className="ladder__bar" style={{ width: `${(r.rmse / max) * 100}%` }} />
            </span>
            <span className="ladder__value">{copy.value(r.key)}</span>
          </li>
        ))}
      </ol>
      <p>{copy.summary}</p>
      <p className="muted">{copy.explain}</p>
      <ul className="ladder__extra">
        <li>
          <RichText text={copy.mae} />
        </li>
        <li>
          <RichText text={copy.r2} />
        </li>
      </ul>
    </div>
  );
}
