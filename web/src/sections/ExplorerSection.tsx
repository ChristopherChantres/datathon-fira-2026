import { useCallback, useMemo, useRef, useState } from 'react';
import { Formula } from '../components/Formula';
import { MiniWaterfall } from '../components/explorer/MiniWaterfall';
import { NeighborView } from '../components/explorer/NeighborView';
import { ParcelPicker } from '../components/explorer/ParcelPicker';
import { PredictionsTable } from '../components/explorer/PredictionsTable';
import { ResultPanel } from '../components/explorer/ResultPanel';
import { WhatIf } from '../components/explorer/WhatIf';
import { ParcelMap } from '../components/ParcelMap';
import { RichText } from '../components/RichText';
import { explorerCopy } from '../content/explorador';
import { modeloCopy, priorTex } from '../content/modelo';
import type { SectionCopy } from '../content/sections';
import type { Story } from '../data/story';
import type { ParcelCollection } from '../data/types';
import { isPredict } from '../data/types';
import { explorerHash, parcelFromHash } from '../lib/deepLink';
import { prefersReducedMotion } from '../lib/gsap';
import { explain } from '../model/explain';
import './ExplorerSection.css';

export function ExplorerSection({ section, story, collection }: { section: SectionCopy; story: Story; collection: ParcelCollection }) {
  const { model } = story;
  const copy = useMemo(() => explorerCopy(story), [story]);
  const parcels = useMemo(() => model.parcels.filter(isPredict), [model]);
  const trainIds = useMemo(() => new Set(model.parcels.filter((p) => p.set === 'train').map((p) => p.id)), [model]);
  const [selectedId, setSelectedId] = useState(() =>
    parcelFromHash(typeof window === 'undefined' ? '' : window.location.hash, model, story.featured.id),
  );
  const topRef = useRef<HTMLDivElement>(null);

  const parcel = parcels.find((p) => p.id === selectedId) ?? story.featured;
  const e = useMemo(() => explain(model, parcel), [model, parcel]);
  const labels = useMemo(() => modeloCopy({ ...story, featured: parcel }, e), [story, parcel, e]);

  const select = useCallback((id: string, reveal = false) => {
    setSelectedId(id);
    // Shareable link without moving the page.
    window.history.replaceState(null, '', explorerHash(id));
    if (reveal) topRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }, []);

  return (
    <section id={section.id} className="section explorer" aria-labelledby={`${section.id}-title`}>
      <div className="section__inner">
        <h2 id={`${section.id}-title`}>{section.title}</h2>
        <p className="explorer__intro">
          <RichText text={copy.intro} />
        </p>

        <div ref={topRef} className="explorer__top">
          <div className="explorer__select">
            <ParcelPicker parcels={parcels} selectedId={parcel.id} onSelect={(id) => select(id)} copy={copy.search} />
            <ParcelMap
              model={model}
              collection={collection}
              className="explorer-map"
              showLegend={false}
              hiddenIds={trainIds}
              selectedId={parcel.id}
              onSelect={(id) => select(id)}
              label={copy.mapLabel}
            />
          </div>
          <ResultPanel story={story} parcel={parcel} e={e} copy={copy.result} />
        </div>

        <WhatIf key={parcel.id} model={model} parcel={parcel} copy={copy.whatIf} />

        <section className="breakdown" aria-labelledby="breakdown-title">
          <h3 id="breakdown-title">{copy.breakdown.title}</h3>
          <div className="breakdown__grid">
            <article className="breakdown__card">
              <h4 className="tone-location">{copy.breakdown.prior}</h4>
              <ul>
                {copy.breakdown.priorLines(parcel, e).map((line) => (
                  <li key={line}>
                    <RichText text={line} />
                  </li>
                ))}
              </ul>
              <Formula tex={priorTex(e)} block />
              <NeighborView model={model} collection={collection} parcel={parcel} copy={copy.breakdown} />
            </article>
            <article className="breakdown__card">
              <h4 className="tone-phenology">{copy.breakdown.modelA}</h4>
              <MiniWaterfall
                steps={e.waterfallA}
                label={labels.stepLabelA}
                tones={{ start: 'location', delta: 'phenology', minor: 'muted', total: 'phenology' }}
                caption={copy.breakdown.modelA}
              />
              <p className="breakdown__note">{copy.breakdown.zoomed}</p>
              <h4 className="tone-location">{copy.breakdown.modelB}</h4>
              <MiniWaterfall
                steps={e.waterfallB}
                label={labels.stepLabelB}
                tones={{ start: 'muted', delta: 'location', minor: 'muted', total: 'location' }}
                caption={copy.breakdown.modelB}
              />
              <p className="breakdown__note">{copy.breakdown.zoomed}</p>
              <h4 className="tone-prediction">{copy.breakdown.ensemble}</h4>
              <Formula tex={copy.breakdown.ensembleTex(e)} block />
              <p className="breakdown__note">{copy.breakdown.ensembleNote(e)}</p>
            </article>
          </div>
        </section>

        <PredictionsTable
          model={model}
          parcels={parcels}
          selectedId={parcel.id}
          onSelect={(id) => select(id, true)}
          copy={copy.table}
          downloadLabel={copy.download}
        />
      </div>
    </section>
  );
}
