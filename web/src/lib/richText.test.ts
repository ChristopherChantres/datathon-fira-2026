import { describe, expect, it } from 'vitest';
import { parseRich, plainText } from './richText';

describe('parseRich', () => {
  it('splits toned and bold segments', () => {
    expect(parseRich('De [138 parcelas](train) sabemos **todo**.')).toEqual([
      { text: 'De ' },
      { text: '138 parcelas', tone: 'train' },
      { text: ' sabemos ' },
      { text: 'todo', bold: true },
      { text: '.' },
    ]);
    expect(plainText('a [b](location) **c**')).toBe('a b c');
  });

  it('rejects unknown tones', () => {
    expect(() => parseRich('[x](purple)')).toThrow(/purple/);
  });
});
