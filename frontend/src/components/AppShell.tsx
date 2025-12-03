/* chemin : /frontend/src/components/layout/AppShell.tsx */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type AppShellProps = {
  title: string;
  children: ReactNode;
};

const NAV_ITEMS = [
  { href: "/sinottico", label: "Sinottico" },
  { href: "/eventi", label: "Eventi" },
  { href: "/calendario", label: "Calendario" },
  { href: "/magazzino", label: "Magazzino" },
  { href: "/catalogo", label: "Catalogo" },
];

export function AppShell({ title, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      {/* SIDEBAR : claire, avec accent rouge */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 px-6 py-6 gap-6 shadow-sm">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
            ARTE LUCE
          </div>
          <div className="text-base font-semibold text-slate-900">
            Pannello eventi
          </div>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition",
                  active
                    ? "bg-brand-accent text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full",
                    active ? "bg-white" : "bg-slate-300",
                  ].join(" ")}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto text-[11px] text-slate-500">
          © {new Date().getFullYear()} Arte Luce
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur flex items-center justify-between px-4 md:px-8">
          <h1 className="text-sm md:text-base font-semibold text-slate-900">
            {title}
          </h1>

          <div className="flex items-center gap-3 text-[11px] md:text-xs text-slate-500">
            <span>Utente loggato</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </header>

        {/* Zone de contenu */}
        <main className="flex-1 px-4 md:px-8 py-4 md:py-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
