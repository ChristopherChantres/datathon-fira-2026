import { parseRich } from '../lib/richText';

export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((s, i) =>
        s.tone ? (
          <span key={i} className={`tone-${s.tone}`}>
            {s.text}
          </span>
        ) : s.bold ? (
          <strong key={i}>{s.text}</strong>
        ) : (
          s.text
        ),
      )}
    </>
  );
}
