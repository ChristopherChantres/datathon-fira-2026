// Accessible combobox (ARIA 1.2 pattern): type an id or municipality, pick with arrows + Enter.
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ExplorerCopy } from '../../content/explorador';
import type { PredictParcel } from '../../data/types';

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

interface Props {
  parcels: PredictParcel[];
  selectedId: string;
  onSelect: (id: string) => void;
  copy: ExplorerCopy['search'];
}

export function ParcelPicker({ parcels, selectedId, onSelect, copy }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return parcels;
    return parcels.filter((p) => normalize(`${p.id} ${p.municipality} ${p.state}`).includes(q));
  }, [parcels, query]);

  const choose = (parcel: PredictParcel | undefined) => {
    if (!parcel) return;
    onSelect(parcel.id);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setOpen(true);
        setActive((a) => Math.min(matches.length - 1, open ? a + 1 : 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        break;
      case 'Enter':
        if (open) {
          event.preventDefault();
          choose(matches[active]);
        }
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          setOpen(false);
        } else setQuery('');
        break;
    }
  };

  const selected = parcels.find((p) => p.id === selectedId);
  return (
    <div className="picker">
      <label htmlFor={`${id}-input`} className="picker__label">
        {copy.label}
      </label>
      <div className="picker__box">
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${id}-opt-${matches[active]!.id}` : undefined}
          placeholder={selected ? copy.option(selected) : copy.placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {open && (
          <ul id={listId} role="listbox" className="picker__list" aria-label={copy.label}>
            {matches.length === 0 && <li className="picker__empty">{copy.empty}</li>}
            {matches.map((p, i) => (
              <li
                key={p.id}
                id={`${id}-opt-${p.id}`}
                role="option"
                aria-selected={i === active}
                className={`picker__option${i === active ? ' is-active' : ''}${p.id === selectedId ? ' is-current' : ''}`}
                // mousedown, not click: it fires before the input's blur closes the list.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(p);
                }}
                onMouseEnter={() => setActive(i)}
              >
                {copy.option(p)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
