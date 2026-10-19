// "¿Y si…?": native range sliders that re-run predict() for a simulated parcel.
import { useId, useMemo, useState } from 'react';
import type { ExplorerCopy } from '../../content/explorador';
import type { ModelData, PredictParcel } from '../../data/types';
import { formatNumber } from '../../lib/format';
import { areaFromPosition, areaRange, originalInputs, phenologyInputs, positionFromArea, simulate } from '../../model/whatIf';
import { RichText } from '../RichText';

const STEPS = 400;
const AREA_STEPS = 1000;
const fmt3 = (v: number) => formatNumber(v, 3);
const fmtHa = (v: number) => `${formatNumber(v)} ha`;

/** Remount with `key={parcel.id}` so a new parcel starts from its own stored inputs. */
export function WhatIf({ model, parcel, copy }: { model: ModelData; parcel: PredictParcel; copy: ExplorerCopy['whatIf'] }) {
  const id = useId();
  const inputs = useMemo(() => phenologyInputs(model, parcel), [model, parcel]);
  const range = useMemo(() => areaRange(model), [model]);
  const original = useMemo(() => originalInputs(model, parcel), [model, parcel]);
  const [values, setValues] = useState(original);
  const result = useMemo(() => simulate(model, parcel, values), [model, parcel, values]);

  return (
    <section className="whatif" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>{copy.title}</h3>
      <p className="muted">
        <RichText text={copy.intro} />
      </p>
      <div className="whatif__grid">
        <div className="whatif__sliders">
          {inputs.map((input) => {
            const value = values.phenology[input.name]!;
            return (
              <div key={input.name} className="whatif__slider">
                <label htmlFor={`${id}-${input.name}`}>
                  <span className="tone-phenology">{input.label}</span>
                  <output htmlFor={`${id}-${input.name}`}>{fmt3(value)}</output>
                </label>
                <input
                  id={`${id}-${input.name}`}
                  type="range"
                  min={input.min}
                  max={input.max}
                  step={(input.max - input.min) / STEPS}
                  value={value}
                  aria-valuetext={copy.valueText(fmt3(value), fmt3(input.original))}
                  onChange={(e) => setValues((v) => ({ ...v, phenology: { ...v.phenology, [input.name]: Number(e.target.value) } }))}
                />
                <span className="whatif__range" aria-hidden="true">
                  <span>{fmt3(input.min)}</span>
                  <span>{fmt3(input.max)}</span>
                </span>
              </div>
            );
          })}
          <div className="whatif__slider">
            <label htmlFor={`${id}-area`}>
              <span className="tone-location">{copy.areaLabel}</span>
              <output htmlFor={`${id}-area`}>{fmtHa(values.areaHa)}</output>
            </label>
            <input
              id={`${id}-area`}
              type="range"
              min={0}
              max={AREA_STEPS}
              step={1}
              value={Math.round(positionFromArea(values.areaHa, range) * AREA_STEPS)}
              aria-valuetext={copy.valueText(fmtHa(values.areaHa), fmtHa(original.areaHa))}
              onChange={(e) => setValues((v) => ({ ...v, areaHa: areaFromPosition(Number(e.target.value) / AREA_STEPS, range) }))}
            />
            <span className="whatif__range" aria-hidden="true">
              <span>{fmtHa(range.min)}</span>
              <span>{fmtHa(range.max)}</span>
            </span>
          </div>
        </div>

        <div className="whatif__result" aria-live="polite">
          <p className="whatif__estimate">
            <RichText text={copy.result(result)} />
          </p>
          <p>{copy.delta(result)}</p>
          {copy.moved(result) && (
            <p>
              <RichText text={copy.moved(result)} />
            </p>
          )}
          <button type="button" onClick={() => setValues(original)} disabled={result.isOriginal}>
            {copy.reset}
          </button>
        </div>
      </div>
    </section>
  );
}
