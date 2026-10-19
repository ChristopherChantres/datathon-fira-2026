// "El reto" copy (visitor-facing, es-MX). Numbers come from the data through `story`.
import type { Story } from '../data/story';
import { formatNumber, formatYield, joinSpanish, placeName, roundTo } from '../lib/format';
import type { StepCopy } from './types';

export function problemaCopy(story: Story) {
  const { counts, states } = story;
  const stateNames = joinSpanish(states.map((s) => placeName(s.state)).sort());
  const byState = states.map((s, i) =>
    i === 0 ? `en ${placeName(s.state)} el promedio es ${formatYield(s.mean)}` : `en ${placeName(s.state)}, ${formatNumber(s.mean)}`,
  );
  const highest = states[0]!;
  const lowest = states[states.length - 1]!;

  const steps: StepCopy[] = [
    {
      title: `${counts.total} parcelas, ${counts.municipalities} municipios, ${counts.states} estados`,
      body: [
        `Cada punto es una parcela de cebada de temporal en ${stateNames}: sin riego, depende de la lluvia.`,
      ],
    },
    {
      title: '¿Qué sabemos de cada una?',
      body: [
        `De [${counts.train} parcelas](train) conocemos el rendimiento reportado.`,
        `Las otras [${counts.predict}](prediction) son la pregunta del reto: su rendimiento no lo conocemos. Las marcamos con «?».`,
      ],
    },
    {
      title: 'La ubicación dice mucho',
      body: [
        'Acomodemos las parcelas conocidas según su rendimiento en toneladas por hectárea, una fila por estado.',
        `${capitalize(joinSpanish(byState))}.`,
        `Entre ${placeName(highest.state)} y ${placeName(lowest.state)} hay ${formatYield(displayedGap(highest.mean, lowest.mean))} de diferencia. Saber dónde está una parcela ya dice mucho.`,
      ],
    },
    {
      title: 'Ahora, las que faltan',
      body: [
        `De vuelta al mapa. Estas [${counts.predict} parcelas](prediction) son las que hay que adivinar.`,
        'Para cada una vamos a estimar un número… y qué tan seguros estamos de él.',
      ],
    },
  ];

  return {
    steps,
    graphicLabel: `Mapa de las ${counts.total} parcelas. Cada paso del texto describe lo que muestra.`,
    legendKnown: `${counts.train} con rendimiento conocido`,
    legendUnknown: `${counts.predict} por predecir`,
    axisLabel: 'Rendimiento (t/ha)',
    meanLabel: (mean: number) => `media ${formatNumber(mean)}`,
    stateLabel: (state: string) => placeName(state),
    municipalityLabel: (name: string) => placeName(name),
  };
}

/** The gap between two means as a reader computes it from the two displayed (2-decimal) values. */
export function displayedGap(high: number, low: number): number {
  return roundTo(roundTo(high, 2) - roundTo(low, 2), 2);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
