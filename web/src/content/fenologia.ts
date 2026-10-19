// "Lo que ve el satélite" copy (visitor-facing, es-MX). Numbers come from the data.
import type { Story } from '../data/story';
import type { CurvesData } from '../data/types';
import { medianMilestones } from '../data/story';
import { formatDate, formatNdvi, joinSpanish } from '../lib/format';
import type { StepCopy } from './types';

export function fenologiaCopy(story: Story, curves: CurvesData) {
  const { featured, counts, model } = story;
  const curve = curves.curves[featured.id];
  if (!curve) throw new Error(`No NDVI curve for ${featured.id}`);
  const m = curve.milestones;
  const median = medianMilestones(curves);
  const inputs = stripSharedPrefix(model.modelA.features.map((f) => f.label.es)).map((label) => `[${label}](phenology)`);
  const year = seasonYear(curve.milestones.sosDate);

  const steps: StepCopy[] = [
    {
      title: 'Una foto casi diaria',
      body: [
        `En la temporada ${year}, el satélite Planet fotografió la parcela **${featured.id}** casi todos los días. Cada punto es su NDVI: qué tan verde y viva está la vegetación, de suelo desnudo a cultivo denso.`,
        `Aquí hay ${curve.raw.length} fotos con ${curves.meta.cloudMax}\u00a0% de nubes o menos. Aun así, algunas salen bajas: una nube o su sombra tapó parte de la parcela.`,
      ],
    },
    {
      title: 'Una curva limpia',
      body: [
        'Quitamos esas caídas y suavizamos los puntos hacia su borde superior.',
        'Queda una sola curva: la temporada contada en una línea.',
      ],
    },
    {
      title: 'Los momentos clave',
      body: [
        `Antes de sembrar, la parcela tiene una base de NDVI de ${formatNdvi(m.base)}.`,
        `La temporada arranca el ${formatDate(m.sosDate)}, llega a su pico de ${formatNdvi(m.peak)} el ${formatDate(m.peakDate)} y termina el ${formatDate(m.eosDate)}: ${m.seasonLengthDays} días de cultivo.`,
      ],
    },
    {
      title: 'Lo que el modelo usa',
      body: [
        'De toda la curva, el modelo usa el **verdor inicial**: qué tan verde está la parcela antes de que arranque el cultivo.',
        `Lo mide de tres formas: ${joinSpanish(inputs)}.`,
        `¿Solo eso? Sí. Con ${counts.train} parcelas conocidas, agregar más variables del satélite empeoraba las predicciones.`,
      ],
    },
    {
      title: 'Todas las parcelas',
      body: [
        `Detrás aparecen las ${counts.total} curvas. Cada parcela lleva su propio ritmo.`,
        `La mediana dibuja el calendario de la región: arranque el ${formatDate(median.sosDate)}, pico el ${formatDate(median.peakDate)} y fin el ${formatDate(median.eosDate)}.`,
      ],
    },
  ];

  return {
    steps,
    chartSummary:
      `Curva de NDVI de la parcela ${featured.id}: base ${formatNdvi(m.base)}, ` +
      `inicio de temporada el ${formatDate(m.sosDate)}, pico de ${formatNdvi(m.peak)} el ${formatDate(m.peakDate)}, ` +
      `fin el ${formatDate(m.eosDate)}, ${m.seasonLengthDays} días.`,
    labels: {
      yAxis: 'NDVI',
      base: 'base',
      sos: 'inicio',
      peak: 'pico',
      eos: 'fin',
      season: `${m.seasonLengthDays} días`,
      initialGreen: 'verdor inicial',
      median: 'mediana',
    },
  };
}

/** Year of an ISO date (the season the curves describe). */
export const seasonYear = (iso: string) => Number(iso.slice(0, 4));

/** ["Verdor inicial · LAI (Planet)", "Verdor inicial · NDVI (Planet)"] → ["LAI (Planet)", "NDVI (Planet)"] */
export function stripSharedPrefix(labels: string[]): string[] {
  const parts = labels.map((l) => l.split(' · '));
  const first = parts[0]?.[0];
  const shared = labels.length > 1 && parts.every((p) => p.length > 1 && p[0] === first);
  return shared ? parts.map((p) => p.slice(1).join(' · ')) : labels;
}

export const fenologiaLoading = 'Cargando las curvas del satélite…';
