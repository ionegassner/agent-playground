import { useEffect, useState } from 'react';
import { ExampleLibrary } from './components/arena/ExampleLibrary';
import { ReplayViewer } from './components/arena/ReplayViewer';
import { Icon } from './components/Icon';
import { demoRecord } from './lib/demo';
import type { ExampleSummary, RecordedExample } from './lib/match-contracts';
import { ExperimentPage } from './pages/ExperimentPage';

const examples = demoRecord<ExampleSummary[]>('/examples/index.json');

export default function DemoApp() {
  const [route, setRoute] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const change = () => {
      setRoute(location.hash.slice(1) || '/');
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', change);
    return () => removeEventListener('hashchange', change);
  }, []);
  const example = examples.find((item) => route === `/example/${item.slug}`);
  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#/" aria-label="Agent Playground home">
          <span className="logo-mark">
            <Icon name="exit" size={24} />
          </span>
          <span>
            agent
            <span className="wordmark-second">
              playground<span className="wordmark-dot">.</span>
            </span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#/" className={route === '/' || example ? 'active' : ''}>
            Examples
          </a>
          <a href="#/experiment" className={route === '/experiment' ? 'active' : ''}>
            Trial evidence
          </a>
          <a href="#/about" className={route === '/about' ? 'active' : ''}>
            About
          </a>
        </nav>
        <span className="header-status">
          <i /> RECORDED DEMO
        </span>
      </header>
      <aside className="demo-notice" aria-label="Demo mode">
        Interactive recordings · No installation, sign-in or model calls
      </aside>
      {route === '/' ? (
        <main className="agent-arena demo-home">
          <header className="lab-heading">
            <div>
              <span className="section-label">
                <span className="tiny-square" /> AGENT PLAYGROUND
              </span>
              <h1>Did the agent actually finish the task?</h1>
              <p>
                A bounded local environment for testing browser agents. Follow their actions through
                repeatable tasks, then check what changed.
              </p>
            </div>
          </header>
          <section className="demo-start" aria-label="Quick start">
            <div>
              <span className="eyebrow">START HERE · ABOUT A MINUTE</span>
              <h2>A checkout fails. What happens next?</h2>
              <p>
                Two instruction profiles encounter the same sold-out item. Open the recording, jump
                to the obstacle, and see how they recover.
              </p>
            </div>
            <a className="button dark" href="#/example/stock-recovery">
              Watch stock recovery <Icon name="arrow" size={16} />
            </a>
          </section>
          <p className="demo-explainer">
            These are recorded attempts with interactive playback, not live agents. You can pause,
            seek, enlarge either view and reveal the verified results.
          </p>
          <ExampleLibrary examples={examples} />
          <section className="experiment-summary">
            <h2>Why check the outcome separately?</h2>
            <p>
              A completed checkout can still exceed the budget. A cancellation can stop renewal but
              also remove paid access. The local application checks the final state independently of
              what the agent says.
            </p>
            <a className="text-link" href="#/about">
              See how it works →
            </a>
          </section>
        </main>
      ) : example ? (
        <main className="agent-arena" key={route}>
          <ReplayViewer
            example={demoRecord<RecordedExample>(`/examples/${example.slug}/replay.json`)}
            match={demoRecord<RecordedExample>(`/examples/${example.slug}/replay.json`).match}
          />
        </main>
      ) : route === '/experiment' ? (
        <ExperimentPage />
      ) : (
        <main className="agent-arena demo-about">
          <span className="eyebrow">ABOUT THIS PROJECT</span>
          <h1>
            {route === '/about'
              ? 'Actions, evidence and outcomes.'
              : 'This example is not included.'}
          </h1>
          {route === '/about' && (
            <>
              <p>
                Agent Playground is a bounded local environment for testing browser agents before
                connecting them to real workflows.
              </p>
              <p>
                An agent can complete a sequence of actions and still miss the user’s goal. A
                purchase might exceed the delivered-price budget. A cancellation might remove access
                the user wanted to keep. The playground makes those outcomes inspectable without
                involving real purchases or accounts.
              </p>
              <h2>How it works</h2>
              <p>
                Agents interact with a running application through browser controls. Each attempt
                starts with isolated state, and the server checks the final order or account state
                against the task’s requirements.
              </p>
              <p>
                The task, starting conditions, available tools and limits can be held fixed across
                attempts. The agent’s decisions can vary. Recordings, checkpoints and application
                events make the actions and their consequences inspectable.
              </p>
              <h2>Technical choices</h2>
              <ul>
                <li>
                  <strong>React and TypeScript:</strong> replay controls, shared playback state and
                  responsive contestant views.
                </li>
                <li>
                  <strong>Node.js and SQLite:</strong> workflow transitions, isolated run records
                  and server-owned verification.
                </li>
                <li>
                  <strong>Playwright:</strong> browser execution, separate browser contexts,
                  recordings and acceptance checks.
                </li>
                <li>
                  <strong>DOM-assisted controls:</strong> visible text and indexed actions keep the
                  interaction bounded and inspectable.
                </li>
              </ul>
              <p>
                Local execution keeps setup small and puts live agent access under the operator’s
                control. Each workflow needs explicit success criteria; adding another domain means
                defining what a correct outcome looks like.
              </p>
              <h2>Current scope</h2>
              <p>
                Shopping and subscription-cancellation workflows use synthetic, seeded data with
                real local state transitions. They exercise constraint checking and recovery from a
                stock rejection.
              </p>
              <p>
                This demo contains interactive recordings and their original verification records.
                It makes no model calls. The scripted grading example is labeled separately from the
                recorded agent runs.
              </p>
              <h2>Next steps</h2>
              <ul>
                <li>A common adapter for user-operated local agents.</li>
                <li>Tool and MCP call budgets at the execution boundary.</li>
                <li>Resettable integrations for timeouts, rate limits and ambiguous outcomes.</li>
                <li>
                  Unchanged agent instructions tested against workflow variations and a scripted
                  baseline.
                </li>
              </ul>
              <p>
                The next useful experiment is one changed cancellation workflow: does the automation
                adapt while preserving the same account-state requirements?
              </p>
              <p>
                Shopping interactions were adapted from the MIT-licensed dopaminebuy project.
                Attribution and license details are included below.
              </p>
              <details className="replay-notes">
                <summary>License and attribution</summary>
                <pre className="demo-license">
                  {demoRecord<string>('/LICENSE')}\n\n
                  {demoRecord<string>('/THIRD_PARTY_LICENSES.txt')}
                </pre>
              </details>
            </>
          )}
          <a className="button light" href="#/">
            Back to examples <Icon name="arrow" size={16} />
          </a>
        </main>
      )}
      <footer className="site-footer">
        <span>agent playground.</span>
        <span>Local-first. Recorded evidence.</span>
        <a href="#/about">About this demo</a>
      </footer>
    </>
  );
}
