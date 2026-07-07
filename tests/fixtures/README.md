# Test fixtures

Sdílená testovací data a factory funkce (builder pattern) pro unit/integration/e2e.

- `workspace.factory.ts` — vytvoří testovací workspace + admina.
- `deal.factory.ts`, `project.factory.ts`, `task.factory.ts` — entity s rozumnými defaulty.
- `seed-min.ts` — minimální seed (role, jedna pipeline, jeden SLA tier) pro integrační testy.

Integrační testy běží proti dočasnému PostgreSQL přes testcontainers (izolace mezi běhy).
