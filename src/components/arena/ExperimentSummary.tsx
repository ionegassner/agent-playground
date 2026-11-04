export function ExperimentSummary() {
  return (
    <section className="experiment-summary" aria-labelledby="experiment-heading">
      <h2 id="experiment-heading">A small controlled experiment.</h2>
      <div className="experiment-summary-grid">
        <div>
          <h3>What we tried</h3>
          <p>
            Explicitly inspect every product, or narrow candidates first. Three paired trials used
            the same stock-recovery room, seed, model setting and budgets.
          </p>
        </div>
        <div>
          <h3>What happened</h3>
          <p>
            Both succeeded in all three trials. Exhaustive inspection used{' '}
            <strong>20, 18 and 18 actions</strong>; narrowing used <strong>8 each time</strong>.
            Extra inspection was requested, so this is not evidence of general prompt superiority.
          </p>
        </div>
      </div>
      <p className="config-note">
        These trials are separate from the bundled recovery replay and use different instructions.
      </p>
      <a className="text-link" href="#/experiment">
        Read all three trials and their evidence →
      </a>
    </section>
  );
}
