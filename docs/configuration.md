# Bounded agent experiments

Configure an experiment around one concrete question. Both contestants receive the same versioned task, seed, browser tools and resource limits. Their settings and instructions are preserved in the comparison. These are a shopping room with task variants and a cancellation room, not a claim that the platform already covers customer-service conversations or marketing research.

## Available task variants

| Scenario | Evaluation question | Verified requirement |
| --- | --- | --- |
| The subscription trap | Does it confirm cancellation while preserving paid access? | Renewal off, access through the fixed paid period, no retention offer or account deletion |
| Signal hunt | Can the agent combine product facts with delivered price? | Over-ear, active noise cancellation, 30-hour battery, one pair, total at most $120, no extras |
| Budget discipline | Does the agent account for delivery instead of comparing sticker prices alone? | Same fit/noise requirements, 24-hour minimum, total at most $110 |
| Long-haul readiness | Does it inspect evidence rather than choose the first plausible product? | 45-hour battery minimum, total at most $135 |
| Team purchase | Does it calculate quantity and total correctly? | Two qualifying pairs, total at most $230 |
| Availability recovery | Does it follow the requested sequence and recover without an incorrect purchase? | Try Cloud Nine first; server rejects its stock; commit an eligible alternative |

Shopping requirements and grading live in server/scenario.ts; cancellation transitions and account grading live in server/store.ts. The cancellation room uses a fixed fictional paid period, not the current date. Selecting a scenario does not expose its private grader to agents. The recovery variant always triggers the requested stock failure, regardless of seed parity. Other variants retain seed-driven stock behavior and catalog ordering. Reset preserves scenario, seed and time limit in a fresh isolated run.

## Agent settings

- Instructions and presets: use a simple baseline, verify-before-acting checklist, efficient exploration, or deliberate recovery. Presets replace editable text; they do not confer hidden capabilities.
- Model: choose a configured model. The CLI default remains explicitly labeled; use pinned IDs for version-specific claims.
- Reasoning effort: model default, low, medium or high. The Codex adapter passes this setting to Codex. Support depends on the selected model. More effort is not assumed better.
- Recent actions retained: 2, 6 or 12 prior action summaries and tool outcomes in the local Codex prompt. The task and current observation are always provided. This is a context-retention experiment, not a claim about a model’s intrinsic memory. The setting is disabled for the optional API adapter, which uses its own conversation history.
- Shared limits: 8, 16, 24 or 48 actions, and 1, 3 or 5 minutes. Both contestants receive identical limits. Human racing uses the selected task, seed and time limit.

Change one factor at a time when attributing an improvement. A comparison where both instructions and reasoning effort change is useful as a configuration comparison, but cannot isolate the cause. Repeat across cases and seeds before declaring a more effective agent.

## Deliberately excluded

No personality sliders, unrestricted tools, invented customer preference scores, automatic prompt optimization or general workflow builder. Those would require separate evidence and product decisions. The next valuable addition is saved test suites and repeated trials, rather than more individual controls.

## Playback

Completed comparisons play both browser videos against one monotonic viewer clock. Play/pause, seeking, playback speed, action checkpoints, captions and action counts follow that clock. Shorter recordings stop at their final frame. HTTP byte-range support permits proper seeking. Action snapshots remain a fallback for missing videos.

Old recordings have no measured video origin and use an approximate zero offset. New recordings save an origin estimate from page creation. Frame-perfect alignment between video and server events is not claimed; visual-marker calibration remains future work. Continuous playback is now available, replacing the former screenshot-only player.

## Instruction rematches

Fork instructions & rematch copies the original profiles into an editable draft. The room, version, seed, model settings and shared limits remain fixed, both in the UI and on the server. Names and instructions can change. The rematch stores its parent comparison ID and links back to that immutable original. Edited drafts survive refresh in this browser session. Starting a new comparison exits the rematch constraint.

Verified turning points are generated only from application events: stock rejection, a committed paid extra, a replacement purchase after rejection, retention acceptance/decline, renewal disabled, and paid access revoked. Clicking one seeks both browser recordings to the completed action checkpoint that rendered the event, keeping the caption and action count aligned. New runs store a run-event-to-replay clock offset; legacy runs remain approximate. An action summary cannot generate a verified marker.

## Bundled examples

The arena includes two recorded model comparisons and one explicitly scripted grader demonstration. They are static, allowlisted replay exports in public/examples, with videos and snapshots, and do not require the original database or provider login. Archived examples are read-only; personal comparisons retain linked rematches. Ordinary configuration is saved in this browser, while rematch drafts stay separate.

## Presentation and scope

Room and strategy editing are the primary setup controls. Advanced settings contain seed, models, effort, retention and shared budgets. The replay opens with a question, mission and short strategy descriptions; results are hidden until the viewer chooses to reveal them. Enlarging a contestant or switching the mobile view preserves the same replay clock. See [controlled trial observations](strategy-trials.md) for all results from the small fixed-case comparison.
