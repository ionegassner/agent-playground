import { spawn } from 'node:child_process';
import { readdirSync, watchFile, unwatchFile } from 'node:fs';
import path from 'node:path';
// Poll only source files in three non-recursive directories. No native recursive watchers or generated media.
const sources = ['server', 'server/agents', 'src/lib'];
let backend;
let restartTimer;
let stopping = false;
let restarting = false;
function startBackend() {
  backend = spawn(process.execPath, ['server/index.ts'], { stdio: 'inherit' });
  const current = backend;
  current.on('exit', (code) => {
    if (!stopping && !restarting && backend === current) stop(code || 1);
  });
  backend.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
}
function restartBackend() {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    if (stopping || restarting) return;
    const previous = backend;
    if (!previous || previous.exitCode !== null) startBackend();
    else {
      restarting = true;
      previous.once('exit', () => {
        restarting = false;
        if (!stopping) startBackend();
      });
      previous.kill();
    }
  }, 150);
}
const watched = new Set();
function watchSource(file) {
  if (watched.has(file)) return;
  watched.add(file);
  watchFile(file, { interval: 400 }, (current, previous) => {
    if (current.mtimeMs !== previous.mtimeMs) restartBackend();
  });
}
function refreshSources() {
  for (const directory of sources) {
    for (const file of readdirSync(directory))
      if (/\.(ts|json)$/.test(file)) watchSource(path.join(directory, file));
  }
}
refreshSources();
for (const directory of sources) {
  watched.add(directory);
  watchFile(directory, { interval: 400 }, (current, previous) => {
    if (current.mtimeMs !== previous.mtimeMs) {
      refreshSources();
      restartBackend();
    }
  });
}
const frontend = spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' });
frontend.on('error', (error) => {
  console.error(error.message);
  stop(1);
});
frontend.on('exit', (code) => {
  if (!stopping) stop(code ?? 1);
});
startBackend();
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(restartTimer);
  for (const file of watched) unwatchFile(file);
  frontend.kill();
  backend?.kill();
  process.exitCode = code;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
