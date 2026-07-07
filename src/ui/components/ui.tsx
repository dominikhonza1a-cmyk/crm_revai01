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

/** Formát peněz z minor jednotky (string/number/bigint) na "1 234 Kč". */
export function money(minor: string | number | bigint | null | undefined, currency = "Kč"): string {
  const n = Number(minor ?? 0) / 100;
  return `${n.toLocaleString("cs-CZ")} ${currency}`;
}
