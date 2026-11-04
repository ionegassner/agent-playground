import { Icon } from '../components/Icon';
export function RulesPage({ start, busy }: { start: () => void; busy: boolean }) {
  return (
    <main className="rules-page">
      <span className="eyebrow">HOW IT WORKS</span>
      <h1>
        Fair starts.
        <br />
        Honest finishes.
      </h1>
      <p className="rules-lead">
        Read the mission, watch the recording, then inspect the server-checked outcome.
      </p>
      <div className="rules-grid">
        {[
          {
            number: '01',
            title: 'Read the mission.',
            text: 'Complete the task exactly as requested. Product details, optional extras, retention offers and final confirmations are part of the rooms.',
          },
          {
            number: '02',
            title: 'Take the same course.',
            text: 'Every fresh attempt uses the same scenario and seed. Obstacles follow defined actions, so reset gives you equivalent task conditions.',
          },
          {
            number: '03',
            title: 'Correct beats quick.',
            text: 'A completed action is not automatically a win. The server checks the final order or account state against every mission requirement. A wrong result cannot win on speed.',
          },
          {
            number: '04',
            title: 'Know what you’re watching.',
            text: 'Local Codex comparisons and optional human play are available. The viewer plays both browser videos on one clock, with clickable action checkpoints and verified turning points. Decision summaries are agent-reported intentions. Live runs stay on your machine and use your own account.',
          },
        ].map((rule) => (
          <article key={rule.number}>
            <span>{rule.number}</span>
            <h2>{rule.title}</h2>
            <p>{rule.text}</p>
          </article>
        ))}
      </div>
      <div className="rules-bottom">
        <p>Fictional shops and accounts. No real payments or subscriptions.</p>
        <button className="button dark" onClick={start} disabled={busy}>
          Try a task
          <Icon name="arrow" />
        </button>
      </div>
    </main>
  );
}
