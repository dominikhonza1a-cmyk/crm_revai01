"use client";

import { trpc } from "@/ui/trpc";
import { Card, Badge, Loading, Empty } from "@/ui/components/ui";

const LIFECYCLE: Record<string, { label: string; tone: "slate" | "green" | "amber" | "blue" }> = {
  prospect: { label: "Prospekt", tone: "blue" },
  active_client: { label: "Klient", tone: "green" },
  past_client: { label: "Bývalý", tone: "slate" },
  partner: { label: "Partner", tone: "amber" },
};

export default function ClientsPage() {
  const { data, isLoading, error } = trpc.organizations.list.useQuery(undefined);
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Chyba: {error.message}</div>;
  if (isLoading || !data) return <Loading />;
  if (data.items.length === 0) return <Empty>Zatím žádní klienti. Přidej prvního přes „+ Nový".</Empty>;

  return (
    <div className="mx-auto max-w-5xl">
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Název</th>
              <th className="px-4 py-3 font-medium">Stav</th>
              <th className="px-4 py-3 font-medium">Odvětví</th>
              <th className="px-4 py-3 font-medium">Web</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((o) => {
              const lc = LIFECYCLE[o.lifecycleStage];
              return (
                <tr key={o.id} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{o.name}</td>
                  <td className="px-4 py-3">{lc ? <Badge tone={lc.tone}>{lc.label}</Badge> : o.lifecycleStage}</td>
                  <td className="px-4 py-3 text-slate-500">{o.industry ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{o.website ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
