import { useMemo, useRef } from 'react';
import { ProblemGraphic } from '../components/ProblemGraphic';
import { Scrolly, type StepGraphicHandle } from '../components/Scrolly';
import { problemaCopy } from '../content/problema';
import type { SectionCopy } from '../content/sections';
import type { Story } from '../data/story';
import type { ParcelCollection } from '../data/types';
import { StorySection } from './StorySection';

export function ProblemaSection({ section, story, collection }: { section: SectionCopy; story: Story; collection: ParcelCollection }) {
  const copy = useMemo(() => problemaCopy(story), [story]);
  const graphicRef = useRef<StepGraphicHandle>(null);
  return (
    <StorySection section={section}>
      <Scrolly
        id="problema"
        steps={copy.steps}
        graphicRef={graphicRef}
        graphicLabel={copy.graphicLabel}
        graphic={<ProblemGraphic ref={graphicRef} story={story} collection={collection} copy={copy} />}
      />
    </StorySection>
  );
}
