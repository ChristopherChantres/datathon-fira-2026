import { describe, expect, it } from 'vitest';
import { isTrain } from '../data/types';
import { model } from '../test/fixtures';
import { explorerHash, parcelFromHash, sectionFromHash } from './deepLink';

const FALLBACK = 'AGC_016';

describe('explorer deep links', () => {
  it('selects a valid predict parcel', () => {
    expect(parcelFromHash('#explorador?parcela=AGC_003', model, FALLBACK)).toBe('AGC_003');
    expect(parcelFromHash(explorerHash('AGC_011'), model, FALLBACK)).toBe('AGC_011');
  });

  it('falls back for unknown ids, train ids, other sections and missing params', () => {
    const train = model.parcels.find(isTrain)!.id;
    for (const hash of ['#explorador?parcela=NOPE', `#explorador?parcela=${train}`, '#modelo?parcela=AGC_003', '#explorador', '', '#explorador?x=1']) {
      expect(parcelFromHash(hash, model, FALLBACK), hash).toBe(FALLBACK);
    }
  });

  it('extracts the section id without the query', () => {
    expect(sectionFromHash('#explorador?parcela=AGC_003')).toBe('explorador');
    expect(sectionFromHash('#modelo')).toBe('modelo');
    expect(sectionFromHash('')).toBe('');
  });
});
