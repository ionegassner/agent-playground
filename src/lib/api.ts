import type { Run, Purchase, RunRecord, WorkflowAction } from './contracts';
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    path,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed. Please try again.');
  return result;
}
export const api = {
  create: (seed = 1, scenarioId = 'signal-hunt', limitMs = 300000) =>
    request<Run>('/api/runs', { seed, scenarioId, limitMs }),
  get: (id: string) => request<Run>(`/api/runs/${id}`),
  action: (id: string, type: WorkflowAction, itemId?: string) =>
    request<Run>(`/api/runs/${id}/actions`, { type, itemId }),
  reset: (id: string) => request<Run>(`/api/runs/${id}/reset`, {}),
  record: (id: string) => request<RunRecord>(`/api/runs/${id}/record`),
  purchase: async (id: string, purchase: Purchase) => {
    const response = await fetch(`/api/runs/${id}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(purchase),
    });
    const result = (await response.json()) as { run?: Run; error?: string };
    if (!result.run) throw new Error(result.error || 'Checkout failed. Please try again.');
    return result;
  },
};
