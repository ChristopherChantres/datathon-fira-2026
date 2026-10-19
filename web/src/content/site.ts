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
  // The video is not published yet; empty hides the link.
  videoUrl: '',
} as const;
