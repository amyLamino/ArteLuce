/* (chemin : /frontend/src/components/AppNav.tsx) */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/calendario", label: "Calendario" },
  { href: "/eventi/lista-mensile", label: "Lista mensile" },
  { href: "/sinottico", label: "Sinottico" },
  { href: "/magazzino", label: "Magazzino" },
  { href: "/magazzino/sinottico", label: "Magazzino · Sinottico" },
  { href: "/location/sinottico", label: "Location · Sinottico" },
  { href: "/anagrafe", label: "Anagrafe" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="border-t border-brand-accent/40 bg-black/30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-brand-text">
        {/* Liens à gauche */}
        <div className="flex flex-wrap gap-2">
          {links.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "rounded-full px-4 py-1.5 text-[11px] font-medium transition",
                  active
                    ? "bg-brand-accent text-white shadow-md"
                    : "bg-black/60 text-brand-text/80 hover:bg-black",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Zone à droite : utilisateur */}
        <div className="flex items-center gap-2 text-[11px] text-brand-text/70">
          <span className="hidden sm:inline">Utente ARTE LUCE</span>
        </div>
      </div>
    </nav>
  );
}
