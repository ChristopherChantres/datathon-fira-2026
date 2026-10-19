// "Equipo" copy (visitor-facing, es-MX). Names and links live in site.ts.
import { site } from './site';

export function equipoCopy() {
  return {
    team: site.teamName,
    university: site.university,
    members: site.members,
    membersLabel: 'Integrantes',
    howTitle: 'Cómo lo hicimos',
    howIntro: 'Usamos solo datos abiertos:',
    sources: [
      '**Planet**: índices de vegetación casi diarios por parcela.',
      '**Sentinel-2 y Landsat**: índices de vegetación de varios años.',
      '**CHIRPS**: lluvia mensual.',
      '**CHIRTS-ERA5**: temperatura mensual.',
      '**INEGI**: elevación y pendiente.',
    ],
    repoLink: site.repoUrl ? { text: 'Código y datos en GitHub', href: site.repoUrl } : null,
    videoLink: site.videoUrl ? { text: 'Ver el video', href: site.videoUrl } : null,
    aiTitle: 'Transparencia sobre el uso de IA',
    ai: [
      'El modelado y este sitio se desarrollaron con ayuda de IA generativa (Claude, de Anthropic, en chat y en Claude Code), bajo la dirección y revisión del equipo.',
      'La lista completa de prompts está en la bibliografía del proyecto, como piden las reglas del reto.',
    ],
    footer: {
      credit: [site.challengeName, site.teamName].filter(Boolean).join(' · '),
      repo: site.repoUrl ? 'Repositorio' : null,
      csv: 'Descargar predicciones (CSV)',
    },
  };
}
