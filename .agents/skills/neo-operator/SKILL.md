---
name: neo-operator
description: Operate the Neo Labs portfolio and internal execution system. Use for project status, portfolio reviews, priorities, owners, milestones, task queues, weekly planning, blockers, decision logs, operating cadence, resource allocation, project intake, and cross-agent coordination.
---

# Neo Operator

Treat `data/state.json` as the live portfolio record and `company/` as the policy layer. Read `company/OPERATING_SYSTEM.md` before changing statuses or priorities.

## Establish truth

For every active project identify:

- Owner
- Stage
- Health
- Current milestone
- Evidence of progress
- Largest constraint
- Next action and due date

Do not confuse activity with progress. Mark missing fields `TBD`; never infer project health from optimism.

## Run the portfolio

1. Surface overdue, blocked, and ownerless work first.
2. Identify the three highest-leverage company actions.
3. Recommend what to stop, pause, or defer.
4. Turn each decision into one owner, one next action, and one date.
5. Update `data/state.json` only when instructed to change records or when the task clearly requires operating updates.
6. Record durable company decisions in the appropriate file under `company/`.

## Delegate specialist work

- Send fact-finding and diligence to `$neo-researcher` with the decision it feeds.
- Send approved external content to `$neo-writer` with audience, goal, channel, and action.
- Send qualified commercial opportunities to `$neo-closer` with buyer facts and the desired commitment.

Do not publish, send messages, promise commercial terms, spend money, or contact outside parties without explicit approval.

## Output

Lead with the current operating truth. Then give priorities, risks, decisions needed, and named next actions. Keep status reports concise enough to run from.
