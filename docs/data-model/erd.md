# 3. ER diagram

Tag/Tagging, CustomFieldDefinition, AuditLog, Reminder, NotificationPreference, Integration a ImportJob
jsou pro čitelnost vynechány — vážou se polymorfně přes `entity_type/entity_id`, resp. na Workspace/User.
Polymorfní vazby (TimelineEvent, Document) jsou v diagramu zjednodušeny na primárního hostitele.

```mermaid
erDiagram
    WORKSPACE ||--o{ USER : "has members"
    WORKSPACE ||--o{ ROLE : "defines"
    USER }o--o{ ROLE : "user_role"
    WORKSPACE ||--o{ ORGANIZATION : "owns"
    ORGANIZATION ||--o{ CONTACT : "employs"
    CONTACT ||--o{ CONTACT_ROLE : "plays"
    ORGANIZATION ||--o{ CONTACT_ROLE : "in context of"
    PROJECT |o--o{ CONTACT_ROLE : "project context"
    ORGANIZATION ||--o{ DEAL : "has"
    PIPELINE_STAGE ||--o{ DEAL : "current stage"
    DEAL |o--o| PROJECT : "won creates draft"
    ORGANIZATION ||--o{ PROJECT : "runs"
    PROJECT_TEMPLATE |o--o{ PROJECT : "instantiates"
    PROJECT_TEMPLATE ||--o{ TASK_TEMPLATE : "contains"
    PROJECT ||--o{ PROJECT_PHASE : "has phases"
    PROJECT |o--o{ TASK : "contains"
    PROJECT_PHASE |o--o{ TASK : "groups"
    TASK |o--o{ TASK : "recurrence parent"
    ORGANIZATION |o--o{ TASK : "support tickets"
    USER |o--o{ TASK : "assignee"
    USER ||--o{ ACTIVITY : "owns"
    ACTIVITY }o--o| ORGANIZATION : "denormalized org"
    ACTIVITY ||--o| TIMELINE_EVENT : "projects into"
    ORGANIZATION |o--o{ TIMELINE_EVENT : "org timeline"
    SLA_POLICY |o--o{ ORGANIZATION : "support tier"
    SLA_POLICY ||--o{ SLA_TRACKER : "governs"
    TASK ||--o{ SLA_TRACKER : "tracked by"
    DOCUMENT ||--o{ DOCUMENT_VERSION : "versions"
    PROJECT |o--o{ DOCUMENT : "linked (polymorphic)"

    ORGANIZATION {
        uuid id PK
        uuid workspace_id FK
        string name
        enum lifecycle_stage
        uuid support_sla_policy_id FK
        jsonb custom_fields
    }
    DEAL {
        uuid id PK
        uuid organization_id FK
        uuid pipeline_stage_id FK
        bigint amount_minor
        timestamptz stage_entered_at
        timestamptz last_activity_at
        uuid created_project_id FK
    }
    PROJECT {
        uuid id PK
        uuid organization_id FK
        uuid deal_id FK
        enum project_type
        enum engagement_type
        enum status
        uuid current_phase_id FK
    }
    TASK {
        uuid id PK
        uuid project_id FK
        enum type
        enum status
        enum priority
        timestamptz due_at
        text recurrence_rule
    }
    TIMELINE_EVENT {
        uuid id PK
        enum entity_type
        uuid entity_id
        uuid organization_id FK
        enum event_type
        timestamptz occurred_at
        jsonb payload
    }
    SLA_TRACKER {
        uuid id PK
        uuid sla_policy_id FK
        enum metric
        timestamptz due_at
        enum status
        int escalation_level
    }
    DOCUMENT {
        uuid id PK
        enum kind
        enum storage_provider
        text external_url
        bool contains_pii
    }
```

Živá kopie tohoto diagramu je i v [../architecture/data-model.md](../architecture/data-model.md) (ADR).
