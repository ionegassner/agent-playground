import { useEffect, useState } from 'react';
import type { Run } from '../lib/contracts';
import { formatElapsed as time } from '../lib/time';
export function RunTimer({ run }: { run: Run }) {
  const [elapsed, setElapsed] = useState(run.elapsedMs);
  useEffect(() => {
    const origin = performance.now();
    setElapsed(run.elapsedMs);
    const timer = setInterval(() => setElapsed(run.elapsedMs + performance.now() - origin), 250);
    return () => clearInterval(timer);
  }, [run.elapsedMs]);
  return (
    <strong className={elapsed > run.limitMs ? 'time-expired' : ''}>
      {time(run.result?.elapsedMs ?? elapsed)}
    </strong>
  );
}
