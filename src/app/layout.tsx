import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

export const metadata = { title: "revai CRM", description: "Interní CRM pro AI automatizační agenturu" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
