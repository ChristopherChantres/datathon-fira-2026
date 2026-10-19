// "Por qué importa" copy (visitor-facing, es-MX). Based on docs/model.md · "Why it matters";
// no statistics, institutions or results beyond it. Numbers come from the data.
import type { Story } from '../data/story';
import { isPredict } from '../data/types';
import { formatNumber, formatYield } from '../lib/format';
import type { StepCopy } from './types';

/** "April–October 2025" → 2025 (the season the estimates are for). */
export function seasonYearFromMeta(season: string): number | null {
  const match = /\b(\d{4})\b/.exec(season);
  return match ? Number(match[1]) : null;
}

export function impactoCopy(story: Story) {
  const { model, counts } = story;
  const flagged = model.parcels.filter(isPredict).filter((p) => p.attentionFlag).length;
  const level = Math.round(model.intervals.level * 100);
  const year = seasonYearFromMeta(model.meta.season);

  const cards: StepCopy[] = [
    {
      title: 'Evaluar crédito',
      body: ['Un analista no solo ve cuánto se espera que rinda una parcela, sino qué tan seguro está el modelo. El intervalo convierte esa duda en un riesgo medible.'],
    },
    {
      title: 'Pensar seguros agrícolas',
      body: ['El extremo bajo del intervalo es una referencia prudente, parcela por parcela, para conversar coberturas antes de la cosecha.'],
    },
    {
      title: 'Estimar y monitorear la productividad',
      body: ['Todo sale de datos públicos de satélite y clima, así que el mismo cálculo puede repetirse en muchas parcelas sin visitar cada una.'],
    },
    {
      title: 'Saber dónde mirar',
      body: ['Las parcelas con intervalo amplio o con aviso de [atención](error) son las que conviene verificar en campo.'],
    },
  ];

  return {
    intro: 'Un número por parcela, con su intervalo, ayuda a decidir.',
    cards,
    forest: {
      title: `Las ${counts.predict} parcelas, de su escenario prudente más alto al más bajo`,
      caption: [
        `Cada fila es una parcela: el punto es la [estimación](prediction) y la barra, su intervalo de ${level} %. Están ordenadas por el límite inferior del intervalo, de mayor a menor.`,
        'Un analista podría fijarse en ese extremo conservador, no solo en la estimación.',
        `En rojo, las [${flagged} parcelas con aviso de atención](error): conviene revisarlas en campo. Elige una fila para abrirla en el explorador.`,
      ],
      label: `Intervalos de ${level} % de las ${counts.predict} parcelas por predecir, ordenados por su límite inferior. Usa las flechas para recorrerlos y Enter para abrir una en el explorador.`,
      axis: 'Rendimiento (t/ha)',
      tip: (id: string, prediction: number, lo: number, hi: number, flagged: boolean) =>
        `${id} · ${formatYield(prediction)} · ${formatNumber(lo)} – ${formatNumber(hi)}${flagged ? ' · atención' : ''}`,
    },
    honesty: year
      ? `Son estimaciones del modelo para la temporada ${year}, no garantías.`
      : 'Son estimaciones del modelo, no garantías.',
  };
}
