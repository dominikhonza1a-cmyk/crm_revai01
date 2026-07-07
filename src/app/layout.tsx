import type { ReactNode } from "react";

/** Root layout (Next.js App Router to vyžaduje). Vizuální styl doladíme v UI fázi. */
export const metadata = { title: "revai CRM" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
