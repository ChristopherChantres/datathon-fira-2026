// Section ids, navigation labels and Phase-1 placeholder copy (visitor-facing: Spanish).
// Counts come from the data, never from literals.
import type { ModelData } from '../data/types';
import { isPredict, isTrain } from '../data/types';
import { joinSpanish, placeName } from '../lib/format';

export type SectionId =
  | 'hero'
  | 'problema'
  | 'fenologia'
  | 'modelo'
  | 'explorador'
  | 'desempeno'
  | 'impacto'
  | 'equipo';

export interface SectionCopy {
  id: SectionId;
  nav: string;
  title: string;
  placeholder: string;
}

export function sectionCopy(model: ModelData): SectionCopy[] {
  const nTrain = model.parcels.filter(isTrain).length;
  const nPredict = model.parcels.filter(isPredict).length;
  const states = joinSpanish([...new Set(model.municipalities.map((m) => placeName(m.state)))].sort());

  return [
    {
      id: 'hero',
      nav: 'Inicio',
      title: '¿Cuánta cebada dará esta parcela?',
      placeholder: `Una explicación interactiva de cómo estimamos el rendimiento de cebada de temporal en ${nPredict} parcelas de ${states}.`,
    },
    {
      id: 'problema',
      nav: 'El reto',
      title: 'El reto',
      placeholder: `Aquí contaremos el reto: ${model.parcels.length} parcelas en ${model.municipalities.length} municipios; de ${nTrain} conocemos el rendimiento y ${nPredict} hay que predecir.`,
    },
    {
      id: 'fenologia',
      nav: 'Satélite',
      title: 'Lo que ve el satélite',
      placeholder: 'Aquí veremos cómo la curva de NDVI de cada parcela revela su temporada: arranque, pico y cierre.',
    },
    {
      id: 'modelo',
      nav: 'Modelo',
      title: 'El modelo',
      placeholder: 'Aquí explicaremos los dos modelos, ubicación y fenología, y cómo se combinan en una sola predicción.',
    },
    {
      id: 'explorador',
      nav: 'Explorador',
      title: `Explora las ${nPredict} parcelas`,
      placeholder: 'Aquí podrás elegir cualquier parcela por predecir y ver su estimación, su intervalo y de dónde sale cada parte.',
    },
    {
      id: 'desempeno',
      nav: 'Desempeño',
      title: '¿Qué tan bien funciona?',
      placeholder: 'Aquí mostraremos cómo validamos el modelo con parcelas que nunca vio y cómo se compara con referencias simples.',
    },
    {
      id: 'impacto',
      nav: 'Impacto',
      title: 'Por qué importa',
      placeholder: 'Aquí explicaremos cómo un intervalo de rendimiento por parcela ayuda a evaluar crédito y seguro agrícola con datos públicos.',
    },
    {
      id: 'equipo',
      nav: 'Equipo',
      title: 'Equipo',
      placeholder: 'Aquí presentaremos al equipo detrás de este trabajo.',
    },
  ];
}
