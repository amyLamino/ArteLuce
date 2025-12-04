/* chemin : frontend/src/app/login/page.tsx */

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<string>("");

  // Pour éviter l’erreur d’hydration avec new Date()
  useEffect(() => {
    setYear(new Date().getFullYear().toString());
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // IMPORTANT : on utilise bien /auth/login
      const res = await api.post("/auth/login", {
        username,
        password,
      });

      const token: string | undefined = res.data?.token;

      if (token && typeof window !== "undefined") {
        window.localStorage.setItem("authToken", token);
      }

      router.push("/calendario");
    } catch (err) {
      console.error(err);
      setError("Credenziali non valide o errore di connessione.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-bg px-4 text-brand-text">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-brand-accent/40 bg-black/80 shadow-2xl md:grid-cols-2">
        {/* Colonne gauche : branding */}
        <div className="relative hidden flex-col justify-between gap-8 bg-gradient-to-br from-black via-brand-accentDark to-brand-accent md:flex p-8">
          <div className="space-y-4">
            <div className="relative h-14 w-28">
              <Image
                src="/arte-luce-logo.png"
                alt="Arte Luce"
                fill
                className="object-contain drop-shadow-lg"
              />
            </div>
            <h1 className="text-2xl font-semibold">
              Benvenuto nel pannello ARTE LUCE
            </h1>
            <p className="text-sm text-brand-text/80 max-w-xs">
              Pianifica gli eventi, gestisci i clienti e controlla il magazzino
              da un’unica interfaccia pensata per il lavoro quotidiano.
            </p>
          </div>
          <p className="text-xs text-brand-text/70">
            © {year} Arte Luce — accesso riservato allo staff interno.
          </p>
        </div>

        {/* Colonne droite : formulaire */}
        <div className="bg-brand-card/90 p-8 md:p-10">
          <h2 className="mb-1 text-xl font-semibold">Accesso</h2>
          <p className="mb-6 text-xs text-brand-text/60">
            Inserisci le credenziali aziendali per accedere al pannello
            gestionale.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="username">
                Nome utente
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-brand-accent/20 bg-black/40 px-3 py-2 text-sm text-brand-text placeholder:text-brand-text/40 focus:border-brand-accent focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-brand-accent/20 bg-black/40 px-3 py-2 text-sm text-brand-text placeholder:text-brand-text/40 focus:border-brand-accent focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-full bg-brand-accent px-4 py-2 text-sm font-medium text-white shadow-lg shadow-brand-accent/40 transition hover:bg-brand-accentDark disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Accesso in corso..." : "Accedi"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
