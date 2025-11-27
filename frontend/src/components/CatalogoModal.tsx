/* (chemin : /frontend/src/components/CatalogoModal.tsx) */
"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { StockBadge, computeStockLevel } from "@/components/StockBadge";

type CatalogItem = {
  id: number;
  nome: string;
  categoria: string;
  sottocategoria: string;
  prezzo: number;
  prezzo_s: string;
  scorta: number;
  prenotato: number;
  disponibilita: number;
  unit_label: string;
  is_tecnico?: boolean;
  is_messo?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  dateDa: string;
  dateA: string;
  selectedLuogo?: number;
  onAdd: (row: {
    materiale_id: number;
    nome: string;
    qta: number;
    prezzo: number;
    categoria?: string;
    sottocategoria?: string;
    is_tecnico?: boolean;
    is_messo?: boolean;
  }) => void;
  mezziKmDefault?: number | null;
};

type LiveInfo = {
  scorta: number;
  pren: number;
  disp: number;
};

export default function CatalogoModal({
  open,
  onClose,
  dateDa,
  dateA,
  selectedLuogo,
  onAdd,
  mezziKmDefault,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [term, setTerm] = useState("");
  const [catFilter, setCatFilter] = useState<string>("");
  const [subFilter, setSubFilter] = useState<string>("");
  const [qtyById, setQtyById] = useState<Record<number, number>>({});
  // quantité déjà ajoutée au carrello
  const [extraById, setExtraById] = useState<Record<number, number>>({});
  // valeurs "live" multi-jours renvoyées par /magazzino/bookings
  const [liveById, setLiveById] = useState<Record<number, LiveInfo>>({});

  /* ------------------------------------------------------------------
   *  Listes catégories / sous-catégories
   * ------------------------------------------------------------------ */
  const categorie = useMemo(
    () =>
      Array.from(new Set(items.map((i) => (i.categoria || "—").trim()))).sort(),
    [items]
  );

  const sottocategorie = useMemo(() => {
    const filtered = catFilter
      ? items.filter((i) => (i.categoria || "—").trim() === catFilter)
      : items;
    return Array.from(
      new Set(filtered.map((i) => (i.sottocategoria || "—").trim()))
    ).sort();
  }, [items, catFilter]);

  /* ------------------------------------------------------------------
   *  Fetch catalogue pour la période DA → A
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!open) return;

    let stop = false;
    (async () => {
      setLoading(true);
      try {
        const params: any = {
          term: term || undefined,
          luogo: selectedLuogo || undefined,
          data_da: dateDa,
          data_a: dateA,
          categoria: catFilter || undefined,
          sottocategoria: subFilter || undefined,
        };
        const r = await api.get("/catalogo/search", { params });
        if (stop) return;
        setItems(r.data?.results || []);
        // on remet les caches dynamiques quand on change de période / filtre
        setExtraById({});
        setLiveById({});
      } catch (err) {
        console.error("Errore caricamento catalogo:", err);
        if (!stop) setItems([]);
      } finally {
        if (!stop) setLoading(false);
      }
    })();

    return () => {
      stop = true;
    };
  }, [open, term, catFilter, subFilter, selectedLuogo, dateDa, dateA]);

  /* ------------------------------------------------------------------
   *  Quantité par ligne
   * ------------------------------------------------------------------ */
  function getQty(it: CatalogItem): number {
    const existing = qtyById[it.id];
    if (existing != null) return existing;

    if (mezziKmDefault != null && it.is_messo) {
      const km = Number(mezziKmDefault);
      if (Number.isFinite(km) && km > 0) return km;
    }
    return 1;
  }

  function getQtyForId(id: number): number {
    const it = items.find((x) => x.id === id);
    if (!it) return 1;
    return getQty(it);
  }

  function setQty(id: number, v: number) {
    setQtyById((prev) => ({
      ...prev,
      [id]: Math.max(1, v || 1),
    }));
  }

  function incQty(id: number) {
    setQty(id, getQtyForId(id) + 1);
  }

  function decQty(id: number) {
    setQty(id, Math.max(1, getQtyForId(id) - 1));
  }

  /* ------------------------------------------------------------------
   *  Aggiungi + gestion disponibilité
   * ------------------------------------------------------------------ */
  async function handleAddClick(it: CatalogItem) {
    const requested = getQty(it);
    const isStandard = !it.is_tecnico && !it.is_messo;

    // valeurs de base (catalogo)
    let scorta = Number(it.scorta ?? 0);
    let prenApi = Number(it.prenotato ?? 0);
    let dispApi = Number(it.disponibilita ?? 0);

    // si on a déjà des données "live" multi-jours, on les utilise
    const live0 = liveById[it.id];
    if (live0) {
      scorta = live0.scorta;
      prenApi = live0.pren;
      dispApi = live0.disp;
    }

    // quantité déjà ajoutée dans ce carrello (en plus des autres événements)
    const extra = Number(extraById[it.id] ?? 0);

    // on récupère la vraie dispo sur toute la période [dateDa, dateA]
    if (isStandard) {
      try {
        const r = await api.get("/magazzino/bookings", {
          params: {
            material: it.id,
            from: dateDa,
            to: dateA,
            on: dateDa,
          },
        });

        const sc = Number(r.data?.scorta ?? scorta);
        const pr = Number(r.data?.prenotato ?? prenApi);
        const di =
          r.data?.disponibile != null
            ? Number(r.data.disponibile)
            : Math.max(0, sc - pr);

        scorta = sc;
        prenApi = pr;
        dispApi = di;

        // on mémorise ces valeurs pour l’affichage des colonnes
        setLiveById((prev) => ({
          ...prev,
          [it.id]: { scorta: sc, pren: pr, disp: di },
        }));
      } catch (err) {
        console.error("Errore lettura disponibilità magazzino:", err);
      }
    }

    const prenBefore = prenApi + extra;
    const dispBefore = isStandard ? Math.max(0, dispApi - extra) : requested;

    let toAdd = requested;

    if (isStandard) {
      if (dispBefore <= 0) {
        alert(
          `Il materiale "${it.nome}" non è disponibile nel periodo ` +
            `${dayjs(dateDa).format("DD/MM/YYYY")} → ${dayjs(dateA).format(
              "DD/MM/YYYY"
            )}.\n\n` +
            `Scorta: ${scorta}\n` +
            `Prenotato: ${prenBefore}\n` +
            `Disponibile: 0\n` +
            `Richiesto: ${requested}`
        );
        setQty(it.id, 1);
        return;
      }

      if (requested > dispBefore) {
        toAdd = dispBefore;
      }
    }

    // popup systématique
    alert(
      `Situazione magazzino per "${it.nome}"\n\n` +
        `Scorta: ${scorta}\n` +
        `Prenotato: ${prenBefore}\n` +
        `Disponibile: ${dispBefore}\n` +
        `Richiesto: ${requested}\n` +
        `Aggiunto al carrello: ${
          isStandard ? (toAdd > 0 ? toAdd : 0) : requested
        }`
    );

    if (isStandard && toAdd <= 0) {
      setQty(it.id, 1);
      return;
    }

    const qtaForCart = isStandard ? toAdd : requested;

    onAdd({
      materiale_id: it.id,
      nome: it.nome,
      qta: qtaForCart,
      prezzo: it.prezzo,
      categoria: it.categoria,
      sottocategoria: it.sottocategoria,
      is_tecnico: it.is_tecnico,
      is_messo: it.is_messo,
    });

    setQty(it.id, 1);

    if (isStandard) {
      // on garde en mémoire ce qui est déjà dans le carrello
      setExtraById((prev) => ({
        ...prev,
        [it.id]: (prev[it.id] ?? 0) + qtaForCart,
      }));
    }
  }

  /* ------------------------------------------------------------------
   *  Style de bordure selon le niveau de stock (StockBadge)
   * ------------------------------------------------------------------ */
  function rowBorderClass(scorta: number, disp: number) {
    const level = computeStockLevel(scorta, disp);
    if (level === "danger") return "border-l-4 border-l-red-500";
    if (level === "warn") return "border-l-4 border-l-amber-500";
    return "";
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-none shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold text-lg">Aggiungere dal catalogo</div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border rounded-none text-sm"
          >
            ✕
          </button>
        </div>

        {/* Filtres / recherche */}
        <div className="px-4 py-3 border-b space-y-2">
          <input
            type="text"
            className="w-full border rounded-none px-3 py-2 text-sm"
            placeholder="Cerca articolo..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />

          <div className="flex flex-wrap gap-2 text-sm">
            <select
              className="border rounded-none px-2 py-1"
              value={catFilter}
              onChange={(e) => {
                setCatFilter(e.target.value);
                setSubFilter("");
              }}
            >
              <option value="">Tutte le categorie</option>
              {categorie.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="border rounded-none px-2 py-1"
              value={subFilter}
              onChange={(e) => setSubFilter(e.target.value)}
            >
              <option value="">Tutte le sottocategorie</option>
              {sottocategorie.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-emerald-500 rounded-sm" />
                Disponibile &gt; 3 / &gt; 20%
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-amber-500 rounded-sm" />
                Bassa scorta
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-red-500 rounded-sm" />
                Non disponibile
              </span>
            </div>
          </div>
        </div>

        {/* Liste des articles */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-slate-600">Caricamento…</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-slate-600">
              Nessun articolo trovato.
            </div>
          ) : (
            <ul>
              {items.map((it) => {
                const extra = Number(extraById[it.id] ?? 0);
                const live = liveById[it.id];

                const baseScorta = live ? live.scorta : it.scorta;
                const basePren = live ? live.pren : it.prenotato;
                const baseDisp = live ? live.disp : it.disponibilita;

                const prenDisplay = basePren + extra;
                const disponDisplay = Math.max(0, baseDisp - extra);

                const isStandard = !it.is_tecnico && !it.is_messo;

                return (
                  <li
                    key={it.id}
                    className={
                      "flex items-center gap-3 px-4 py-3 border-b text-sm " +
                      rowBorderClass(baseScorta, disponDisplay)
                    }
                  >
                    <div className="flex-1">
                      <div className="font-semibold">{it.nome}</div>
                      <div className="text-xs text-slate-500">
                        {it.categoria || "—"} → {it.sottocategoria || "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Scorta: {baseScorta} · Prenotato: {prenDisplay} ·
                        Disponibile: {disponDisplay} ·{" "}
                        <StockBadge
                          scorta={baseScorta}
                          dispon={disponDisplay}
                        />
                      </div>
                      {it.is_tecnico && (
                        <div className="inline-block mt-1 text-[10px] px-1 border rounded-none">
                          TECNICO ({it.unit_label})
                        </div>
                      )}
                      {it.is_messo && (
                        <div className="inline-block mt-1 ml-1 text-[10px] px-1 border rounded-none">
                          MEZZO ({it.unit_label})
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 min-w-[150px]">
                      <div className="font-semibold">{it.prezzo_s}</div>

                      {/* Sélecteur de quantité */}
                      <div className="inline-flex items-center border rounded-none">
                        <button
                          type="button"
                          className="px-2 py-1 text-xs"
                          onClick={() => decQty(it.id)}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          className="w-12 text-center border-l border-r text-xs py-1"
                          value={getQty(it)}
                          onChange={(e) =>
                            setQty(it.id, Number(e.target.value || 1))
                          }
                        />
                        <button
                          type="button"
                          className="px-2 py-1 text-xs"
                          onClick={() => incQty(it.id)}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1 text-xs border rounded-none bg-black text-white disabled:opacity-40"
                        disabled={isStandard && disponDisplay <= 0}
                        onClick={() => handleAddClick(it)}
                      >
                        Aggiungi
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex justify-end">
          <button
            type="button"
            className="px-4 py-2 border rounded-none bg-white"
            onClick={onClose}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
