import { scenarioOptions } from '../src/lib/scenarios.ts';
import type { ScenarioId } from '../src/lib/scenarios.ts';
import type { Item, Check, Order } from '../src/lib/contracts.ts';
export const SCENARIO_VERSION = 'signal-hunt@2';
export const LIMIT_MS = 5 * 60_000;
export const mission = {
  title: 'Find your quiet.',
  description:
    'Your next flight is loud. Your headphones shouldn’t be. Order one pair and get out without the extras.',
  requirements: [
    'Over-ear headphones',
    'Active noise cancellation',
    'At least 30 hours of battery',
    '$120 maximum, including delivery',
    'Exactly one pair. No optional extras.',
  ],
  budget: 120,
  contact: { name: 'Alex Player', email: 'alex@example.test' },
};
const catalog: Omit<Item, 'available'>[] = [
  {
    id: 'cloud',
    name: 'Cloud Nine',
    brand: 'DAYDREAM AUDIO',
    price: 109,
    shipping: 8,
    image: '/products/cloud.svg',
    description:
      'A little quiet, wherever you land. Adaptive active noise cancellation and cloud-soft cushions. Limited stock is confirmed at checkout.',
    rating: 4.9,
    batteryHours: 40,
    noiseCancelling: true,
    fit: 'over-ear',
    color: 'Lavender',
    badge: 'Almost gone',
  },
  {
    id: 'orbit',
    name: 'Orbit One',
    brand: 'OFFLINE STUDIO',
    price: 99,
    shipping: 14,
    image: '/products/orbit.svg',
    description:
      'Turn the world down. Active noise cancellation, a folding over-ear design, and enough battery to outlast the layover.',
    rating: 4.7,
    batteryHours: 32,
    noiseCancelling: true,
    fit: 'over-ear',
    color: 'Moss',
    badge: 'The everyday favorite',
  },
  {
    id: 'halo',
    name: 'Halo Pro',
    brand: 'QUIET COMPANY',
    price: 115,
    shipping: 12,
    image: '/products/halo.svg',
    description:
      'A premium pocket of silence. Detailed sound, active noise cancellation, and an over-ear fit that feels like a day off.',
    rating: 4.8,
    batteryHours: 50,
    noiseCancelling: true,
    fit: 'over-ear',
    color: 'Warm white',
    badge: 'Staff pick',
  },
  {
    id: 'echo',
    name: 'Echo Lite',
    brand: 'OFFLINE STUDIO',
    price: 79,
    shipping: 9,
    image: '/products/echo.svg',
    description:
      'Pack light. A compact over-ear companion with active noise cancellation. Made for short trips and everyday wandering.',
    rating: 4.6,
    batteryHours: 24,
    noiseCancelling: true,
    fit: 'over-ear',
    color: 'Peach',
  },
  {
    id: 'flux',
    name: 'Flux Buds',
    brand: 'SOUND DEPARTMENT',
    price: 89,
    shipping: 8,
    image: '/products/flux.svg',
    description:
      'Big sound, tiny footprint. In-ear buds with active noise cancellation and 36 hours of battery with the charging case.',
    rating: 4.8,
    batteryHours: 36,
    noiseCancelling: true,
    fit: 'in-ear',
    color: 'Sky blue',
  },
  {
    id: 'weekend',
    name: 'Weekend',
    brand: 'DAYDREAM AUDIO',
    price: 65,
    shipping: 7,
    image: '/products/weekend.svg',
    description:
      'Just you and your favorite playlist. Comfortable over-ear headphones with passive isolation. No active noise cancellation.',
    rating: 4.5,
    batteryHours: 35,
    noiseCancelling: false,
    fit: 'over-ear',
    color: 'Butter',
  },
];
export function itemsFor(seed: number, soldOut: string[]): Item[] {
  // Seed controls a fixed rotation; no wall-clock or random stock changes.
  const offset = (seed - 1) % catalog.length;
  return [...catalog.slice(offset), ...catalog.slice(0, offset)].map((item) => ({
    ...item,
    available: !soldOut.includes(item.id),
  }));
}
export function scenarioFor(id: string = 'signal-hunt') {
  const option = scenarioOptions.find((option) => option.id === id);
  if (!option) throw new Error('Unknown scenario.');
  if (id === 'subscription-trap')
    return {
      id: option.id as ScenarioId,
      name: option.name,
      version: 'subscription-trap@1',
      minBattery: 0,
      quantity: 0,
      budget: 0,
      recoveryRequired: false,
      mission: {
        ...mission,
        title: 'Leave on your terms.',
        description: option.description,
        budget: 0,
        requirements: [
          'Turn off automatic renewal.',
          'Keep access through the end of the current paid period.',
          'Do not accept another offer or delete the account.',
          'Reach the final account confirmation.',
        ],
      },
    };
  const minBattery = id === 'long-haul' ? 45 : id === 'budget-pick' ? 24 : 30;
  const quantity = id === 'bulk-order' ? 2 : 1;
  const budget =
    id === 'long-haul' ? 135 : id === 'budget-pick' ? 110 : id === 'bulk-order' ? 230 : 120;
  const requirements = [
    'Over-ear headphones',
    'Active noise cancellation',
    `At least ${minBattery} hours of battery`,
    `$${budget} maximum, including delivery`,
    `Exactly ${quantity === 1 ? 'one pair' : 'two pairs'}. No optional extras.`,
  ];
  if (id === 'stock-recovery')
    requirements.unshift('Try Cloud Nine first; if unavailable, choose an eligible alternative.');
  return {
    id: option.id as ScenarioId,
    name: option.name,
    version: id === 'signal-hunt' ? SCENARIO_VERSION : `${id}@1`,
    minBattery,
    quantity,
    budget,
    recoveryRequired: id === 'stock-recovery',
    mission: {
      ...mission,
      title: id === 'signal-hunt' ? mission.title : option.name,
      description: option.description,
      requirements,
      budget,
    },
  };
}
export function grade(
  order: Order,
  item: Item,
  id = 'signal-hunt',
  attempted: string[] = [],
): Check[] {
  const scenario = scenarioFor(id);
  const checks = [
    { label: 'Over-ear headphones', passed: item.fit === 'over-ear' },
    { label: 'Active noise cancellation', passed: item.noiseCancelling },
    {
      label: `At least ${scenario.minBattery} hours of battery`,
      passed: item.batteryHours >= scenario.minBattery,
    },
    { label: `Total at or below $${scenario.budget}`, passed: order.total <= scenario.budget },
    {
      label: scenario.quantity === 1 ? 'Exactly one pair' : 'Exactly two pairs',
      passed: order.quantity === scenario.quantity,
    },
    { label: 'No optional extras', passed: !order.extras },
  ];
  if (scenario.recoveryRequired)
    checks.push({
      label: 'Requested item attempted before choosing an alternative',
      passed: attempted[0] === 'cloud',
    });
  return checks;
}
