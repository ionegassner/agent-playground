import type { Run } from '../lib/contracts';
import { formatElapsed as time } from '../lib/time';
import { formatCash } from '../lib/format';
import { Icon } from './Icon';
export function Scorecard({
  run,
  onReset,
  onExport,
  busy,
}: {
  run: Run;
  onReset: () => void;
  onExport: () => void;
  busy: boolean;
}) {
  const result = run.result!;
  const item = run.items.find((item) => item.id === result.order?.itemId)!;
  return (
    <div className="scorecard">
      <span className={`score-icon ${result.correct ? 'success' : 'missed'}`}>
        <Icon name={result.correct ? 'check' : 'info'} size={32} />
      </span>
      <span className="eyebrow">SERVER-VERIFIED RESULT</span>
      <h2>
        {result.correct
          ? 'You found your way out.'
          : result.subscription
            ? 'Not quite an escape.'
            : 'An order. Not quite an escape.'}
      </h2>
      <p>
        {result.correct
          ? 'You paid attention to the details. Every requirement checks out.'
          : 'The final state does not meet every mission requirement.'}
      </p>
      <div className="score-stats">
        <div>
          <strong>{time(result.elapsedMs)}</strong>
          <span>ELAPSED TIME</span>
        </div>
        <div>
          <strong>
            {result.checks.filter((check) => check.passed).length}/{result.checks.length}
          </strong>
          <span>REQUIREMENTS</span>
        </div>
        <div>
          <strong>{result.recoveries}</strong>
          <span>RECOVERY EVENTS</span>
        </div>
      </div>
      {result.order && item ? (
        <div className="receipt">
          <img src={item.image} alt="" />
          <div>
            <strong>{item.name}</strong>
            <span>
              {result.order.quantity} pair ·{' '}
              {result.order.extras ? 'Gift wrap included' : 'No optional extras'}
            </span>
          </div>
          <b>{formatCash(result.order.total)}</b>
        </div>
      ) : result.subscription ? (
        <div className="receipt account-receipt">
          <Icon name="shield" size={25} />
          <div>
            <strong>Automatic renewal {result.subscription.renewalEnabled ? 'on' : 'off'}</strong>
            <span>
              {result.subscription.accessActive
                ? `Access through ${result.subscription.paidThrough}`
                : 'Access ended immediately'}
            </span>
          </div>
        </div>
      ) : null}
      <ul className="result-checks">
        {result.checks.map((check) => (
          <li key={check.label} className={check.passed ? 'passed' : 'failed'}>
            <Icon name={check.passed ? 'check' : 'close'} size={16} />
            {check.label}
            <small>{check.passed ? 'PASS' : 'MISSED'}</small>
          </li>
        ))}
      </ul>
      <div className="score-actions">
        <button className="button dark" onClick={onReset} disabled={busy}>
          Try the same challenge
          <Icon name="reset" size={17} />
        </button>
        <button className="button light" onClick={onExport}>
          Download run record
          <Icon name="download" size={17} />
        </button>
      </div>
      <details className="run-timeline">
        <summary>
          See the verified workflow <span>{run.events.length} events</span>
        </summary>
        <ol>
          {run.events.map((event) => (
            <li key={event.sequence}>
              <time>{time(event.elapsedMs)}</time>
              <span>{event.message}</span>
            </li>
          ))}
        </ol>
      </details>
      <p className="record-note">
        {run.participant === 'agent' ? 'Agent' : 'Human'} attempt · Scenario {run.scenarioVersion} ·
        Seed {run.seed}
        <br />
        The download contains application events and results. Browser recordings are available for
        managed agent runs.
      </p>
    </div>
  );
}
