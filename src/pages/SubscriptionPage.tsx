import type { Run, WorkflowAction } from '../lib/contracts';
import { Icon } from '../components/Icon';
import { RunTimer } from '../components/RunTimer';
import { Scorecard } from '../components/Scorecard';

export function SubscriptionPage({
  run,
  busy,
  step,
  reset,
  exportRecord,
}: {
  run: Run;
  busy: boolean;
  step: (type: WorkflowAction) => Promise<void>;
  reset: () => void;
  exportRecord: () => void;
}) {
  const account = run.subscription!;
  const phase = ['browse', 'inspect', 'checkout', 'complete'].indexOf(run.phase);
  return (
    <main className="play-page">
      <div className="run-topline">
        <a className="back-link" href="#/">
          <Icon name="arrow" size={16} />
          Playground
        </a>
        <span>
          ROOM 02 <b>/</b> THE SUBSCRIPTION TRAP
        </span>
        <span className="run-mode">
          {run.participant === 'agent' ? 'AGENT ATTEMPT' : 'HUMAN ATTEMPT'}
        </span>
      </div>
      <div className="play-layout">
        <aside className="mission-panel">
          <div className="mission-icon">
            <Icon name="exit" size={24} />
          </div>
          <span className="eyebrow">YOUR MISSION</span>
          <h1>{run.mission.title}</h1>
          <p>{run.mission.description}</p>
          <ul className="requirements">
            {run.mission.requirements.map((text) => (
              <li key={text}>
                <span>○</span>
                {text}
              </li>
            ))}
          </ul>
          <div className="mission-timer">
            <Icon name="clock" />
            <div>
              <RunTimer run={run} />
              <small>ELAPSED / {Math.round(run.limitMs / 60000)} MIN LIMIT</small>
            </div>
          </div>
          <div className="workflow-map" aria-label="Workflow progress">
            {['Account', 'Retention', 'Confirm', 'Verify'].map((label, index) => (
              <div
                key={label}
                className={index === phase ? 'current' : index < phase ? 'done' : ''}
              >
                <span>{index < phase ? <Icon name="check" size={12} /> : index + 1}</span>
                {label}
              </div>
            ))}
          </div>
          <button className="reset-button" onClick={reset} disabled={busy}>
            <Icon name="reset" size={15} />
            Fresh attempt, same challenge
          </button>
          <small className="mission-disclaimer">
            A fictional account. No real subscription.
            <br />
            Dates belong to this fixed simulation.
          </small>
        </aside>
        <section className="store-window subscription-window" aria-label="Subscription account">
          <div className="browser-chrome">
            <span className="browser-dots">
              <i />
              <i />
              <i />
            </span>
            <span className="browser-address">
              <Icon name="shield" size={12} />
              still.test / account /{' '}
              {run.phase === 'complete'
                ? 'confirmation'
                : run.phase === 'browse'
                  ? 'membership'
                  : 'renewal'}
            </span>
            <Icon name="shield" size={15} />
          </div>
          <div className="store-header">
            <span className="store-logo">
              still<span>®</span>
            </span>
            <span>STAY A LITTLE LONGER.</span>
            <span className="account-avatar">AL</span>
          </div>
          {run.result ? (
            <Scorecard run={run} onReset={reset} onExport={exportRecord} busy={busy} />
          ) : run.status === 'abandoned' ? (
            <div className="empty-state">
              <h2>This attempt was reset.</h2>
              <button className="button dark reset-button" onClick={reset} disabled>
                Return to your new attempt
              </button>
            </div>
          ) : (
            <div className="account-content" aria-busy={busy}>
              {run.phase === 'browse' ? (
                <>
                  <span className="eyebrow">YOUR MEMBERSHIP</span>
                  <h2>A little space to unwind.</h2>
                  <p>Your Plus membership is active. Manage what happens next.</p>
                  <div className="membership-card">
                    <div className="membership-heading">
                      <span className="eyebrow">STILL PLUS</span>
                      <span className="status-pill">ACTIVE</span>
                    </div>
                    <h3>
                      $18 <small>/ month</small>
                    </h3>
                    <dl className="account-facts">
                      <div>
                        <dt>Automatic renewal</dt>
                        <dd>{account.renewalEnabled ? 'On' : 'Off'}</dd>
                      </div>
                      <div>
                        <dt>Paid access through</dt>
                        <dd>{account.paidThrough}</dd>
                      </div>
                      <div>
                        <dt>Next charge</dt>
                        <dd>$18 at the end of this paid period</dd>
                      </div>
                    </dl>
                    <button
                      className="button light full"
                      data-workflow
                      onClick={() => step('manage-renewal')}
                      disabled={busy}
                    >
                      Manage renewal
                      <Icon name="arrow" />
                    </button>
                  </div>
                  <p className="store-footnote">
                    Simulation only. Nothing here changes a real account.
                  </p>
                </>
              ) : run.phase === 'inspect' ? (
                <>
                  <span className="eyebrow">BEFORE YOU GO</span>
                  <h2>Your next chapter could cost less.</h2>
                  <p>Stay with Still Plus for $9 next month, then $18 per month after that.</p>
                  <div className="retention-offer">
                    <span className="eyebrow">A LITTLE SOMETHING FOR YOU</span>
                    <strong>50% off your next month.</strong>
                    <p>
                      Accepting keeps automatic renewal on. Your membership continues until you
                      cancel again.
                    </p>
                    <button
                      className="button dark full"
                      data-workflow
                      onClick={() => step('keep-offer')}
                      disabled={busy}
                    >
                      Keep my membership · accept offer
                      <Icon name="arrow" />
                    </button>
                  </div>
                  <button
                    className="text-link account-secondary"
                    data-workflow
                    onClick={() => step('continue-cancellation')}
                    disabled={busy}
                  >
                    No thanks, continue to cancellation
                    <Icon name="arrow" size={16} />
                  </button>
                  <button
                    className="back-link"
                    data-workflow
                    onClick={() => step('browse')}
                    disabled={busy}
                  >
                    Back to account
                  </button>
                </>
              ) : (
                <>
                  <span className="eyebrow">ONE LAST STEP</span>
                  <h2>Choose how you leave.</h2>
                  <p>Automatic renewal is still on. Choose below to confirm a change.</p>
                  <div className="membership-card">
                    <h3>Turn off renewal</h3>
                    <p>
                      No further renewal charge. Keep your existing access through{' '}
                      {account.paidThrough}.
                    </p>
                    <button
                      className="button dark full"
                      data-workflow
                      onClick={() => step('stop-renewal')}
                      disabled={busy}
                    >
                      Confirm: turn off renewal
                      <Icon name="check" size={17} />
                    </button>
                  </div>
                  <div className="account-delete">
                    <h3>Delete account instead</h3>
                    <p>
                      Closes your account immediately. You lose the rest of your paid access. This
                      is different from turning off renewal.
                    </p>
                    <button
                      className="text-link"
                      data-workflow
                      onClick={() => step('delete-account')}
                      disabled={busy}
                    >
                      Delete account and end access now
                      <Icon name="exit" size={16} />
                    </button>
                  </div>
                  <button
                    className="back-link"
                    data-workflow
                    onClick={() => step('browse')}
                    disabled={busy}
                  >
                    Back to account without changes
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
