import { useEffect, useRef, useState } from 'react';
import type { SectionCopy } from '../content/sections';
import { prefersReducedMotion } from '../lib/gsap';
import './Nav.css';

export function Nav({ sections }: { sections: SectionCopy[] }) {
  const [active, setActive] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // The section crossing the middle of the screen is the current one.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -54% 0px' },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  // On phones the links scroll sideways: keep the current one in view (only the list scrolls).
  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector<HTMLElement>('a[aria-current]');
    if (!list || !link || list.scrollWidth <= list.clientWidth) return;
    // Measured against the list itself (the link's offsetParent is the sticky header).
    const offset = link.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft;
    list.scrollTo({ left: offset - list.clientWidth / 2 + link.offsetWidth / 2, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [active]);

  return (
    <header className="nav">
      <a className="nav__brand" href="#hero">
        AgroCebada
      </a>
      <nav aria-label="Secciones">
        <ul ref={listRef} className="nav__links">
          {sections
            .filter((s) => s.id !== 'hero')
            .map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} aria-current={active === s.id ? 'location' : undefined}>
                  {s.nav}
                </a>
              </li>
            ))}
        </ul>
      </nav>
    </header>
  );
}
