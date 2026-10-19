import { RichText } from '../components/RichText';
import { equipoCopy } from '../content/equipo';
import type { SectionCopy } from '../content/sections';
import './Phase4.css';

export function TeamSection({ section }: { section: SectionCopy }) {
  const copy = equipoCopy();
  return (
    <section id={section.id} className="section team" aria-labelledby={`${section.id}-title`}>
      <div className="section__inner">
        <h2 id={`${section.id}-title`}>{section.title}</h2>
        <div className="team__grid">
          <div>
            <p className="team__name">{copy.team}</p>
            {copy.university && <p className="muted">{copy.university}</p>}
            <h3>{copy.membersLabel}</h3>
            <ul className="team__members">
              {copy.members.map((m) => (
                <li key={m.name}>
                  {m.name}
                  {m.role && <span className="muted"> · {m.role}</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>{copy.howTitle}</h3>
            <p>{copy.howIntro}</p>
            <ul className="team__sources">
              {copy.sources.map((s) => (
                <li key={s}>
                  <RichText text={s} />
                </li>
              ))}
            </ul>
            {(copy.repoLink || copy.videoLink) && (
              <p className="team__links">
                {copy.repoLink && (
                  <a href={copy.repoLink.href} target="_blank" rel="noopener noreferrer">
                    {copy.repoLink.text} ↗
                  </a>
                )}
                {copy.videoLink && (
                  <a href={copy.videoLink.href} target="_blank" rel="noopener noreferrer">
                    {copy.videoLink.text} ↗
                  </a>
                )}
              </p>
            )}
          </div>
        </div>
        <aside className="team__ai" aria-labelledby="ai-title">
          <h3 id="ai-title">{copy.aiTitle}</h3>
          {copy.ai.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </aside>
      </div>
    </section>
  );
}
