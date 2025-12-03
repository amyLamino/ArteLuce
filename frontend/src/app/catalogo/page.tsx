/* chemin : /frontend/src/app/catalogo/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";

type CatalogItem = {
  id: number;
  nome: string;
  categoria?: string | null;
  sottocategoria?: string | null;
  scorta?: number;
  prenotato?: number;
  disponibilita?: number;
  prezzo?: number;
  prezzo_s?: string;
  is_tecnico?: boolean;
  is_messo?: boolean;
};

export default function CatalogoPage() {
  const router = useRouter();

  const [term, setTerm] = useState("");
  const [day, setDay] = useState(() => dayjs().format("YYYY-MM-DD"));

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Protection: redirect login si pas de token */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
      }
    }
  }, [router]);

  // charge le catalogue via l’API /catalogo/search
  // en passant la date → backend peut calculer Prenotato / Disponibile
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get("/catalogo/search", {
        params: {
          term: term || undefined,
          data: day || undefined, // 👈 date utilisée pour PRENOTATO / DISPONIBILE
        },
      });
      setItems(r.data?.results || []);
    } catch (e: any) {
      setError(e?.message || "Errore imprevisto");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // première charge + rechargement quand la date change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  // regroupement par categoria / sottocategoria
  const grouped = useMemo(() => {
    const g: Record<string, Record<string, CatalogItem[]>> = {};
    for (const m of items) {
      const cat = (m.categoria || "— Senza categoria —").trim();
      const sub = (m.sottocategoria || "— Senza sottocategoria —").trim();
      if (!g[cat]) g[cat] = {};
      if (!g[cat][sub]) g[cat][sub] = [];
      g[cat][sub].push(m);
    }
    return g;
  }, [items]);

  return (
    <AppShell title="Catalogo materiali">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-100">
              Catalogo
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Ricerca rapida di materiali, tecnici e mezzi con disponibilità
              alla data selezionata.
            </p>
          </div>

          {/* Barre de recherche + filtre date */}
          <div className="flex flex-wrap gap-2 items-center bg-white/95 border border-slate-200 rounded-2xl px-3 py-2 shadow-sm">
            <input
              className="border border-slate-300 rounded-xl px-2 py-1 text-sm text-slate-800 flex-1 min-w-[220px]"
              placeholder="Cerca articolo…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load();
              }}
            />
            <label className="text-xs md:text-sm flex items-center gap-1 text-slate-700">
              <span>Data</span>
              <input
                type="date"
                className="border border-slate-300 rounded-xl px-2 py-1 text-sm text-slate-800"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs md:text-sm bg-white text-slate-800 hover:bg-slate-50"
              onClick={load}
            >
              Cerca
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 border border-rose-200 bg-rose-50 text-rose-700 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-4 text-sm text-slate-400">Caricamento…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 text-sm text-slate-500">
            Nessun articolo trovato.
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([cat, bySub]) => (
                <section
                  key={cat}
                  className="rounded-2xl bg-white border border-slate-200 shadow-sm"
                >
                  <div className="px-4 py-2 font-semibold bg-slate-50 text-slate-800 border-b border-slate-200">
                    {cat}
                  </div>

                  {Object.entries(bySub)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([sub, list]) => (
                      <div key={sub} className="border-t border-slate-100 px-4 py-3">
                        <div className="text-sm font-medium text-slate-700 mb-2">
                          {sub}
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-xs md:text-sm">
                            <thead className="bg-slate-900/85">
                              <tr>
                                <th className="text-left px-2 py-2 font-medium text-slate-200">
                                  Articolo
                                </th>
                                <th className="text-right px-2 py-2 font-medium text-slate-200">
                                  Scorta
                                </th>
                                <th className="text-right px-2 py-2 font-medium text-slate-200">
                                  Prenotato
                                </th>
                                <th className="text-right px-2 py-2 font-medium text-slate-200">
                                  Disponibile
                                </th>
                                <th className="text-right px-2 py-2 font-medium text-slate-200">
                                  Prezzo base
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {list
                                .slice()
                                .sort((a, b) =>
                                  (a.nome || "").localeCompare(b.nome || ""),
                                )
                                .map((m) => (
                                  <tr
                                    key={m.id}
                                    className="border-t border-slate-200 hover:bg-slate-50"
                                  >
                                    <td className="px-2 py-1.5">
                                      <div className="flex items-center gap-2 text-slate-900">
                                        <span>{m.nome}</span>
                                        {m.is_tecnico && (
                                          <span className="text-[10px] px-1 border border-slate-300 rounded-md text-slate-700">
                                            TECNICO
                                          </span>
                                        )}
                                        {m.is_messo && (
                                          <span className="text-[10px] px-1 border border-slate-300 rounded-md text-slate-700">
                                            MEZZO
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-2 py-1.5 text-right text-slate-800">
                                      {m.scorta ?? "—"}
                                    </td>
                                    <td className="px-2 py-1.5 text-right text-slate-800">
                                      {m.prenotato ?? 0}
                                    </td>
                                    <td className="px-2 py-1.5 text-right text-slate-800">
                                      {m.disponibilita ??
                                        (m.scorta != null && m.prenotato != null
                                          ? Math.max(
                                              0,
                                              (m.scorta || 0) -
                                                (m.prenotato || 0),
                                            )
                                          : "—")}
                                    </td>
                                    <td className="px-2 py-1.5 text-right text-slate-900">
                                      {m.prezzo_s ??
                                        (m.prezzo != null
                                          ? `${m.prezzo.toFixed(2)} €`
                                          : "—")}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                </section>
              ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
