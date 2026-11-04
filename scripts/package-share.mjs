import { cp, mkdtemp, mkdir, rm, writeFile, readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { releaseFiles } from './release-files.mjs';

const stage = await mkdtemp(path.join(tmpdir(), 'agent-playground-source-'));
const root = path.join(stage, 'agent-playground');
try {
  await mkdir(root);
  for (const file of releaseFiles)
    await cp(file, path.join(root, file), {
      recursive: true,
      filter: (source) => !['.DS_Store', '__pycache__'].includes(path.basename(source)),
    });
  async function inspect(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) await inspect(file);
      else {
        const relative = path.relative(root, file);
        if (
          /(^|\/)(data|node_modules|research|vendor|artifacts|experiments|release|\.git)(\/|$)/.test(
            relative,
          ) &&
          !relative.startsWith('public/experiments/')
        )
          throw new Error(`Unexpected release file: ${relative}`);
        if (/\.(ts|tsx|mjs|cjs|json|md|txt|html)$/.test(file)) {
          const text = await readFile(file, 'utf8');
          if (
            /(sk-[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{24,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/.test(
              text,
            )
          )
            throw new Error(`Review possible credential in ${relative}`);
        }
      }
    }
  }
  await inspect(root);
  await mkdir('release', { recursive: true });
  const archive = path.resolve('release/agent-playground-source.zip');
  await rm(archive, { force: true });
  execFileSync('zip', ['-q', '-r', archive, 'agent-playground'], { cwd: stage });
  await writeFile(
    'release/START-HERE.txt',
    `AGENT PLAYGROUND\n\nOpen agent-playground-demo.html in Chrome.\nNo installation, server, account or model calls are needed. If a download opens as text in a preview, save it and open it in your browser.\n\nStart with Watch stock recovery. Use Jump to the obstacle, then Reveal verified results.\nThese are interactive recordings, not live agent sessions. The scripted example is labeled.\n\nFor the full local app, extract agent-playground-source.zip and follow its README.\nLive runs are optional and use the operator's own provider account and allowance.\n`,
  );
  console.log('Prepared demo, source ZIP and START-HERE.txt in release/. Nothing was uploaded.');
} finally {
  await rm(stage, { recursive: true, force: true });
}
