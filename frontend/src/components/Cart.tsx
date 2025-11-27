/* /frontend/src/components/Cart.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";

export type CartRow = {
  materiale_id: number;
  nome: string;
  qta: number;
  prezzo: number;             // prezzo unitario
  importo?: number;           // calcolato se mancante = qta * prezzo
  categoria?: string;
  sottocategoria?: string;
  is_tecnico?: boolean;
  is_trasporto?: boolean;
  // pour compatibilité avec d’autres parties du code (mezzi = trasporto)
  is_messo?: boolean;
};

type Groups = Record<string, CartRow[]>;

const LS_KEY_ROWS = "cart:rows";
const LS_KEY_NOTES = "cart:notes";

/* --------------------- Hook carrello (local, persistant) -------------------- */
export function useCart() {
  const [rows, setRows] = useState<CartRow[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY_ROWS) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY_ROWS, JSON.stringify(rows));
  }, [rows]);

  function add(row: CartRow) {
    setRows((prev) => {
      // fusion par materiale_id (même article) → additionne les quantités
      const idx = prev.findIndex((r) => r.materiale_id === row.materiale_id);
      if (idx >= 0) {
        const next = [...prev];
        const merged = { ...next[idx] };
        const extraQ = Number(row.qta || 0);
        merged.qta =
          Number(merged.qta || 0) + (isFinite(extraQ) ? extraQ : 0);
        merged.prezzo = Number(merged.prezzo);
        merged.importo = merged.qta * merged.prezzo;

        // conserve catégorie/sottocategoria si manquantes
        if (!merged.categoria && row.categoria)
          merged.categoria = row.categoria;
        if (!merged.sottocategoria && row.sottocategoria)
          merged.sottocategoria = row.sottocategoria;

        // garde les flags tecnico / mezzi / trasporto si présents
        if (row.is_tecnico != null) merged.is_tecnico = row.is_tecnico;
        if (row.is_trasporto != null) merged.is_trasporto = row.is_trasporto;
        if (row.is_messo != null) merged.is_messo = row.is_messo;

        next[idx] = merged;
        return next;
      }

      const q = Number(row.qta || 0);
      const p = Number(row.prezzo || 0);
      return [...prev, { ...row, qta: q, prezzo: p, importo: q * p }];
    });
  }

  function remove(materiale_id: number) {
    setRows((prev) => prev.filter((r) => r.materiale_id !== materiale_id));
  }

  function updateQty(materiale_id: number, newQta: number) {
    setRows((prev) =>
      prev.map((r) =>
        r.materiale_id === materiale_id
          ? {
              ...r,
              qta: newQta,
              importo: Number(newQta) * Number(r.prezzo),
            }
          : r
      )
    );
  }

  function clear() {
    setRows([]);
  }

  const total = rows.reduce(
    (s, r) => s + Number(r.importo ?? r.qta * r.prezzo),
    0
  );

  return { rows, add, remove, updateQty, clear, total };
}

/* ------------------------------- Cart groupé ------------------------------- */

function eur(n: number) {
  return (Number(n) || 0).toFixed(2);
}

