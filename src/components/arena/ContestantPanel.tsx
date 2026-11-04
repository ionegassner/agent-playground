import type { AgentEpisode } from '../../lib/match-contracts';
import { ReplayVideo } from '../ReplayVideo';
import { Icon } from '../Icon';
import { formatElapsed } from '../../lib/time';
export function ContestantPanel({
  episode,
  index,
  position,
  playing,
  speed,
  live,
  scripted,
  failed,
  onReady,
  onFailed,
  onEnlarge,
  enlarged,
}: {
  episode: AgentEpisode;
  index: number;
  position: number;
  playing: boolean;
  speed: number;
  live: boolean;
  scripted: boolean;
  failed: boolean;
  onReady: () => void;
  onFailed: () => void;
  onEnlarge: () => void;
  enlarged: boolean;
}) {
  const frame = episode.steps.findLast((step) => step.elapsedMs <= position) || episode.steps[0];
  return (
    <section className="episode-panel" aria-label={`Contestant ${index ? 'B' : 'A'}`}>
      <div className="episode-heading">
        <span className={`contestant-avatar side-${index}`}>{index ? 'B' : 'A'}</span>
        <div>
          <strong>{episode.config.name}</strong>
          <small>
            {scripted
              ? 'Scripted browser fixture'
              : episode.config.model === 'codex-default'
                ? 'Codex · CLI default'
                : episode.config.model}
          </small>
        </div>
        <button
          className="text-link enlarge-button"
          aria-label={`${enlarged ? 'Show both contestants' : 'Enlarge contestant ' + (index ? 'B' : 'A')}`}
          onClick={onEnlarge}
        >
          {enlarged ? 'Show both' : 'Enlarge'}
          <Icon name="up" size={15} />
        </button>
      </div>
      <div className="episode-browser">
        {episode.video && !failed && !live ? (
          <ReplayVideo
            src={episode.video}
            position={position}
            playing={playing}
            speed={speed}
            offset={episode.videoOffsetMs || 0}
            onReady={onReady}
            onError={onFailed}
          />
        ) : frame ? (
          <img src={frame.frame} alt={`Recorded browser at ${formatElapsed(frame.elapsedMs)}`} />
        ) : (
          <div className="frame-empty">
            <Icon name="clock" />
            <p>Waiting for the browser’s first observation…</p>
          </div>
        )}
        {episode.video && !failed && !live && position === 0 && !playing && frame && (
          <img
            className="replay-start-poster"
            src={episode.steps[0].frame}
            alt="Initial browser observation"
          />
        )}
      </div>
      {failed && (
        <p className="media-notice" role="status">
          Browser video unavailable. Showing recorded action snapshots.
        </p>
      )}
      <div className="decision-caption">
        <span className="eyebrow">
          {scripted ? 'SCRIPTED ACTION DESCRIPTION' : 'AGENT-REPORTED DECISION SUMMARY'}
        </span>
        <p>{frame?.summary || 'No action taken yet.'}</p>
      </div>
      <div className="episode-stats">
        <span>{live ? 'Live observation' : 'Recorded observation'}</span>
        <span>
          {
            episode.steps.filter((step) => step.action !== 'start' && step.elapsedMs <= position)
              .length
          }{' '}
          actions
        </span>
      </div>
    </section>
  );
}
