// "¿Qué tan bien funciona?" copy (visitor-facing, es-MX). Every number from model.json.
import type { Story } from '../data/story';
import { formatNumber, placeName } from '../lib/format';
import { intervalCoverage, ladder, repeats, validationScheme, type LadderKey } from '../model/performance';

const metric = (x: number) => formatNumber(x, 3);
const STRATA: Record<string, string> = { municipality: 'municipio', state: 'estado' };

export function desempenoCopy(story: Story) {
  const { model, counts } = story;
  const v = model.validation;
  const scheme = validationScheme(model);
  const rungs = ladder(model);
  const byKey = (k: LadderKey) => rungs.find((r) => r.key === k)!;
  const fewer = (base: number) => Math.round((1 - v.rmse / base) * 100);
  const reps = repeats(model).map((r) => r.rmse);
  const level = Math.round(model.intervals.level * 100);
  const strata = scheme.stratifiedBy ? STRATA[scheme.stratifiedBy] : null;

  return {
    intro: [
      `Para medir el error usamos validación cruzada: repartimos las ${counts.train} parcelas conocidas en ${scheme.folds} grupos${strata ? `, equilibrados por ${strata}` : ''}, y estimamos cada grupo con un modelo entrenado sin él.`,
      `Lo repetimos ${scheme.repeats} veces con grupos distintos. Así, cada parcela fue estimada por modelos que nunca la vieron.`,
    ],
    ladder: {
      title: 'Del promedio a nuestro modelo',
      metric: 'Error típico, en t/ha · RMSE',
      explain: 'El RMSE es la distancia típica entre la estimación y el valor real; castiga más los errores grandes. Menos es mejor.',
      labels: {
        globalMean: 'Adivinar siempre el promedio',
        municipalMean: 'Adivinar el promedio de cada municipio',
        model: 'Nuestro modelo',
      } satisfies Record<LadderKey, string>,
      value: (k: LadderKey) => (k === 'model' ? `${metric(v.rmse)} ± ${metric(v.rmseSd)}` : metric(byKey(k).rmse)),
      summary: `Nuestro modelo se equivoca ${fewer(byKey('globalMean').rmse)}\u00a0% menos que adivinar siempre el promedio y ${fewer(byKey('municipalMean').rmse)}\u00a0% menos que usar solo el promedio del municipio.`,
      mae: `**MAE ${metric(v.mae)} t/ha**: en promedio, la estimación se aleja eso del valor real.`,
      r2: `**R² ${metric(v.r2)}**: el modelo explica cerca de ${Math.round(v.r2 * 100)}\u00a0% de las diferencias de rendimiento entre parcelas.`,
    },
    stability: {
      title: 'Estable entre repeticiones',
      text: `Cada punto es una de las ${reps.length} repeticiones. El RMSE va de ${metric(Math.min(...reps))} a ${metric(Math.max(...reps))}: el resultado no depende de cómo se armaron los grupos.`,
      mean: 'media',
      label: `RMSE de las ${reps.length} repeticiones: ${reps.map(metric).join(', ')}.`,
    },
    scatter: {
      title: 'Real contra estimado',
      caption: `Cada punto es una parcela conocida: su rendimiento reportado contra el promedio de sus ${scheme.repeats} estimaciones fuera de muestra. Las cifras oficiales de error se calculan repetición por repetición, no con estos promedios.`,
      rows: 'Las filas horizontales son municipios que reportan rendimientos redondeados.',
      x: 'Estimación fuera de muestra (t/ha)',
      y: 'Rendimiento reportado (t/ha)',
      diagonal: 'estimación = real',
      measured: 'medido',
      rounded: 'redondeado',
      label: `Gráfica de dispersión de las ${counts.train} parcelas conocidas. Usa las flechas para recorrerlas.`,
      tip: (id: string, municipality: string, actual: number, estimate: number) =>
        `${id} · ${placeName(municipality)} · real ${formatNumber(actual)} · estimado ${formatNumber(estimate)} t/ha`,
    },
    coverage: {
      title: 'Una incertidumbre honesta',
      intro: `Cada estimación lleva un intervalo de ${level}\u00a0%. ¿Cumple lo que promete?`,
      items: intervalCoverage(model).map((c) => ({
        regime: c.regime,
        title: c.regime === 'measured' ? 'Rendimientos medidos' : 'Rendimientos redondeados',
        width: `±${formatNumber(c.halfWidth)} t/ha`,
        hits: Math.round(c.coverage * 100),
        text: `En validación, el valor real cayó dentro del intervalo ${Math.round(c.coverage * 100)} de cada 100 veces (${formatNumber(c.coverage * 100, 1)}\u00a0%).`,
      })),
    },
    alternatives:
      'Probamos muchas alternativas (gradient boosting, bosques aleatorios, SVR, PCA, PLS, procesos gaussianos, modelos mixtos, variables de terreno…); ninguna superó a este modelo de forma estadísticamente distinguible.',
  };
}

export type DesempenoCopy = ReturnType<typeof desempenoCopy>;
