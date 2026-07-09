"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/ui/trpc";

const TYPE_META: Record<string, { label: string; doodle: string }> = {
  client: { label: "Klienti", doodle: "/doodles/people.svg" },
  contact: { label: "Kontakty", doodle: "/doodles/pandulak.png" },
  deal: { label: "Dealy", doodle: "/doodles/handshake.svg" },
  project: { label: "Projekty", doodle: "/doodles/rocket.png" },
  task: { label: "Úkoly", doodle: "/doodles/icon-tasks.png" },
};

/** Globální hledání — Cmd/Ctrl+K nebo klik na lupu v hlavičce. */
export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(q), 220); return () => clearTimeout(t); }, [q]);
  useEffect(() => { if (open) { setQ(""); setDebounced(""); setCursor(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);

  const results = trpc.search.query.useQuery({ q: debounced }, { enabled: open && debounced.trim().length >= 2 });
  const hits = results.data ?? [];

  useEffect(() => { setCursor(0); }, [hits.length]);

  if (!open) return null;

  const go = (href: string) => { onClose(); router.push(href); };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4 pt-[12vh]" onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, hits.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
        if (e.key === "Enter" && hits[cursor]) go(hits[cursor].href);
      }}>
      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/50" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18" className="shrink-0 text-faint">
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input ref={inputRef} className="w-full bg-transparent py-3.5 text-sm text-ink placeholder:text-faint outline-none"
            placeholder="Hledej klienty, kontakty, dealy, projekty, úkoly…" value={q} onChange={(e) => setQ(e.target.value)} />
          <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-faint">Esc</kbd>
        </div>

        <div className="max-h-[50vh] overflow-auto p-2">
          {debounced.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-faint">Napiš alespoň 2 znaky…</p>
          ) : results.isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-faint">Hledám…</p>
          ) : !hits.length ? (
            <div className="py-4 text-center">
              <img src="/doodles/empty-box.png" alt="" width={72} height={72} className="mx-auto mb-1 opacity-90" />
              <p className="text-sm text-faint">Nic nenalezeno pro „{debounced}"</p>
            </div>
          ) : (
            hits.map((h, i) => (
              <button key={`${h.type}:${h.id}`}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === cursor ? "bg-accent-soft" : "hover:bg-white/5"}`}
                onMouseEnter={() => setCursor(i)} onClick={() => go(h.href)}>
                <img src={TYPE_META[h.type]?.doodle} alt="" width={26} height={26} className="shrink-0 object-contain" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{h.title}</span>
                  {h.subtitle && <span className="block truncate text-xs text-faint">{h.subtitle}</span>}
                </span>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-faint">{TYPE_META[h.type]?.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
