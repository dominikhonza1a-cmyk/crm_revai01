# src/app — Next.js App Router (tenká slupka)

Routing a HTTP jen delegují na moduly (`src/modules`) a UI (`src/ui`). Žádná business logika zde.

```
app/
├── layout.tsx                      # AppShell (viz src/ui/layout)
├── (auth)/login/page.tsx           # přihlášení (Better Auth)
├── (app)/dashboard/page.tsx        # widgetový dashboard
├── (app)/clients/page.tsx          # seznam klientů
├── (app)/clients/[orgId]/page.tsx  # klientská karta (taby: overview/projekty/kontakty/timeline/dokumenty/dealy)
├── (app)/deals/page.tsx            # pipeline kanban
├── (app)/projects/[projectId]/page.tsx  # projektová karta (fáze-stepper + taby)
├── (app)/tasks/page.tsx            # My Work / board / ticket queue
├── (app)/settings/[...section]/page.tsx # nastavení (10 sekcí)
└── api/
    ├── trpc/[trpc]/route.ts        # tRPC handler (interní UI)
    ├── v1/[...rest]/route.ts       # REST fasáda pro n8n/Make/Zapier (OpenAPI)
    └── webhooks/[provider]/route.ts # příchozí webhooky (email push, chat, git) — ověření podpisu
```

Konkrétní `.tsx`/`route.ts` soubory se doplní ve fázi 0–1; struktura odpovídá 6položkové navigaci
(viz [../ui/README.md](../ui/README.md)).
