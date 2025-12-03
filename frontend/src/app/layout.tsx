/* (chemin : /frontend/src/app/layout.tsx) */
import "../styles/globals.css";
import type { Metadata } from "next";
import Image from "next/image";
import AppNav from "@/components/AppNav";

export const metadata: Metadata = {
  title: "ARTE LUCE",
  description:
    "ARTE LUCE — gestione noleggio eventi: offerte, calendario, magazzino",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {/* BLOC HEADER GLOBAL (dégradé noir/rouge) */}
        <div className="mx-auto max-w-6xl px-3 pt-3">
          <header className="overflow-hidden rounded-3xl border border-brand-accent/40 bg-gradient-to-r from-black via-brand-bg to-brand-accentDark shadow-lg">
            {/* Ligne logo + textes du haut */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2 text-brand-text">
              {/* Logo + titre */}
              <div className="flex items-center gap-4">
                <div className="relative h-10 w-32">
                  <Image
                    src="/arte-luce-logo.png" // (chemin : /frontend/public/arte-luce-logo.png)
                    alt="ARTE LUCE"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold tracking-[0.25em] text-brand-text">
                    ARTE LUCE
                  </span>
                  <span className="text-[11px] text-brand-text/80">
                    Supporto eventi · Noleggio
                  </span>
                </div>
              </div>

              {/* Texte à droite comme sur ton écran */}
              <div className="text-right text-[11px] leading-tight text-brand-text/80">
                <div>Console gestionale</div>
                <div>Offerte · Calendario · Magazzino</div>
              </div>
            </div>

            {/* Barre de navigation avec pastilles */}
            <AppNav />
          </header>
        </div>

        {/* CONTENU DES PAGES (clair) */}
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
