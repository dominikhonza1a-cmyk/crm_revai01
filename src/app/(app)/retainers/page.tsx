"use client";

import Link from "next/link";
import { trpc } from "@/ui/trpc";
import { Card, SectionTitle, Badge, Loading, Empty, money } from "@/ui/components/ui";

const STATUS_LABEL: Record<string, string> = { draft: "Draft", active: "Aktivní", on_hold: "Pozastavený", closed: "Uzavřený" };

/** Retainery — přehled projektů s měsíční sazbou (rozklik dlaždice „Měsíční retainery" na dashboardu).
 *  Read-only: každý řádek odkazuje na projekt a klienta; editace sazby probíhá na kartě projektu. */
export default function RetainersPage() {
  const list = trpc.reporting.retainers.useQuery();
  if (list.isLoading) return <Loading />;
  const items = list.data?.items ?? [];
  const running = items.filter((r) => r.running);
  const paused = items.filter((r) => !r.running);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <p className="text-sm text-muted">Projekty s měsíční retainerovou sazbou. Sazbu upravíš na kartě projektu.</p>

      {!items.length ? (
        <Empty doodle="/doodles/retainer.svg">Zatím žádné retainery. Nastav u projektu typ „retainer" a měsíční sazbu.</Empty>
      ) : (
        <>
          <Card>
            <SectionTitle right={<span className="font-display text-xl tracking-wide text-ink">{money(list.data!.totalMonthlyCzkMinor)} <span className="text-xs font-sans tracking-normal text-faint">/ měsíc</span></span>}>
              Běžící retainery
            </SectionTitle>
            {!running.length ? <p className="text-sm text-faint">Žádný běžící retainer</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-faint">
                      <th className="py-2 pr-3 font-medium">Projekt</th><th className="py-2 pr-3 font-medium">Klient</th>
                      <th className="py-2 pr-3 font-medium">Od</th><th className="py-2 pr-3 font-medium">Naposledy fakturováno</th>
                      <th className="py-2 pr-3 text-right font-medium">CZK/měs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {running.map((r) => <RetainerRow key={r.id} r={r} />)}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {paused.length > 0 && (
            <Card>
              <SectionTitle>Neběžící (pozastavené / uzavřené)</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-line">
                    {paused.map((r) => <RetainerRow key={r.id} r={r} muted />)}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-faint">Tyto se nepočítají do měsíčního součtu ani do cashflow.</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

type RetainerItem = {
  id: string; name: string; status: string; running: boolean; monthlyCzkMinor: number | bigint;
  organizationId: string; organizationName: string; startDate: string | null; lastBilledOn: string | null;
};

function RetainerRow({ r, muted = false }: { r: RetainerItem; muted?: boolean }) {
  const cz = (d: string | null) => (d ? new Date(d).toLocaleDateString("cs-CZ") : "—");
  return (
    <tr className={`hover:bg-white/5 ${muted ? "opacity-60" : ""}`}>
      <td className="py-2.5 pr-3">
        <Link href={`/projects/${r.id}`} className="font-medium text-ink hover:text-accent hover:underline">{r.name}</Link>
        {r.status !== "active" && <Badge tone="slate">{STATUS_LABEL[r.status] ?? r.status}</Badge>}
      </td>
      <td className="py-2.5 pr-3">
        <Link href={`/clients/${r.organizationId}`} className="text-muted hover:text-accent hover:underline">{r.organizationName}</Link>
      </td>
      <td className="py-2.5 pr-3 text-muted">{cz(r.startDate)}</td>
      <td className="py-2.5 pr-3 text-muted">{cz(r.lastBilledOn)}</td>
      <td className="py-2.5 pr-3 text-right font-medium text-ink">{money(Number(r.monthlyCzkMinor))}</td>
    </tr>
  );
}
