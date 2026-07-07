import type { ReactNode } from "react";

/** Znovupoužitelné UI prvky — minimalistické, světlý motiv, emerald akcent. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function StatCard({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: boolean }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tracking-tight ${accent ? "text-accent-600" : "text-slate-800"}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </Card>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{children}</h2>;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600", green: "bg-accent-50 text-accent-700",
    amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700", blue: "bg-blue-50 text-blue-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">{children}</div>;
}

export function Loading() {
  return <div className="animate-pulse text-sm text-slate-400">Načítám…</div>;
}

/** Formát peněz z minor jednotky (string/number/bigint) na "1 234 Kč". */
export function money(minor: string | number | bigint | null | undefined, currency = "Kč"): string {
  const n = Number(minor ?? 0) / 100;
  return `${n.toLocaleString("cs-CZ")} ${currency}`;
}
