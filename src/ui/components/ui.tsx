import type { ReactNode } from "react";
import { LIFECYCLE_META } from "@/domain/enums";

/** Znovupoužitelné UI prvky — tmavý motiv, mint/emerald akcent. */

export function Card({ children, className = "", doodle, doodlePos = "tr" }: { children: ReactNode; className?: string; doodle?: string; doodlePos?: "tr" | "br" }) {
  return (
    <div className={`relative rounded-2xl border border-line bg-surface p-5 ${className}`}>
      {doodle && (
        <img src={doodle} alt="" width={80} height={80}
          className={`pointer-events-none absolute select-none opacity-95 ${doodlePos === "tr" ? "right-2 top-0" : "bottom-0 right-2"}`} />
      )}
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint, icon, iconSrc, tone = "accent", doodle }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; iconSrc?: string; tone?: "accent" | "amber" | "blue" | "pink"; doodle?: string }) {
  const iconBg: Record<string, string> = {
    accent: "bg-accent-soft text-accent", amber: "bg-amber-400/10 text-amber-400",
    blue: "bg-sky-400/10 text-sky-400", pink: "bg-pink-400/10 text-pink-400",
  };
  return (
    <div className="relative h-full rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent/40">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        {iconSrc
          ? <img src={iconSrc} alt="" width={48} height={48} className="pointer-events-none h-12 w-12 select-none object-contain" />
          : icon && <span className={`grid h-9 w-9 place-items-center rounded-xl ${iconBg[tone]}`}>{icon}</span>}
      </div>
      <div className="mt-3 font-display text-4xl tracking-wide text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-faint">{hint}</div>}
      {doodle && <img src={doodle} alt="" width={52} height={52} className="pointer-events-none absolute bottom-2 right-3 select-none opacity-90" />}
    </div>
  );
}

/** Barevný badge pro stav vztahu klienta — barva podle stavu (LIFECYCLE_META). */
export function LifecycleBadge({ stage }: { stage: string }) {
  const meta = LIFECYCLE_META[stage];
  if (!meta) return <span className="text-xs text-faint">{stage}</span>;
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${meta.color}22`, color: meta.color }}>
      {meta.label}
    </span>
  );
}

export function SectionTitle({ children, right, icon }: { children: ReactNode; right?: ReactNode; icon?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-display text-xl tracking-wide text-ink">
        {icon && <img src={icon} alt="" width={26} height={26} className="pointer-events-none select-none" />}
        {children}
      </h2>
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

export function Empty({ children, doodle = "/doodles/empty-box.png" }: { children: ReactNode; doodle?: string | null }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/50 p-8 text-center">
      {doodle && <img src={doodle} alt="" width={96} height={96} className="mx-auto mb-2 opacity-90" />}
      <div className="text-sm text-faint">{children}</div>
    </div>
  );
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
          <h2 className="font-display text-2xl tracking-wide text-ink">{title}</h2>
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

/** Převede tRPC/zod chybu na čitelnou větu (místo syrového JSON pole issues). */
export function formatError(message: string | undefined | null): string {
  if (!message) return "Neznámá chyba";
  try {
    const parsed = JSON.parse(message);
    if (Array.isArray(parsed)) {
      return parsed.map((i: { message?: string; path?: (string | number)[] }) => {
        const field = i.path?.length ? FIELD_LABELS[String(i.path[0])] ?? String(i.path[0]) : null;
        return field ? `${field}: ${i.message ?? "neplatná hodnota"}` : i.message ?? "neplatná hodnota";
      }).join(" · ");
    }
  } catch { /* není JSON → vrátíme jak je */ }
  return message;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Název", website: "Web", title: "Název", email: "E-mail", phone: "Telefon",
  externalUrl: "URL", amountMinor: "Hodnota", dueAt: "Termín", firstName: "Jméno", lastName: "Příjmení",
};
