import { useMemo } from 'react';
import { RichText } from '../components/RichText';
import { preguntasCopy } from '../content/preguntas';
import type { SectionCopy } from '../content/sections';
import type { Story } from '../data/story';
import './Phase4.css';

export function QuestionsSection({ section, story }: { section: SectionCopy; story: Story }) {
  const copy = useMemo(() => preguntasCopy(story), [story]);
  return (
    <section id={section.id} className="section questions" aria-labelledby={`${section.id}-title`}>
      <div className="section__inner">
        <h2 id={`${section.id}-title`}>{section.title}</h2>
        <p className="section__lead-muted">{copy.intro}</p>
        <ol className="cards cards--questions">
          {copy.questions.map((q, i) => (
            <li key={q.question} className="card">
              <p className="card__number" aria-hidden="true">
                {i + 1}
              </p>
              <h3>{q.question}</h3>
              {q.answer.map((p) => (
                <p key={p}>
                  <RichText text={p} />
                </p>
              ))}
              {q.link && (
                <p>
                  <a href={q.link.href}>{q.link.text} →</a>
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
