import type { RecordedExample } from './match-contracts';

export interface DemoBundle {
  responses: Record<string, unknown>;
  assets: Record<string, { type: string; base64: string }>;
}

declare global {
  interface Window {
    __ARENA_DEMO__?: DemoBundle;
  }
}

const bundle = typeof window === 'undefined' ? undefined : window.__ARENA_DEMO__;
export const demoMode = !!bundle;
const urls = new Map<string, string>();
const records = new Map<string, unknown>();

export function demoUrl(path: string): string {
  if (!bundle) return path;
  const cached = urls.get(path);
  if (cached) return cached;
  const asset = bundle.assets[path];
  let blob: Blob;
  if (asset) {
    const bytes = Uint8Array.from(atob(asset.base64), (c) => c.charCodeAt(0));
    blob = new Blob([bytes], { type: asset.type });
  } else if (Object.hasOwn(bundle.responses, path)) {
    blob = new Blob([JSON.stringify(bundle.responses[path], null, 2)], {
      type: 'application/json',
    });
  } else return path;
  const url = URL.createObjectURL(blob);
  urls.set(path, url);
  return url;
}

export function demoRecord<T>(path: string): T {
  if (!bundle || !Object.hasOwn(bundle.responses, path))
    throw new Error('This record is not included in the offline demo.');
  if (!records.has(path)) {
    const original = bundle.responses[path];
    // Only media paths are resolved. The raw evidence download stays unchanged.
    if (path.endsWith('/replay.json')) {
      const example = structuredClone(original) as RecordedExample;
      for (const contestant of example.match.contestants) {
        if (contestant.video) contestant.video = demoUrl(contestant.video);
        for (const step of contestant.steps) step.frame = demoUrl(step.frame);
      }
      records.set(path, example);
    } else records.set(path, original);
  }
  return records.get(path) as T;
}
