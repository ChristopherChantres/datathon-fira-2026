// Explorer copy (visitor-facing, es-MX). Numbers come from the data / predict().
import type { Story } from '../data/story';
import type { PredictParcel } from '../data/types';
import { formatDelta, formatNumber, formatYield, placeName } from '../lib/format';
import type { Explanation } from '../model/explain';
import type { WhatIfResult } from '../model/whatIf';
import { tone } from './modelo';

export function explorerCopy(story: Story) {
  const { counts, model } = story;
  const level = Math.round(model.intervals.level * 100);
  return {
    intro: `Elige cualquiera de las [${counts.predict} parcelas por predecir](prediction) en el mapa, en el buscador o en la tabla. El modelo corre aquí mismo, en tu navegador.`,
    search: {
      label: 'Buscar parcela',
      placeholder: 'ID o municipio',
      empty: 'Ninguna parcela coincide.',
      option: (p: PredictParcel) => `${p.id} · ${placeName(p.municipality)}, ${placeName(p.state)}`,
    },
    mapLabel: `Mapa de las ${counts.predict} parcelas por predecir; las ${counts.train} conocidas aparecen tenues. Usa las flechas y Enter para elegir una.`,
    result: {
      caption: (id: string) => `${id} · estimación`,
      interval: (lo: number, hi: number) => `intervalo de ${level}\u00a0%: ${formatNumber(lo)} – ${formatYield(hi)}`,
      axis: 'Rendimiento (t/ha)',
      dots: `Puntos grises: los ${counts.train} rendimientos conocidos.`,
      municipality: 'Municipio',
      state: 'Estado',
      area: 'Superficie',
      areaValue: (ha: number) => `${formatNumber(ha)} ha`,
      regime: (p: PredictParcel) => {
        const half = formatNumber(model.intervals.halfWidth[p.regime]);
        return p.regime === 'rounded'
          ? `En este municipio los rendimientos reportados vienen redondeados; por eso el intervalo usa ±${half} t/ha.`
          : `En este municipio los rendimientos reportados son medidos (sin redondear); el intervalo usa ±${half} t/ha.`;
      },
      attention:
        'Atención: a menos de 500 m está una de las 10 parcelas que el modelo predijo peor en validación; tómalo con más cautela.',
    },
    breakdown: {
      title: '¿De dónde sale?',
      prior: 'Ubicación: el prior',
      priorLines: (p: PredictParcel, e: Explanation) => [
        `Media de [${placeName(p.municipality)}](location) (${e.prior.municipalN} parcelas, ajustada): ${formatYield(e.prior.municipalMean)}`,
        `Media ponderada de sus [${e.prior.neighbors.length} vecinas](location): ${formatYield(e.prior.neighborMean)}`,
      ],
      neighbors: `Cada línea es una vecina conocida; más gruesa, más peso. Pasa el cursor o usa las flechas para ver cada una.`,
      neighborTip: (id: string, distance: string, yieldValue: number, share: string) => [id, `a ${distance}`, `Rendimiento real: ${formatYield(yieldValue)}`, `Peso: ${share}`],
      modelA: 'Modelo A: el satélite corrige',
      modelB: 'Modelo B: segunda opinión (top 5 + otras)',
      ensemble: 'La combinación',
      ensembleTex: (e: Explanation) =>
        String.raw`${tone('prediction', String.raw`\hat y`)} = ${e.ensemble.weightA} \times ${tone('phenology', formatNumber(e.ensemble.modelA))} + ${e.ensemble.weightB} \times ${tone('location', formatNumber(e.ensemble.modelB))} = ${tone('prediction', formatNumber(e.ensemble.prediction))}`,
      ensembleNote: (e: Explanation) =>
        e.ensemble.clipped
          ? `El resultado salía del rango observado, así que se recortó a ${formatYield(e.ensemble.prediction)}.`
          : `Dentro del rango observado (${formatNumber(e.ensemble.clip[0])}–${formatNumber(e.ensemble.clip[1])} t/ha): no hace falta recortar.`,
      zoomed: 'escala ampliada',
    },
    whatIf: {
      title: '¿Y si…?',
      intro:
        'Mueve los datos del satélite o la superficie y mira cómo responde el modelo. Es una **simulación del modelo**, no una nueva medición: la ubicación (el prior) no cambia.',
      areaLabel: 'Superficie (ha, escala logarítmica)',
      valueText: (value: string, original: string) => `${value}; valor original ${original}`,
      result: (r: WhatIfResult) => `Con estos valores: [${formatYield(r.simulated.prediction)}](prediction)`,
      delta: (r: WhatIfResult) =>
        r.isOriginal ? 'Son los datos originales de la parcela.' : `${formatDelta(r.delta)} t/ha frente a la estimación original (${formatYield(r.original.prediction)}).`,
      moved: (r: WhatIfResult) =>
        r.movedA && r.movedB
          ? 'Se movieron el [modelo A](phenology) (satélite) y el [modelo B](location) (superficie).'
          : r.movedA
            ? 'Se movió el [modelo A](phenology): el satélite.'
            : r.movedB
              ? 'Se movió el [modelo B](location): la superficie.'
              : '',
      reset: 'Restablecer',
    },
    table: {
      caption: `Las ${counts.predict} estimaciones. Elige una fila para verla en el explorador.`,
      columns: { id: 'Parcela', municipality: 'Municipio', state: 'Estado', prediction: 'Estimación (t/ha)', interval: `Intervalo ${level}\u00a0%`, flag: 'Aviso' },
      flag: 'Atención',
      sortHint: 'Ordenar',
    },
    download: `Descargar las ${counts.predict} predicciones (CSV)`,
    loading: 'Preparando el explorador…',
  };
}

export type ExplorerCopy = ReturnType<typeof explorerCopy>;
