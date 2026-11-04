import { experimentQuestion, genericComparisonQuestion } from '../../lib/experiment';
import { useComparisonSetup } from '../../hooks/useComparisonSetup';
import { scenarioOptions, strategyPresets } from '../../lib/scenarios';
import { Icon } from '../Icon';
export function ComparisonSetup({
  startHuman,
}: {
  startHuman: (scenarioId?: string, seed?: number, timeMs?: number) => void;
}) {
  const {
    status,
    experiment,
    experimentError,
    experimentMatches,
    loadExperiment,
    configs,
    seed,
    setSeed,
    scenarioId,
    setScenarioId,
    limits,
    setLimits,
    parentMatchId,
    parentMatch,
    error,
    starting,
    launch,
    edit,
  } = useComparisonSetup();
  return (
    <section aria-label="Comparison setup">
      <div className="section-heading">
        <h2>Try two approaches.</h2>
      </div>
      <p className="setup-question">
        {experimentMatches ? experimentQuestion : genericComparisonQuestion}
      </p>
      <div className="experiment-load">
        <button className="button light" onClick={loadExperiment} disabled={!experiment || !status}>
          Load experiment strategies
        </button>
        <p className="config-note">
          Explicitly replaces this setup with the recorded stock-recovery instructions, seed 1, 24
          actions, three minutes and 12 retained actions. Uses an available local model; the
          original trials used the CLI default.
        </p>
        {experimentError && <p role="status">{experimentError}</p>}
      </div>
      {error && (
        <p role="alert" className="global-error">
          {error}
        </p>
      )}
      {parentMatchId && (
        <aside className="rematch-banner">
          <div>
            <strong>An instruction rematch.</strong>
            <p>
              Same room, seed, models and limits. Edit either profile’s instructions to test a
              different approach.
            </p>
            {parentMatch && (
              <p>
                {configs
                  .map(
                    (c, i) =>
                      `${i ? 'B' : 'A'}: ${c.instructions === parentMatch.contestants[i].config.instructions ? 'instructions unchanged' : 'instructions edited'}`,
                  )
                  .join(' · ')}
              </p>
            )}
          </div>
          <a className="text-link" href={`#/match/${parentMatchId}`}>
            View original
            <Icon name="up" size={15} />
          </a>
          <button
            className="text-link"
            onClick={() => {
              sessionStorage.removeItem('arena-comparison-draft');
              location.reload();
            }}
          >
            Start a new comparison
          </button>
        </aside>
      )}
      <section className="lab-task">
        {scenarioId === 'subscription-trap' ? (
          <span className="room-glyph">
            <Icon name="exit" size={35} />
          </span>
        ) : (
          <img src="/products/orbit.svg" alt="Moss green headphones" />
        )}
        <div>
          <label className="scenario-picker">
            Room & mission
            <select
              aria-label="Scenario"
              disabled={!!parentMatchId}
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
            >
              {['Subscription cancellation', 'Shopping checkout'].map((room) => (
                <optgroup label={room} key={room}>
                  {scenarioOptions
                    .filter(
                      (option) =>
                        (option.id === 'subscription-trap') ===
                        (room === 'Subscription cancellation'),
                    )
                    .map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} · {option.skill}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <p>{scenarioOptions.find((option) => option.id === scenarioId)?.description}</p>
        </div>
      </section>
      <div className="config-grid">
        {configs.map((config, index) => (
          <section className="agent-config" key={index}>
            <div className="contestant-label">
              <span className={`contestant-avatar side-${index}`}>{index ? 'B' : 'A'}</span>
              <span>CONTESTANT {index ? 'B' : 'A'}</span>
              <span className="tool-label">DOM-assisted</span>
            </div>
            <label>
              Agent name
              <input
                value={config.name}
                maxLength={50}
                onChange={(e) => edit(index, 'name', e.target.value)}
              />
            </label>
            <label>
              Strategy preset
              <select
                aria-label="Strategy preset"
                value={
                  strategyPresets.find((p) => p.instructions === config.instructions)?.id || ''
                }
                onChange={(e) => {
                  const preset = strategyPresets.find((p) => p.id === e.target.value);
                  if (preset) edit(index, 'instructions', preset.instructions);
                }}
              >
                <option value="">Custom instructions</option>
                {strategyPresets.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Task instructions
              <textarea
                aria-label="Task instructions"
                rows={6}
                value={config.instructions}
                maxLength={6000}
                onChange={(e) => edit(index, 'instructions', e.target.value)}
              />
            </label>
            <p className="config-note">
              Change the strategy instructions; the mission remains the same for both agents.
            </p>
          </section>
        ))}
      </div>
      <details className="advanced-settings">
        <summary>Advanced settings</summary>
        <p className="config-note">
          Same room and budgets for both contestants. Rematches preserve model settings too.
        </p>
        <div className="advanced-common">
          {' '}
          <label>
            Scenario seed
            <input
              type="number"
              min={1}
              disabled={!!parentMatchId}
              max={999999}
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
            />
          </label>{' '}
          <div className="shared-limits">
            <label>
              Shared action limit
              <select
                aria-label="Shared action limit"
                disabled={!!parentMatchId}
                value={limits.actions}
                onChange={(e) => setLimits({ ...limits, actions: Number(e.target.value) })}
              >
                {[8, 16, 24, 48].map((n) => (
                  <option key={n} value={n}>
                    {n} actions
                  </option>
                ))}
              </select>
            </label>
            <label>
              Shared time limit
              <select
                aria-label="Shared time limit"
                disabled={!!parentMatchId}
                value={limits.timeMs}
                onChange={(e) => setLimits({ ...limits, timeMs: Number(e.target.value) })}
              >
                <option value={60000}>1 minute</option>
                <option value={180000}>3 minutes</option>
                <option value={300000}>5 minutes</option>
              </select>
            </label>
          </div>
        </div>
        <div className="config-grid">
          {configs.map((config, index) => (
            <section className="agent-config" key={index}>
              <h3>Contestant {index ? 'B' : 'A'}</h3>{' '}
              <label>
                Model
                <select
                  aria-label="Model"
                  disabled={!!parentMatchId}
                  value={config.model}
                  onChange={(e) => edit(index, 'model', e.target.value)}
                >
                  {!status?.models.length && <option value="">Inference connection needed</option>}
                  {status?.models.map((model) => (
                    <option key={model} value={model}>
                      {model === 'codex-default' ? 'Codex · local CLI default' : model}
                    </option>
                  ))}
                </select>
              </label>
              <div className="agent-settings">
                <label>
                  Reasoning effort
                  <select
                    aria-label="Reasoning effort"
                    disabled={!!parentMatchId}
                    value={config.reasoningEffort || ''}
                    onChange={(e) => edit(index, 'reasoningEffort', e.target.value)}
                  >
                    <option value="">Model default</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label>
                  Recent actions retained
                  <select
                    aria-label="Recent actions retained"
                    disabled={!!parentMatchId || status?.supportsActionMemory === false}
                    value={config.memorySteps ?? 12}
                    onChange={(e) => edit(index, 'memorySteps', Number(e.target.value))}
                  >
                    <option value="2">Last 2 actions</option>
                    <option value="6">Last 6 actions</option>
                    <option value="12">Last 12 actions</option>
                  </select>
                </label>
              </div>
            </section>
          ))}
        </div>{' '}
        <p className="config-note">
          {status?.message} Codex summaries and token usage are recorded; its output limit is
          checked between actions.
        </p>
      </details>
      <div className="launch-bar">
        <div>
          <strong>One starting line. Two isolated browsers.</strong>
          <p className="config-note">
            Live runs use your own local provider account and allowance.
          </p>
        </div>
        <button className="button dark" onClick={launch} disabled={starting || !status?.ready}>
          {starting ? 'Starting comparison…' : parentMatchId ? 'Run rematch' : 'Run comparison'}
          <Icon name="play" size={17} />
        </button>
      </div>
      {!status?.ready && (
        <aside className="inference-notice">
          <Icon name="info" />
          <div>
            <strong>Connect inference to run real agents.</strong>
            <p>
              {status?.message || 'Checking runner configuration…'} Saved examples remain available
              without inference.
            </p>
          </div>
        </aside>
      )}
      <button
        className="text-link try-challenge"
        onClick={() => startHuman(scenarioId, seed, limits.timeMs)}
      >
        Try the challenge yourself
        <Icon name="arrow" size={15} />
      </button>
    </section>
  );
}
