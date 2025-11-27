// /frontend/src/app/catalogo/page.tsx (ou équivalent)
"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { api } from "@/lib/api";

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
  const [term, setTerm] = useState("");
  const [day, setDay] = useState(() => dayjs().format("YYYY-MM-DD"));

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Catalogo</h1>

      {/* Barre de recherche + filtre date */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="border rounded-none px-2 py-1 flex-1 min-w-[220px]"
          placeholder="Cerca articolo…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load();
          }}
        />
        <label className="text-sm flex items-center gap-1">
          <span>Data</span>
          <input
            type="date"
            className="border rounded-none px-2 py-1"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="px-3 py-1 border rounded-none"
          onClick={load}
        >
          Cerca
        </button>
      </div>

      {error && (
        <div className="p-3 border bg-rose-50 text-rose-700 rounded-none">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-4 text-sm text-slate-500">Caricamento…</div>
      ) : items.length === 0 ? (
        <div className="p-4 text-sm text-slate-500">
          Nessun articolo trovato.
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cat, bySub]) => (
              <section key={cat} className="border rounded-none bg-white">
                <div className="px-3 py-2 font-semibold bg-slate-100">
                  {cat}
                </div>

                {Object.entries(bySub)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([sub, list]) => (
                    <div key={sub} className="border-t px-3 py-2">
                      <div className="text-sm font-medium text-slate-600 mb-1">
                        {sub}
                      </div>

                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left px-2 py-1">Articolo</th>
                            <th className="text-right px-2 py-1">Scorta</th>
                            <th className="text-right px-2 py-1">
                              Prenotato
                            </th>
                            <th className="text-right px-2 py-1">
                              Disponibile
                            </th>
                            <th className="text-right px-2 py-1">
                              Prezzo base
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {list
                            .slice()
                            .sort((a, b) =>
                              (a.nome || "").localeCompare(b.nome || "")
                            )
                            .map((m) => (
                              <tr key={m.id} className="border-t">
                                <td className="px-2 py-1">
                                  <div className="flex items-center gap-2">
                                    <span>{m.nome}</span>
                                    {m.is_tecnico && (
                                      <span className="text-[10px] px-1 border rounded-none">
                                        TECNICO
                                      </span>
                                    )}
                                    {m.is_messo && (
                                      <span className="text-[10px] px-1 border rounded-none">
                                        MEZZO
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-2 py-1 text-right">
                                  {m.scorta ?? "—"}
                                </td>
                                <td className="px-2 py-1 text-right">
                                  {m.prenotato ?? 0}
                                </td>
                                <td className="px-2 py-1 text-right">
                                  {m.disponibilita ??
                                    (m.scorta != null && m.prenotato != null
                                      ? Math.max(
                                          0,
                                          m.scorta - m.prenotato
                                        )
                                      : "—")}
                                </td>
                                <td className="px-2 py-1 text-right">
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
                  ))}
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
