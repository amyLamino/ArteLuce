/* chemin : /frontend/src/app/page.tsx */

import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-brand-accent/30 bg-gradient-to-br from-black via-brand-card to-brand-accentDark/70 shadow-2xl">
          {/* bande diagonale rouge pour rappeler le logo */}
          <div className="pointer-events-none absolute -left-20 top-0 h-40 w-72 rotate-[-30deg] bg-brand-accent/70 blur-sm" />

          <div className="relative grid gap-8 p-8 md:grid-cols-[1.2fr,1fr] md:p-10">
            {/* Colonne texte principale */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-accent/50 bg-black/60 px-3 py-1 text-xs text-brand-text/80">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-accent" />
                Pannello gestionale · ARTE LUCE
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Gestisci eventi, offerte e magazzino in un’unica interfaccia.
                </h1>
                <p className="text-sm text-brand-text/70 md:text-base">
                  Accedi al pannello per controllare il calendario delle date,
                  generare preventivi, organizzare la logistica e tenere sotto
                  controllo il magazzino di materiale tecnico.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-brand-accent px-5 py-2 text-sm font-medium text-white shadow-lg shadow-brand-accent/40 transition hover:bg-brand-accentDark"
                >
                  Accedi al pannello
                </Link>

                <span className="text-xs text-brand-text/60">
                  Usa le credenziali aziendali.
                  In caso di problemi contatta l&apos;amministratore.
                </span>
              </div>
            </div>

            {/* Colonne droite : logo + infos rapides */}
            <div className="flex flex-col justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-28">
                  <Image
                    src="/arte-luce-logo.png"
                    alt="Arte Luce"
                    fill
                    className="object-contain drop-shadow-lg"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-[0.3em] text-brand-text/80">
                    ARTE LUCE
                  </p>
                  <p className="text-xs text-brand-text/60">
                    Supporto eventi · Noleggio luci e strutture
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl bg-black/40 p-4 text-xs text-brand-text/70">
                <p className="font-medium text-brand-text/80">
                  Cosa puoi fare dal pannello:
                </p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Visualizzare il calendario completo degli eventi</li>
                  <li>Creare e aggiornare offerte e preventivi</li>
                  <li>Gestire magazzino, location e anagrafiche</li>
                </ul>
                <p className="text-[11px] text-brand-text/50">
                  © {new Date().getFullYear()} Arte Luce — uso interno.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
