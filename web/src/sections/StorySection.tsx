import type { ReactNode } from 'react';
import type { SectionCopy } from '../content/sections';

/** A narrative section: its heading, then whatever tells the story (usually a Scrolly). */
export function StorySection({ section, children }: { section: SectionCopy; children: ReactNode }) {
  return (
    <section id={section.id} className="section section--story" aria-labelledby={`${section.id}-title`}>
      <div className="section__inner">
        <h2 id={`${section.id}-title`}>{section.title}</h2>
      </div>
      <div className="section__story">{children}</div>
    </section>
  );
}
