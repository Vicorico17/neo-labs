# Neo Labs OS

A local company operating system for running Neo Labs as a venture studio today and an investment platform over time.

## Start

```bash
npm start
```

Open `http://localhost:4173`. The dashboard writes changes to `data/state.json`, so the portfolio remains portable and versionable.

On a Vercel preview, edits fall back to browser-local storage because serverless files are read-only. Commit approved portfolio changes to `data/state.json` to preserve them as the shared source of truth.

## Use the agents

From this repository, ask Codex to use one of:

- `$neo-researcher`
- `$neo-writer`
- `$neo-closer`
- `$neo-operator`

The project instructions in `AGENTS.md` route work and keep each role grounded in the same company context.

## First setup pass

1. Replace every `TBD` in `company/` with an explicit founder decision.
2. Add every active project to the dashboard.
3. Give every project one owner, one current milestone, and one next action.
4. Decide whether Neo Labs Capital starts with advisory, SPVs, or a regulated fund structure after legal review.
