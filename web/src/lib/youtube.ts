// YouTube helpers for the click-to-load video facade. Nothing here contacts YouTube.

const ID = /^[A-Za-z0-9_-]{11}$/;
const WATCH_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const PATH_PREFIXES = ['embed', 'shorts', 'live', 'v'];

/**
 * The video id of a YouTube URL (watch?v=, youtu.be/, /embed/, /shorts/, /live/, /v/),
 * or null when the URL is empty, malformed, not YouTube, or the id is not well formed.
 */
export function youtubeId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split('/').filter(Boolean);

  let candidate: string | null | undefined = null;
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    candidate = segments[0];
  } else if (WATCH_HOSTS.has(host)) {
    if (segments[0] === 'watch') candidate = parsed.searchParams.get('v');
    else if (segments[0] && PATH_PREFIXES.includes(segments[0])) candidate = segments[1];
  }
  return candidate && ID.test(candidate) ? candidate : null;
}

export const youtubeThumbnail = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** Privacy-enhanced player; only requested after the visitor clicks play. */
export const youtubeEmbed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