export function CartView({
  rows,
  onRemove,
  onQtyChange,
}: {
  rows: CartRow[];
  onRemove: (materiale_id: number) => void;
  onQtyChange?: (materiale_id: number, newQta: number) => void;
}) {
  // groupement par Categoria (clé vide → "— Senza categoria —")
  const groups: Groups = useMemo(() => {
    const g: Groups = {};
    for (const r of rows) {
      const k = (r.categoria || "— Senza categoria —").trim();
      (g[k] ||= []).push(r);
    }
    // tri interne par sottocategoria puis nome
    for (const k of Object.keys(g)) {
      g[k].sort(
        (a, b) =>
          (a.sottocategoria || "").localeCompare(b.sottocategoria || "") ||
          a.nome.localeCompare(b.nome)
      );
    }
    return g;
  }, [rows]);

  const grandTotal = useMemo(
    () =>
      rows.reduce(
        (s, r) => s + Number(r.importo ?? r.qta * r.prezzo),
        0
      ),
    [rows]
  );

  // notes par catégorie (persistées)
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY_NOTES) || "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem(LS_KEY_NOTES, JSON.stringify(notes));
  }, [notes]);

  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([cat, list]) => {
        const subtotal = list.reduce(
          (s, r) => s + Number(r.importo ?? r.qta * r.prezzo),
          0
        );

        return (
          <section key={cat} className="border rounded-none bg-white">
            <div className="px-3 py-2 flex items-center justify-between bg-slate-100">
              <div className="font-semibold">{cat}</div>
              <div className="text-sm">
                Subtotale: <b>{eur(subtotal)} €</b>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-2 py-1 w-48">Sottocategoria</th>
                  <th className="text-left px-2 py-1">Articolo</th>
                  <th className="text-right px-2 py-1 w-32">
                    Qtà
                    <div className="text-[10px] text-slate-400">
                      pz / ore / km
                    </div>
                  </th>
                  <th className="text-right px-2 py-1 w-32">
                    Prezzo unitario
                    <div className="text-[10px] text-slate-400">
                      €/pz / €/ora / €/km
                    </div>
                  </th>
                  <th className="text-right px-2 py-1 w-28">Importo</th>
                  <th className="text-right px-2 py-1 w-24">Azione</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => {
                  const isMezzo = r.is_trasporto || r.is_messo;
                  const unitLabel = r.is_tecnico
                    ? "ore"
                    : isMezzo
                    ? "km"
                    : "pz";

                  return (
                    <tr
                      key={cat + ":" + r.materiale_id + ":" + i}
                      className="border-t"
                    >
                      <td className="px-2 py-1">
                        {r.sottocategoria || "—"}
                      </td>

                      <td className="px-2 py-1">
                        {r.nome}
                        {r.is_tecnico && (
                          <span className="ml-2 text-[10px] px-1 border rounded-none">
                            tecnico
                          </span>
                        )}
                        {isMezzo && (
                          <span className="ml-2 text-[10px] px-1 border rounded-none">
                            mezzo
                          </span>
                        )}
                      </td>

                      {/* Qtà avec boutons - / + + label unité */}
                      <td className="px-2 py-1 text-right">
                        {onQtyChange ? (
                          <>
                            <div className="inline-flex items-center border rounded-none">
                              <button
                                type="button"
                                className="px-2 py-1 text-xs"
                                onClick={() =>
                                  onQtyChange(
                                    r.materiale_id,
                                    Math.max(1, r.qta - 1)
                                  )
                                }
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={1}
                                className="w-12 text-center border-l border-r text-xs py-1"
                                value={r.qta}
                                onChange={(e) =>
                                  onQtyChange(
                                    r.materiale_id,
                                    Math.max(
                                      1,
                                      Number(e.target.value || 1)
                                    )
                                  )
                                }
                              />
                              <button
                                type="button"
                                className="px-2 py-1 text-xs"
                                onClick={() =>
                                  onQtyChange(r.materiale_id, r.qta + 1)
                                }
                              >
                                +
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {unitLabel}
                            </div>
                          </>
                        ) : (
                          <>
                            {r.qta}
                            <div className="text-[10px] text-slate-500">
                              {unitLabel}
                            </div>
                          </>
                        )}
                      </td>

                      {/* Prix unitaire */}
                      <td className="px-2 py-1 text-right">
                        {eur(r.prezzo)} €
                      </td>

                      {/* Importo */}
                      <td className="px-2 py-1 text-right">
                        {eur(r.importo ?? r.qta * r.prezzo)} €
                      </td>

                      {/* Action */}
                      <td className="px-2 py-1 text-right">
                        <button
                          className="px-2 py-1 border rounded-none"
                          onClick={() => onRemove(r.materiale_id)}
                        >
                          Rimuovi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Note della categoria */}
            <div className="p-3 border-t">
              <label className="text-xs text-slate-600">
                Note ({cat})
              </label>
              <textarea
                className="mt-1 w-full border rounded-none px-2 py-1"
                rows={3}
                placeholder="Aggiungi una nota per questa categoria…"
                value={notes[cat] || ""}
                onChange={(e) =>
                  setNotes((prev) => ({
                    ...prev,
                    [cat]: e.target.value,
                  }))
                }
              />
            </div>
          </section>
        );
      })}

      <div className="text-right font-semibold">
        Totale: {eur(grandTotal)} €
      </div>
    </div>
  );
}
