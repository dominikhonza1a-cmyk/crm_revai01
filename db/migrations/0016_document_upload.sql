-- 0016: Nahrané soubory (native_file) přímo v CRM + volný popis kategorie při „Jiné".
ALTER TABLE document ADD COLUMN IF NOT EXISTS category_label text;
ALTER TABLE document ADD COLUMN IF NOT EXISTS storage_key text;   -- cesta v Supabase Storage (bucket documents)
