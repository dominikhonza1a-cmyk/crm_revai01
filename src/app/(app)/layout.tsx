"use client";

import type { ReactNode } from "react";
import { Providers } from "@/ui/providers";
import { AppShell } from "@/ui/layout/app-shell";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <AppShell>{children}</AppShell>
    </Providers>
  );
}
