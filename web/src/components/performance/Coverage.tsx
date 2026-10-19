// "X de cada 100": interval coverage in validation, per label regime.
import type { DesempenoCopy } from '../../content/desempeno';

export function Coverage({ copy }: { copy: DesempenoCopy['coverage'] }) {
  return (
    <div className="coverage">
      <h3>{copy.title}</h3>
      <p className="muted">{copy.intro}</p>
      <div className="coverage__grid">
        {copy.items.map((item) => (
          <article key={item.regime} className="coverage__card">
            <h4>
              {item.title} <span className="tone-prediction">{item.width}</span>
            </h4>
            <div className="coverage__waffle" aria-hidden="true">
              {Array.from({ length: 100 }, (_, i) => (
                <span key={i} className={i < item.hits ? 'is-hit' : undefined} />
              ))}
            </div>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
