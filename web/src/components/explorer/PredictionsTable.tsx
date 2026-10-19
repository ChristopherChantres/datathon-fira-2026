// All 59 estimates; sortable, and choosing a row selects it in the explorer.
import { useMemo, useState } from 'react';
import type { ExplorerCopy } from '../../content/explorador';
import type { ModelData, PredictParcel } from '../../data/types';
import { formatNumber, placeName } from '../../lib/format';
import { predictionsCsv } from '../../model/csv';

type Key = 'id' | 'municipality' | 'state' | 'prediction' | 'interval' | 'flag';
type Dir = 'ascending' | 'descending';

const value = (p: PredictParcel, key: Key): string | number =>
  key === 'prediction' ? p.prediction : key === 'interval' ? p.interval80[0] : key === 'flag' ? Number(p.attentionFlag) : key === 'id' ? p.id : p[key];

interface Props {
  model: ModelData;
  parcels: PredictParcel[];
  selectedId: string;
  onSelect: (id: string) => void;
  copy: ExplorerCopy['table'];
  downloadLabel: string;
}

export function PredictionsTable({ model, parcels, selectedId, onSelect, copy, downloadLabel }: Props) {
  const [sort, setSort] = useState<{ key: Key; dir: Dir }>({ key: 'id', dir: 'ascending' });
  const rows = useMemo(() => {
    const sign = sort.dir === 'ascending' ? 1 : -1;
    return [...parcels].sort((a, b) => {
      const va = value(a, sort.key);
      const vb = value(b, sort.key);
      const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
      return c !== 0 ? sign * c : a.id.localeCompare(b.id);
    });
  }, [parcels, sort]);

  const header = (key: Key) => (
    <th scope="col" aria-sort={sort.key === key ? sort.dir : undefined}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'ascending' ? 'descending' : 'ascending' }))}
        aria-label={`${copy.columns[key]}. ${copy.sortHint}`}
      >
        {copy.columns[key]}
        <span aria-hidden="true" className="table__arrow">
          {sort.key === key ? (sort.dir === 'ascending' ? '▲' : '▼') : ''}
        </span>
      </button>
    </th>
  );

  const download = () => {
    const blob = new Blob([predictionsCsv(model)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'predicciones_59_agrocebada.csv';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="predictions">
      {/* A <caption> is as wide as the table and scrolls away on phones; show it outside. */}
      <p className="predictions__caption" aria-hidden="true">
        {copy.caption}
      </p>
      <div className="predictions__scroll">
        <table className="predictions__table">
          <caption className="visually-hidden">{copy.caption}</caption>
          <thead>
            <tr>
              {header('id')}
              {header('municipality')}
              {header('state')}
              {header('prediction')}
              {header('interval')}
              {header('flag')}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={p.id === selectedId ? 'is-selected' : undefined} aria-current={p.id === selectedId || undefined} onClick={() => onSelect(p.id)}>
                <th scope="row">
                  <button type="button" className="predictions__pick" onClick={(e) => (e.stopPropagation(), onSelect(p.id))}>
                    {p.id}
                  </button>
                </th>
                <td>{placeName(p.municipality)}</td>
                <td>{placeName(p.state)}</td>
                <td className="num tone-prediction">{formatNumber(p.prediction)}</td>
                <td className="num">
                  {formatNumber(p.interval80[0])} – {formatNumber(p.interval80[1])}
                </td>
                <td>{p.attentionFlag ? <span className="tone-error">{copy.flag}</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="predictions__download" onClick={download}>
        {downloadLabel}
      </button>
    </div>
  );
}
