import { useMemo } from 'react';
import { ForestPlot } from '../components/impact/ForestPlot';
import { RichText } from '../components/RichText';
import { impactoCopy } from '../content/impacto';
import type { SectionCopy } from '../content/sections';
import type { Story } from '../data/story';
import './Phase4.css';

export function ImpactSection({ section, story }: { section: SectionCopy; story: Story }) {
  const copy = useMemo(() => impactoCopy(story), [story]);
  return (
    <section id={section.id} className="section impact" aria-labelledby={`${section.id}-title`}>
      <div className="section__inner">
        <h2 id={`${section.id}-title`}>{section.title}</h2>
        <p className="section__lead-muted">{copy.intro}</p>
        <ol className="cards">
          {copy.cards.map((card) => (
            <li key={card.title} className="card">
              <h3>{card.title}</h3>
              {card.body.map((p) => (
                <p key={p}>
                  <RichText text={p} />
                </p>
              ))}
            </li>
          ))}
        </ol>
        <ForestPlot model={story.model} copy={copy.forest} />
        <p className="impact__honesty">{copy.honesty}</p>
      </div>
    </section>
  );
}
