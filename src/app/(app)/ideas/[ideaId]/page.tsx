"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/ui/trpc";
import { Loading, Empty } from "@/ui/components/ui";
import { DocumentsTab } from "@/ui/components/entity-tabs";
import { TagPicker } from "@/ui/components/tag-picker";
import { MarkdownLite } from "@/ui/components/markdown-lite";

/**
 * Detail nápadu: nekonečné psaní s AUTOSAVE (debounce 800 ms) — žádné tlačítko Uložit.
 * Přílohy = reference na dokumenty (Drive/SharePoint…), štítky jako u klientů.
 */
export default function IdeaDetailPage() {
  const ideaId = useParams().ideaId as string;
  const router = useRouter();
  const idea = trpc.ideas.get.useQuery({ id: ideaId });
  const [title, setTitle] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [saved, setSaved] = useState<"saved" | "saving" | "dirty">("saved");
  const [mode, setMode] = useState<"view" | "edit" | null>(null);   // null = podle obsahu po načtení
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgUpload = trpc.ideas.imageUploadUrl.useMutation();

  const update = trpc.ideas.update.useMutation({
    onSuccess: () => setSaved("saved"),
    onError: () => setSaved("dirty"),
  });
  const updateRef = useRef(update.mutate);
  updateRef.current = update.mutate;

  const remove = trpc.ideas.remove.useMutation({ onSuccess: () => router.push("/ideas") });

  // autosave: 800 ms po posledním úhozu
  useEffect(() => {
    if (title === null && content === null) return;
    setSaved("dirty");
    const t = setTimeout(() => {
      setSaved("saving");
      updateRef.current({ id: ideaId, ...(title !== null ? { title } : {}), ...(content !== null ? { content } : {}) });
    }, 800);
    return () => clearTimeout(t);
  }, [title, content, ideaId]);

  // uložit i při odchodu ze stránky
  useEffect(() => {
    return () => {
      if (title !== null || content !== null) {
        updateRef.current({ id: ideaId, ...(title !== null ? { title } : {}), ...(content !== null ? { content } : {}) });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-výška textarey (roste donekonečna)
  const autoGrow = () => {
    const el = textRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight + 4}px`; }
  };
  useEffect(autoGrow, [content, idea.data]);

  const children = trpc.ideas.children.useQuery({ id: ideaId });
  const removeChild = trpc.ideas.remove.useMutation({ onSuccess: () => children.refetch() });
  const createChild = trpc.ideas.create.useMutation({
    onSuccess: (res) => router.push(`/ideas/${res.id}`),
  });

  if (idea.isLoading) return <Loading />;
  if (!idea.data) return <Empty doodle="/doodles/bulb.svg">Nápad nenalezen</Empty>;

  const titleValue = title ?? idea.data.title;
  const contentValue = content ?? idea.data.content;
  const effectiveMode = mode ?? (idea.data.content.trim() ? "view" : "edit");

  /** Obalí výběr v textaree markdown značkami (B/I/kód) nebo vloží prefix řádku (#, ##, -). */
  const applyFormat = (kind: "bold" | "italic" | "code" | "h1" | "h2" | "list" | "link") => {
    const el = textRef.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const sel = value.slice(a, b) || "text";
    let next = value, cursor = b;
    if (kind === "bold") { next = value.slice(0, a) + `**${sel}**` + value.slice(b); cursor = a + sel.length + 4; }
    if (kind === "italic") { next = value.slice(0, a) + `*${sel}*` + value.slice(b); cursor = a + sel.length + 2; }
    if (kind === "code") { next = value.slice(0, a) + "`" + sel + "`" + value.slice(b); cursor = a + sel.length + 2; }
    if (kind === "link") { next = value.slice(0, a) + `[${sel}](https://)` + value.slice(b); cursor = a + sel.length + 12; }
    if (kind === "h1" || kind === "h2" || kind === "list") {
      const prefix = kind === "h1" ? "# " : kind === "h2" ? "## " : "- ";
      const lineStart = value.lastIndexOf("\n", a - 1) + 1;
      next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
      cursor = b + prefix.length;
    }
    setContent(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor, cursor); });
  };

  /** Vloží text na pozici kurzoru (obrázek, tabulka…). */
  const insertAtCursor = (snippet: string) => {
    const el = textRef.current;
    const base = contentValue;
    const a = el ? el.selectionStart : base.length;
    const b = el ? el.selectionEnd : base.length;
    const next = base.slice(0, a) + snippet + base.slice(b);
    setContent(next);
    const cursor = a + snippet.length;
    requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(cursor, cursor); } autoGrow(); });
  };

  /** Nahraje obrázek do úložiště a vloží ho jako markdown ![](url) na pozici kurzoru. */
  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const up = await imgUpload.mutateAsync({ filename: file.name || "obrazek.png" });
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { error } = await sb.storage.from(up.bucket).uploadToSignedUrl(up.path, up.token, file);
      if (error) throw error;
      insertAtCursor(`\n![${(file.name || "obrázek").replace(/[[\]]/g, "")}](${up.publicUrl})\n`);
    } catch (e) {
      alert("Nahrání obrázku se nepodařilo: " + String((e as Error)?.message ?? e));
    }
  };

  /** Vložení obrázku ze schránky (Ctrl/Cmd+V screenshotu). */
  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imgs = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
    if (imgs.length) { e.preventDefault(); imgs.forEach(uploadImage); }
  };

  const TABLE_TEMPLATE = "\n| Sloupec 1 | Sloupec 2 | Sloupec 3 |\n|---|---|---|\n| … | … | … |\n| … | … | … |\n";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={idea.data.parentId ? `/ideas/${idea.data.parentId}` : "/ideas"} title={idea.data.parentId ? "Zpět na nadřazenou stránku" : "Zpět na nápady"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint hover:bg-white/5 hover:text-ink">←</Link>
        <input
          className="min-w-0 flex-1 bg-transparent text-2xl font-semibold text-ink outline-none placeholder:text-faint"
          value={titleValue} onChange={(e) => setTitle(e.target.value)} placeholder="Název nápadu…" />
        <span className={`shrink-0 text-xs ${saved === "saved" ? "text-accent" : "text-faint"}`}>
          {saved === "saved" ? "Uloženo ✓" : saved === "saving" ? "Ukládám…" : "Píšeš…"}
        </span>
        <button className="shrink-0 rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent"
          onClick={() => setMode(effectiveMode === "view" ? "edit" : "view")}>
          {effectiveMode === "view" ? "✎ Upravit text" : "✓ Hotovo"}
        </button>
        <button className="shrink-0 text-xs text-red-300 hover:underline" disabled={remove.isPending}
          onClick={() => { if (confirm("Smazat tento nápad?")) remove.mutate({ id: ideaId }); }}>Smazat</button>
      </div>

      <TagPicker entityType="idea" entityId={ideaId} />

      {effectiveMode === "view" ? (
        <div className="min-h-[30vh] cursor-text rounded-2xl border border-line bg-surface p-5"
          onDoubleClick={() => setMode("edit")} title="Dvojklik = upravit">
          {contentValue.trim() ? <MarkdownLite text={contentValue} /> : <p className="text-sm text-faint">Prázdné — klikni na „✎ Upravit text".</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface">
          {/* Sticky toolbar — drží se nahoře i při dlouhém textu */}
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 rounded-t-2xl border-b border-line bg-surface/95 px-3 py-2 text-xs backdrop-blur">
            {([["bold", "B"], ["italic", "I"], ["h1", "H1"], ["h2", "H2"], ["list", "• seznam"], ["link", "odkaz"], ["code", "</>"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => applyFormat(k)}
                className={`rounded-lg border border-line px-2.5 py-1 text-muted transition-colors hover:border-accent/40 hover:text-accent ${k === "bold" ? "font-bold" : k === "italic" ? "italic" : ""}`}>
                {l}
              </button>
            ))}
            <span className="mx-0.5 h-4 w-px bg-line" />
            <button onClick={() => insertAtCursor(TABLE_TEMPLATE)}
              className="rounded-lg border border-line px-2.5 py-1 text-muted transition-colors hover:border-accent/40 hover:text-accent" title="Vložit tabulku">▦ tabulka</button>
            <button onClick={() => fileRef.current?.click()} disabled={imgUpload.isPending}
              className="rounded-lg border border-line px-2.5 py-1 text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50" title="Vložit obrázek (nebo vlož ze schránky přes Ctrl/Cmd+V)">
              {imgUpload.isPending ? "nahrávám…" : "🖼 obrázek"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { Array.from(e.target.files ?? []).forEach(uploadImage); e.target.value = ""; }} />
            <span className="ml-auto hidden text-faint sm:inline">Tabulku i screenshot můžeš rovnou vložit (Ctrl/Cmd+V)</span>
          </div>
          {/* Psaní vlevo, živý náhled formátování vpravo */}
          <div className="grid gap-0 lg:grid-cols-2">
            <textarea
              ref={textRef}
              className="min-h-[50vh] w-full resize-none border-b border-line bg-transparent p-5 text-sm leading-relaxed text-ink outline-none placeholder:text-faint lg:border-b-0 lg:border-r"
              placeholder="Piš cokoli — poznatky, odkazy, plány… Ukládá se to samo. **tučně**, # nadpis, - odrážka, | tabulka |, screenshot vlož přes Ctrl/Cmd+V."
              value={contentValue}
              onPaste={onPaste}
              onChange={(e) => { setContent(e.target.value); autoGrow(); }} />
            <div className="min-h-[50vh] overflow-auto p-5">
              <p className="mb-2 text-[10px] uppercase tracking-wide text-faint">Náhled</p>
              {contentValue.trim() ? <MarkdownLite text={contentValue} /> : <p className="text-sm text-faint">Náhled formátování se ukáže tady.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Podstránky — jako v Notionu */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted"><img src="/doodles/page.svg" alt="" width={18} height={18} /> Podstránky</h2>
          <button className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent"
            disabled={createChild.isPending}
            onClick={() => createChild.mutate({ parentId: ideaId })}>+ Nová podstránka</button>
        </div>
        {!children.data?.length ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-3 text-xs text-faint">Zatím žádné podstránky — tlačítkem založíš stránku uvnitř tohoto nápadu a píšeš dál.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {children.data.map((c) => (
              <div key={c.id} className="group relative">
                <Link href={`/ideas/${c.id}`}
                  className="block rounded-xl border border-line bg-surface px-3.5 py-2.5 pr-8 transition-colors hover:border-accent/40">
                  <span className="flex items-center gap-1.5 truncate text-sm text-ink"><img src="/doodles/page.svg" alt="" width={16} height={16} className="shrink-0" />{c.title}</span>
                  {c.snippet && <span className="block truncate text-xs text-faint">{c.snippet}</span>}
                </Link>
                <button className="absolute right-2 top-2 hidden text-xs text-red-300 hover:underline group-hover:block" title="Smazat podstránku"
                  disabled={removeChild.isPending}
                  onClick={(e) => { e.preventDefault(); if (confirm(`Smazat podstránku „${c.title}"?`)) removeChild.mutate({ id: c.id }); }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted">Přílohy a odkazy</h2>
        <DocumentsTab entityType="idea" entityId={ideaId} />
      </div>
    </div>
  );
}
