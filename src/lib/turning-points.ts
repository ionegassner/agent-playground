import type { AgentEpisode } from './match-contracts';
const labels: Record<string, string> = {
  renewal_opened: 'Retention offer presented',
  availability: 'Item unavailable',
  extras_added: 'Paid extra committed',
  recovered: 'Alternative committed',
  retention_declined: 'Retention offer declined',
  retention_accepted: 'Retention offer accepted',
  renewal_disabled: 'Renewal turned off',
  access_revoked: 'Paid access lost',
};
/** Only authoritative application events become turning points; summaries are not evidence. */
export function turningPoints(episode: AgentEpisode) {
  return episode.events.flatMap((event) => {
    const label = labels[event.type];
    if (!label) return [];
    const eventTime = Math.max(0, event.elapsedMs + (episode.eventOffsetMs ?? 0));
    // Land after the browser has rendered the event's action, so caption and frame agree.
    const completedAction = episode.steps.find(
      (step) => step.action !== 'start' && step.elapsedMs >= eventTime,
    );
    return [
      {
        sequence: event.sequence,
        label,
        message: event.message,
        elapsedMs: completedAction?.elapsedMs ?? eventTime,
      },
    ];
  });
}
