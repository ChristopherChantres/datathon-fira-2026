// Section ids, navigation labels and titles (visitor-facing: Spanish). Counts come from
// the data, never literals.
import type { ModelData } from '../data/types';
import { isPredict } from '../data/types';

export type SectionId =
  | 'hero'
  | 'problema'
  | 'fenologia'
  | 'modelo'
  | 'explorador'
  | 'desempeno'
  | 'preguntas'
  | 'impacto'
  | 'equipo';

export interface SectionCopy {
  id: SectionId;
  nav: string;
  title: string;
}

export function sectionCopy(model: ModelData): SectionCopy[] {
  const nPredict = model.parcels.filter(isPredict).length;

  return [
    {
      id: 'hero',
      nav: 'Inicio',
      title: '¿Cuánta cebada dará esta parcela?',
    },
    {
      id: 'problema',
      nav: 'El reto',
      title: 'El reto',
    },
    {
      id: 'fenologia',
      nav: 'Satélite',
      title: 'Lo que ve el satélite',
    },
    {
      id: 'modelo',
      nav: 'Modelo',
      title: 'El modelo',
    },
    {
      id: 'explorador',
      nav: 'Explorador',
      title: `Explora las ${nPredict} parcelas`,
    },
    {
      id: 'desempeno',
      nav: 'Desempeño',
      title: '¿Qué tan bien funciona?',
    },
    {
      id: 'preguntas',
      nav: 'Preguntas guía',
      title: 'Preguntas guía',
    },
    {
      id: 'impacto',
      nav: 'Impacto',
      title: 'Por qué importa',
    },
    {
      id: 'equipo',
      nav: 'Equipo',
      title: 'Equipo',
    },
  ];
}
