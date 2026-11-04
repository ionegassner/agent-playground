import { experimentEvidencePath, matchesExperiment } from '../lib/experiment';
import type { ExperimentEvidence } from '../lib/experiment';
import { defaultStrategies } from '../lib/strategies';
import { useState, useEffect } from 'react';
import type { AgentConfig, Match, RunnerStatus } from '../lib/match-contracts';
import { get } from '../lib/http';
function savedSettings() {
  try {
    return JSON.parse(
      sessionStorage.getItem('arena-comparison-draft') ||
        localStorage.getItem('arena-comparison-settings') ||
        'null',
    );
  } catch {
    return null;
  }
}
export function useComparisonSetup() {
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [experiment, setExperiment] = useState<ExperimentEvidence | null>(null);
  const [experimentError, setExperimentError] = useState('');
  const [status, setStatus] = useState<RunnerStatus | null>(null);
  const [configs, setConfigs] = useState<AgentConfig[]>(() => {
    try {
      const draft = savedSettings();
      if (Array.isArray(draft?.configs) && draft.configs.length === 2) return draft.configs;
    } catch {}
    return defaultStrategies(savedSettings()?.scenarioId || 'subscription-trap').map((config) => ({
      ...config,
      model: '',
    }));
  });
  const [seed, setSeed] = useState(() => {
    try {
      return savedSettings()?.seed || 1;
    } catch {
      return 1;
    }
  });
  const [scenarioId, setScenarioId] = useState(() => {
    try {
      return savedSettings()?.scenarioId || 'subscription-trap';
    } catch {
      return 'signal-hunt';
    }
  });
  const [limits, setLimits] = useState(() => {
    try {
      return (
        savedSettings()?.limits || {
          actions: 24,
          timeMs: 300000,
        }
      );
    } catch {
      return { actions: 24, timeMs: 300000 };
    }
  });
  const [parentMatchId, setParentMatchId] = useState<string | undefined>(() => {
    try {
      return savedSettings()?.parentMatchId;
    } catch {
      return undefined;
    }
  });
  const [parentMatch, setParentMatch] = useState<Match | null>(null);
  useEffect(() => {
    if (parentMatchId)
      get<Match>(`/api/matches/${parentMatchId}`)
        .then(setParentMatch)
        .catch((e) => setError(e.message));
  }, [parentMatchId]);
  useEffect(() => {
    const settings = JSON.stringify({ parentMatchId, configs, scenarioId, seed, limits });
    if (parentMatchId) sessionStorage.setItem('arena-comparison-draft', settings);
    else localStorage.setItem('arena-comparison-settings', settings);
  }, [parentMatchId, configs, scenarioId, seed, limits]);
  useEffect(() => {
    get<ExperimentEvidence>(experimentEvidencePath)
      .then(setExperiment)
      .catch(() =>
        setExperimentError('Experiment strategies could not be loaded. Your draft is unchanged.'),
      );
    get<RunnerStatus>('/api/runner')
      .then((data) => {
        setStatus(data);
        setConfigs((old) =>
          old.map((config, i) => ({
            ...config,
            model: config.model || data.models[i] || data.models[0] || '',
          })),
        );
      })
      .catch((e) => setError(e.message));
  }, []);
  function changeScenario(id: string) {
    const previous = defaultStrategies(scenarioId);
    const next = defaultStrategies(id);
    setConfigs((old) =>
      old.map((config, index) =>
        previous.some((p) => p.instructions === config.instructions)
          ? { ...config, ...next[index] }
          : config,
      ),
    );
    setScenarioId(id);
  }
  function loadExperiment() {
    if (!experiment) return;
    // An explicit action replaces the current setup. Ordinary navigation never applies it.
    sessionStorage.removeItem('arena-comparison-draft');
    setParentMatchId(undefined);
    setParentMatch(null);
    setScenarioId(experiment.scenarioId);
    setSeed(experiment.seed);
    setLimits({ actions: experiment.limits.actions, timeMs: experiment.limits.timeMs });
    setConfigs(
      experiment.configs.map((config) => ({
        ...config,
        model: status?.models.includes(config.model)
          ? config.model
          : status?.models[0] || config.model,
        memorySteps: config.memorySteps ?? 12,
      })),
    );
    setError('');
  }
  async function launch() {
    setStarting(true);
    setError('');
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentMatchId,
          seed,
          scenarioId,
          limits,
          contestants: configs.map((c) => ({
            ...c,
            ...(c.reasoningEffort ? { reasoningEffort: c.reasoningEffort } : {}),
            ...(status?.supportsActionMemory === false ? {} : { memorySteps: c.memorySteps ?? 12 }),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.removeItem('arena-comparison-draft');
      location.hash = `/match/${data.id}`;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }
  function edit(index: number, field: keyof AgentConfig, value: string | number) {
    setConfigs((old) =>
      old.map((c, i) =>
        i === index
          ? { ...c, [field]: field === 'reasoningEffort' && value === '' ? undefined : value }
          : c,
      ),
    );
  }
  return {
    status,
    experiment,
    experimentError,
    experimentMatches: matchesExperiment(scenarioId, configs, experiment),
    loadExperiment,
    configs,
    seed,
    setSeed,
    scenarioId,
    setScenarioId: changeScenario,
    limits,
    setLimits,
    parentMatchId,
    parentMatch,
    error,
    starting,
    launch,
    edit,
  };
}
