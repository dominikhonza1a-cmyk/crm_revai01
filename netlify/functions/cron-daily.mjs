// Cron: denně 5:00 UTC (6:00/7:00 Praha) — recurring tasky retainerů + stale dealy.
export default async () => {
  const res = await fetch(`${process.env.URL}/api/jobs?job=daily`, {
    method: "POST",
    headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
  });
  console.log("cron-daily:", res.status, await res.text());
};

export const config = { schedule: "0 5 * * *" };
