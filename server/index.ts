import { byteRange } from './media.ts';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdirSync, existsSync, statSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { MatchRunner } from './agents/matches.ts';
import { RunStore, DomainError } from './store.ts';
if (existsSync('.env')) process.loadEnvFile('.env');
const port = Number(process.env.PORT || 3001);
const directory = process.env.DATA_DIR || 'data';
mkdirSync(directory, { recursive: true });
const store = new RunStore(path.join(directory, 'arena.sqlite'));
const matches = new MatchRunner(
  store,
  path.join(directory, 'recordings'),
  process.env.ARENA_BASE_URL || `http://127.0.0.1:${port}`,
);
const mime: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webm': 'video/webm',
};
function sendFile(
  req: IncomingMessage,
  res: ServerResponse,
  file: string,
  cacheControl = 'no-cache',
) {
  const size = statSync(file).size;
  const range = byteRange(req.headers.range, size);
  if (range === false) {
    res.writeHead(416, { 'Content-Range': `bytes */${size}` });
    res.end();
    return;
  }
  const start = range?.start ?? 0;
  const end = range?.end ?? size - 1;
  res.writeHead(range ? 206 : 200, {
    'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Content-Length': end - start + 1,
    ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
    'Cache-Control': cacheControl,
  });
  if (req.method === 'HEAD' || size === 0) res.end();
  else createReadStream(file, { start, end }).pipe(res);
}
function cookie(id: string, token: string) {
  return `run_${id}=${token}; HttpOnly; SameSite=Strict; Path=/api/runs/${id}; Max-Age=86400${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`;
}
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  const json = (status: number, body: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (url.pathname === '/api/health') {
      json(200, { ok: true });
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)
        throw new DomainError(403, 'Cross-origin requests are not allowed.');
      let body: unknown = {};
      if (req.method === 'POST') {
        if (!req.headers['content-type']?.startsWith('application/json'))
          throw new DomainError(415, 'Use JSON for this request.');
        let text = '';
        for await (const chunk of req) {
          text += chunk;
          if (text.length > 16_384) throw new DomainError(413, 'Request is too large.');
        }
        try {
          body = JSON.parse(text);
        } catch {
          throw new DomainError(400, 'Invalid JSON.');
        }
      }
      if (url.pathname === '/api/runs' && req.method === 'POST') {
        const seed = (body as { seed?: number })?.seed ?? 1;
        const created = store.create(
          seed,
          'human',
          (body as { scenarioId?: string })?.scenarioId,
          (body as { limitMs?: number })?.limitMs,
        );
        res.setHeader('Set-Cookie', cookie(created.run.id, created.token));
        json(201, created.run);
        return;
      }
      if (url.pathname === '/api/runner' && req.method === 'GET') {
        json(200, matches.status());
        return;
      }
      if (url.pathname === '/api/matches') {
        if (req.method === 'GET') {
          json(200, matches.list());
          return;
        }
        if (req.method === 'POST') {
          const started = matches.start(body);
          started.completion.catch(() => {});
          json(202, started.match);
          return;
        }
      }
      const replay = url.pathname.match(
        /^\/api\/matches\/([a-f0-9-]{36})(?:\/assets\/([01])\/([\w.-]+))?$/,
      );
      if (replay) {
        const [, id, side, asset] = replay;
        const match = matches.get(id);
        if (side && asset) {
          if (!/^(\d{3}(-after)?\.png|browser\.webm)$/.test(asset))
            throw new DomainError(404, 'Asset not found.');
          const file = path.join(directory, 'recordings', id, side, asset);
          if (!existsSync(file)) throw new DomainError(404, 'Recording not available.');
          sendFile(
            req,
            res,
            file,
            match.status === 'completed' ? 'public, max-age=31536000, immutable' : 'no-store',
          );
          return;
        }
        json(200, match);
        return;
      }
      const match = url.pathname.match(
        /^\/api\/runs\/([a-f0-9-]{36})(?:\/(actions|purchase|reset|record))?$/,
      );
      if (!match) throw new DomainError(404, 'Endpoint not found.');
      const [, id, operation] = match;
      const token =
        (req.headers.cookie || '')
          .split(';')
          .map((c) => c.trim())
          .find((c) => c.startsWith(`run_${id}=`))
          ?.split('=')[1] || '';
      if (!operation && req.method === 'GET') {
        json(200, store.get(id, token));
        return;
      }
      if (operation === 'actions' && req.method === 'POST') {
        json(200, store.action(id, token, body));
        return;
      }
      if (operation === 'purchase' && req.method === 'POST') {
        const result = store.purchase(id, token, body);
        json(result.status, result);
        return;
      }
      if (operation === 'reset' && req.method === 'POST') {
        const created = store.reset(id, token);
        res.setHeader('Set-Cookie', cookie(created.run.id, created.token));
        json(201, created.run);
        return;
      }
      if (operation === 'record' && req.method === 'GET') {
        json(200, store.record(id, token));
        return;
      }
      throw new DomainError(405, 'Method not allowed.');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      json(405, { error: 'Method not allowed.' });
      return;
    }
    const root = path.resolve('dist');
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep)) file = path.join(root, 'index.html');
    if (!existsSync(file) || !statSync(file).isFile()) {
      if (url.pathname.startsWith('/examples/'))
        throw new DomainError(404, 'Recorded example asset not found.');
      file = path.join(root, 'index.html');
    }
    if (!existsSync(file)) {
      json(404, { error: 'Frontend not built. Run npm run build or use the development server.' });
      return;
    }
    sendFile(req, res, file);
  } catch (error) {
    if (error instanceof DomainError) json(error.status, { error: error.message });
    else {
      console.error(error);
      json(500, { error: 'Something went wrong. Please try again.' });
    }
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Arena API ready at http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(() => {
      store.close();
      process.exit(0);
    }),
  );
