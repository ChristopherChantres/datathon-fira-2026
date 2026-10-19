// The page must never mention an error floor (CLAUDE.md rule 7).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const webRoot = fileURLToPath(new URL('../../', import.meta.url));
const self = fileURLToPath(import.meta.url);

// Split so this file does not match its own patterns.
const FORBIDDEN = [['0', '.416'], ['0', ',416'], ['piso de', ' error'], ['error', ' floor']].map((p) => p.join(''));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe('forbidden strings', () => {
  const targets = [...files(join(webRoot, 'src')), join(webRoot, 'index.html')].filter((f) => f !== self);

  it.each(FORBIDDEN)('nothing in web/src or index.html contains "%s"', (needle) => {
    const hits = targets.filter((f) => readFileSync(f, 'utf8').toLowerCase().includes(needle));
    expect(hits.map((f) => relative(webRoot, f))).toEqual([]);
  });
});
