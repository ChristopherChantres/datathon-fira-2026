// Guards for the copy folder: submission details have no placeholders, and figures are
// never typed into visitor text outside facts.ts.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { model } from '../test/fixtures';
import { facts } from './facts';
import { seasonYearFromMeta } from './impacto';
import { site } from './site';
import { videoId } from './video';
import { sectionCopy } from './sections';

const dir = fileURLToPath(new URL('.', import.meta.url));
// Widened: the configured value is a literal type, but either form must stay valid.
const videoUrl: string = site.videoUrl;
const read = (file: string) => readFileSync(join(dir, file), 'utf8');

/** The text of every string and template literal (outside ${…}), skipping comments. */
export function stringLiterals(source: string): string[] {
  const out: string[] = [];
  let i = 0;
  const stack: ('code' | 'template')[] = ['code'];
  let braces: number[] = [];
  while (i < source.length) {
    const c = source[i]!;
    const mode = stack[stack.length - 1];
    if (mode === 'template') {
      let text = '';
      while (i < source.length && source[i] !== '`' && !(source[i] === '$' && source[i + 1] === '{')) {
        text += source[i] === '\\' ? source[i]! + source[++i]! : source[i];
        i++;
      }
      out.push(text);
      if (source[i] === '`') {
        stack.pop();
        i++;
      } else {
        stack.push('code');
        braces.push(0);
        i += 2;
      }
      continue;
    }
    if (c === '/' && source[i + 1] === '/') {
      i = source.indexOf('\n', i);
      if (i < 0) break;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      i = source.indexOf('*/', i) + 2;
      continue;
    }
    if (c === "'" || c === '"') {
      let text = '';
      i++;
      while (i < source.length && source[i] !== c) {
        text += source[i] === '\\' ? source[i]! + source[++i]! : source[i];
        i++;
      }
      out.push(text);
      i++;
      continue;
    }
    if (c === '`') {
      stack.push('template');
      i++;
      continue;
    }
    if (stack.length > 1 && braces.length) {
      if (c === '{') braces[braces.length - 1]!++;
      if (c === '}') {
        if (braces[braces.length - 1] === 0) {
          braces.pop();
          stack.pop();
          i++;
          continue;
        }
        braces[braces.length - 1]!--;
      }
    }
    i++;
  }
  braces = [];
  return out;
}

// Digits that are names, not figures: data products, parcel ids, unicode escapes, and
// "X de cada 10/100" whose X is computed.
const ALLOWED = [/Sentinel-2/g, /CHIRTS-ERA5/g, /\bAGC_\d+\b/g, /\\u[0-9a-fA-F]{4}/g, /de cada 10{1,2}\b/g];

describe('site.ts', () => {
  it('has no placeholders', () => {
    const source = read('site.ts');
    expect(source).not.toMatch(/<[^>]*>/);
    expect(source).not.toMatch(/TODO|coming soon|lorem/i);
    for (const literal of stringLiterals(source)) expect(literal).not.toContain('<');
  });

  it('has the submission details', () => {
    expect(site.teamName).not.toBe('');
    expect(site.members.length).toBeGreaterThan(0);
    for (const m of site.members) expect(m.name.trim()).not.toBe('');
    expect(site.repoUrl).toMatch(/^https:\/\/github\.com\//);
    expect(videoUrl === '' || /^https:\/\//.test(videoUrl)).toBe(true);
  });

  it('has a video URL the facade can play, or none at all', () => {
    expect(videoUrl === '' || videoId !== null).toBe(true);
    const ids = sectionCopy(model).map((s) => s.id);
    expect(ids.includes('video')).toBe(videoId !== null);
    if (videoId) expect(ids.slice(0, 3)).toEqual(['hero', 'video', 'problema']);
  });
});

describe('figures in copy', () => {
  // site.ts holds names and URLs (e.g. "Datathon FIRA 2026"), guarded above.
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'facts.ts' && f !== 'site.ts');

  it.each(files)('%s types no figures into visitor text', (file) => {
    const offenders = stringLiterals(read(file))
      .map((text) => ALLOWED.reduce((t, re) => t.replace(re, ''), text))
      .filter((text) => /\d/.test(text));
    expect(offenders).toEqual([]);
  });

  it('the scanner sees through templates and skips comments and expressions', () => {
    expect(stringLiterals("// 'x 1'\nconst a = `b ${f('c', 2)} d 3`; /* '4' */ const e = \"5\";")).toEqual(['b ', 'c', ' d 3', '5']);
  });

  // docs/ is not in the Docker build context, so this check only runs locally.
  const docPath = fileURLToPath(new URL('../../../docs/model.md', import.meta.url));
  it.skipIf(!existsSync(docPath))('facts.ts only holds figures stated in docs/model.md', () => {
    const doc = readFileSync(docPath, 'utf8');
    expect(doc).toContain(`r ≈ +${facts.seasonLengthCorrelation}`);
    expect(doc).toContain(`${facts.climatePixels} climate pixels`);
    expect(doc).toContain(`~${facts.climatePixelKm} km`);
    expect(doc).toContain('April–June rainfall');
    expect(doc).toContain(`${facts.attentionWorstN} worst-predicted`);
    expect(doc).toContain(`${facts.attentionRadiusM} m`);
  });
});

describe('season year', () => {
  it('comes from model.json meta.season', () => {
    expect(seasonYearFromMeta(model.meta.season)).toBe(Number(/\d{4}/.exec(model.meta.season)![0]));
    expect(seasonYearFromMeta('sin año')).toBeNull();
  });
});
