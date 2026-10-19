// Hero copy (visitor-facing, es-MX). Numbers come from the data through `story`.
import type { Story } from '../data/story';
import { joinSpanish, placeName } from '../lib/format';

export function heroCopy(story: Story) {
  const { counts, featured } = story;
  const stateNames = joinSpanish([...new Set(story.model.municipalities.map((m) => placeName(m.state)))].sort());
  return {
    title: '¿Cuánta cebada dará esta parcela?',
    subtitle:
      `En ${stateNames} hay ${counts.total} parcelas de cebada de temporal. ` +
      `De [${counts.train}](train) sabemos cuánto rindieron; [${counts.predict}](prediction) quedan por predecir. ` +
      `Esta es una de ellas: **${featured.id}**, en ${placeName(featured.municipality)}, ${placeName(featured.state)}.`,
    cue: 'Desliza para averiguarlo',
  };
}
