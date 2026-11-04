import type { Result, RunEvent } from './contracts';
export interface AgentConfig {
  name: string;
  model: string;
  instructions: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
  memorySteps?: number;
}
export interface AgentStep {
  label?: string;
  elapsedMs: number;
  action: string;
  summary: string;
  frame: string;
}
export interface AgentEpisode {
  config: AgentConfig;
  status: 'queued' | 'running' | 'completed' | 'failed';
  steps: AgentStep[];
  result: Result | null;
  events: RunEvent[];
  inputTokens: number;
  outputTokens: number;
  error?: string;
  video?: string;
  videoOffsetMs?: number;
  eventOffsetMs?: number;
}
export interface Match {
  parentMatchId?: string;
  id: string;
  seed: number;
  scenarioVersion: string;
  scenarioId?: string;
  scenarioName?: string;
  createdAt: string;
  status: 'running' | 'completed' | 'interrupted';
  toolMode: 'dom-assisted';
  limits: { actions: number; timeMs: number; outputTokens: number };
  contestants: AgentEpisode[];
}
export interface RunnerStatus {
  ready: boolean;
  supportsActionMemory?: boolean;
  models: string[];
  message: string;
}

export interface ExampleSummary {
  kind: 'model' | 'scripted';
  slug: string;
  title: string;
  description: string;
}
export interface RecordedExample extends ExampleSummary {
  mission?: string;
  comparisonPurpose?: string;
  strategySummaries?: [string, string];
  observation: string;
  match: Match;
}
