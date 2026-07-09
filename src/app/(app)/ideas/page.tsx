"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/ui/trpc";
import { Card, Loading, Empty, btnPrimary } from "@/ui/components/ui";

/** Nápady — sdílená nástěnka poznámek: postřehy, odkazy, plány mimo klienty. */
export default function IdeasPage() {
  const router = useRouter();
  const list = trpc.ideas.list.useQuery();
  const create = trpc.ideas.create.useMutation({
    onSuccess: (res) => router.push(`/ideas/${res.id}`),
  });

  if (list.isLoading) return <Loading />;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Postřehy, odkazy a plány — sdílené mezi vámi. Autosave, žádné ukládání.</p>
        <button className={btnPrimary} disabled={create.isPending} onClick={() => create.mutate({})}>
          {create.isPending ? "Zakládám…" : "+ Nový nápad"}
        </button>
      </div>

      {!list.data?.length ? (
        <Empty doodle="/doodles/bulb.svg">Zatím žádné nápady — založ první tlačítkem „+ Nový nápad"</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.data.map((i) => (
            <Link key={i.id} href={`/ideas/${i.id}`}>
              <Card className="h-full transition-colors hover:border-accent/40">
                <h3 className="mb-1 truncate font-medium text-ink">{i.title}</h3>
                <p className="line-clamp-3 whitespace-pre-line text-sm text-faint">{i.snippet || "…"}</p>
                <p className="mt-3 text-xs text-faint">{new Date(i.updatedAt).toLocaleString("cs-CZ")}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
