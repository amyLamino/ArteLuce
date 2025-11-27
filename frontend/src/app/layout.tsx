/* (chemin : /frontend/src/app/layout.tsx) */
import "../styles/globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import AppNav from "@/components/AppNav";

export const metadata: Metadata = {
  title: "ARTE LUCE",
  description: "ARTE LUCE — gestione noleggio eventi: offerte, calendario, magazzino",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="bg-white border-b">
          <AppNav />

          {/* Nav secondaire (sans la page 'Sinottino' / mini dashboard) */}
          <nav className="mx-auto max-w-6xl px-4 py-3 flex gap-4 text-sm">
            {/* supprimé: <Link href="/">Sinottino</Link> */}
            <Link href="/calendario">Calendario</Link>
            <Link href="/eventi/offerta-rapida">Eventi — Offerta rapida</Link>
            <Link href="/magazzino">Magazzino</Link>
            <Link href="/magazzino/sinottico">Magazzino — Sinottico</Link>
            <Link href="/location/sinottico">Location — Sinottico</Link>
            <Link href="/anagrafe" className="px-3 py-2">
              Anagrafe
            </Link>
          </nav>
        </header>

        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
