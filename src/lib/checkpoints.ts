import type { AgentEpisode, AgentStep } from './match-contracts';
export function checkpointLabel(episode: AgentEpisode, step: AgentStep, index: number) {
  if (step.label?.startsWith('Place order')) return 'Confirm order';
  if (step.label)
    return (
      (
        {
          'Close checkout': 'Return to product details',
          'All headphones': 'Return to products',
          'Go to checkout': 'Open checkout',
          'Manage renewal': 'Open renewal settings',
          'No thanks, continue to cancellation': 'Continue cancellation',
          'Confirm: turn off renewal': 'Confirm renewal off',
        } as Record<string, string>
      )[step.label] || step.label
    );
  const previous = episode.steps[index - 1]?.elapsedMs ?? 0;
  const events = episode.events.filter((event) => {
    const time = event.elapsedMs + (episode.eventOffsetMs ?? 0);
    return time > previous && time <= step.elapsedMs;
  });
  const labels: Record<string, string> = {
    browse: 'Return to products',
    checkout_opened: 'Open checkout',
    availability: 'Encounter stock rejection',
    order: 'Confirm order',
    recovered: 'Commit replacement order',
    retention_declined: 'Continue cancellation',
    renewal_opened: 'Open renewal settings',
    renewal_disabled: 'Confirm renewal off',
    retention_accepted: 'Accept retention offer',
    access_revoked: 'Delete account',
  };
  for (const event of events.toReversed()) {
    if (event.type === 'inspect')
      return event.message.replace(/^Opened /, 'Inspect ').replace(/\.$/, '');
    if (labels[event.type]) return labels[event.type];
  }
  return step.action === 'select'
    ? 'Change selection'
    : step.action === 'scroll'
      ? 'Scroll the page'
      : step.action === 'finish'
        ? 'End attempt'
        : 'Interact with page';
}
