# Controlled strategy observations

The question was whether inspecting every product changes correctness or action count compared with narrowing candidates first. Three paired trials used the same availability-recovery room and seed. Both strategies completed all three trials correctly. Narrowing used fewer actions in this fixed setup; there was no observed correctness difference.

| Trial | Inspect every product | Narrow candidates first | Correctness |
| --- | --- | --- | --- |
| 1 | 20 actions | 8 actions | Both correct |
| 2 | 18 actions | 8 actions | Both correct |
| 3 | 18 actions | 8 actions | Both correct |

Each agent had 24 actions and three minutes, the same visible-text browser tools, model setting and 12 recent actions. The stock rejection was triggered by an attempt to purchase Cloud Nine. The server graded the final order independently. Each paired run used isolated browser contexts and separate run capabilities.

The inspection strategy explicitly requested every product’s detail page before selection. The narrowing strategy requested candidate filtering using catalog facts, followed by verification of plausible options. Both had to follow the same requested purchase sequence, recover from the same stock obstacle and satisfy all mission constraints. The distinction was chosen to make a specific frontend-observable behavior inspectable, not to search broadly for a winning prompt. Extra inspection is expected from the first instruction; its higher action count is not a discovery about model intelligence.

The [configuration and all trial records](../public/experiments/strategy-trials.json) preserve successes, actions, errors, final checks and application events. Original full recordings remain in the local run database; these trial records do not depend on model access. The bundled recovery replay is a separate recording with different instructions. It is not one of these three trials.

These observations do not establish prompt superiority or general agent capability. They cover one room, one seed, three repetitions and a CLI-default model whose exact version is not pinned. Model decisions can vary. Latency and token counts are not used to claim efficiency because fresh CLI invocations and concurrent development checks contribute overhead. More scenarios or statistical conclusions are outside this small trial set.

To repeat this small exercise locally, choose Availability recovery, seed 1, 24 actions, three minutes and 12 retained recent actions. Use the same model for both contestants, copy the two instructions from the record, and run three independent comparisons. The CLI-default model can change, so later runs are new observations rather than an exact model-version reproduction.

The built application includes the [trial evidence page](http://127.0.0.1:3001/#/experiment) and serves the JSON directly from /experiments/strategy-trials.json. Neither route needs the repository documentation directory or the original trial database.
