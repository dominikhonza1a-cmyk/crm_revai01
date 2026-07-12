"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type Option = { value: string; label: string };

/**
 * Vlastní dropdown v našich barvách (nativní <select> ignoruje color-scheme na macOS).
 * Panel se vykresluje přes portál s fixed pozicí — nikdy ho neořízne rodič s overflow-hidden
 * (karty, tabulky, scroll kontejnery). Klávesnice: šipky vybírají, Enter potvrdí, Esc zavře.
 */
export function Select({ value, onChange, options, className = "", placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: readonly Option[];
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [rect, setRect] = useState<{ left: number; top: number; bottom: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  const measure = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, bottom: r.bottom, width: r.width });
  };

  useLayoutEffect(() => { if (open) measure(); }, [open]);

  useEffect(() => {
    if (!open) return;
    setCursor(Math.max(0, options.findIndex((o) => o.value === value)));
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const reposition = () => measure();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", reposition, true); // capture → chytí i vnořené scroll kontejnery
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, options, value]);

  const pick = (v: string) => { onChange(v); setOpen(false); };

  // rozhodni, jestli panel otevřít dolů nebo nahoru (podle místa ve viewportu)
  const openUp = rect ? (window.innerHeight - rect.bottom < 260 && rect.top > window.innerHeight - rect.bottom) : false;

  return (
    <div className={`relative ${className}`}>
      <button ref={btnRef} type="button"
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-left text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); if (!open) setOpen(true); else setCursor((c) => Math.min(c + 1, options.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
          if (e.key === "Enter" && open) { e.preventDefault(); pick(options[cursor]!.value); }
          if (e.key === "Escape") setOpen(false);
        }}>
        <span className={current ? "text-ink" : "text-faint"}>{current?.label ?? placeholder ?? "—"}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && rect && typeof document !== "undefined" && createPortal(
        <div ref={panelRef}
          className="fixed z-[100] max-h-64 overflow-auto rounded-xl border border-line bg-surface p-1 shadow-xl shadow-black/40"
          style={{
            left: rect.left,
            width: rect.width,
            ...(openUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
          }}>
          {options.map((o, i) => (
            <button key={o.value} type="button"
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${i === cursor ? "bg-accent-soft text-accent" : "text-ink hover:bg-white/5"}`}
              onMouseEnter={() => setCursor(i)} onClick={() => pick(o.value)}>
              <span className="w-4 shrink-0 text-accent">{o.value === value ? "✓" : ""}</span>
              {o.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
