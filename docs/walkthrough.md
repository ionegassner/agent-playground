# Trying Agent Playground

## Recorded demo

Open `agent-playground-demo.html` from the release download in your browser. Everything needed by the viewer is in that file. No server, login or model request is involved.

1. Choose **Watch stock recovery**.
2. Play or pause, change speed, and enlarge either contestant.
3. Use **Jump to the obstacle** to see the stock rejection.
4. Open **Explore the recorded actions** and inspect the replacement purchase.
5. Open **Reveal verified results** to check the final order against the task.
6. Try cancellation, then the separately labeled scripted example. The latter shows why completing checkout is not sufficient proof of success.

The **Trial evidence** page includes all three paired outcomes and a downloadable JSON record. **About** explains the mechanics, attribution and limits.

## Full local application

Run `npm ci` and `npm run dev`, then open `http://127.0.0.1:5174`.

The full app also supports human play and optional local agent comparisons. Technical settings are under **Advanced settings**. Live comparisons use your own local provider access and allowance; viewing recordings and playing manually do not use inference.

The HTML demo omits setup and live execution controls. It preserves recorded videos, checkpoints and original grading evidence. It does not simulate an agent making new decisions.

## What to inspect in the source

- `server/store.ts`: workflow transitions, persistence and authoritative outcomes.
- `server/agents/`: the observation/action loop, agent adapter and run limits.
- `src/hooks/useReplay.ts`: the shared playback clock.
- `src/components/arena/ReplayViewer.tsx`: seeking, contestant selection and result disclosure.
- `src/lib/demo.ts` and `scripts/build-demo.mjs`: self-contained offline playback.

The recordings contain fictional accounts and products. Original recordings retain the previous project branding.
