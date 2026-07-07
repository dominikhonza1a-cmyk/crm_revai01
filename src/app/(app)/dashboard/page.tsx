"use client";

import { trpc } from "@/ui/trpc";
import { Loading } from "@/ui/components/ui";
import { DashboardView } from "@/ui/pages/dashboard-view";

export default function DashboardPage() {
  const { data, isLoading, error } = trpc.reporting.dashboard.useQuery();
  if (error) return <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">Chyba: {error.message}</div>;
  if (isLoading || !data) return <Loading />;
  return <DashboardView data={data} />;
}
