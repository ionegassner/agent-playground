import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile, mkdtemp, readdir, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const folder = await mkdtemp(path.join(tmpdir(), 'agent-playground-demo-'));
try {
  await build({
    configFile: false,
    publicDir: false,
    plugins: [react()],
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      outDir: folder,
      emptyOutDir: true,
      cssCodeSplit: false,
      lib: {
        entry: path.resolve('src/demo-main.tsx'),
        name: 'AgentPlayground',
        formats: ['iife'],
        fileName: () => 'demo.js',
      },
    },
  });
  const responses = {};
  const assets = {};
  const index = JSON.parse(await readFile('public/examples/index.json', 'utf8'));
  responses['/examples/index.json'] = index;
  for (const example of index) {
    if (!/^[a-z0-9-]+$/.test(example.slug)) throw new Error('Invalid example slug.');
    const url = `/examples/${example.slug}/replay.json`;
    const record = JSON.parse(await readFile(`public${url}`, 'utf8'));
    responses[url] = record;
    for (const contestant of record.match.contestants) {
      for (const asset of [contestant.video, ...contestant.steps.map((step) => step.frame)].filter(
        Boolean,
      )) {
        if (!asset.startsWith(`/examples/${example.slug}/`) || asset.includes('..'))
          throw new Error('Unexpected public asset path.');
        if (!assets[asset])
          assets[asset] = {
            type: asset.endsWith('.webm') ? 'video/webm' : 'image/png',
            base64: (await readFile(`public${asset}`)).toString('base64'),
          };
      }
    }
  }
  responses['/experiments/strategy-trials.json'] = JSON.parse(
    await readFile('public/experiments/strategy-trials.json', 'utf8'),
  );
  for (const name of ['LICENSE', 'THIRD_PARTY_LICENSES.txt'])
    responses[`/${name}`] = await readFile(name, 'utf8');
  const scripts = (await readFile(path.join(folder, 'demo.js'), 'utf8')).replace(
    /<\/script/gi,
    '<\\/script',
  );
  const styles = (
    await Promise.all(
      (await readdir(folder))
        .filter((file) => file.endsWith('.css'))
        .map((file) => readFile(path.join(folder, file), 'utf8')),
    )
  ).join('\n');
  const payload = JSON.stringify({ responses, assets }).replace(/</g, '\\u003c');
  const icon = (await readFile('public/favicon.svg')).toString('base64');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src blob: data:; media-src blob: data:; connect-src 'none'; font-src data:; base-uri 'none'; form-action 'none'">
<meta name="description" content="Agent Playground: interactive recorded browser-agent tasks. Works offline without sign-in or model calls.">
<title>Agent Playground — Recorded demo</title><link rel="icon" href="data:image/svg+xml;base64,${icon}"><style>${styles}</style></head>
<body><div id="root"></div><noscript>This interactive demo needs JavaScript enabled in your browser. It runs locally and makes no network requests.</noscript>
<script>window.__ARENA_DEMO__=${payload};</script><script>${scripts}</script></body></html>`;
  await mkdir('release', { recursive: true });
  await writeFile('release/agent-playground-demo.html', html);
  console.log(
    `Standalone demo: release/agent-playground-demo.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MiB). No server or provider required.`,
  );
} finally {
  await rm(folder, { recursive: true, force: true });
}
