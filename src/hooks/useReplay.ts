import { useEffect, useState } from 'react';
import type { Match } from '../lib/match-contracts';
export function useReplay(match: Match) {
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [videoReady, setVideoReady] = useState([false, false]);
  const [videoFailed, setVideoFailed] = useState([false, false]);
  const duration = Math.max(
    0,
    ...match.contestants.flatMap((c) => c.steps.map((s) => s.elapsedMs)),
  );
  useEffect(() => {
    if (match.status === 'running') setPosition(duration);
  }, [duration, match.status]);
  useEffect(() => {
    if (!playing) return;
    const origin = performance.now();
    const initial = position;
    let frame = 0;
    const tick = () => {
      const next = Math.min(duration, initial + (performance.now() - origin) * speed);
      setPosition(next);
      if (next >= duration) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, duration]);
  const seek = (ms: number) => {
    setPlaying(false);
    setPosition(Math.max(0, Math.min(duration, ms)));
  };
  const toggle = () => {
    if (position >= duration) setPosition(0);
    setPlaying(!playing);
  };
  const ready = (index: number) =>
    setVideoReady((old) => (old[index] ? old : old.map((v, i) => (i === index ? true : v))));
  const failed = (index: number) =>
    setVideoFailed((old) => old.map((v, i) => (i === index ? true : v)));
  return {
    position,
    playing,
    speed,
    setSpeed,
    duration,
    seek,
    toggle,
    ready,
    failed,
    videoFailed,
    disabled:
      match.status === 'running' ||
      !duration ||
      match.contestants.some((e, i) => e.video && !videoReady[i] && !videoFailed[i]),
  };
}
