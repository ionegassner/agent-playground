import { SubscriptionPage } from './SubscriptionPage';
import { useState } from 'react';
import type { Run, Purchase, WorkflowAction } from '../lib/contracts';
import { Icon } from '../components/Icon';
import { ItemCard } from '../components/ItemCard';
import { BuySheet } from '../components/BuySheet';
import { RunTimer } from '../components/RunTimer';
import { Scorecard } from '../components/Scorecard';
import { formatCash } from '../lib/format';
export function ChallengePage({
  run,
  busy,
  step,
  reset,
  buy,
  exportRecord,
  start,
}: {
  run: Run;
  busy: boolean;
  step: (type: WorkflowAction, itemId?: string) => Promise<void>;
  reset: () => void;
  buy: (purchase: Purchase) => Promise<string | undefined>;
  exportRecord: () => void;
  start: () => void;
}) {
  const [sort, setSort] = useState('recommended');
  const [query, setQuery] = useState('');
  const selected = run?.items.find((item) => item.id === run.selectedItemId);
  const visibleItems =
    run?.items
      .filter((item) => `${item.brand} ${item.name}`.toLowerCase().includes(query.toLowerCase()))
      .toSorted((a, b) =>
        sort === 'price' ? a.price - b.price : sort === 'rating' ? b.rating - a.rating : 0,
      ) || [];
  if (run.subscription)
    return (
      <SubscriptionPage
        run={run}
        busy={busy}
        step={step}
        reset={reset}
        exportRecord={exportRecord}
      />
    );
  return (
    <main className="play-page">
      <div className="run-topline">
        <a className="back-link" href="#/">
          <Icon name="arrow" style={{ transform: 'rotate(180deg)' }} size={16} />
          Playground
        </a>
        <span>
          CHALLENGE 01 <b>/</b> {run.mission.title.toUpperCase()}
        </span>
        <span className="run-mode">
          {run.participant === 'agent' ? 'AGENT ATTEMPT' : 'HUMAN ATTEMPT'}
        </span>
      </div>
      <div className="play-layout">
        <aside className="mission-panel">
          <div className="mission-icon">
            <Icon name="headphones" size={24} />
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
            {['Browse', 'Inspect', 'Checkout', 'Verify'].map((label, index) => {
              const phase = ['browse', 'inspect', 'checkout', 'complete'].indexOf(run.phase);
              return (
                <div
                  key={label}
                  className={index === phase ? 'current' : index < phase ? 'done' : ''}
                >
                  <span>{index < phase ? <Icon name="check" size={12} /> : index + 1}</span>
                  {label}
                </div>
              );
            })}
          </div>
          <button className="reset-button" onClick={reset} disabled={busy}>
            <Icon name="reset" size={15} />
            Fresh attempt, same challenge
          </button>
          <small className="mission-disclaimer">
            All products and details are fictional.
            <br />
            Correctness comes before speed.
          </small>
        </aside>
        <section className="store-window" aria-label="Challenge store">
          <div className="browser-chrome">
            <span className="browser-dots">
              <i />
              <i />
              <i />
            </span>
            <span className="browser-address">
              <Icon name="shield" size={12} />
              offline.test /{' '}
              {run.phase === 'browse'
                ? 'store'
                : run.phase === 'complete'
                  ? 'receipt'
                  : selected?.id || 'store'}
            </span>
            <Icon name="bag" size={15} />
          </div>
          <div className="store-header">
            <button
              onClick={() => step('browse')}
              disabled={busy || run.status !== 'active'}
              className="store-logo"
            >
              off<span>line</span>
              <b>®</b>
            </button>
            <span>GOOD SOUND. LESS NOISE.</span>
            <span className="store-cart">
              <Icon name="bag" size={18} />
              {run.result ? '1' : '0'}
            </span>
          </div>
          {run.result ? (
            <Scorecard run={run} onReset={reset} onExport={exportRecord} busy={busy} />
          ) : run.status === 'abandoned' ? (
            <div className="empty-state">
              <h2>This attempt was reset.</h2>
              <p>Start fresh with identical challenge conditions.</p>
              <button className="button dark" onClick={start}>
                New attempt
                <Icon name="arrow" />
              </button>
            </div>
          ) : (
            <>
              {run.phase === 'browse' && (
                <div className="store-content">
                  <div className="store-intro">
                    <span className="eyebrow">TUNE OUT. TUNE IN.</span>
                    <h2>Find a little quiet.</h2>
                    <p>For big days, long flights, and everything in between.</p>
                  </div>
                  <div className="store-tools">
                    <label className="search-box">
                      <span className="sr-only">Search products</span>
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Find your next favorite…"
                      />
                      <Icon name="headphones" size={17} />
                    </label>
                    <label className="sort-box">
                      <Icon name="filter" size={15} />
                      <span className="sr-only">Sort products</span>
                      <select value={sort} onChange={(e) => setSort(e.target.value)}>
                        <option value="recommended">Recommended</option>
                        <option value="price">Price: low to high</option>
                        <option value="rating">Highest rated</option>
                      </select>
                    </label>
                  </div>
                  <div className={`product-grid ${busy ? 'is-busy' : ''}`}>
                    {visibleItems.map((item, index) => (
                      <ItemCard
                        item={item}
                        index={index}
                        key={item.id}
                        onOpen={(id) => {
                          if (!busy) void step('inspect', id);
                        }}
                      />
                    ))}
                  </div>
                  {!visibleItems.length && (
                    <div className="empty-state">
                      <h3>No matches yet.</h3>
                      <p>Try another name, or clear your search.</p>
                      <button className="button light" onClick={() => setQuery('')}>
                        Clear search
                      </button>
                    </div>
                  )}
                  <p className="store-footnote">A fictional store. A very real attention test.</p>
                </div>
              )}
              {(run.phase === 'inspect' || run.phase === 'checkout') && selected && (
                <div className="detail-content">
                  <button className="back-link" onClick={() => step('browse')} disabled={busy}>
                    <Icon name="arrow" style={{ transform: 'rotate(180deg)' }} size={16} />
                    All headphones
                  </button>
                  <div className="product-detail">
                    <div className="detail-art">
                      <img
                        src={selected.image}
                        alt={`${selected.color} ${selected.fit} headphones`}
                      />
                      {!selected.available && <span className="sold-out">Sold out</span>}
                    </div>
                    <div className="detail-copy">
                      <span className="eyebrow">{selected.brand}</span>
                      <h2>{selected.name}</h2>
                      <span className="detail-rating">
                        ★ {selected.rating} <span>/ PEOPLE LIKE THE QUIET</span>
                      </span>
                      <p>{selected.description}</p>
                      <dl className="spec-grid">
                        <div>
                          <dt>Fit</dt>
                          <dd>{selected.fit === 'over-ear' ? 'Over-ear' : 'In-ear'}</dd>
                        </div>
                        <div>
                          <dt>Battery</dt>
                          <dd>{selected.batteryHours} hours</dd>
                        </div>
                        <div>
                          <dt>Noise cancellation</dt>
                          <dd>{selected.noiseCancelling ? 'Active' : 'Passive only'}</dd>
                        </div>
                        <div>
                          <dt>Color</dt>
                          <dd>{selected.color}</dd>
                        </div>
                      </dl>
                      <div className="detail-price">
                        <strong>{formatCash(selected.price)}</strong>
                        <span>+ {formatCash(selected.shipping)} standard delivery</span>
                      </div>
                      <button
                        className="button dark full"
                        onClick={() => step('checkout')}
                        disabled={busy || !selected.available}
                      >
                        {selected.available ? 'Go to checkout' : 'Currently sold out'}
                        <Icon name="arrow" />
                      </button>
                      <span className="detail-note">
                        Delivery is included in your final checkout total.
                      </span>
                    </div>
                  </div>
                  <div className="store-promise">
                    <Icon name="headphones" size={21} />
                    <span>Less noise. More you.</span>
                    <span>Find your own frequency.</span>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      {run.phase === 'checkout' && selected && !run.result && (
        <BuySheet
          key={selected.id}
          item={selected}
          onClose={() => {
            void step('inspect', selected.id);
          }}
          onBuy={buy}
        />
      )}
    </main>
  );
}
