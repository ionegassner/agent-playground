import type { ExampleSummary } from '../../lib/match-contracts';
import { Icon } from '../Icon';
export function ExampleLibrary({ examples }: { examples: ExampleSummary[] }) {
  if (!examples.length) return null;
  return (
    <section className="example-library" aria-label="Recorded examples">
      <div className="section-heading">
        <h2>Pick a question. Watch it unfold.</h2>
        <span className="eyebrow">NO PROVIDER LOGIN NEEDED</span>
      </div>
      <div className="example-grid">
        {examples.map((item) => (
          <a className="example-card" key={item.slug} href={`#/example/${item.slug}`}>
            <span className="eyebrow">
              {item.kind === 'scripted' ? 'SCRIPTED GRADER DEMO' : 'RECORDED AGENT RUN'}
              <Icon name="play" size={14} />
            </span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <span className="text-link">
              Watch the attempt
              <Icon name="arrow" size={15} />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
