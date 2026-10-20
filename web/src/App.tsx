import { lazy, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { Hero } from './components/Hero';
import { Nav } from './components/Nav';
import { FEATURED_PARCEL_ID } from './content/featured';
import { sectionCopy, type SectionId } from './content/sections';
import { useModel, useParcels, type ModelData, type ParcelCollection } from './data';
import { buildStory } from './data/story';
import { sectionFromHash } from './lib/deepLink';
import { FenologiaSection } from './sections/FenologiaSection';
import { ExplorerSection } from './sections/ExplorerSection';
import { ModeloSection } from './sections/ModeloSection';
import { ImpactSection } from './sections/ImpactSection';
import { PerformanceSection } from './sections/PerformanceSection';
import { QuestionsSection } from './sections/QuestionsSection';
import { TeamSection } from './sections/TeamSection';
import { equipoCopy } from './content/equipo';
import { site } from './content/site';
import { downloadPredictionsCsv } from './lib/download';
import { ProblemaSection } from './sections/ProblemaSection';
import { VideoSection } from './sections/VideoSection';
import { videoId } from './content/video';
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
        {videoId && <VideoSection section={section('video')} videoId={videoId} />}
        {story_.problema}
        {story_.fenologia}
        {story_.modelo}
        <ExplorerSection section={section('explorador')} story={story} collection={collection} />
        <PerformanceSection section={section('desempeno')} story={story} />
        <QuestionsSection section={section('preguntas')} story={story} />
        <ImpactSection section={section('impacto')} story={story} />
        <TeamSection section={section('equipo')} />
      </main>
      <Footer model={model} />
      {DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel model={model} />
        </Suspense>
      )}
    </>
  );
}


function Footer({ model }: { model: ModelData }) {
  const copy = equipoCopy().footer;
  return (
    <footer className="footer muted">
      <p>{copy.credit}</p>
      <p className="footer__links">
        {copy.repo && (
          <a href={site.repoUrl} target="_blank" rel="noopener noreferrer">
            {copy.repo} ↗
          </a>
        )}
        <button type="button" onClick={() => downloadPredictionsCsv(model)}>
          {copy.csv}
        </button>
      </p>
    </footer>
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
