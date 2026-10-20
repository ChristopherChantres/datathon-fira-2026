// Video copy (visitor-facing, es-MX). The URL and length live in site.ts.
import { youtubeId } from '../lib/youtube';
import { site } from './site';

/** The video's YouTube id, or null when site.videoUrl is empty or not a YouTube URL. */
export const videoId = youtubeId(site.videoUrl);

export function videoCopy() {
  return {
    heroButton: `▶ Ver el video (${site.videoMinutes} min)`,
    play: 'Reproducir el video del proyecto',
    iframeTitle: 'Video del proyecto AgroCebada',
    youtubeLink: 'Verlo en YouTube',
  };
}
