// Cron: každých 5 minut — SLA eskalace + overdue úkoly + doručení čekajících notifikací.
// Jen zavolá /api/jobs v naší Next aplikaci (URL a CRON_SECRET dodá Netlify env).
export default async () => {
  const res = await fetch(`${process.env.URL}/api/jobs?job=frequent`, {
    method: "POST",
    headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
  });
  console.log("cron-frequent:", res.status, await res.text());
};

export const config = { schedule: "*/5 * * * *" };
