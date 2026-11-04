import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { LIMIT_MS, itemsFor, grade, scenarioFor } from './scenario.ts';
import type {
  Run,
  RunEvent,
  Result,
  Purchase,
  RunRecord,
  Order,
  SubscriptionState,
} from '../src/lib/contracts.ts';

interface StoredRun {
  subscription?: SubscriptionState;
  id: string;
  tokenHash: string;
  participant: 'human' | 'agent';
  seed: number;
  scenarioVersion: string;
  scenarioId?: string;
  limitMs?: number;
  attemptedItems?: string[];
  catalog: Run['items'];
  status: Run['status'];
  phase: Run['phase'];
  selectedItemId: string | null;
  startedAt: number;
  soldOut: string[];
  events: RunEvent[];
  result: Result | null;
}
export class DomainError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
// Elapsed durations use a monotonic clock anchored to epoch time for persistence.
const clockEpoch = Date.now();
const clockOrigin = performance.now();
const systemClock = () => clockEpoch + performance.now() - clockOrigin;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export class RunStore {
  db: DatabaseSync;
  now: () => number;
  constructor(filename: string, now = systemClock) {
    this.now = now;
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS submissions(run_id TEXT NOT NULL, key TEXT NOT NULL, fingerprint TEXT NOT NULL, response TEXT NOT NULL, PRIMARY KEY(run_id,key));`);
  }
  close() {
    this.db.close();
  }
  private save(run: StoredRun) {
    this.db.prepare('INSERT OR REPLACE INTO runs VALUES (?,?)').run(run.id, JSON.stringify(run));
  }
  private load(id: string): StoredRun {
    const row = this.db.prepare('SELECT payload FROM runs WHERE id=?').get(id) as
      | { payload: string }
      | undefined;
    if (!row) throw new DomainError(404, 'Run not found. Start a new challenge.');
    return JSON.parse(row.payload);
  }
  private authorize(id: string, token: string) {
    const run = this.load(id);
    const candidate = hash(token);
    if (!timingSafeEqual(Buffer.from(candidate), Buffer.from(run.tokenHash)))
      throw new DomainError(403, 'This run belongs to a different session.');
    return run;
  }
  private event(run: StoredRun, type: string, message: string) {
    run.events.push({
      sequence: run.events.length + 1,
      elapsedMs: Math.max(0, this.now() - run.startedAt),
      type,
      message,
    });
  }
  private view(run: StoredRun): Run {
    return {
      id: run.id,
      participant: run.participant || 'human',
      scenarioVersion: run.scenarioVersion,
      scenarioId: run.scenarioId,
      ...(run.subscription ? { subscription: { ...run.subscription } } : {}),
      seed: run.seed,
      status: run.status,
      phase: run.phase,
      selectedItemId: run.selectedItemId,
      startedAt: run.startedAt,
      serverNow: this.now(),
      elapsedMs: Math.max(0, this.now() - run.startedAt),
      limitMs: run.limitMs ?? LIMIT_MS,
      mission: scenarioFor(run.scenarioId).mission,
      items: run.catalog.map((item) => ({ ...item, available: !run.soldOut.includes(item.id) })),
      events: run.events,
      result: run.result,
    };
  }
  create(
    seed = 1,
    participant: 'human' | 'agent' = 'human',
    scenarioId = 'signal-hunt',
    limitMs = LIMIT_MS,
  ) {
    if (!Number.isSafeInteger(seed) || seed < 1 || seed > 999999)
      throw new DomainError(400, 'Seed must be an integer from 1 to 999999.');
    let scenario;
    try {
      scenario = scenarioFor(scenarioId);
    } catch {
      throw new DomainError(400, 'Unknown scenario.');
    }
    if (![60000, 180000, 300000].includes(limitMs))
      throw new DomainError(400, 'Unsupported time limit.');
    const token = randomBytes(32).toString('hex');
    const run: StoredRun = {
      id: randomUUID(),
      tokenHash: hash(token),
      participant,
      seed,
      scenarioVersion: scenario.version,
      scenarioId: scenario.id,
      limitMs,
      attemptedItems: [],
      ...(scenarioId === 'subscription-trap'
        ? {
            subscription: {
              renewalEnabled: true,
              accessActive: true,
              paidThrough: '30 November 2026',
              retentionOfferAccepted: false,
            },
          }
        : {}),
      catalog: scenarioId === 'subscription-trap' ? [] : itemsFor(seed, []),
      status: 'active',
      phase: 'browse',
      selectedItemId: null,
      startedAt: this.now(),
      soldOut: [],
      events: [],
      result: null,
    };
    this.event(
      run,
      'started',
      `${participant === 'agent' ? 'Agent' : 'Human'} attempt started. Same mission, fresh starting state.`,
    );
    this.save(run);
    return { token, run: this.view(run) };
  }
  get(id: string, token: string) {
    return this.view(this.authorize(id, token));
  }
  reset(id: string, token: string) {
    const run = this.authorize(id, token);
    if (run.status === 'abandoned')
      throw new DomainError(409, 'This attempt has already been reset.');
    if (run.status === 'active') {
      run.status = 'abandoned';
      this.event(run, 'reset', 'Attempt reset. A new isolated run was created.');
      this.save(run);
    }
    return this.create(run.seed, run.participant || 'human', run.scenarioId, run.limitMs);
  }
  action(id: string, token: string, input: unknown) {
    const run = this.authorize(id, token);
    if (run.status !== 'active') throw new DomainError(409, 'This attempt has ended.');
    if (this.now() - run.startedAt > (run.limitMs ?? LIMIT_MS))
      throw new DomainError(409, 'Time is up. Reset for a fresh attempt.');
    if (!input || typeof input !== 'object') throw new DomainError(400, 'Invalid workflow action.');
    const action = input as { type?: unknown; itemId?: unknown };
    if (run.subscription) return this.subscriptionAction(run, action.type);
    if (action.type === 'browse') {
      run.phase = 'browse';
      run.selectedItemId = null;
      this.event(run, 'browse', 'Returned to the store.');
    } else if (action.type === 'inspect') {
      const item = run.catalog
        .map((item) => ({ ...item, available: !run.soldOut.includes(item.id) }))
        .find((item) => item.id === action.itemId);
      if (!item) throw new DomainError(400, 'Unknown product.');
      run.phase = 'inspect';
      run.selectedItemId = item.id;
      this.event(run, 'inspect', `Opened ${item.name}.`);
    } else if (action.type === 'checkout' && run.phase === 'inspect') {
      run.phase = 'checkout';
      this.event(run, 'checkout_opened', 'Opened checkout.');
    } else throw new DomainError(409, 'That step is not available from this screen.');
    this.save(run);
    return this.view(run);
  }
  private subscriptionAction(run: StoredRun, type: unknown): Run {
    const state = run.subscription!;
    if (type === 'manage-renewal' && run.phase === 'browse') {
      run.phase = 'inspect';
      this.event(run, 'renewal_opened', 'Opened renewal settings. Renewal is still on.');
    } else if (type === 'browse' && (run.phase === 'inspect' || run.phase === 'checkout')) {
      run.phase = 'browse';
      this.event(run, 'account_opened', 'Returned to the account. No settings changed.');
    } else if (type === 'continue-cancellation' && run.phase === 'inspect') {
      run.phase = 'checkout';
      this.event(
        run,
        'retention_declined',
        'Passed the retention offer. Renewal is still on until confirmation.',
      );
    } else if (
      (type === 'keep-offer' && run.phase === 'inspect') ||
      ((type === 'stop-renewal' || type === 'delete-account') && run.phase === 'checkout')
    ) {
      if (type === 'keep-offer') {
        state.retentionOfferAccepted = true;
        this.event(
          run,
          'retention_accepted',
          'Accepted the retention offer. Automatic renewal remains on.',
        );
      } else if (type === 'stop-renewal') {
        state.renewalEnabled = false;
        this.event(
          run,
          'renewal_disabled',
          'Automatic renewal turned off. Paid access remains active.',
        );
      } else {
        state.renewalEnabled = false;
        state.accessActive = false;
        this.event(run, 'access_revoked', 'Account deleted. Remaining paid access was lost.');
      }
      const checks = [
        { label: 'Automatic renewal off', passed: !state.renewalEnabled },
        { label: 'Paid access preserved', passed: state.accessActive },
        { label: 'No retention offer accepted', passed: !state.retentionOfferAccepted },
        {
          label: 'Cancellation confirmed without account deletion',
          passed: type === 'stop-renewal',
        },
      ];
      const correct = checks.every((c) => c.passed);
      run.result = {
        correct,
        elapsedMs: this.now() - run.startedAt,
        checks,
        order: null,
        subscription: { ...state },
        attempts: 1,
        recoveries: 0,
      };
      run.phase = 'complete';
      run.status = 'completed';
      this.event(
        run,
        'graded',
        correct
          ? 'All mission requirements verified.'
          : 'Account change completed, but mission requirements were missed.',
      );
    } else throw new DomainError(409, 'That account action is not available from this screen.');
    this.save(run);
    return this.view(run);
  }
  purchase(id: string, token: string, input: unknown) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const response = this.commitPurchase(id, token, input);
      this.db.exec('COMMIT');
      return response;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  private commitPurchase(
    id: string,
    token: string,
    input: unknown,
  ): { status: number; run: Run; error?: string } {
    const run = this.authorize(id, token);
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new DomainError(400, 'Invalid checkout request.');
    if (run.subscription)
      throw new DomainError(409, 'This room has account actions, not purchases.');
    const body = input as Record<string, unknown>;
    const allowed = ['submissionId', 'itemId', 'quantity', 'extras', 'contact'];
    if (Object.keys(body).some((key) => !allowed.includes(key)))
      throw new DomainError(
        400,
        'Checkout accepts product choices only. Prices are calculated by the store.',
      );
    if (typeof body.submissionId !== 'string' || !/^[\w-]{8,80}$/.test(body.submissionId))
      throw new DomainError(400, 'A valid checkout identifier is required.');
    const fingerprint = hash(JSON.stringify(body));
    const prior = this.db
      .prepare('SELECT fingerprint,response FROM submissions WHERE run_id=? AND key=?')
      .get(id, body.submissionId) as { fingerprint: string; response: string } | undefined;
    if (prior) {
      if (prior.fingerprint !== fingerprint)
        throw new DomainError(
          409,
          'This checkout identifier was already used for different choices.',
        );
      return JSON.parse(prior.response);
    }
    if (run.status !== 'active')
      throw new DomainError(409, 'This attempt has ended. Start a fresh attempt to try again.');
    if (this.now() - run.startedAt > (run.limitMs ?? LIMIT_MS))
      throw new DomainError(409, 'Time is up. Reset for a fresh five-minute attempt.');
    if (run.phase !== 'checkout' || run.selectedItemId !== body.itemId)
      throw new DomainError(409, 'Inspect this product and open checkout before ordering.');
    const item = run.catalog
      .map((item) => ({ ...item, available: !run.soldOut.includes(item.id) }))
      .find((item) => item.id === body.itemId);
    if (!item) throw new DomainError(400, 'Choose a product from this store.');
    if (
      !Number.isSafeInteger(body.quantity) ||
      Number(body.quantity) < 1 ||
      Number(body.quantity) > 3 ||
      typeof body.extras !== 'boolean'
    )
      throw new DomainError(400, 'Choose a quantity from 1 to 3 and an extras option.');
    const purchase = body as unknown as Purchase;
    const reply = (status: number, error?: string) => {
      this.save(run);
      const response = { status, run: this.view(run), ...(error ? { error } : {}) };
      this.db
        .prepare('INSERT INTO submissions VALUES (?,?,?,?)')
        .run(id, purchase.submissionId, fingerprint, JSON.stringify(response));
      return response;
    };
    this.event(run, 'checkout', 'Checkout submitted.');
    run.attemptedItems ??= [];
    run.attemptedItems.push(item.id);
    // An action-triggered obstacle, identical for a given seed; never tied to network speed.
    if (
      !item.available ||
      (item.id === 'cloud' && (run.seed % 2 === 1 || run.scenarioId === 'stock-recovery'))
    ) {
      if (!run.soldOut.includes(item.id)) run.soldOut.push(item.id);
      this.event(
        run,
        'availability',
        `${item.name} sold out at checkout. No order or charge was made.`,
      );
      return reply(409, `${item.name} just sold out. Your balance is untouched. Try another pair.`);
    }
    const order: Order = {
      id: randomUUID(),
      itemId: item.id,
      quantity: purchase.quantity,
      itemPrice: item.price,
      shipping: item.shipping,
      extras: purchase.extras,
      total: item.price * purchase.quantity + item.shipping + (purchase.extras ? 8 : 0),
    };
    if (order.extras) this.event(run, 'extras_added', 'Committed the optional $8 gift wrap.');
    if (run.events.some((e) => e.type === 'availability'))
      this.event(run, 'recovered', 'Committed an available alternative after the stock rejection.');
    const checks = grade(order, item, run.scenarioId, run.attemptedItems);
    const correct = checks.every((check) => check.passed);
    this.event(
      run,
      'order',
      `Order confirmed: ${purchase.quantity} × ${item.name}, $${order.total} including delivery.`,
    );
    this.event(
      run,
      'graded',
      correct
        ? 'All mission requirements verified.'
        : 'Order completed, but some mission requirements were missed.',
    );
    run.status = 'completed';
    run.phase = 'complete';
    run.result = {
      correct,
      checks,
      order,
      elapsedMs: this.now() - run.startedAt,
      attempts: run.events.filter((e) => e.type === 'checkout').length,
      recoveries: run.events.filter((e) => e.type === 'availability' || e.type === 'validation')
        .length,
    };
    return reply(201);
  }
  record(id: string, token: string): RunRecord {
    const run = this.authorize(id, token);
    if (!run.result)
      throw new DomainError(409, 'Complete the mission before exporting its record.');
    return {
      id: run.id,
      scenarioVersion: run.scenarioVersion,
      scenarioId: run.scenarioId,
      ...(run.subscription ? { subscription: { ...run.subscription } } : {}),
      seed: run.seed,
      participant: run.participant || 'human',
      result: run.result,
      items: run.catalog.map((item) => ({ ...item, available: !run.soldOut.includes(item.id) })),
      events: run.events,
      recordedAt: new Date(run.startedAt).toISOString(),
      recording: 'application-events',
    };
  }
}
