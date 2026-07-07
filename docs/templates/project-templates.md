# Jak psát projektové šablony (JSON)

Šablony žijí v [../../db/seeds/templates](../../db/seeds/templates) a seedují se do `ProjectTemplate` + `TaskTemplate`.
Při Won→projekt se **kopírují** (snapshot) — pozdější změna šablony neovlivní běžící projekty.

## Schéma
```jsonc
{
  "key": "chatbot-delivery",
  "name": "Chatbot / Voicebot – dodávka",
  "project_type": "chatbot_voicebot",       // chatbot_voicebot | process_automation | custom_ai
  "engagement_type": "one_off",             // one_off | retainer
  "default_sla_tier": "standard",           // klíč SLAPolicy tier (support)
  "phases": [
    { "key": "kickoff",  "name": "Kickoff",  "position": 1, "duration_days": 5 },
    { "key": "discovery","name": "Discovery","position": 2, "duration_days": 10 }
    // …
  ],
  "tasks": [
    {
      "phase_key": "kickoff",
      "title": "Úvodní call + sběr přístupů",
      "default_assignee_role": "pm",         // sales | pm | dev | support
      "offset_days": 0,                       // od začátku fáze
      "estimate_minutes": 90
      // "recurrence_rule": "FREQ=MONTHLY"    // jen retainer recurring tasky
    }
  ]
}
```

## Pravidla
- `key` je immutable identifikátor šablony.
- `phase.key` musí být z enumu `ProjectPhase.key` (kickoff, discovery, build, test_uat, deploy, hypercare, ongoing, closed).
- `due_at` tasku při instanciaci = `project.start_date + Σ(předchozí fáze duration) + task.offset_days`.
- `default_assignee_role` se mapuje na nejbližšího uživatele s rolí; není-li, task zůstane nepřiřazený.
- Retainer šablona používá fázi `ongoing` a tasky s `recurrence_rule`.
