# Migrace — CSV mapping

## Organizations
| Cílové pole | Typ | Povinné | Dedupe |
|---|---|---|---|
| `name` | text | ano | ✔ |
| `website` | url | ne | ✔ (doména) |
| `industry` | text | ne | |
| `employee_count_band` | enum | ne | |
| `lifecycle_stage` | enum(prospect…) | ne (default prospect) | |
| `owner_email` | → User | ne | |
| custom `cf.*` | dle definice | ne | |

## Contacts
| Cílové pole | Typ | Povinné | Dedupe |
|---|---|---|---|
| `email` | email | ano | ✔ |
| `first_name` / `last_name` | text | ano | |
| `phone` | text (PII) | ne | |
| `job_title` | text | ne | |
| `organization` | → Org (název/doména) | ne | |
| `role` | → ContactRole enum | ne | |
| `legal_basis` | enum | ne (default legitimate_interest) | |

## Deals
| Cílové pole | Typ | Povinné | Dedupe |
|---|---|---|---|
| `title` | text | ano | |
| `organization` | → Org | ano | |
| `amount_minor` | currency | ne | |
| `pipeline_stage` | → Stage (název) | ne (default Lead) | |
| `owner_email` | → User | ne | |
| `expected_close_date` | date | ne | |
| `project_type_hint` | enum | ne | |

## Transformace
- Peníze: `"120 000 Kč"` → `amount_minor=12000000, currency=CZK` (parser podle `currency` sloupce/defaultu).
- Datum: ISO nebo `DD.MM.YYYY`.
- Enum: case-insensitivní mapování + synonyma (`"won"`/`"vyhráno"` → stage kind=won).
- Neznámé sloupce → ignorovány (s upozorněním v dry-run reportu).
