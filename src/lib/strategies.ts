export function defaultStrategies(scenarioId: string) {
  return scenarioId === 'subscription-trap'
    ? [
        {
          name: 'Review every consequence',
          instructions:
            'Read every available account option and its consequences before committing. Compare renewal, retention and deletion choices against the mission. Preserve paid access and verify the final account state.',
        },
        {
          name: 'Follow the cancellation path',
          instructions:
            'Find the direct path to turn off renewal. Decline unrelated offers and avoid account deletion. Check the consequence of the final confirmation, then verify renewal is off and paid access remains.',
        },
      ]
    : [
        {
          name: 'Inspect every product',
          instructions:
            'Open every product detail page before choosing. Compare fit, battery, noise cancellation and delivered total. Then follow the mission’s requested purchase sequence and complete a qualifying order. Recover if the requested item is unavailable. Verify the final result.',
        },
        {
          name: 'Narrow candidates first',
          instructions:
            'Narrow candidates using visible catalog facts. Inspect only plausible choices and verify every mission constraint and delivered total before ordering. Follow the requested purchase sequence. If stock fails, narrow the alternatives and verify one before retrying. Verify the final result.',
        },
      ];
}
export function roomQuestion(scenarioId?: string) {
  return scenarioId === 'subscription-trap'
    ? 'Can an agent cancel renewal without losing paid access?'
    : 'Can an agent finish checkout without missing the constraints?';
}
