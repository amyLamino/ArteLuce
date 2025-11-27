/* (chemin : /frontend/src/components/AppNav.tsx) */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/calendario", label: "Calendario" },
  { href: "/eventi/lista-mensile", label: "Lista Mensile" },
  { href: "/sinottico", label: "Sinottico" },  // <- c'est le “vrai” Sinottico
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="max-w-6xl mx-auto px-4">
      <div className="flex items-center justify-between h-12">
        {/* Logo / nom appli */}
        <Link
          href="/calendario"          // tu peux remettre "/" si tu veux
          className="flex items-baseline gap-2"
        >
          <span className="font-semibold tracking-wide">ARTE LUCE</span>
          <span className="text-[11px] uppercase text-slate-500">
            supporto eventi
          </span>
        </Link>

        {/* Liens de navigation */}
        <div className="flex items-center gap-1">
          {links.map((l) => {
            const active =
              pathname === l.href ||
              (l.href !== "/" && pathname?.startsWith(l.href));

            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  "px-3 py-1.5 border rounded-none text-sm " +
                  (active
                    ? "bg-black text-white"
                    : "hover:bg-slate-50")
                }
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
