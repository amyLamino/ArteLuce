"use client";

import { useMemo } from "react";

/** Lignes d’un événement / d’un panier */
export type PreventivoRow = {
  materiale_id: number;
  nome: string;
  qta: number;
  prezzo: number;     // PU
  importo: number;    // total de ligne
  categoria?: string | null;
  sottocategoria?: string | null;
};

export default function PreventivoGrouped({
  rows,
  note,
  showNote = true,
  titolo = "PREVENTIVO",
}: {
  rows: PreventivoRow[];
  note?: string | null;
  showNote?: boolean;
  titolo?: string;
}) {
  // Agrège par Categoria → Sottocategoria → Matériel (fusionne les doublons)
  const grouped = useMemo(() => {
    const g: Record<string, Record<string, Record<number, {
      nome: string;
      qt: number;
      pu: number;      // dernier PU vu (on affiche le PU moyen pondéré ci-dessous)
      tot: number;
    }>>> = {};

    for (const r of rows) {
      const cat = (r.categoria || "— Senza categoria —").trim();
      const sub = (r.sottocategoria || "— Senza sottocategoria —").trim();
      g[cat] ||= {};
      g[cat][sub] ||= {};
      const k = r.materiale_id;
      if (!g[cat][sub][k]) {
        g[cat][sub][k] = { nome: r.nome, qt: 0, pu: Number(r.prezzo || 0), tot: 0 };
      }
      g[cat][sub][k].qt  += Number(r.qta || 0);
      g[cat][sub][k].tot += Number(r.importo || r.qta * r.prezzo || 0);
    }

    return g;
  }, [rows]);

  const grandTotal = useMemo(() => {
    let t = 0;
    Object.values(grouped).forEach(bySub =>
      Object.values(bySub).forEach(items =>
        Object.values(items).forEach(it => (t += it.tot))));
    return t;
  }, [grouped]);

  if (!rows?.length) {
    return (
      <div className="border rounded-none bg-white p-3 text-slate-600">
        Nessuna riga nel preventivo.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      {/* Titre */}
      <div className="text-lg font-semibold">{titolo}</div>

      {/* Cartes par Categoria / Sottocategoria */}
      {Object.entries(grouped)
        .sort(([a],[b]) => a.localeCompare(b))
        .map(([cat, bySub]) => (
          <div key={cat} className="bg-white border rounded-none">
            <div className="px-3 py-2 font-semibold">{cat}</div>

            {Object.entries(bySub)
              .sort(([a],[b]) => a.localeCompare(b))
              .map(([sub, itemsMap]) => {
                const items = Object.values(itemsMap);
                const subTotal = items.reduce((s,it)=>s+it.tot,0);

                return (
                  <div key={sub} className="border-t">
                    <div className="px-3 pt-2 text-sm font-medium text-slate-600">{sub}</div>

                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left  px-3 py-2 w-[55%]">Articolo</th>
                          <th className="text-right px-3 py-2">Qtà</th>
                          <th className="text-right px-3 py-2">Prezzo unitario</th>
                          <th className="text-right px-3 py-2">Importo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items
                          .sort((a,b)=>a.nome.localeCompare(b.nome))
                          .map((it, i) => {
                            const puMedio = it.qt ? it.tot / it.qt : it.pu;
                            return (
                              <tr key={i} className="border-t">
                                <td className="px-3 py-2">{it.nome}</td>
                                <td className="px-3 py-2 text-right">{it.qt}</td>
                                <td className="px-3 py-2 text-right">{puMedio.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right">{it.tot.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-slate-50">
                          <td className="px-3 py-2 text-right font-medium" colSpan={3}>Subtotale</td>
                          <td className="px-3 py-2 text-right font-semibold">{subTotal.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })}
          </div>
      ))}

      {/* Total général */}
      <div className="text-right text-base font-semibold">
        Total: {grandTotal.toFixed(2)} €
      </div>

      {/* Bloc NOTE (visible au client) */}
      {showNote && (
        <div className="bg-white border rounded-none p-3">
          <div className="font-semibold mb-1">Note</div>
          {note?.trim() ? (
            <div className="whitespace-pre-wrap text-sm">{note}</div>
          ) : (
            <div className="text-sm text-slate-500">—</div>
          )}
        </div>
      )}
    </section>
  );
}
