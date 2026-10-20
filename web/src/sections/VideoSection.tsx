// "El proyecto en N minutos": a click-to-load YouTube facade. Only our own markup and the
// thumbnail image load up front; the player iframe (and its scripts) only after a click.
import { useState } from 'react';
import type { SectionCopy } from '../content/sections';
import { site } from '../content/site';
import { videoCopy } from '../content/video';
import { youtubeEmbed, youtubeThumbnail } from '../lib/youtube';
import './VideoSection.css';

export function VideoSection({ section, videoId }: { section: SectionCopy; videoId: string }) {
  const copy = videoCopy();
  const [playing, setPlaying] = useState(false);

  return (
    <section id={section.id} className="section video" aria-labelledby={`${section.id}-title`}>
      <div className="section__inner">
        <h2 id={`${section.id}-title`}>{section.title}</h2>
        <div className="video__frame">
          {playing ? (
            <iframe
              // Keyboard focus moves into the player that replaced the button.
              ref={(el) => el?.focus()}
              src={youtubeEmbed(videoId)}
              title={copy.iframeTitle}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            // A native button: Enter and Space activate it without extra handlers.
            <button type="button" className="video__facade" aria-label={copy.play} onClick={() => setPlaying(true)}>
              <img src={youtubeThumbnail(videoId)} alt="" loading="lazy" decoding="async" width={480} height={360} />
              <span className="video__play" aria-hidden="true">
                <svg viewBox="0 0 68 48" width="68" height="48">
                  <rect width="68" height="48" rx="12" />
                  <path d="M27 14v20l18-10z" />
                </svg>
              </span>
            </button>
          )}
        </div>
        <p className="video__link">
          <a href={site.videoUrl} target="_blank" rel="noopener noreferrer">
            {copy.youtubeLink} ↗
          </a>
        </p>
      </div>
    </section>
  );
}
