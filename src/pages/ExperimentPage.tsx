import { useEffect, useState } from 'react';
import { get } from '../lib/http';
import { experimentEvidencePath } from '../lib/experiment';
import type { ExperimentEvidence } from '../lib/experiment';
import { formatElapsed } from '../lib/time';
import { demoUrl } from '../lib/demo';
export function ExperimentPage() {
  const [evidence, setEvidence] = useState<ExperimentEvidence | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    get<ExperimentEvidence>(experimentEvidencePath)
      .then((data) => {
        if (alive) setEvidence(data);
      })
      .catch(() => {
        if (alive)
          setError('The trial evidence could not be loaded. Return to the arena and try again.');
      });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <main className="agent-arena experiment-page">
      <a className="back-link" href="#/">
        ← Back to the playground
      </a>
      <span className="eyebrow">REAL AGENT TRIALS · ONE FIXED CASE</span>
      <h1>Controlled strategy trial evidence</h1>
      {error ? (
        <p role="alert" className="global-error">
          {error}
        </p>
      ) : !evidence ? (
        <p role="status">Loading the trial evidence…</p>
      ) : (
        <>
          <p className="mission-description">{evidence.question}</p>
          <p>
            Both strategies succeeded in all three trials. Extra inspection was explicitly
            requested. Action counts describe that behavior in this setup; they do not establish
            general prompt superiority or agent capability.
          </p>
          <div className="trial-table-wrap">
            <table className="trial-table">
              <caption>All three paired outcomes</caption>
              <thead>
                <tr>
                  <th scope="col">Trial</th>
                  <th scope="col">Inspect every product</th>
                  <th scope="col">Narrow candidates first</th>
                  <th scope="col">Verified outcome</th>
                </tr>
              </thead>
              <tbody>
                {evidence.trials.map((trial) => (
                  <tr key={trial.trial}>
                    <th scope="row">{trial.trial}</th>
                    {trial.contestants.map((contestant, index) => (
                      <td key={index}>{contestant.actions} actions</td>
                    ))}
                    <td>
                      {trial.contestants.every((contestant) => contestant.correct)
                        ? 'Both correct'
                        : 'See individual outcomes below'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <section className="experiment-context">
            <h2>What was held fixed</h2>
            <p>
              Room {evidence.scenarioVersion}; seed {evidence.seed}; {evidence.limits.actions}{' '}
              actions and {evidence.limits.timeMs / 60000} minutes per contestant; the same
              visible-text browser tools and 12 retained recent actions. Model setting:{' '}
              {evidence.model}. The exact model version was not pinned.
            </p>
            <div className="strategy-intro">
              {evidence.configs.map((config, index) => (
                <div key={index}>
                  <span className={`contestant-avatar side-${index}`}>{index ? 'B' : 'A'}</span>
                  <div>
                    <h3>{config.name}</h3>
                    <p>{config.instructions}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="experiment-context">
            <h2>Workflow replay</h2>
            <p>
              The bundled recovery example is a separate recording with different instructions. It
              is not one of these trials.
            </p>
            <a className="text-link" href="#/example/stock-recovery">
              Watch the recovery replay →
            </a>
          </section>
          <section className="experiment-context">
            <h2>Inspect the records</h2>
            <p>
              The bundled evidence includes configurations, actions, final checks and server events.
              The full browser recordings for these three trials remain in the original local run
              data; they are not bundled here.
            </p>
            <a
              className="button light"
              href={demoUrl(experimentEvidencePath)}
              download="strategy-trials.json"
            >
              Download all trial evidence (JSON)
            </a>
            {evidence.trials.map((trial) => (
              <details className="trial-record" key={trial.trial}>
                <summary>Trial {trial.trial}: verified events and checks</summary>
                <div className="result-grid">
                  {trial.contestants.map((contestant, index) => (
                    <section key={index}>
                      <h3>{contestant.name}</h3>
                      <p>
                        {contestant.correct ? 'Correct completion' : 'Requirements not met'} ·{' '}
                        {contestant.actions} actions
                      </p>
                      {contestant.error && <p>{contestant.error}</p>}
                      <ul>
                        {contestant.result?.checks.map((check) => (
                          <li key={check.label}>
                            {check.passed ? '✓' : '×'} {check.label}
                          </li>
                        ))}
                      </ul>
                      <ol>
                        {contestant.events.map((event) => (
                          <li key={event.sequence}>
                            <time>{formatElapsed(event.elapsedMs)}</time> {event.message}
                          </li>
                        ))}
                      </ol>
                    </section>
                  ))}
                </div>
              </details>
            ))}
          </section>
          <p className="experiment-limit">
            Three repetitions of one room and seed are descriptive observations, not a broader
            benchmark. Model decisions may vary; CLI invocations and concurrent development checks
            add overhead, so latency is not used to claim efficiency. The scripted grader
            demonstration remains a separate fixture.
          </p>
        </>
      )}
    </main>
  );
}
