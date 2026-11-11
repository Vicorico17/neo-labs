# ro.fun — Fund OS

Neo Labs and ro.fun are one investment fund initiative. This repository holds the fund workspace, investment thesis, operating records, and specialist roles.

## Run locally

```bash
npm start
```

Open http://localhost:4173. Local edits write to `data/state.json`. The server binds to localhost; this workspace has no authentication and is intended for private local use.

When file persistence is unavailable, edits are stored in this browser and clearly labeled. Export browser edits before clearing browser data. Existing Neo Labs browser records are preserved during the identity migration. Deployment and changes to the live ro.fun domain are separate actions requiring approval.

## Workspace

- Overview: fund decisions, recorded holdings, priorities, and recent decisions.
- Investments: sourcing through investment committee and deployment.
- Portfolio: recorded investment companies, separate from fund operations.
- Investors: relationships, indications, and commitments.
- Thesis: editable mandate and fund parameters; unknowns remain TBD.
- Operations: internal projects and owned actions.
- Agent desk: research, writing, commercial support, and operations.

No investment records or fund terms are fabricated. This is an internal working system, not an offering document.

Company policy lives in `company/`, records in `data/state.json`, and reusable work in role output directories. Use the existing `$neo-operator`, `$neo-researcher`, `$neo-writer`, and `$neo-closer` skills; their names remain stable.
