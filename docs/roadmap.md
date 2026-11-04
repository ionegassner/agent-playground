# Next steps

The goal is a bounded local environment for testing agent behavior before connecting it to real workflows. Repeatability applies to the environment, not to the model’s decisions.

## Bring your own agent

Define a versioned local adapter contract for observations, actions, metadata and replay records. Prove it with the built-in runner and one independent local adapter on the same tasks. Keep grading and other attempts outside the contestant’s allowed tools.

Imported traces should be labeled as imported. They cannot prove that the playground enforced the external agent’s limits.

## Tool and MCP budgets

At an execution boundary controlled by the playground, enforce total and per-tool call caps, tool allowlists, concurrency, per-call timeouts and a run deadline. Count failures and retries; record why execution stopped.

A call cap is not a spending cap. Requests already in flight may consume allowance after cancellation. Calls made independently by an external agent are outside the coordinator’s control. Do not claim otherwise.

## Test integrations

Start with resettable local HTTP fixtures for rate limits, timeouts and ambiguous completion. Then add a small fixture MCP server for ticket, inventory or calendar operations. This tests tool use and state changes without real accounts.

User-owned sandbox integrations can follow once local fixtures work. Credentials stay local, connections are opt-in, and the operator owns any service charges. No hosted live execution or shared provider account is planned.

## Test boundaries rather than add rooms

Freeze a reasonable scripted baseline and agent instructions, then change one cancellation workflow: navigation, confirmation procedure or a recoverable interruption. Grade both against the same final-state requirements, repeat attempts and retain failures.

If both approaches succeed immediately or fail for tooling reasons, investigate that before building more UI. A later playbook experiment could test whether guidance learned on one version transfers to a held-out version.

## Reuse

Move application-specific reset, observation, action and verification behavior behind a small adapter. Shopping and cancellation should use the same runner and viewer without extra domain branches. That would demonstrate infrastructure reuse across two workflows, not a universal agent platform.

## Scope

These are proposals. Current tasks use synthetic seeded data with real local state transitions. Live agents choose their own actions; scripted fixtures are labeled separately. The controlled app is not a security sandbox for arbitrary code or tools.
