import { redirect } from "next/navigation";

/** Kořen webu → dashboard (nepřihlášené AppShell přesměruje na /login). */
export default function Home() {
  redirect("/dashboard");
}
