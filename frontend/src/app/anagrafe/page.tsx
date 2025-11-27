/* /frontend/src/app/anagrafe/page.tsx */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast, Toast } from "@/components/Toast";
import { usePersistentState, useScrollRestoration } from "@/hooks/usePersistent";

type Tab = "clienti" | "luoghi" | "tecnici" | "mezzi";

// Types très souples pour ne pas casser TypeScript si le backend change un peu
type BaseRow = {
  id: number;
  nome?: string;
  [key: string]: any;
};

function labelForTab(t: Tab) {
  if (t === "clienti") return "Clienti";
  if (t === "luoghi") return "Luoghi";
  if (t === "tecnici") return "Tecnici";
  return "Mezzi";
}

export default function AnagrafePage() {
  useScrollRestoration("scroll:anagrafe");

  const [tab, setTab] = usePersistentState<Tab>("anagrafe:tab", "clienti");
  const [rows, setRows] = useState<BaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const { msg, setMsg } = useToast();

  // charge les données quand l’onglet change
  useEffect(() => {
    load(tab);
  }, [tab]);

  async function load(t: Tab) {
    setLoading(true);
    try {
      const endpoint =
        t === "clienti"
          ? "/clienti/"
          : t === "luoghi"
          ? "/luoghi/"
          : t === "tecnici"
          ? "/tecnici/"
          : "/mezzi/";

      const r = await api.get(endpoint, { params: { _t: Date.now() } });
      const raw = Array.isArray(r.data?.results) ? r.data.results : r.data;
      const list: BaseRow[] = Array.isArray(raw) ? raw : [];
      setRows(list);
    } catch (e) {
      console.error("[anagrafe] errore load:", e);
      setRows([]);
      setMsg("Errore durante il caricamento dei dati.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Anagrafe</h1>
        <Link href="/sinottico" className="text-sm underline">
          ← Torna al sinottico
        </Link>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b pb-2">
        {(["clienti", "luoghi", "tecnici", "mezzi"] as Tab[]).map((t) => (
          <button
            key={t}
            className={
              "px-3 py-2 text-sm border-b-2 " +
              (tab === t ? "border-black font-semibold" : "border-transparent text-slate-500")
            }
            onClick={() => setTab(t)}
          >
            {labelForTab(t)}
          </button>
        ))}
      </div>

      {/* Info chargement */}
      {loading && (
        <div className="text-sm text-slate-600">Caricamento {labelForTab(tab).toLowerCase()}…</div>
      )}

      {/* Tableau simple pour chaque type */}
      {!loading && rows.length === 0 && (
        <div className="text-sm text-slate-500">
          Nessun elemento trovato per {labelForTab(tab).toLowerCase()}.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <section className="bg-white border rounded-none">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              {tab === "clienti" && (
                <tr>
                  <th className="px-2 py-1 text-left">ID</th>
                  <th className="px-2 py-1 text-left">Nome</th>
                  <th className="px-2 py-1 text-left">Email</th>
                  <th className="px-2 py-1 text-left">Telefono</th>
                </tr>
              )}
              {tab === "luoghi" && (
                <tr>
                <th className="px-2 py-1 text-left">ID</th>
                <th className="px-2 py-1 text-left">Nome</th>
                <th className="px-2 py-1 text-left">Indirizzo</th>
                <th className="px-2 py-1 text-left">Città</th>
                <th className="px-2 py-1 text-right">Distanza A/R (km)</th>
              </tr>
              )}
              {tab === "tecnici" && (
                <tr>
                  <th className="px-2 py-1 text-left">ID</th>
                  <th className="px-2 py-1 text-left">Nome</th>
                  <th className="px-2 py-1 text-left">Ruolo</th>
                  <th className="px-2 py-1 text-left">Telefono</th>
                </tr>
              )}
              {tab === "mezzi" && (
                <tr>
                  <th className="px-2 py-1 text-left">ID</th>
                  <th className="px-2 py-1 text-left">Targa / Nome</th>
                  <th className="px-2 py-1 text-right">€/km</th>
                  <th className="px-2 py-1 text-right">€/ora</th>
                </tr>
              )}
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  {tab === "clienti" && (
                    <>
                      <td className="px-2 py-1">{r.id}</td>
                      <td className="px-2 py-1">{r.nome || r.ragione_sociale || "—"}</td>
                      <td className="px-2 py-1">{r.email || "—"}</td>
                      <td className="px-2 py-1">{r.telefono || r.cell || "—"}</td>
                    </>
                  )}
                  {tab === "luoghi" && (
                  <>
                    <td className="px-2 py-1">{r.id}</td>
                    <td className="px-2 py-1">{r.nome || "—"}</td>
                    <td className="px-2 py-1">
                      {r.indirizzo || r.via || "—"}
                    </td>
                    <td className="px-2 py-1">
                      {r.citta || r.cap_citta || "—"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {r.distanza_km_ar != null
                        ? Number(r.distanza_km_ar).toFixed(1)
                        : r.distanza_km != null
                        ? Number(r.distanza_km).toFixed(1)
                        : "—"}
                    </td>
                  </>
                )}

                  {tab === "tecnici" && (
                    <>
                      <td className="px-2 py-1">{r.id}</td>
                      <td className="px-2 py-1">{r.nome || "—"}</td>
                      <td className="px-2 py-1">{r.ruolo || r.note || "—"}</td>
                      <td className="px-2 py-1">{r.telefono || r.cell || "—"}</td>
                    </>
                  )}
                  {tab === "mezzi" && (
                    <>
                      <td className="px-2 py-1">{r.id}</td>
                      <td className="px-2 py-1">{r.nome || r.targa || "—"}</td>
                      <td className="px-2 py-1 text-right">
                        {r.prezzo_km != null ? `${Number(r.prezzo_km).toFixed(2)} €` : "—"}
                      </td>
                      <td className="px-2 py-1 text-right">
                        {r.prezzo_ora != null ? `${Number(r.prezzo_ora).toFixed(2)} €` : "—"}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Toast msg={msg} />
    </div>
  );
}
