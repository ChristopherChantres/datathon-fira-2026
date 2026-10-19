// "Preguntas guía" copy (visitor-facing, es-MX): the challenge's three guide questions.
// Figures from the data, or from facts.ts (each cited to docs/model.md).
import type { Story } from '../data/story';
import { formatNumber, joinSpanish } from '../lib/format';
import { facts } from './facts';
import { stripSharedPrefix } from './fenologia';

export interface QuestionCopy {
  question: string;
  answer: string[];
  link?: { text: string; href: string };
}

export function preguntasCopy(story: Story) {
  const { model, counts } = story;
  const inputs = stripSharedPrefix(model.modelA.features.map((f) => f.label.es));
  const nInputs = model.modelA.features.length;
  const v = model.validation;

  const questions: QuestionCopy[] = [
    {
      question: '¿Qué índice es más importante en la predicción?',
      answer: [
        `El **verdor inicial** de la parcela: qué tan verde está antes de que arranque la temporada. Son las ${nInputs} variables de satélite que usa el modelo A: [${joinSpanish(inputs)}](phenology).`,
        'El modelo las eligió entre todas las de fenología por ser las que mejor explican lo que la ubicación no explica.',
        `Entre zonas, la variable satelital más relacionada con el rendimiento es la duración de la temporada (r ≈ +${formatNumber(facts.seasonLengthCorrelation)}).`,
      ],
    },
    {
      question: '¿Qué variable climática tiene mayor peso?',
      answer: [
        `La lluvia de ${facts.establishmentRain}, cuando el cultivo se establece.`,
        `Pero el clima funciona sobre todo como indicador de zona: las ${counts.total} parcelas caen en solo ${facts.climatePixels} píxeles climáticos (de unos ${facts.climatePixelKm} km), así que la [ubicación](location) ya absorbe ese efecto.`,
      ],
    },
    {
      question: '¿Qué combinación de variables funciona mejor?',
      answer: [
        `[Ubicación](location) + [${nInputs} variables de fenología](phenology). Con solo ${counts.train} parcelas conocidas, agregar más bloques del satélite empeoraba el error.`,
        `Con esa combinación, el error típico en validación es de ${formatNumber(v.rmse, 3)} t/ha, frente a ${formatNumber(v.baselines.municipalMeanRmse, 3)} usando solo el promedio de cada municipio.`,
      ],
      link: { text: 'Ver cómo lo validamos', href: '#desempeno' },
    },
  ];

  return {
    intro: 'El reto propone tres preguntas. Estas son nuestras respuestas, con su justificación.',
    questions,
  };
}
