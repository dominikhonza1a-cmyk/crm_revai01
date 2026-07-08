// Cron: denně 6:00 UTC (7:00/8:00 Praha) — denní e-mailový digest.
export default async () => {
  const res = await fetch(`${process.env.URL}/api/jobs?job=digest`, {
    method: "POST",
    headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
  });
  console.log("cron-digest:", res.status, await res.text());
};

export const config = { schedule: "0 6 * * *" };
