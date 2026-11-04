/** Package an allowlisted replay with local media; never copies database payloads or credentials. */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Match, RecordedExample } from '../src/lib/match-contracts.ts';
export function exportExample(
  match: Match,
  recordingRoot: string,
  outputRoot: string,
  metadata: Omit<RecordedExample, 'match'>,
) {
  if (match.status !== 'completed' || !/^[a-z0-9-]+$/.test(metadata.slug))
    throw new Error('Only completed examples with safe slugs can be exported.');
  const directory = path.join(outputRoot, metadata.slug);
  mkdirSync(directory, { recursive: true });
  const contestants = match.contestants.map((episode, index) => {
    const asset = (url: string) => {
      const file = path.basename(url);
      if (!/^(\d{3}(-after)?\.png|browser\.webm)$/.test(file))
        throw new Error('Unexpected recording asset.');
      mkdirSync(path.join(directory, String(index)), { recursive: true });
      copyFileSync(
        path.join(recordingRoot, match.id, String(index), file),
        path.join(directory, String(index), file),
      );
      return `/examples/${metadata.slug}/${index}/${file}`;
    };
    return {
      config: {
        name: episode.config.name,
        model: episode.config.model,
        instructions: episode.config.instructions,
        reasoningEffort: episode.config.reasoningEffort,
        memorySteps: episode.config.memorySteps,
      },
      status: episode.status,
      steps: episode.steps.map((step) => ({
        elapsedMs: step.elapsedMs,
        label: step.label,
        action: step.action,
        summary: step.summary,
        frame: asset(step.frame),
      })),
      result: episode.result,
      events: episode.events.map((event) => ({
        sequence: event.sequence,
        elapsedMs: event.elapsedMs,
        type: event.type,
        message: event.message,
      })),
      inputTokens: episode.inputTokens,
      outputTokens: episode.outputTokens,
      ...(episode.error ? { error: episode.error } : {}),
      ...(episode.video ? { video: asset(episode.video) } : {}),
      videoOffsetMs: episode.videoOffsetMs,
      eventOffsetMs: episode.eventOffsetMs,
    };
  });
  const replay: RecordedExample = {
    ...metadata,
    match: {
      id: match.id,
      seed: match.seed,
      scenarioId: match.scenarioId,
      scenarioName: match.scenarioName,
      scenarioVersion: match.scenarioVersion,
      createdAt: match.createdAt,
      status: match.status,
      toolMode: match.toolMode,
      limits: match.limits,
      contestants,
    },
  };
  writeFileSync(path.join(directory, 'replay.json'), JSON.stringify(replay, null, 2) + '\n');
}
