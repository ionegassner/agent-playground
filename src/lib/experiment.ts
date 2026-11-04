import type { AgentConfig } from './match-contracts';
import type { Result, RunEvent } from './contracts';
export const experimentEvidencePath = '/experiments/strategy-trials.json';
export const experimentQuestion =
  'Does inspecting every product change correctness or action count compared with narrowing candidates first?';
export const genericComparisonQuestion = 'How do these two strategies approach the same mission?';
export interface ExperimentEvidence {
  question: string;
  scope: string;
  scenarioId: string;
  scenarioVersion: string;
  seed: number;
  model: string;
  modelVersionPinned: boolean;
  limits: { actions: number; timeMs: number; outputTokens: number };
  configs: AgentConfig[];
  trials: {
    trial: number;
    matchId: string;
    createdAt: string;
    contestants: {
      name: string;
      status: string;
      correct: boolean;
      actions: number;
      result: Result | null;
      error?: string | null;
      events: RunEvent[];
    }[];
  }[];
}
export function matchesExperiment(
  scenarioId: string,
  configs: AgentConfig[],
  evidence: ExperimentEvidence | null,
) {
  return (
    !!evidence &&
    scenarioId === evidence.scenarioId &&
    configs.length === evidence.configs.length &&
    configs.every((config, index) => config.instructions === evidence.configs[index].instructions)
  );
}
