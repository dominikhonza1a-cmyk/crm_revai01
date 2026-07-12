"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/ui/trpc";
import { Card, Badge, Loading, Empty } from "@/ui/components/ui";

import { LIFECYCLE_META } from "@/domain/enums";

export default function ClientsPage() {
  const router = useRouter();
  const { data, isLoading, error } = trpc.organizations.list.useQuery(undefined);
  if (error) return <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">Chyba: {error.message}</div>;
  if (isLoading || !data) return <Loading />;
  if (data.items.length === 0) return <Empty>Zatím žádní klienti. Přidej prvního přes „+ Nový".</Empty>;

  return (
    <div className="mx-auto max-w-5xl">
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-white/5 text-left text-xs uppercase tracking-wide text-faint">
            <tr>
              <th className="px-4 py-3 font-medium">Název</th>
              <th className="px-4 py-3 font-medium">Stav</th>
              <th className="px-4 py-3 font-medium">Odvětví</th>
              <th className="px-4 py-3 font-medium">Web</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.items.map((o) => {
              const lc = LIFECYCLE_META[o.lifecycleStage];
              return (
                <tr key={o.id} onClick={() => router.push(`/clients/${o.id}`)} className="cursor-pointer transition-colors hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-ink">{o.name}</td>
                  <td className="px-4 py-3">{lc ? <Badge tone={lc.tone}>{lc.label}</Badge> : o.lifecycleStage}</td>
                  <td className="px-4 py-3 text-muted">{o.industry ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{o.website ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
