// Minimal inline markup for the copy files, so editors can color words without JSX:
//   [texto](prediction)  → texto in the --prediction color
//   **texto**            → bold
export const TONES = ['location', 'phenology', 'prediction', 'train', 'error', 'muted'] as const;
export type Tone = (typeof TONES)[number];

export type RichSegment = { text: string; tone?: Tone; bold?: boolean };

const TOKEN = /\[([^\]]+)\]\(([a-z]+)\)|\*\*([^*]+)\*\*/g;

export function parseRich(source: string): RichSegment[] {
  const out: RichSegment[] = [];
  let last = 0;
  for (const match of source.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ text: source.slice(last, index) });
    const [, toned, tone, bold] = match;
    if (toned !== undefined) {
      if (!(TONES as readonly string[]).includes(tone!)) throw new Error(`Unknown tone "${tone}" in: ${source}`);
      out.push({ text: toned, tone: tone as Tone });
    } else {
      out.push({ text: bold!, bold: true });
    }
    last = index + match[0].length;
  }
  if (last < source.length) out.push({ text: source.slice(last) });
  return out;
}

/** The text without markup (for aria labels). */
export const plainText = (source: string) => parseRich(source).map((s) => s.text).join('');
