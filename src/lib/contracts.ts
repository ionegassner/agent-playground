/** Public browser contract. Private grading rules live only in server/scenario.ts. */
export interface Item {
  id: string;
  name: string;
  brand: string;
  price: number;
  shipping: number;
  image: string;
  description: string;
  rating: number;
  batteryHours: number;
  noiseCancelling: boolean;
  fit: 'over-ear' | 'in-ear';
  color: string;
  badge?: string;
  available: boolean;
}
export interface RunEvent {
  sequence: number;
  elapsedMs: number;
  type: string;
  message: string;
}
export interface Check {
  label: string;
  passed: boolean;
}
export interface Order {
  id: string;
  itemId: string;
  quantity: number;
  itemPrice: number;
  shipping: number;
  extras: boolean;
  total: number;
}
export interface SubscriptionState {
  renewalEnabled: boolean;
  accessActive: boolean;
  paidThrough: string;
  retentionOfferAccepted: boolean;
}
export type WorkflowAction =
  | 'browse'
  | 'inspect'
  | 'checkout'
  | 'manage-renewal'
  | 'continue-cancellation'
  | 'keep-offer'
  | 'stop-renewal'
  | 'delete-account';
export interface Result {
  correct: boolean;
  elapsedMs: number;
  checks: Check[];
  order: Order | null;
  subscription?: SubscriptionState;
  attempts: number;
  recoveries: number;
}
export interface Run {
  participant: 'human' | 'agent';
  id: string;
  scenarioVersion: string;
  scenarioId?: string;
  subscription?: SubscriptionState;
  seed: number;
  status: 'active' | 'completed' | 'abandoned';
  phase: 'browse' | 'inspect' | 'checkout' | 'complete';
  selectedItemId: string | null;
  startedAt: number;
  serverNow: number;
  elapsedMs: number;
  limitMs: number;
  mission: {
    title: string;
    description: string;
    requirements: string[];
    budget: number;
    contact: { name: string; email: string };
  };
  items: Item[];
  events: RunEvent[];
  result: Result | null;
}
export interface Purchase {
  submissionId: string;
  itemId: string;
  quantity: number;
  extras: boolean;
  contact?: { name: string; email: string };
}
export interface RunRecord {
  id: string;
  scenarioVersion: string;
  scenarioId?: string;
  subscription?: SubscriptionState;
  seed: number;
  participant: 'human' | 'agent';
  result: Result;
  items: Item[];
  events: RunEvent[];
  recordedAt: string;
  recording: 'application-events';
}
