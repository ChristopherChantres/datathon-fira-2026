import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Formula } from './components/Formula';
import { ParcelMap } from './components/ParcelMap';
import { Nav } from './components/Nav';
import { sectionCopy, type SectionCopy, type SectionId } from './content/sections';
import { useModel, useParcels, type ModelData, type ParcelCollection } from './data';
import './App.css';

// Statically false in production builds, so the panel is tree-shaken away.
const DebugPanel = import.meta.env.DEV ? lazy(() => import('./components/DebugPanel')) : null;

export function App() {
  const model = useModel();
  const parcels = useParcels();

  if (model.status === 'error' || parcels.status === 'error') {
    const error = model.status === 'error' ? model.error : parcels.status === 'error' ? parcels.error : null;
    return <ErrorState error={error} />;
  }
  if (model.status === 'loading' || parcels.status === 'loading') {
    return <LoadingState />;
  }
  return <Page model={model.data} collection={parcels.data} />;
}

function Page({ model, collection }: { model: ModelData; collection: ParcelCollection }) {
  const sections = sectionCopy(model);

  // Sections render only after the data loads, so the browser's own jump to a deep link
  // (e.g. /#explorador) found nothing; redo it once the page exists.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
  }, []);
  const extras: Partial<Record<SectionId, ReactNode>> = {
    problema: <ParcelMap model={model} collection={collection} />,
    modelo: <EnsembleFormula model={model} />,
  };

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <Nav sections={sections} />
      <main id="contenido">
        {sections.map((section) => (
          <Section key={section.id} section={section}>
            {extras[section.id]}
          </Section>
        ))}
      </main>
      <footer className="footer muted">Reto AgroCebada FIRA 2026</footer>
      {DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel model={model} />
        </Suspense>
      )}
    </>
  );
}

function Section({ section, children }: { section: SectionCopy; children?: ReactNode }) {
  const isHero = section.id === 'hero';
  const Heading = isHero ? 'h1' : 'h2';
  return (
    <section id={section.id} className={`section${isHero ? ' section--hero' : ''}`} aria-labelledby={`${section.id}-title`}>
      <div className="section__inner">
        <Heading id={`${section.id}-title`}>{section.title}</Heading>
        <p className={isHero ? 'section__lead' : 'muted'}>{section.placeholder}</p>
        {children}
      </div>
    </section>
  );
}

/** Smoke test for KaTeX: the final ensemble, with the weights and clip range from model.json. */
function EnsembleFormula({ model }: { model: ModelData }) {
  const { weightA, weightB, clip } = model.ensemble;
  const [lo, hi] = clip;
  const tex =
    String.raw`\htmlClass{tex-prediction}{\hat{y}} = \min\!\Big(\max\big(` +
    String.raw`${weightA}\,\htmlClass{tex-phenology}{A} + ${weightB}\,\htmlClass{tex-location}{B},\; ${lo}\big),\; ${hi}\Big)`;
  return (
    <div className="ensemble">
      <Formula tex={tex} block />
      <p className="muted ensemble__caption">
        <span className="tex-phenology">A</span>: ubicación + corrección por fenología ·{' '}
        <span className="tex-location">B</span>: ubicación · <span className="tex-prediction">ŷ</span>: rendimiento
        estimado (t/ha)
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="status" role="status" aria-live="polite">
      <p>Cargando los datos del modelo…</p>
    </div>
  );
}

function ErrorState({ error }: { error: Error | null }) {
  return (
    <div className="status status--error" role="alert">
      <h2>No pudimos cargar los datos</h2>
      <p className="muted">Revisa tu conexión e inténtalo de nuevo.</p>
      {import.meta.env.DEV && error && <p className="muted">{error.message}</p>}
      <p>
        <button type="button" onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </p>
    </div>
  );
}
