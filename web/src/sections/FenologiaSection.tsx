import { useMemo, useRef } from 'react';
import { PhenologyGraphic } from '../components/PhenologyGraphic';
import { Scrolly, type StepGraphicHandle } from '../components/Scrolly';
import { fenologiaCopy, fenologiaLoading } from '../content/fenologia';
import type { SectionCopy } from '../content/sections';
import { useCurves } from '../data';
import type { Story } from '../data/story';
import { useNearViewport } from '../lib/useSize';
import { StorySection } from './StorySection';

const STEP_COUNT = 5;
const SCRUB_STEPS = [1];

export function FenologiaSection({ section, story }: { section: SectionCopy; story: Story }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  // The curves (~0.8 MB) load when the section is about one screen away.
  const near = useNearViewport(anchorRef);
  const curves = useCurves(near);
  const graphicRef = useRef<StepGraphicHandle>(null);
  const copy = useMemo(() => (curves.status === 'ready' ? fenologiaCopy(story, curves.data) : null), [curves, story]);

  return (
    <StorySection section={section}>
      <div ref={anchorRef}>
        {copy && curves.status === 'ready' ? (
          <Scrolly
            id="fenologia"
            side="left"
            steps={copy.steps}
            scrubSteps={SCRUB_STEPS}
            graphicRef={graphicRef}
            graphicLabel={copy.chartSummary}
            graphic={<PhenologyGraphic ref={graphicRef} story={story} curves={curves.data} copy={copy} />}
          />
        ) : (
          // Same height as the finished section, so content below does not jump when it loads.
          <div className="story-pending" style={{ minHeight: `calc(${STEP_COUNT} * 85svh)` }} role="status">
            <p className="muted">{curves.status === 'error' ? 'No pudimos cargar las curvas del satélite.' : fenologiaLoading}</p>
          </div>
        )}
      </div>
    </StorySection>
  );
}
