// "El modelo" copy (visitor-facing, es-MX). Every number comes from explain() / the data.
import type { Story } from '../data/story';
import type { Explanation, WaterfallStep } from '../model/explain';
import { distanceUpperBound, formatDelta, formatDistance, formatNumber, formatPercent, formatYield, joinSpanish, placeName } from '../lib/format';
import type { StepCopy } from './types';

const STATE_PREFIX = 'ubi_est_';
const MUNICIPALITY_PREFIX = 'ubi_mun_';

/** Spanish label for a model B input, phrased by the parcel's own value (dummies are 0/1). */
export function locationFeatureLabel(name: string, value: number | undefined): string {
  if (name.startsWith(STATE_PREFIX)) {
    const state = placeName(name.slice(STATE_PREFIX.length));
    return value === 1 ? `Estado: ${state}` : `No es ${state}`;
  }
  if (name.startsWith(MUNICIPALITY_PREFIX)) {
    const mun = placeName(name.slice(MUNICIPALITY_PREFIX.length));
    return value === 1 ? `Municipio: ${mun}` : `No está en ${mun}`;
  }
  const fixed: Record<string, string> = {
    ubi_lon: 'Longitud',
    ubi_lat: 'Latitud',
    ubi_area_ha: 'Superficie',
    ubi_log_area: 'Log de la superficie',
  };
  return fixed[name] ?? name;
}

export function modeloCopy(story: Story, e: Explanation) {
  const { featured, counts, model } = story;
  const p = e.prior;
  const mun = placeName(featured.municipality);
  const ens = e.ensemble;
  const maxDistance = Math.max(...p.neighbors.map((n) => n.distanceKm));
  const percent = (w: number) => formatPercent(w);

  const phenoLabel = (name: string) => model.modelA.features.find((f) => f.name === name)?.label.es ?? name;
  const stepLabelA = (s: WaterfallStep) =>
    s.kind === 'start' ? 'Prior' : s.kind === 'total' ? 'Modelo A' : s.key === 'base' ? 'Ajuste base' : phenoLabel(s.key);
  const stepLabelB = (s: WaterfallStep) =>
    s.kind === 'start'
      ? 'Punto de partida'
      : s.kind === 'total'
        ? 'Modelo B'
        : s.key === 'others'
          ? `Otras ${s.features.length}`
          : locationFeatureLabel(s.key, featured.features[s.key]);

  const correction = e.breakdown.correctionA;
  const phenoDeltas = e.waterfallA.filter((s) => s.kind === 'delta' && s.key !== 'base');
  const baseStep = e.waterfallA.find((s) => s.key === 'base')!;
  const topB = e.waterfallB.filter((s) => s.kind === 'delta' && s.key !== 'others');
  const [lo, hi] = ens.clip;
  const levelPct = Math.round(ens.level * 100);

  const steps: StepCopy[] = [
    {
      title: 'Sin saber nada',
      body: [
        `Si no supiéramos nada de la parcela **${featured.id}**, la mejor apuesta sería el promedio de las ${counts.train} parcelas conocidas: **${formatYield(p.globalMean)}**.`,
      ],
    },
    {
      title: 'Su municipio',
      body: [
        `Pero sabemos que está en [${mun}](location). Ahí, ${p.municipalN} parcelas conocidas promedian ${p.rawMunicipalMean === null ? '—' : formatYield(p.rawMunicipalMean)}.`,
        `Antes de usar ese promedio lo acercamos un poco a la media global, como si sumáramos ${formatNumber(p.smoothing, 1)} parcelas con el promedio general. Queda en [${formatYield(p.municipalMean)}](location).`,
        `En un municipio con pocas parcelas ese ajuste pesa mucho; con ${p.municipalN}, casi nada.`,
      ],
    },
    {
      title: 'Sus vecinas',
      body: [
        `Más cerca todavía: las [${p.neighbors.length} parcelas conocidas más próximas](location), todas a menos de ${distanceUpperBound(maxDistance).text}.`,
        `Cada una pesa más mientras más cerca está. La más cercana está a ${formatDistance(p.nearest.distanceKm)} y se lleva el ${percent(p.nearest.weight)} del peso.`,
        `Su promedio ponderado: [${formatYield(p.neighborMean)}](location).`,
      ],
    },
    {
      title: 'El prior',
      body: [
        `Juntamos las dos pistas: ${percent(p.municipalWeight)} municipio y ${percent(p.knnWeight)} vecinas.`,
        `El resultado, [${formatYield(p.combined)}](location), es el **prior**: lo que la ubicación sola dice de ${featured.id}.`,
      ],
    },
    {
      title: 'El satélite corrige',
      body: [
        'Ahora entra el satélite. Ampliamos la escala para ver los pasos.',
        `Partimos del prior, aplicamos un pequeño ajuste base ([${formatDelta(baseStep.value)}](muted)) y sumamos el efecto del verdor inicial: ${joinSpanish(phenoDeltas.map((s) => `[${formatDelta(s.value)}](phenology)`))} t/ha.`,
        `En total, la corrección es de ${formatDelta(correction)} t/ha y el [modelo A](phenology) queda en ${formatYield(e.breakdown.modelA)}.`,
        'La ubicación hace el trabajo pesado; el satélite afina.',
      ],
    },
    {
      title: 'Una segunda opinión',
      body: [
        `El [modelo B](location) solo mira la ubicación: coordenadas, superficie, estado y municipio. Parte de ${formatYield(e.waterfallB[0]!.value)} y suma efectos; los ${topB.length} más grandes aquí son ${joinSpanish(topB.map((s) => `${lowerFirst(stepLabelB(s))} (${formatDelta(s.value)})`))}.`,
        `Resultado: [${formatYield(e.breakdown.modelB)}](location).`,
        `Es una regresión **Ridge**: encoge los coeficientes para que ${counts.train} parcelas alcancen y ninguna variable se lleve sola el crédito. Por eso estado y municipio, que dicen casi lo mismo, se reparten el efecto.`,
      ],
    },
    {
      title: 'La predicción',
      body: [
        `Combinamos las dos opiniones: ${formatNumber(ens.weightA, 4)} × [A](phenology) + ${formatNumber(ens.weightB, 4)} × [B](location). Los pesos se eligieron para que la combinación se equivocara lo menos posible con parcelas que no había visto.`,
        ens.clipped
          ? `El resultado salía del rango observado (${formatNumber(lo)}–${formatNumber(hi)} t/ha), así que lo recortamos.`
          : `Si el resultado saliera del rango observado (${formatNumber(lo)}–${formatNumber(hi)} t/ha) lo recortaríamos; aquí no hace falta.`,
        `Nuestra estimación para ${featured.id}: [${formatYield(ens.prediction)}](prediction).`,
        `Ningún modelo es exacto, así que damos un intervalo de ${levelPct}\u00a0%: [entre ${formatNumber(ens.interval[0])} y ${formatYield(ens.interval[1])}](prediction). Esperamos que el rendimiento real caiga ahí ${Math.round(ens.level * 10)} de cada 10 veces.`,
      ],
    },
    {
      title: 'La receta completa',
      body: [
        `Esa es la fórmula entera, la misma para las ${counts.predict} parcelas por predecir.`,
        'Más abajo, en el explorador, puedes probarla con cualquiera de ellas.',
      ],
    },
  ];

  return {
    steps,
    stepLabelA,
    stepLabelB,
    graphicLabel: `Explicación paso a paso de la estimación para ${featured.id}. Cada paso del texto describe lo que muestra.`,
    labels: {
      axis: 'Rendimiento (t/ha)',
      globalMean: 'media global',
      municipalMean: `media de ${mun}`,
      neighborMean: 'media de vecinas',
      prior: 'prior',
      zoomed: 'escala ampliada',
      estimate: 'estimación',
      interval: `intervalo de ${levelPct}\u00a0%`,
      featuredTag: featured.id,
      nearest: `${formatDistance(p.nearest.distanceKm)} · ${percent(p.nearest.weight)}`,
      neighborResult: `media ponderada ${formatNumber(p.neighborMean)}`,
    },
  };
}

