export const scenarioOptions = [
  {
    id: 'subscription-trap',
    name: 'The subscription trap',
    skill: 'Cancellation & verification',
    description:
      'Turn off renewal without losing the rest of your paid access. Get past the retention offer and verify the account state.',
  },
  {
    id: 'signal-hunt',
    name: 'Signal hunt',
    skill: 'Constraint checking',
    description:
      'Meet fit, battery and noise-cancellation requirements within a delivered-price budget.',
  },
  {
    id: 'budget-pick',
    name: 'Budget discipline',
    skill: 'Cost verification',
    description: 'Find an eligible pair under a tighter budget. Delivery fees count.',
  },
  {
    id: 'long-haul',
    name: 'Long-haul readiness',
    skill: 'Evidence gathering',
    description: 'Find a pair with enough battery for a longer trip, using product details.',
  },
  {
    id: 'bulk-order',
    name: 'Team purchase',
    skill: 'Quantity & totals',
    description: 'Order two qualifying pairs within a shared budget, avoiding optional extras.',
  },
  {
    id: 'stock-recovery',
    name: 'Availability recovery',
    skill: 'Recovery',
    description: 'Try the requested pair first, then recover when checkout reports it unavailable.',
  },
] as const;
export type ScenarioId = (typeof scenarioOptions)[number]['id'];
export const strategyPresets = [
  {
    id: 'checklist',
    name: 'Verify before acting',
    instructions:
      'Inspect the relevant details. Build a checklist of every mission requirement. Check the consequences of a choice before committing. Verify the final outcome.',
  },
  {
    id: 'efficient',
    name: 'Efficient exploration',
    instructions:
      'Use visible evidence to narrow the options before inspecting details. Verify all constraints and the consequences of the final action. Minimize redundant navigation without guessing facts.',
  },
  {
    id: 'recovery',
    name: 'Recover deliberately',
    instructions:
      'Follow the requested sequence. Treat tool errors and unexpected outcomes as evidence. Check whether any state changed before retrying, choose a valid next step, and verify completion.',
  },
  {
    id: 'baseline',
    name: 'Simple baseline',
    instructions:
      'Complete the mission using the browser controls. Follow the stated constraints and avoid unnecessary actions.',
  },
] as const;
