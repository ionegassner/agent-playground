import { ExperimentPage } from './pages/ExperimentPage';
import { AgentArenaPage } from './pages/AgentArenaPage';
import { ChallengePage } from './pages/ChallengePage';
import { ArchivePage } from './pages/ArchivePage';
import { RulesPage } from './pages/RulesPage';
import { useEffect, useState } from 'react';
import { api } from './lib/api';
import type { Run, RunRecord, Purchase, WorkflowAction } from './lib/contracts';
import { Icon } from './components/Icon';

const rememberedRuns = () => {
  try {
    return JSON.parse(sessionStorage.getItem('arena-runs') || '[]') as string[];
  } catch {
    return [];
  }
};
function remember(id: string) {
  sessionStorage.setItem(
    'arena-runs',
    JSON.stringify([id, ...rememberedRuns().filter((x) => x !== id)].slice(0, 30)),
  );
}
function download(record: RunRecord) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `agent-playground-${record.id}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || '/');
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [records, setRecords] = useState<Run[]>([]);
  useEffect(() => {
    const change = () => {
      setRoute(location.hash.slice(1) || '/');
      setError('');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    let alive = true;
    if (route.startsWith('/play/')) {
      setBusy(true);
      api
        .get(route.slice(6))
        .then((data) => {
          if (alive) {
            setRun(data);
            remember(data.id);
          }
        })
        .catch((e) => {
          if (alive) setError(e.message);
        })
        .finally(() => {
          if (alive) setBusy(false);
        });
    }
    if (route === '/archive') {
      Promise.all(rememberedRuns().map((id) => api.get(id).catch(() => null))).then((data) => {
        if (alive) setRecords(data.filter((x): x is Run => x !== null));
      });
    }
    return () => {
      alive = false;
    };
  }, [route]);
  const start = async (scenario: unknown = 'signal-hunt', requestedSeed = 1, limitMs = 300000) => {
    setBusy(true);
    setError('');
    try {
      const next = await api.create(
        requestedSeed,
        typeof scenario === 'string' ? scenario : 'signal-hunt',
        limitMs,
      );
      setRun(next);
      remember(next.id);
      location.hash = `/play/${next.id}`;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const step = async (type: WorkflowAction, itemId?: string) => {
    if (!run) return;
    setBusy(true);
    setError('');
    try {
      setRun(await api.action(run.id, type, itemId));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!run) return;
    setBusy(true);
    setError('');
    try {
      const next = await api.reset(run.id);
      setRun(next);
      remember(next.id);
      location.hash = `/play/${next.id}`;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const buy = async (purchase: Purchase) => {
    if (!run) return 'Start a challenge first.';
    const result = await api.purchase(run.id, purchase);
    if (result.run) setRun(result.run);
    return result.error;
  };
  const exportRecord = async () => {
    if (!run) return;
    try {
      download(await api.record(run.id));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const playing = route.startsWith('/play/');
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
          <a className={route === '/' || playing ? 'active' : ''} href="#/">
            Playground
          </a>
          <a className={route === '/archive' ? 'active' : ''} href="#/archive">
            Human attempts
          </a>
          <a className={route === '/rules' ? 'active' : ''} href="#/rules">
            How it works
          </a>
        </nav>
        <span className="header-status">
          <i />
          LOCAL PLAYGROUND
        </span>
      </header>
      {error && (
        <div className="global-error" role="alert">
          {error}
          <button onClick={() => setError('')} aria-label="Dismiss error">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {(route === '/' || route.startsWith('/match/') || route.startsWith('/example/')) && (
        <AgentArenaPage
          key={route}
          startHuman={start}
          matchId={route.startsWith('/match/') ? route.slice(7) : undefined}
          exampleId={route.startsWith('/example/') ? route.slice(9) : undefined}
        />
      )}
      {playing && (!run || run.id !== route.slice(6)) && (
        <main className="loading-screen">
          <span className="logo-mark">
            <Icon name="exit" />
          </span>
          <h1>{error ? 'This attempt is unavailable.' : 'Setting your starting line…'}</h1>
          <button className="button dark" onClick={start}>
            Start a fresh attempt
            <Icon name="arrow" />
          </button>
        </main>
      )}
      {playing && run && run.id === route.slice(6) && (
        <ChallengePage
          key={run.id}
          run={run}
          busy={busy}
          step={step}
          reset={reset}
          buy={buy}
          exportRecord={exportRecord}
          start={start}
        />
      )}
      {route === '/archive' && <ArchivePage records={records} start={start} busy={busy} />}
      {route === '/experiment' && <ExperimentPage />}
      {route === '/rules' && <RulesPage start={start} busy={busy} />}
      {!['/', '/archive', '/rules', '/experiment'].includes(route) &&
        !playing &&
        !route.startsWith('/match/') &&
        !route.startsWith('/example/') && (
          <main className="empty-state">
            <h1>This door goes nowhere.</h1>
            <a className="button dark" href="#/">
              Back to the playground
              <Icon name="arrow" />
            </a>
          </main>
        )}
      <footer className="site-footer">
        <span>
          agent playground<span className="wordmark-dot">.</span>
        </span>
        <span>Local browser tasks. Verified outcomes.</span>
        <a href="#/rules">
          How outcomes are checked
          <Icon name="up" size={13} />
        </a>
      </footer>
    </>
  );
}
