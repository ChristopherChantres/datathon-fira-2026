// Development-only panel (never bundled in production): compares predict() with the
// values stored by the Python export for any predict parcel.
import { useMemo, useState } from 'react';
import type { ModelData, PredictParcel } from '../data/types';
import { isPredict } from '../data/types';
import { predict, withArea, type Contribution } from '../model/predict';
import './DebugPanel.css';

const fmt = (x: number) => x.toFixed(10);
const diff = (a: number, b: number) => Math.abs(a - b).toExponential(2);

export default function DebugPanel({ model }: { model: ModelData }) {
  const parcels = useMemo(() => model.parcels.filter(isPredict), [model]);
  const [open, setOpen] = useState(false);
  const [id, setId] = useState(parcels[0]?.id ?? '');
  const [area, setArea] = useState('');

  const parcel = parcels.find((p) => p.id === id);
  if (!parcel) return null;

  const areaValue = Number(area);
  const target: PredictParcel = area && areaValue > 0 ? withArea(parcel, areaValue) : parcel;
  const r = predict(model, target);
  const rows: [string, number, number | null][] = [
    ['prior', r.prior, parcel.prior.combined],
    ['modelA', r.modelA, parcel.modelA],
    ['modelB', r.modelB, parcel.modelB],
    ['unclipped', r.unclipped, null],
    ['prediction', r.prediction, parcel.prediction],
    ['interval80[0]', r.interval80[0], parcel.interval80[0]],
    ['interval80[1]', r.interval80[1], parcel.interval80[1]],
  ];

  return (
    <aside className={`debug ${open ? 'is-open' : ''}`} aria-label="Debug panel (development only)">
      <button type="button" className="debug__toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? 'Close debug' : 'Debug'}
      </button>
      {open && (
        <div className="debug__body">
          <div className="debug__controls">
            <label>
              Parcel{' '}
              <select value={id} onChange={(e) => setId(e.target.value)}>
                {parcels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.municipality}
                    {p.attentionFlag ? ' ⚑' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Area override (ha){' '}
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder={String(parcel.areaHa)}
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </label>
          </div>
          <p>
            regime: {parcel.regime} · clipped: {String(r.clipped)} · attentionFlag: {String(parcel.attentionFlag)}
            {target !== parcel && ' · values differ from stored because the area is overridden'}
          </p>
          <table>
            <thead>
              <tr>
                <th>value</th>
                <th>predict()</th>
                <th>stored</th>
                <th>|diff|</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([name, computed, stored]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{fmt(computed)}</td>
                  <td>{stored === null ? '—' : fmt(stored)}</td>
                  <td>{stored === null ? '—' : diff(computed, stored)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ContributionTable title={`Model A correction = ${fmt(r.correctionA)} (incl. priorCoef·prior = ${fmt(r.priorTermA)})`} rows={r.contributionsA} />
          <ContributionTable title="Model B contributions" rows={r.contributionsB} />
        </div>
      )}
    </aside>
  );
}

function ContributionTable({ title, rows }: { title: string; rows: Contribution[] }) {
  return (
    <table>
      <caption>{title}</caption>
      <thead>
        <tr>
          <th>feature</th>
          <th>x</th>
          <th>z</th>
          <th>coef</th>
          <th>coef·z</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.name}>
            <td>{c.name}</td>
            <td>{c.value.toPrecision(6)}</td>
            <td>{c.standardized.toFixed(4)}</td>
            <td>{c.coef.toFixed(4)}</td>
            <td>{c.contribution.toFixed(5)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