// Formulas (KaTeX). Colors use the palette classes allowed by <Formula>.
export const tone = (cls: 'location' | 'phenology' | 'prediction', tex: string) => String.raw`\htmlClass{tex-${cls}}{${tex}}`;

/** prior = w_mun · ȳ_mun + w_vec · ȳ_vec, then the featured parcel's numbers. */
export function priorTex(e: Explanation): string {
  const p = e.prior;
  return String.raw`\begin{aligned}
\text{prior} &= w_{\text{mun}}\,\bar y_{\text{mun}} + w_{\text{vec}}\,\bar y_{\text{vec}} \\
&= ${p.municipalWeight} \times ${tone('location', formatNumber(p.municipalMean))} + ${p.knnWeight} \times ${tone('location', formatNumber(p.neighborMean))} = ${tone('location', formatNumber(p.combined))}
\end{aligned}`;
}

/** The full ensemble with the weights and clip range from model.json. */
export function ensembleTex(story: Story): string {
  const { weightA, weightB, clip } = story.model.ensemble;
  const [lo, hi] = clip;
  return (
    String.raw`${tone('prediction', String.raw`\hat{y}`)} = \min\!\Big(\max\big(` +
    String.raw`${weightA}\,${tone('phenology', 'A')} + ${weightB}\,${tone('location', 'B')},\; ${formatNumber(lo)}\big),\; ${formatNumber(hi)}\Big)`
  );
}

export function ensembleCaption(): string {
  return '[A](phenology): ubicación + corrección por fenología · [B](location): ubicación · [ŷ](prediction): rendimiento estimado (t/ha)';
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
