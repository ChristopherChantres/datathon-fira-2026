// Copy must stay true to the numbers it shows (Phase-2 review fixes).
import { describe, expect, it } from 'vitest';
import { buildStory, stateYieldStats } from '../data/story';
import { isPredict } from '../data/types';
import { distanceUpperBound, formatNumber } from '../lib/format';
import { explain } from '../model/explain';
import { curves, model } from '../test/fixtures';
import { FEATURED_PARCEL_ID } from './featured';
import { fenologiaCopy, seasonYear, stripSharedPrefix } from './fenologia';
import { modeloCopy } from './modelo';
import { displayedGap, problemaCopy } from './problema';

const story = buildStory(model, FEATURED_PARCEL_ID, true);

describe('"todas a menos de X" is true for every predict parcel', () => {
  it.each(model.parcels.filter(isPredict).map((p) => [p.id, p] as const))('%s', (_id, parcel) => {
    const max = Math.max(...parcel.prior.neighbors.map((n) => n.distanceKm));
    const bound = distanceUpperBound(max);
    expect(bound.km).toBeGreaterThanOrEqual(max);
    const text = modeloCopy({ ...story, featured: parcel }, explain(model, parcel)).steps[2]!.body[0]!;
    expect(text).toContain(`a menos de ${bound.text}`);
  });

  it('rounds up, never down', () => {
    expect(distanceUpperBound(2.9156)).toEqual({ km: 3, text: '3 km' });
    expect(distanceUpperBound(3)).toEqual({ km: 3, text: '3 km' });
    expect(distanceUpperBound(42.7261).text).toBe('43 km');
    expect(distanceUpperBound(0.512)).toEqual({ km: 0.6, text: '600 m' });
    expect(distanceUpperBound(0.95).text).toBe('1 km');
  });
});

describe('state gap equals the difference of the displayed means', () => {
  it('matches the two rounded means', () => {
    const states = stateYieldStats(model);
    const high = states[0]!;
    const low = states[states.length - 1]!;
    const shownHigh = Number(formatNumber(high.mean));
    const shownLow = Number(formatNumber(low.mean));
    expect(displayedGap(high.mean, low.mean)).toBeCloseTo(shownHigh - shownLow, 10);
    const text = problemaCopy(story).steps[2]!.body.join(' ');
    expect(text).toContain(`${formatNumber(shownHigh - shownLow)} t/ha de diferencia`);
  });

  it('does not claim how yields were measured', () => {
    const text = problemaCopy(story).steps.flatMap((s) => s.body).join(' ');
    expect(text).not.toMatch(/medido en campo/);
  });
});

describe('satellite copy', () => {
  const copy = fenologiaCopy(story, curves);
  it('derives the season year from the curve dates', () => {
    const year = seasonYear(curves.curves[FEATURED_PARCEL_ID]!.milestones.sosDate);
    expect(copy.steps[0]!.body[0]).toContain(`temporada ${year}`);
    expect(curves.curves[FEATURED_PARCEL_ID]!.smooth.every(([d]) => d.startsWith(String(year)))).toBe(true);
  });

  it('lists the model inputs without repeating the shared prefix', () => {
    expect(stripSharedPrefix(['Verdor inicial · LAI (Planet)', 'Verdor inicial · NDVI (Planet)'])).toEqual(['LAI (Planet)', 'NDVI (Planet)']);
    expect(stripSharedPrefix(['A · x', 'B · y'])).toEqual(['A · x', 'B · y']);
    const sentence = copy.steps[3]!.body[1]!;
    expect(sentence.match(/Verdor inicial/g)).toBeNull();
  });
});

describe('model copy', () => {
  it('calls the intercept + prior term a base adjustment, not a fixed one', () => {
    const text = modeloCopy(story, explain(model, story.featured)).steps[4]!.body.join(' ');
    expect(text).toContain('ajuste base');
    expect(text).not.toContain('fijo');
  });
});
