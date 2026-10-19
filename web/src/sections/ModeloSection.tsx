import { useMemo, useRef } from 'react';
import { ModelGraphic } from '../components/ModelGraphic';
import { Scrolly, type StepGraphicHandle } from '../components/Scrolly';
import { modeloCopy } from '../content/modelo';
import type { SectionCopy } from '../content/sections';
import type { Story } from '../data/story';
import type { ParcelCollection } from '../data/types';
import { explain } from '../model/explain';
import { StorySection } from './StorySection';

export function ModeloSection({ section, story, collection }: { section: SectionCopy; story: Story; collection: ParcelCollection }) {
  const explanation = useMemo(() => explain(story.model, story.featured), [story]);
  const copy = useMemo(() => modeloCopy(story, explanation), [story, explanation]);
  const graphicRef = useRef<StepGraphicHandle>(null);
  return (
    <StorySection section={section}>
      <Scrolly
        id="modelo"
        steps={copy.steps}
        graphicRef={graphicRef}
        graphicLabel={copy.graphicLabel}
        graphic={<ModelGraphic ref={graphicRef} story={story} explanation={explanation} collection={collection} copy={copy} />}
      />
    </StorySection>
  );
}
