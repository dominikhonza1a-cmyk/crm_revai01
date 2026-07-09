"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { NewClientModal, NewDealModal } from "@/ui/components/create-modals";
import { SearchPalette } from "@/ui/components/search-palette";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "grid", doodle: "/doodles/chart.png" },
  { href: "/clients", label: "Klienti", icon: "users", doodle: "/doodles/people.svg" },
  { href: "/deals", label: "Obchod", icon: "chart", doodle: "/doodles/handshake.svg" },
  { href: "/projects", label: "Projekty", icon: "folder", doodle: "/doodles/rocket.png" },
  { href: "/tasks", label: "Úkoly", icon: "check", doodle: "/doodles/icon-tasks.png" },
  { href: "/ideas", label: "Nápady", icon: "bulb", doodle: "/doodles/bulb.svg" },
  { href: "/settings", label: "Nastavení", icon: "gear", doodle: "/doodles/gear.svg" },
] as const;

function Icon({ name, className = "" }: { name: string; className?: string }) {
  const p: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
    folder: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
    check: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    bulb: <><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.4c.8.8 1.5 1.6 1.7 2.6h4.6c.2-1 .9-1.8 1.7-2.6A6 6 0 0 0 12 3z" /></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} width="20" height="20">{p[name]}</svg>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [supabase] = useState(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!));
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<null | "client" | "deal">(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd/Ctrl+K → globální hledání
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setEmail(session.user.email ?? null);
      setReady(true);
    });
  }, [router, supabase]);

  function toggle() {
    setCollapsed((c) => { localStorage.setItem("sidebar-collapsed", c ? "0" : "1"); return !c; });
  }
  async function logout() { await supabase.auth.signOut(); router.replace("/login"); }

  if (!ready) return <div className="grid h-screen place-items-center text-faint">Načítám…</div>;

  const active = NAV.find((n) => pathname?.startsWith(n.href));
  const title = active?.label ?? "revai CRM";

  return (
    <div className="flex h-screen bg-bg">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-60"} flex flex-col border-r border-line bg-surface transition-all duration-200`}>
        <div className="flex h-16 items-center gap-2.5 px-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-strong font-display text-lg text-[#08110c]">R</div>
          {!collapsed && <span className="font-display text-xl tracking-wider text-ink">REVAI CRM</span>}
        </div>
        <nav className="flex-1 space-y-1 px-2.5 py-2">
          {NAV.map((n) => {
            const active = pathname?.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} title={n.label}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-accent-soft text-accent" : "text-muted hover:bg-white/5 hover:text-ink"}`}>
                <Icon name={n.icon} className={active ? "text-accent" : "text-faint"} />
                {!collapsed && <span>{n.label}</span>}
              </Link>
            );
          })}
        </nav>
        <button onClick={toggle} className="m-2.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-faint hover:bg-white/5 hover:text-muted" title="Sbalit / rozbalit">
          <Icon name="menu" />
          {!collapsed && <span>Sbalit</span>}
        </button>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface/60 px-6">
          <div className="flex items-center gap-2.5">
            {active?.doodle && <img src={active.doodle} alt="" width={38} height={38} className="pointer-events-none select-none" />}
            <h1 className="font-display text-2xl tracking-wider text-ink">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setSearchOpen(true)} title="Hledat (⌘K)"
              className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-faint transition-colors hover:border-accent/40 hover:text-muted">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
                <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="hidden md:inline">Hledat</span>
              <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[10px] md:inline">⌘K</kbd>
            </button>
            <div className="relative">
              <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-1.5 rounded-xl bg-accent-strong px-3.5 py-2 text-sm font-semibold text-[#08110c] transition-all hover:brightness-110">
                <Icon name="plus" className="h-4 w-4" /> Nový
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl shadow-black/30">
                    <button className="block w-full px-4 py-2 text-left text-sm text-muted hover:bg-white/5 hover:text-ink" onClick={() => { setModal("client"); setMenuOpen(false); }}>Nový klient</button>
                    <button className="block w-full px-4 py-2 text-left text-sm text-muted hover:bg-white/5 hover:text-ink" onClick={() => { setModal("deal"); setMenuOpen(false); }}>Nový deal</button>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="hidden sm:inline">{email}</span>
              <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-xl text-faint hover:bg-white/5 hover:text-ink" title="Odhlásit">
                <Icon name="logout" />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      {modal === "client" && <NewClientModal onClose={() => setModal(null)} />}
      {modal === "deal" && <NewDealModal onClose={() => setModal(null)} />}
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
