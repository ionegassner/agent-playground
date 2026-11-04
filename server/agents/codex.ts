/** Subscription-backed local adapter. No auth files or tokens are read by this app. */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ModelCall, BrowserAction } from './provider.ts';
export const codexCall: ModelCall = async (
  model,
  instructions,
  input,
  _maxOutput,
  signal,
  options,
) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'arena-codex-'));
  const schema = fileURLToPath(new URL('./action-schema.json', import.meta.url));
  const messages = input.filter(
    (entry): entry is { role: string; content: string } =>
      !!entry && typeof entry === 'object' && 'role' in entry && 'content' in entry,
  );
  const previous = input
    .filter(
      (entry): entry is { type: string; arguments: string } =>
        !!entry && typeof entry === 'object' && 'type' in entry && 'arguments' in entry,
    )
    .map((entry) => entry.arguments)
    .slice(-(options?.memorySteps ?? 12));
  const outcomes = input
    .filter(
      (entry): entry is { type: string; output: string } =>
        !!entry &&
        typeof entry === 'object' &&
        'type' in entry &&
        entry.type === 'function_call_output' &&
        'output' in entry &&
        typeof entry.output === 'string',
    )
    .map((entry) => entry.output)
    .slice(-(options?.memorySteps ?? 12));
  const prompt = `${instructions}\n\nYou are choosing ONE browser action. Built-in tools are disabled. Do not inspect files. Return only the action JSON required by the output schema.\nRecent actions:\n${previous.join('\n')}\nRecent tool outcomes:\n${outcomes.join('\n')}\n\nLatest observation:\n${messages.at(-1)?.content || ''}`;
  const args = [
    'exec',
    '--ignore-user-config',
    '--skip-git-repo-check',
    '--ephemeral',
    '--sandbox',
    'read-only',
    '--disable',
    'shell_tool',
    '--disable',
    'multi_agent',
    '-c',
    'web_search="disabled"',
    '--json',
    '--output-schema',
    schema,
    '-C',
    directory,
  ];
  if (options?.reasoningEffort)
    args.push('-c', `model_reasoning_effort="${options.reasoningEffort}"`);
  if (model !== 'codex-default') args.push('--model', model);
  args.push('-');
  try {
    return await new Promise((resolve, reject) => {
      const env = { ...process.env };
      delete env.OPENAI_API_KEY;
      delete env.CODEX_API_KEY;
      const child = spawn('codex', args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
      let output = '';

      const abort = () => child.kill('SIGTERM');
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
      child.stdout.on('data', (chunk) => {
        output += chunk;
        if (output.length > 2000000) child.kill('SIGTERM');
      });
      child.stderr.resume();
      child.on('error', () =>
        reject(new Error('Codex CLI could not start. Install Codex and sign in with ChatGPT.')),
      );
      child.on('close', (code) => {
        signal.removeEventListener('abort', abort);
        if (signal.aborted) {
          reject(new Error('Codex request timed out.'));
          return;
        }
        if (code !== 0) {
          reject(
            new Error(
              'Codex request failed. Check subscription limits, login, and the selected model.',
            ),
          );
          return;
        }
        try {
          const events = output.split('\n').flatMap((line) => {
            try {
              return [JSON.parse(line)];
            } catch {
              return [];
            }
          });
          if (
            events.some(
              (event) =>
                event.type === 'item.completed' &&
                ['command_execution', 'mcp_tool_call', 'web_search'].includes(event.item?.type),
            )
          )
            throw new Error('Contestant attempted an unavailable built-in tool.');
          const text = events
            .filter(
              (event) => event.type === 'item.completed' && event.item?.type === 'agent_message',
            )
            .map((event) => event.item.text)
            .join('');
          const action = JSON.parse(text) as BrowserAction;
          const usage = events.find((event) => event.type === 'turn.completed')?.usage;
          const callId = `codex-${input.length}`;
          resolve({
            action,
            output: [
              {
                type: 'function_call',
                name: 'browser_action',
                call_id: callId,
                arguments: JSON.stringify(action),
              },
            ],
            callId,
            inputTokens: usage?.input_tokens ?? 0,
            outputTokens: usage?.output_tokens ?? 0,
          });
        } catch (error) {
          reject(error);
        }
      });
      child.stdin.end(prompt);
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};
