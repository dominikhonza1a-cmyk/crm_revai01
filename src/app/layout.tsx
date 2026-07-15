import type { ReactNode } from "react";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
// Titulkový font (nadpisy, KPI čísla, brand) — pro běžný text zůstává Inter kvůli čitelnosti.
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-bebas", display: "swap" });

export const metadata = { title: "revai CRM", description: "Interní CRM pro AI automatizační agenturu" };
export const viewport = { width: "device-width", initialScale: 1, themeColor: "#0b1220" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs" className={`${inter.variable} ${bebas.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
