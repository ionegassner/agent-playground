import { ExperimentSummary } from '../components/arena/ExperimentSummary';
import { useEffect, useState } from 'react';
import { get } from '../lib/http';
import type { Match, ExampleSummary, RecordedExample } from '../lib/match-contracts';
import { ComparisonSetup } from '../components/arena/ComparisonSetup';
import { ReplayViewer } from '../components/arena/ReplayViewer';
import { ExampleLibrary } from '../components/arena/ExampleLibrary';
import { Icon } from '../components/Icon';
export function AgentArenaPage({
  startHuman,
  matchId,
  exampleId,
}: {
  startHuman: (scenarioId?: string, seed?: number, timeMs?: number) => void;
  matchId?: string;
  exampleId?: string;
}) {
  const [examples, setExamples] = useState<ExampleSummary[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [match, setMatch] = useState<Match | null>(null);
  const [example, setExample] = useState<RecordedExample | null>(null);
  const [error, setError] = useState('');
  const viewing = !!(matchId || exampleId);
  useEffect(() => {
    if (viewing) return;
    get<ExampleSummary[]>('/examples/index.json')
      .then(setExamples)
      .catch(() =>
        setError('Recorded examples are unavailable. You can still set up a comparison.'),
      );
    get<Match[]>('/api/matches')
      .then(setMatches)
      .catch(() =>
        setError('Personal comparisons could not be loaded. Bundled examples remain available.'),
      );
  }, [viewing]);
  useEffect(() => {
    if (!viewing) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const update = async () => {
      try {
        if (exampleId) {
          if (!/^[a-z0-9-]+$/.test(exampleId)) throw Error('Invalid example.');
          const data = await get<RecordedExample>(`/examples/${exampleId}/replay.json`);
          if (alive) {
            setExample(data);
            setMatch(data.match);
          }
        } else {
          const data = await get<Match>(`/api/matches/${matchId}`);
          if (alive) {
            setMatch(data);
            if (data.status === 'running') timer = setTimeout(update, 1200);
          }
        }
      } catch {
        if (alive)
          setError('This comparison is unavailable. Return to the arena or try the link again.');
      }
    };
    void update();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [viewing, matchId, exampleId]);
  return (
    <main className="agent-arena">
      {!viewing && (
        <header className="lab-heading">
          <div>
            <span className="section-label">
              <span className="tiny-square" /> AGENT PLAYGROUND
            </span>
            <h1>Test browser agents on repeatable tasks.</h1>
            <p>
              Run bounded local tasks, inspect the agent’s actions, and check the resulting state.
            </p>
          </div>
        </header>
      )}
      {error && (
        <p className="global-error" role="alert">
          {error}
        </p>
      )}
      {!viewing ? (
        <>
          <ExampleLibrary examples={examples} />
          <ExperimentSummary />
          <ComparisonSetup startHuman={startHuman} />
          <section className="lab-library">
            <div className="section-heading">
              <h2>Your comparisons</h2>
              <span className="eyebrow">PERSONAL RUNS</span>
            </div>
            {matches.length ? (
              <div className="archive-list">
                {matches.map((m) => (
                  <a className="archive-row" key={m.id} href={`#/match/${m.id}`}>
                    <Icon name="play" />
                    <div>
                      <strong>{m.contestants.map((c) => c.config.name).join(' vs ')}</strong>
                      <small>
                        {m.scenarioName || 'Signal hunt'} · {new Date(m.createdAt).toLocaleString()}
                      </small>
                    </div>
                    <span>{m.status === 'running' ? 'Recording' : 'Watch replay'}</span>
                    <Icon name="up" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="comparison-empty">
                <h3>No personal comparisons yet.</h3>
                <p>Start with a bundled replay, or try your own instructions above.</p>
              </div>
            )}
          </section>
        </>
      ) : match ? (
        <>
          <ReplayViewer match={match} example={example} />
          <button
            className="text-link try-challenge"
            onClick={() =>
              startHuman(match.scenarioId || 'signal-hunt', match.seed, match.limits.timeMs)
            }
          >
            Try the challenge yourself
            <Icon name="arrow" size={15} />
          </button>
        </>
      ) : (
        <div className="empty-state">
          <h2>{error ? 'This replay is unavailable.' : 'Loading comparison…'}</h2>
          {error && (
            <a className="button light" href="#/">
              Back to the playground
              <Icon name="arrow" />
            </a>
          )}
        </div>
      )}
    </main>
  );
}
