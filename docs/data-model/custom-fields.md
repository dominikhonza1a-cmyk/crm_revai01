# Custom fields

## Rozhodnutí: definice v tabulce, hodnoty v JSONB (ne EAV)

- **`CustomFieldDefinition`** = řádek v tabulce (per `entity_type`): `key` (slug, **immutable**), `label`,
  `field_type`, `options`, `required`, `is_pii`, `position`, `archived_at`.
- **Hodnoty** = klíče v `custom_fields jsonb` na hostitelské entitě: `{"annual_revenue": 5000000, "tech_stack": ["n8n","openai"]}`.
- **Filtrování** přes GIN index na `custom_fields` každé tabulky.

## Proč ne fyzická EAV tabulka
EAV (`custom_field_value` s řádkem na hodnotu) znamená: N joinů nebo agregaci na každý list-view, typování
napříč 8 sloupci a bolestivé řazení/filtry. JSONB drží hodnoty **u řádku** → jeden dotaz, triviální export,
a GDPR scrub PII pole je jeden `UPDATE`. Samostatnou `custom_field_value` tabulku zavedeme **jen** kdyby
vznikla potřeba cross-entity reportingu nad custom fieldy s DB-integritou (fáze 3+).

## Validace
`custom-fields` shared modul validuje hodnoty proti definicím (zod schéma sestavené za běhu z definic).
Validace je společná pro API i CSV import — **jeden zdroj pravdy**. Neznámý klíč nebo špatný typ = chyba.

## Past a jak jí předejít
Přejmenování `key` by odpojilo existující hodnoty → `key` je **immutable**, mění se jen `label`.
Archivace (`archived_at`) skryje pole v UI, ale hodnoty ponechá kvůli historii a exportu.

## GDPR
Pole s `is_pii=true` se při erasure/anonymizaci kontaktu nulují (`custom_fields` klíč → NULL).
`is_pii` je **povinná volba** při zakládání pole (privacy by default).
