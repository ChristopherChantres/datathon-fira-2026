import type { SectionCopy } from '../content/sections';
import './Nav.css';

export function Nav({ sections }: { sections: SectionCopy[] }) {
  return (
    <header className="nav">
      <a className="nav__brand" href="#hero">
        AgroCebada
      </a>
      <nav aria-label="Secciones">
        <ul className="nav__links">
          {sections
            .filter((s) => s.id !== 'hero')
            .map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.nav}</a>
              </li>
            ))}
        </ul>
      </nav>
    </header>
  );
}
