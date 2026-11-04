import type { Run } from '../lib/contracts';
import { formatElapsed as time } from '../lib/time';
import { Icon } from '../components/Icon';
export function ArchivePage({
  records,
  start,
  busy,
}: {
  records: Run[];
  start: () => void;
  busy: boolean;
}) {
  return (
    <main className="archive-page">
      <span className="eyebrow">HUMAN ATTEMPTS</span>
      <h1>Your attempts.</h1>
      <p className="muted">
        Attempts from this browser session. Completed runs include verified scorecards and
        downloadable event records.
      </p>
      {records.length ? (
        <div className="archive-list">
          {records.map((record) => (
            <a href={`#/play/${record.id}`} key={record.id} className="archive-row">
              <span className={`attempt-avatar ${record.result?.correct ? 'success' : ''}`}>
                <Icon name={record.result ? 'check' : 'clock'} />
              </span>
              <div>
                <strong>{record.mission.title}</strong>
                <small>
                  {new Date(record.startedAt).toLocaleString()} · Human · Seed {record.seed}
                </small>
              </div>
              <span>
                {record.result
                  ? record.result.correct
                    ? 'Mission complete'
                    : 'Requirements missed'
                  : record.status === 'active'
                    ? 'In progress'
                    : 'Reset'}
              </span>
              <b>{record.result ? time(record.result.elapsedMs) : '—'}</b>
              <Icon name="up" size={18} />
            </a>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="mission-icon">
            <Icon name="bag" size={28} />
          </span>
          <h2>No human attempts yet.</h2>
          <p>Play the challenge to create your first attempt.</p>
          <button className="button dark" onClick={start} disabled={busy}>
            Enter the challenge
            <Icon name="arrow" />
          </button>
        </div>
      )}
    </main>
  );
}
