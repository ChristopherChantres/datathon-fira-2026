import { lazy, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { Hero } from './components/Hero';
import { Nav } from './components/Nav';
import { FEATURED_PARCEL_ID } from './content/featured';
import { sectionCopy, type SectionCopy, type SectionId } from './content/sections';
import { useModel, useParcels, type ModelData, type ParcelCollection } from './data';
import { buildStory } from './data/story';
import { sectionFromHash } from './lib/deepLink';
import { FenologiaSection } from './sections/FenologiaSection';
import { ExplorerSection } from './sections/ExplorerSection';
import { ModeloSection } from './sections/ModeloSection';
import { PerformanceSection } from './sections/PerformanceSection';
import { ProblemaSection } from './sections/ProblemaSection';
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
  if (model.status !== 'ready' || parcels.status !== 'ready') {
    return <LoadingState />;
  }
  return <Page model={model.data} collection={parcels.data} />;
}

function Page({ model, collection }: { model: ModelData; collection: ParcelCollection }) {
  const sections = sectionCopy(model);
  // Strict in development: a bad FEATURED_PARCEL_ID throws instead of silently falling back.
  const story = useMemo(() => buildStory(model, FEATURED_PARCEL_ID, import.meta.env.DEV), [model]);

  // Sections render only after the data loads, so the browser's own jump to a deep link
  // (e.g. /#explorador) found nothing; redo it once the page exists.
  useEffect(() => {
    // "#explorador?parcela=AGC_003" points at the explorer section.
    const id = sectionFromHash(window.location.hash);
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
  }, []);

  const byId = new Map(sections.map((s) => [s.id, s]));
  const section = (id: SectionId) => byId.get(id)!;
  const story_: Record<'problema' | 'fenologia' | 'modelo', ReactNode> = {
    problema: <ProblemaSection section={section('problema')} story={story} collection={collection} />,
    fenologia: <FenologiaSection section={section('fenologia')} story={story} />,
    modelo: <ModeloSection section={section('modelo')} story={story} collection={collection} />,
  };

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <Nav sections={sections} />
      <main id="contenido">
        <Hero story={story} collection={collection} />
        {story_.problema}
        {story_.fenologia}
        {story_.modelo}
        <ExplorerSection section={section('explorador')} story={story} collection={collection} />
        <PerformanceSection section={section('desempeno')} story={story} />
        {sections
          .filter((s) => s.placeholder)
          .map((s) => (
            <Placeholder key={s.id} section={s} />
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


function Placeholder({ section }: { section: SectionCopy }) {
  return (
    <section id={section.id} className="section" aria-labelledby={`${section.id}-title`}>
      <div className="section__inner">
        <h2 id={`${section.id}-title`}>{section.title}</h2>
        {section.placeholder && <p className="muted">{section.placeholder}</p>}
      </div>
    </section>
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
