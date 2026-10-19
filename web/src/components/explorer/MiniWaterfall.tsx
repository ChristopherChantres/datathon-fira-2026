// Compact HTML waterfall for explain() steps (no new math: positions come from the steps).
import type { WaterfallStep } from '../../model/explain';
import { formatDelta, formatNumber } from '../../lib/format';

type Tone = 'location' | 'phenology' | 'muted';

interface Props {
  steps: WaterfallStep[];
  label: (s: WaterfallStep) => string;
  tones: { start: Tone; delta: Tone; minor: Tone; total: Tone };
  caption: string;
}

export function MiniWaterfall({ steps, label, tones, caption }: Props) {
  const levels = steps.flatMap((s) => [s.from, s.to]);
  const lo = Math.min(...levels);
  const hi = Math.max(...levels);
  const pad = Math.max((hi - lo) * 0.08, 0.002);
  const pct = (v: number) => ((v - (lo - pad)) / (hi - lo + 2 * pad)) * 100;
  const toneOf = (s: WaterfallStep) =>
    s.kind === 'start' ? tones.start : s.kind === 'total' ? tones.total : s.key === 'base' || s.key === 'others' ? tones.minor : tones.delta;

  return (
    <table className="mini-wf">
      <caption className="visually-hidden">{caption}</caption>
      <tbody>
        {steps.map((s) => {
          const level = s.kind !== 'delta';
          const left = pct(Math.min(s.from, s.to));
          const width = Math.max(0.6, pct(Math.max(s.from, s.to)) - left);
          return (
            <tr key={s.key} className={`tone-${toneOf(s)}${level ? ' is-level' : ''}`}>
              <th scope="row">{label(s)}</th>
              <td className="mini-wf__track" aria-hidden="true">
                {level ? (
                  <span className="mini-wf__level" style={{ left: `${pct(s.value)}%` }} />
                ) : (
                  <span className="mini-wf__bar" style={{ left: `${left}%`, width: `${width}%` }} />
                )}
              </td>
              <td className="mini-wf__value">{level ? formatNumber(s.value) : formatDelta(s.value)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
