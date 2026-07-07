# 10. Struktura složek

```
revai_CRM/
├── README.md
├── package.json · tsconfig.json · next.config.ts · drizzle.config.ts
├── docker-compose.yml · Dockerfile · .env.example · .gitignore
│
├── config/                     # typovaný env loader + deklarativní konfigurace
│   ├── app.config.ts           # zod-validace env při startu (fail-fast)
│   ├── default.json            # ne-tajné defaulty, feature flags, retenční lhůty
│   ├── permissions.json        # matice role → permission (zdroj pro seed)
│   └── notification-rules.json # událost → kanál/režim (default)
│
├── docs/                       # návrh (tento dokument a sourozenci)
│   ├── product/                # vize, architektura, reporting, implementační strategie, glosář
│   ├── data-model/             # entity, ERD, konvence, multi-tenancy, custom fields, activity-vs-timeline
│   ├── workflows/              # engine, katalog, lifecycle diagramy, notifikace, SLA
│   ├── integrations/           # email, chat webhook, storage links, REST API, roadmap
│   ├── security/               # role/permissions, audit, GDPR, secrets
│   ├── migration/              # import strategie, CSV mapping, SaaS migrace
│   ├── templates/              # onboarding & šablony
│   └── architecture/           # folder-structure, scaffold-map, data-model ADR
│
├── db/
│   ├── migrations/             # generované SQL (Drizzle Kit), číslované
│   └── seeds/                  # role, permissions, stages, phases, SLA tiery, tagy, workflows, demo
│       └── templates/          # JSON projektové šablony
│
├── src/
│   ├── app/                    # Next.js App Router — TENKÁ slupka (routing)
│   │   ├── (auth)/login · (app)/{dashboard,clients,deals,projects,tasks,settings}
│   │   └── api/{trpc,v1,webhooks}   # tRPC · REST fasáda · příchozí webhooky
│   │
│   ├── domain/                 # ČISTÉ jádro — nulové závislosti
│   │   ├── ids.ts · enums.ts · money.ts · events.ts · errors.ts
│   │   ├── entities/           # čisté doménové typy
│   │   └── policies/           # deal-stage, project-phase, sla, recurrence, permission
│   │
│   ├── modules/                # organizations, contacts, deals, projects, tasks,
│   │                           # activities, documents, integrations, reporting, security
│   │                           # (každý modul stejná konvence souborů — viz scaffold-map)
│   │
│   ├── adapters/               # porty + adaptéry: email, chat, storage, git, calendar
│   ├── api/                    # tRPC init, root router, middleware (auth/permission/audit), rest
│   ├── ui/                     # layout, components, pages/*, hooks
│   ├── workflows/              # dsl, engine, registry, actions/, definitions/
│   ├── shared/                 # db, tenant-context, event-bus, scheduler, notifications/,
│   │                           # audit/, custom-fields/, tags/, csv-import/, gdpr/
│   └── worker.ts               # entrypoint worker procesu (scheduler + outbox consumer)
│
├── tests/                      # unit · integration · e2e · fixtures
├── scripts/                    # migrate, seed, dev-reset, create-tenant, gdpr-export, backup
└── examples/                   # csv/ · webhooks/ · workflows/
```

Mapa souborů uvnitř každé složky s účelem a rozhraním je v [scaffold-map.md](scaffold-map.md).
