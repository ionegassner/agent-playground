import { useState } from 'react';
import type { Match, RecordedExample } from '../../lib/match-contracts';
import { roomQuestion } from '../../lib/strategies';
import { turningPoints } from '../../lib/turning-points';
import { checkpointLabel } from '../../lib/checkpoints';
import { useReplay } from '../../hooks/useReplay';
import { Icon } from '../Icon';
import { formatElapsed } from '../../lib/time';
import { ContestantPanel } from './ContestantPanel';
import { demoMode } from '../../lib/demo';

export function ReplayViewer({
  match,
  example,
}: {
  match: Match;
  example?: RecordedExample | null;
}) {
  const replay = useReplay(match);
  const [focus, setFocus] = useState<number | null>(null);
  const [mobileSide, setMobileSide] = useState(0);
  const [copyStatus, setCopyStatus] = useState('');
  const scripted = example?.kind === 'scripted';
  const points = match.contestants.flatMap((episode, index) =>
    turningPoints(episode).map((p) => ({ ...p, side: index })),
  );
  const obstacleType = match.scenarioId === 'subscription-trap' ? 'renewal_opened' : 'availability';
  const obstacle = points.find(
    (p) =>
      match.contestants[p.side].events.find((e) => e.sequence === p.sequence)?.type ===
      obstacleType,
  );
  function selectContestant(side: number) {
    setMobileSide(side);
    setFocus((current) => (current === null ? null : side));
  }
  function seekToContestant(side: number, time: number) {
    selectContestant(side);
    replay.seek(time);
  }
  function revise() {
    sessionStorage.setItem(
      'arena-comparison-draft',
      JSON.stringify({
        parentMatchId: match.id,
        configs: match.contestants.map((c) => ({ ...c.config })),
        seed: match.seed,
        scenarioId: match.scenarioId || 'signal-hunt',
        limits: match.limits,
      }),
    );
    location.hash = '/';
  }
  return (
    <>
      <section className="replay-intro">
        <span className="eyebrow">
          {scripted ? 'SCRIPTED GRADER DEMO · NO MODEL CALLS' : 'RECORDED AGENT RUN'}
        </span>
        <h1>{example?.title || roomQuestion(match.scenarioId)}</h1>
        <p className="mission-description">
          {example?.mission ||
            (match.scenarioId === 'subscription-trap'
              ? 'Turn off automatic renewal. Keep access through the paid period. Decline offers and preserve the account.'
              : 'Complete the purchase within the mission’s budget and product constraints. If the requested product is unavailable, choose an eligible alternative.')}
        </p>
        <div className="profile-context">
          <span className="eyebrow">
            {scripted ? 'SCRIPTED BROWSER FIXTURES' : 'AGENT INSTRUCTION PROFILES'}
          </span>
          <p>
            {scripted
              ? 'A and B are scripted browser fixtures used to test the grader. No agent chooses these actions.'
              : example
                ? 'A and B are two instruction profiles created for the local Codex runner. Both use the same model setting, task, seed, tools and limits; the strategy instructions differ.'
                : 'A and B identify the two agent configurations for this task. Their instructions and model settings are recorded with the attempt.'}
          </p>
          {example?.comparisonPurpose && <p>{example.comparisonPurpose}</p>}
        </div>
        <div className="strategy-intro">
          {match.contestants.map((episode, index) => (
            <div key={index}>
              <span className={`contestant-avatar side-${index}`}>{index ? 'B' : 'A'}</span>
              <div>
                <span className="eyebrow">
                  {scripted ? 'Fixture' : 'Profile'} {index ? 'B' : 'A'}
                </span>
                <h2>{episode.config.name}</h2>
                <p>{example?.strategySummaries?.[index] || episode.config.instructions}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="match-info">
        <span className="status-pill">
          {match.status === 'running' ? 'LIVE ATTEMPTS' : 'RECORDED COMPARISON'}
        </span>
        <span>
          {match.scenarioName || 'Signal hunt'} · {match.toolMode}
        </span>
        {example ? (
          <a className="text-link" href="#/">
            {demoMode ? 'Back to examples' : 'Set up your own comparison'}
            <Icon name="arrow" size={15} />
          </a>
        ) : (
          <button className="text-link" onClick={revise} disabled={match.status === 'running'}>
            Fork instructions & rematch
            <Icon name="reset" size={15} />
          </button>
        )}
      </div>
      {match.parentMatchId && (
        <p className="config-note">
          Instruction rematch ·{' '}
          <a href={`#/match/${match.parentMatchId}`}>Watch the original comparison</a>
        </p>
      )}
      <div className="replay-toolbar">
        <div className="contestant-switch" role="group" aria-label="Choose contestant">
          {match.contestants.map((episode, index) => (
            <button
              key={index}
              aria-pressed={mobileSide === index}
              onClick={() => selectContestant(index)}
            >
              Watch {index ? 'B' : 'A'}
              <span>{episode.config.name}</span>
            </button>
          ))}
        </div>
        <button
          className="button light obstacle-jump"
          disabled={!obstacle || match.status === 'running'}
          onClick={() => {
            if (obstacle) {
              seekToContestant(obstacle.side, obstacle.elapsedMs);
            }
          }}
        >
          <Icon name="arrow" size={16} />
          {obstacle ? 'Jump to the obstacle' : 'No obstacle recorded'}
        </button>
      </div>
      <div className="replay-controls" role="group" aria-label="Shared replay controls">
        <button
          className="icon-button"
          aria-label={replay.playing ? 'Pause replay' : 'Play replay'}
          onClick={replay.toggle}
          disabled={replay.disabled}
        >
          <Icon name={replay.playing ? 'pause' : 'play'} />
        </button>
        <time>
          {formatElapsed(replay.position)} / {formatElapsed(replay.duration)}
        </time>
        <input
          aria-label="Replay position"
          type="range"
          min={0}
          max={replay.duration || 1}
          value={replay.position}
          onChange={(e) => replay.seek(Number(e.target.value))}
        />
        <select
          aria-label="Playback speed"
          value={replay.speed}
          onChange={(e) => replay.setSpeed(Number(e.target.value))}
        >
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={4}>4×</option>
        </select>
        {!demoMode && (
          <button
            className="button light"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(location.href);
                setCopyStatus('Link copied.');
              } catch {
                setCopyStatus('Could not copy automatically. Copy the address from your browser.');
              }
            }}
          >
            Copy comparison link
            <Icon name="up" size={15} />
          </button>
        )}
      </div>
      <p className="copy-status" role="status">
        {copyStatus}
      </p>
      <div className={`comparison-grid ${focus !== null ? 'focused-contestant' : ''}`}>
        {match.contestants.map((episode, index) => (
          <div
            key={index}
            className={`contestant-slot ${mobileSide === index ? 'mobile-selected' : ''} ${focus !== null && focus !== index ? 'desktop-hidden' : ''}`}
          >
            <ContestantPanel
              episode={episode}
              index={index}
              position={replay.position}
              playing={replay.playing}
              speed={replay.speed}
              live={match.status === 'running'}
              scripted={scripted}
              failed={replay.videoFailed[index]}
              onReady={() => replay.ready(index)}
              onFailed={() => replay.failed(index)}
              enlarged={focus === index}
              onEnlarge={() => {
                setMobileSide(index);
                setFocus(focus === index ? null : index);
              }}
            />
          </div>
        ))}
      </div>
      <details className="checkpoint-details">
        <summary>Explore the recorded actions</summary>
        <section className="turning-points" aria-label="Verified turning points">
          <span className="eyebrow">VERIFIED TURNING POINTS</span>
          <div className="turning-point-row">
            {points.map((p) => (
              <button
                className="turning-point"
                key={`${p.side}-${p.sequence}`}
                aria-label={`${p.side ? 'B' : 'A'}: ${p.label}`}
                aria-pressed={Math.abs(replay.position - p.elapsedMs) < 200}
                onClick={() => {
                  seekToContestant(p.side, p.elapsedMs);
                }}
              >
                <b>{p.side ? 'B' : 'A'}</b>
                <time>{formatElapsed(p.elapsedMs)}</time>
                {p.label}
              </button>
            ))}
            {!points.length && (
              <p className="config-note">
                No stock, extras or account turning points recorded in this attempt.
              </p>
            )}
          </div>
        </section>
        <div className="checkpoint-row">
          {match.contestants.flatMap((episode, index) =>
            episode.steps.map((step, n) =>
              step.action === 'start' ? null : (
                <button
                  key={`${index}-${n}`}
                  aria-label={`${index ? 'B' : 'A'}: ${checkpointLabel(episode, step, n)}`}
                  onClick={() => {
                    seekToContestant(index, step.elapsedMs);
                  }}
                >
                  <b>{index ? 'B' : 'A'}</b> · {checkpointLabel(episode, step, n)}
                </button>
              ),
            ),
          )}
        </div>
      </details>
      <details className="result-reveal">
        <summary>Reveal verified results</summary>
        {example?.observation && <p className="result-observation">{example.observation}</p>}
        <div className="result-grid">
          {match.contestants.map((episode, index) => (
            <section key={index} aria-label={`Result ${index ? 'B' : 'A'}`}>
              <h3>
                {index ? 'B' : 'A'} · {episode.config.name}
              </h3>
              <p>
                {episode.result
                  ? episode.result.correct
                    ? '✓ Correct completion'
                    : '× Requirements missed'
                  : episode.status === 'failed'
                    ? 'Attempt failed'
                    : 'No verified result yet'}
              </p>
              {episode.error && <p className="error-message">{episode.error}</p>}
              <ul>
                {episode.result?.checks.map((check) => (
                  <li key={check.label}>
                    {check.passed ? '✓' : '×'} {check.label}
                  </li>
                ))}
              </ul>
              <p>
                {episode.steps.filter((s) => s.action !== 'start').length} actions ·{' '}
                {scripted
                  ? 'No model usage'
                  : `${episode.inputTokens + episode.outputTokens} total tokens`}
              </p>
              <details className="episode-evidence">
                <summary>Verified events & configuration</summary>
                <p className="config-note">{episode.config.instructions}</p>
                <p className="config-note">
                  Scenario {match.scenarioVersion} · Seed {match.seed} · {match.limits.actions}{' '}
                  actions / {match.limits.timeMs / 60000} minutes · Effort:{' '}
                  {episode.config.reasoningEffort || 'model default'} · Recent actions:{' '}
                  {episode.config.memorySteps ?? 12}
                </p>
                {episode.events.map((event) => (
                  <p key={event.sequence}>
                    <b>{formatElapsed(event.elapsedMs)}</b> {event.message}
                  </p>
                ))}
                {episode.video && (
                  <a className="text-link" href={episode.video} download>
                    Download browser video
                    <Icon name="download" size={15} />
                  </a>
                )}
              </details>
            </section>
          ))}
        </div>
      </details>
      <details className="replay-notes">
        <summary>How to read this replay</summary>
        <p>
          Shared playback uses estimated video origins, not frame-perfect timing. Missing video
          falls back to snapshots.{' '}
          {scripted
            ? 'This fixture uses scripted browser actions; no inference or model performance is measured.'
            : 'The model receives visible text and indexed controls. Summaries report intentions, not private reasoning. Each local Codex action starts a fresh process, adding overhead. A single comparison cannot establish a better strategy.'}{' '}
          {demoMode
            ? 'All recordings and evidence in this demo are included in this file. No model calls are made.'
            : 'Bundled examples work without the original database; personal links need their server data.'}
        </p>
      </details>
    </>
  );
}
