import type { ReactNode } from "react";

/** Znovupoužitelné UI prvky — tmavý motiv, mint/emerald akcent. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>{children}</div>;
}

export function StatCard({ label, value, hint, icon, tone = "accent" }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; tone?: "accent" | "amber" | "blue" | "pink" }) {
  const iconBg: Record<string, string> = {
    accent: "bg-accent-soft text-accent", amber: "bg-amber-400/10 text-amber-400",
    blue: "bg-sky-400/10 text-sky-400", pink: "bg-pink-400/10 text-pink-400",
  };
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent/40">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        {icon && <span className={`grid h-9 w-9 place-items-center rounded-xl ${iconBg[tone]}`}>{icon}</span>}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-faint">{hint}</div>}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-base font-semibold text-ink">{children}</h2>
      {right}
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const tones: Record<string, string> = {
    slate: "bg-white/5 text-muted", green: "bg-accent-soft text-accent",
    amber: "bg-amber-400/10 text-amber-400", red: "bg-red-400/10 text-red-400", blue: "bg-sky-400/10 text-sky-400",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line bg-surface/50 p-10 text-center text-sm text-faint">{children}</div>;
}

export function Loading() {
  return <div className="animate-pulse text-sm text-faint">Načítám…</div>;
}

/** Jednoduchý donut graf ze segmentů (SVG). */
export function Donut({ segments, size = 128, stroke = 16 }: { segments: { value: number; color: string; label?: string }[]; size?: number; stroke?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="round" />;
          offset += len;
          return el;
        })}
      </g>
    </svg>
  );
}

/** Sdílené styly formulářových polí. */
export const fieldInput = "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft";
export const fieldLabel = "mb-1.5 block text-xs font-medium text-muted";
export const btnPrimary = "rounded-xl bg-accent-strong px-4 py-2.5 text-sm font-semibold text-[#08110c] transition-all hover:brightness-110 disabled:opacity-60";
export const btnGhost = "rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-ink";

/** Modální okno (overlay + panel). Zavře se klikem mimo nebo na ✕. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-white/5 hover:text-ink">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Taby (jednoduchý přepínač). */
export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${active === t.key ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Formát peněz z minor jednotky (string/number/bigint) na "1 234 Kč". */
export function money(minor: string | number | bigint | null | undefined, currency = "Kč"): string {
  const n = Number(minor ?? 0) / 100;
  return `${n.toLocaleString("cs-CZ")} ${currency}`;
}
