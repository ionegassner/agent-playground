# Local agent comparisons

The primary experience is now watching and comparing browser agents, then improving task instructions. Human play is optional. Signal hunt no longer requires copying an exact name or email; checkout focuses on product choices, totals, extras and availability recovery.

## Inference choices

The default local runner uses the installed Codex CLI and its existing ChatGPT login. A minimal inference probe succeeded on October 14, 2026. No API key or separately billed API request was involved. Contestant runs consume Codex subscription allowance. This does not establish eligibility for an app-specific Sign in with ChatGPT integration or every model in a catalog.

Codex is launched with user configuration ignored, an empty temporary working directory, ephemeral sessions, read-only sandbox, shell tools and multi-agent features disabled, and web search disabled. The app never reads login tokens. Its model receives visible page text and indexed controls, plus its task strategy and recent actions; it returns one structured browser action. Playwright executes that action. The default model label explicitly says CLI default; pin a supported model ID through ARENA_MODEL_A for version-specific comparisons.

This is a DOM-assisted browser harness using Codex to choose actions, not a screenshot-only computer-use benchmark or a comparison of full unmodified agent products. Each action invokes a fresh Codex process with supplied task context; native persistent Codex conversations are not yet used. That overhead contributes to elapsed time. Output usage is checked between actions; the CLI adapter does not enforce a strict per-request output cap. API mode can enforce a per-request cap. Input and output token totals are disclosed separately in saved records.

For local API experiments, ARENA_INFERENCE=openai-api selects the Responses adapter. It requires OPENAI_API_KEY and ARENA_MODEL_A, with an optional ARENA_MODEL_B. This mode is separately billed and is not the default. No API credentials are configured. Both adapters implement the same inference interface so additional supported providers can be added later.

Eligible Plus/Pro users may authorize ChatGPT plan usage through a dedicated open-source sign-in integration. That flow, entitlement checking and public user accounts are deferred. Claude integration must follow its supported authentication terms; a Claude subscription alone does not establish permission to embed subscription usage in a third-party app.

## Fair comparisons

Both contestants use the same scenario version, seed, 1280 by 900 viewport, Los Angeles timezone, browser control surface, shared action budget and deadline (24 actions and five minutes by default). They have isolated run capabilities and browser contexts. Custom instructions are saved with each episode. Use the same model to study prompts, or identical instructions to study models. A single matchup is a demonstration; repeat seeds and trials before generalizing.

The shared mission is visible in the browser. The contestant cannot call the run API, execute JavaScript, inspect storage, read repository files or invoke grading tools through its exposed browser actions. Private grading remains in the server. Correctness is determined from committed orders or confirmed account state, not self-reported completion.

## Viewing and learning

The comparison viewer plays both browser recordings against a shared clock and supports play/pause, speed selection, scrubbing and action checkpoints. Action snapshots provide a fallback when video is unavailable. Each step displays a brief agent-reported decision summary. Treat it as a stated intention and compare it with verified application events; it is not a window into private chain of thought.

Playwright also captures full browser video per contestant. Videos are also available as separate downloads. New recordings retain an estimated origin; legacy recordings use an approximate zero offset. Frame-perfect alignment with events requires visible-marker calibration. Configurations, token usage, timestamps, verified events and results are persisted in SQLite; raw inference responses and authentication data are not stored with matchups.

Fork instructions & rematch copies the prior profiles and locks the room, seed, models and shared limits. The new comparison records a link to its immutable original. See [bounded configuration](configuration.md) for supported experiments. Local comparison links open without login but require the same local server and recordings to remain available. They are not internet-public links. Process restart marks unfinished comparisons interrupted rather than silently resuming them.

## Tests and remaining work

The isolated integration fixture uses real browsers with a synthetic decision provider, explicitly labeled as a test. It verifies correct and incorrect purchases and account changes, screenshots, video files, turning-point navigation, rematch lineage and sanitized persistence without contacting inference. Human browser checks verify frictionless checkout and recovery. Replay checks verify both video clocks, pause, seeking, speed and selected-scenario human play.

Remaining: subscription login for public users, exact model resolution and version pinning, hard CLI output limits, continuous-video clock calibration, persistent inference sessions, broader task types, repeated-trial reporting and hosting controls.
