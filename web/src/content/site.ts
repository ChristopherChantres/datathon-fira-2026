// Submission details, edited in one place. An empty string hides whatever depends on it.
export interface Member {
  name: string;
  /** Empty until the team confirms roles. */
  role: string;
}

export const site = {
  projectName: 'Datathon FIRA 2026',
  challengeName: 'Reto AgroCebada FIRA 2026',
  teamName: 'print(desgranados?)',
  members: [
    { name: 'Luciana Hernández', role: '' },
    { name: 'Abraham Medina', role: '' },
    { name: 'Cesar Pérez', role: '' },
    { name: 'Viktor Chargoy', role: '' },
    { name: 'Christopher Chantres', role: '' },
  ] satisfies Member[],
  university: 'Universidad de las Américas Puebla',
  repoUrl: 'https://github.com/ChristopherChantres/datathon-fira-2026',
  // Any common YouTube URL form; empty or unparseable hides everything video-related.
  videoUrl: 'https://www.youtube.com/watch?v=khRHMa40_u8',
  /** Length shown on the hero button and the video section title. */
  videoMinutes: 5,
} as const;
