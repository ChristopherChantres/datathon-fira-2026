import { useMemo } from 'react';
import { Coverage } from '../components/performance/Coverage';
import { Ladder } from '../components/performance/Ladder';
import { RepeatStrip } from '../components/performance/RepeatStrip';
import { Scatter } from '../components/performance/Scatter';
import { desempenoCopy } from '../content/desempeno';
import type { SectionCopy } from '../content/sections';
import type { Story } from '../data/story';
import './PerformanceSection.css';

export function PerformanceSection({ section, story }: { section: SectionCopy; story: Story }) {
  const copy = useMemo(() => desempenoCopy(story), [story]);
  return (
    <section id={section.id} className="section performance" aria-labelledby={`${section.id}-title`}>
      <div className="section__inner">
        <h2 id={`${section.id}-title`}>{section.title}</h2>
        {copy.intro.map((p) => (
          <p key={p} className="performance__intro">
            {p}
          </p>
        ))}
        <div className="performance__grid">
          <Ladder model={story.model} copy={copy.ladder} />
          <RepeatStrip model={story.model} copy={copy.stability} />
        </div>
        <div className="performance__grid">
          <Scatter model={story.model} copy={copy.scatter} />
          <Coverage copy={copy.coverage} />
        </div>
        <p className="performance__alternatives">{copy.alternatives}</p>
      </div>
    </section>
  );
}
