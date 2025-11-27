/* /frontend/src/components/CatalogoSelector.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { api } from "@/lib/api";

/* ---------- Types ---------- */
type Mat = {
  id: number;
  nome: string;
  prezzo_base: number | string;
  categoria?: string | null;
  sottocategoria?: string | null;
  is_tecnico?: boolean;
  is_messo?: boolean;
  scorta: number;
};

type LiveCell = {
  prenotato: number;
  disponibilita: number;
  status: "ok" | "warn" | "ko";
};

type Props = {
  onAdd: (row: {
    materiale_id: number;
    nome: string;
    qta: number;
    prezzo: number;
    is_tecnico?: boolean;
    is_messo?: boolean;
  }) => void;

  /** date de début de l’événement (YYYY-MM-DD) */
  dateValue?: string;

  /** nb de jours de couverture (1 = 1 jour, 2 = 2 jours, etc.) */
  coperturaGiorni?: number;

  /* filtres externes (comme avant) */
  catFilter?: string;
  subFilter?: string;
  onChangeFilters?: (cat: string, sub: string) => void;

  /* distance A/R du luogo pour auto km (mezzi) */
  defaultKmFromLuogo?: number;

  /* tarifications de base locales */
  defaultEuroKm?: number;   // ex: 1.2 €/km
  defaultEuroOra?: number;  // ex: 30 €/h
};

/* ---------- Component ---------- */
export default function CatalogoSelector(props: Props) {
  const {
    dateValue,
    coperturaGiorni = 1,
    catFilter = "",
    subFilter = "",
    onChangeFilters,
    defaultKmFromLuogo = 0,
    defaultEuroKm = 1.2,
    defaultEuroOra = 30,
  } = props;

  const [data, setData] = useState<Mat[]>([]);
  const [q, setQ] = useState("");

  /* quantités / km / heures / tarifs par produit */
  const [qtyPiece, setQtyPiece] = useState<Record<number, number>>({});
  const [nKm, setNKm] = useState<Record<number, number>>({});
  const [eurKm, setEurKm] = useState<Record<number, number>>({});
  const [nOre, setNOre] = useState<Record<number, number>>({});
  const [eurOra, setEurOra] = useState<Record<number, number>>({});

  const [live, setLive] = useState<Record<number, LiveCell>>({});

  /* ------------ Chargement du magazzino ------------ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await api
        .get("/materiali/")
        .catch(() => ({ data: [] as Mat[] }));
      const list: Mat[] = (r.data || []) as Mat[];
      if (cancelled) return;

      setData(list);

      // initialise les états seulement s'ils n'existent pas
      setQtyPiece((prev) => {
        const next = { ...prev };
        for (const m of list) if (next[m.id] == null) next[m.id] = 1;
        return next;
      });
      setNKm((prev) => {
        const next = { ...prev };
        for (const m of list)
          if (next[m.id] == null) next[m.id] = defaultKmFromLuogo || 0;
        return next;
      });
      setEurKm((prev) => {
        const next = { ...prev };
        for (const m of list)
          if (next[m.id] == null) next[m.id] = defaultEuroKm;
        return next;
      });
      setNOre((prev) => {
        const next = { ...prev };
        for (const m of list) if (next[m.id] == null) next[m.id] = 1;
        return next;
      });
      setEurOra((prev) => {
        const next = { ...prev };
        for (const m of list)
          if (next[m.id] == null) next[m.id] = defaultEuroOra;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [defaultKmFromLuogo, defaultEuroKm, defaultEuroOra]);

  /* quand le luogo change → pré-remplir km des mezzi */
  useEffect(() => {
    if (!data.length) return;
    setNKm((prev) => {
      const next = { ...prev };
      for (const m of data) {
        if (
          m.is_messo &&
          (prev[m.id] ?? 0) === 0 &&
          defaultKmFromLuogo > 0
        ) {
          next[m.id] = defaultKmFromLuogo;
        }
      }
      return next;
    });
  }, [defaultKmFromLuogo, data]);

  /* ------------ Disponibilité live multi-jour ------------ */
  useEffect(() => {
    if (!dateValue || !data.length) {
      setLive({});
      return;
    }

    const giorni = Math.max(1, Number(coperturaGiorni || 1));

    const from = dateValue;
    const to = dayjs(dateValue)
      .add(giorni - 1, "day")
      .format("YYYY-MM-DD");

    const ids = data.map((d) => d.id).join(",");

    api
      .get(`/magazzino/status`, {
        params: { from, to, materials: ids },
      })
      .then((r) => {
        const map: Record<number, LiveCell> = {};
        for (const m of r.data?.materials || []) {
          const by = Array.isArray(m.by_day) ? m.by_day : [];

          if (!by.length) {
            map[m.id] = {
              prenotato: 0,
              disponibilita: Number(m.stock ?? 0),
              status: "ok",
            };
            continue;
          }

          // max de "used" sur la période
          const maxUsed = by.reduce(
            (acc: number, d: any) =>
              Math.max(acc, Number(d.used || 0)),
            0
          );

          // min de "free" sur la période (le jour le plus critique)
          const minFree = by.reduce(
            (acc: number, d: any) =>
              Math.min(
                acc,
                Number(
                  d.free ??
                    m.stock ??
                    0
                )
              ),
            Number(m.stock ?? 0)
          );

          const status: LiveCell["status"] =
            minFree > 0
              ? "ok"
              : Number(m.stock || 0) > 0 && minFree === 0
              ? "warn"
              : "ko";

          map[m.id] = {
            prenotato: maxUsed,
            disponibilita: Math.max(0, minFree),
            status,
          };
        }
        setLive(map);
      })
      .catch(() => setLive({}));
  }, [data, dateValue, coperturaGiorni]);

  /* ------------ Filtres & groupes ------------ */
  const cats = useMemo(() => {
    return Array.from(
      new Set(
        data
          .map((d) => (d.categoria ?? "").trim())
          .filter(Boolean)
      )
    ).sort();
  }, [data]);

  const subs = useMemo(() => {
    const normCat = (catFilter || "").trim();
    return Array.from(
      new Set(
        data
          .filter(
            (d) =>
              !normCat ||
              (d.categoria ?? "").trim() === normCat
          )
          .map((d) => (d.sottocategoria ?? "").trim())
          .filter(Boolean)
      )
    ).sort();
  }, [data, catFilter]);

  const filtered = useMemo(() => {
    return data
      .filter((m) => {
        const normCat = (catFilter || "").trim().toLowerCase();
        const normSub = (subFilter || "").trim().toLowerCase();
        const term = (q || "").trim().toLowerCase();

        const okCat =
          !normCat ||
          (m.categoria ?? "").trim().toLowerCase() === normCat;
        const okSub =
          !normSub ||
          (m.sottocategoria ?? "")
            .trim()
            .toLowerCase() === normSub;
        const okQ =
          !term ||
          (m.nome || "")
            .toLowerCase()
            .includes(term);
        return okCat, okSub, okQ;
      })
      .sort(
        (a, b) =>
          (a.sottocategoria || "").localeCompare(
            b.sottocategoria || ""
          ) || a.nome.localeCompare(b.nome)
      );
  }, [data, q, catFilter, subFilter]);

  const grouped = useMemo(() => {
    const g: Record<string, Mat[]> = {};
    for (const m of filtered) {
      const k = m.sottocategoria || "— Senza sottocategoria —";
      (g[k] ||= []).push(m);
    }
    return g;
  }, [filtered]);

  /* ------------ Vérification disponibilité (booking multi-jour) ------------ */
  async function ensureAvailability(
    materiale_id: number,
    want: number
  ): Promise<boolean> {
    if (!dateValue) return true;

    const giorni = Math.max(1, Number(coperturaGiorni || 1));
    const from = dateValue;
    const to = dayjs(dateValue)
      .add(giorni - 1, "day")
      .format("YYYY-MM-DD");

    try {
      const r = await api.get("/magazzino/bookings", {
        params: {
          material: materiale_id,
          from,
          to,
          on: dateValue,
        },
      });

      // backend magazzino/bookings retourne "disponibile"
      const disp = Math.max(
        0,
        Number(r.data?.disponibile ?? r.data?.scorta ?? 0)
      );

      if (want > disp) {
        alert(
          `Disponibili ${disp} pezzo/i tra il ${dayjs(from).format(
            "DD/MM"
          )} e il ${dayjs(to).format(
            "DD/MM"
          )}. Riduci la quantità oppure verifica lo stock.`
        );
        return false;
      }
      return true;
    } catch {
      // en cas d’erreur backend, on ne bloque pas
      return true;
    }
  }

  /* ------------ Ajout d’un article ------------ */
  async function addOne(m: Mat) {
    const isMezzo = !!m.is_messo;
    const isTec = !!m.is_tecnico;

    const _qta = isMezzo
      ? Math.max(0, Number(nKm[m.id] ?? 0))
      : isTec
      ? Math.max(0, Number(nOre[m.id] ?? 0))
      : Math.max(1, Number(qtyPiece[m.id] ?? 1));

    const _prezzo = isMezzo
      ? Number(eurKm[m.id] ?? defaultEuroKm)
      : isTec
      ? Number(eurOra[m.id] ?? defaultEuroOra)
      : Number(m.prezzo_base || 0);

    // pour la vérif de disponibilité:
    // - mezzi/tecnici : 1 “pezzo”
    // - materiali : la quantité demandée
    const ok = await ensureAvailability(
      m.id,
      isMezzo || isTec ? 1 : _qta
    );
    if (!ok) return;

    props.onAdd({
      materiale_id: m.id,
      nome: m.nome,
      qta: _qta,
      prezzo: _prezzo,
      is_tecnico: isTec,
      is_messo: isMezzo,
    });
  }

  /* ------------ Ligne du tableau ------------ */
  function Row({ m }: { m: Mat }) {
    const liveRow = live[m.id];
    const pren =
      liveRow?.prenotato ??
      0;
    const disp =
      liveRow?.disponibilita ??
      Math.max(
        0,
        Number(m.scorta || 0) -
          (liveRow?.prenotato ?? 0)
      );

    const dotClass =
      liveRow?.status === "ko"
        ? "bg-rose-500"
        : liveRow?.status === "warn"
        ? "bg-amber-400"
        : "bg-emerald-500";

    const isMezzo = !!m.is_messo;
    const isTec = !!m.is_tecnico;

    return (
      <tr className="border-t align-middle">
        <td className="px-2 py-1">
          {m.categoria || "—"}
        </td>
        <td className="px-2 py-1">
          {m.sottocategoria || "—"}
        </td>
        <td className="px-2 py-1">
          {m.nome}
          {isTec ? (
            <span className="ml-2 text-[10px] border px-1">
              tecnico
            </span>
          ) : null}
          {isMezzo ? (
            <span className="ml-2 text-[10px] border px-1">
              messo
            </span>
          ) : null}
        </td>

        {/* Colonnes dynamiques */}
        {isMezzo ? (
          <>
            <td className="px-2 py-1 text-right">
              <input
                type="number"
                min={0}
                step="0.1"
                className="border rounded-none w-20 text-right px-1"
                value={nKm[m.id] ?? 0}
                onChange={(e) =>
                  setNKm((prev) => ({
                    ...prev,
                    [m.id]: Math.max(
                      0,
                      Number(e.target.value) || 0
                    ),
                  }))
                }
              />
            </td>
            <td className="px-2 py-1 text-right">
              <input
                type="number"
                min={0}
                step="0.01"
                className="border rounded-none w-20 text-right px-1"
                value={eurKm[m.id] ?? defaultEuroKm}
                onChange={(e) =>
                  setEurKm((prev) => ({
                    ...prev,
                    [m.id]: Math.max(
                      0,
                      Number(e.target.value) || 0
                    ),
                  }))
                }
              />
            </td>
            <td className="px-2 py-1 text-right font-semibold">
              {(
                ((nKm[m.id] ?? 0) *
                  (eurKm[m.id] ?? defaultEuroKm)) ||
                0
              ).toFixed(2)}{" "}
              €
            </td>
          </>
        ) : isTec ? (
          <>
            <td className="px-2 py-1 text-right">
              <input
                type="number"
                min={0}
                step="0.5"
                className="border rounded-none w-20 text-right px-1"
                value={nOre[m.id] ?? 1}
                onChange={(e) =>
                  setNOre((prev) => ({
                    ...prev,
                    [m.id]: Math.max(
                      0,
                      Number(e.target.value) || 0
                    ),
                  }))
                }
              />
            </td>
            <td className="px-2 py-1 text-right">
              <input
                type="number"
                min={0}
                step="0.5"
                className="border rounded-none w-20 text-right px-1"
                value={
                  eurOra[m.id] ?? defaultEuroOra
                }
                onChange={(e) =>
                  setEurOra((prev) => ({
                    ...prev,
                    [m.id]: Math.max(
                      0,
                      Number(e.target.value) || 0
                    ),
                  }))
                }
              />
            </td>
            <td className="px-2 py-1 text-right font-semibold">
              {(
                ((nOre[m.id] ?? 0) *
                  (eurOra[m.id] ?? defaultEuroOra)) ||
                0
              ).toFixed(2)}{" "}
              €
            </td>
          </>
        ) : (
          <>
            <td className="px-2 py-1 text-right">
              <input
                type="number"
                min={1}
                className="border rounded-none w-16 text-right px-1"
                value={qtyPiece[m.id] ?? 1}
                onChange={(e) =>
                  setQtyPiece((prev) => ({
                    ...prev,
                    [m.id]: Math.max(
                      1,
                      Number(e.target.value) || 1
                    ),
                  }))
                }
              />
            </td>
            <td className="px-2 py-1 text-right">
              {Number(
                m.prezzo_base || 0
              ).toFixed(2)}
            </td>
            <td className="px-2 py-1 text-right font-semibold">
              {(
                (Number(m.prezzo_base || 0) *
                  (qtyPiece[m.id] ?? 1)) ||
                0
              ).toFixed(2)}{" "}
              €
            </td>
          </>
        )}

        <td className="px-2 py-1 text-right">
          {m.scorta}
        </td>
        <td className="px-2 py-1 text-right">
          {pren}
        </td>
        <td className="px-2 py-1 text-right">
          <span className="inline-flex items-center gap-2 text-xs">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${dotClass}`}
            />
            {disp}
          </span>
        </td>
        <td className="px-2 py-1">
          <button
            className="px-2 py-1 border rounded-none text-xs"
            onClick={() => addOne(m)}
          >
            Aggiungi
          </button>
        </td>
      </tr>
    );
  }

  return (
    <div className="border rounded-none bg-white">
      {/* Filtres */}
      <div className="px-3 py-2 flex flex-wrap items-center gap-2 bg-slate-50">
        <select
          className="border rounded-none px-2 py-1"
          value={catFilter}
          onChange={(e) =>
            onChangeFilters?.(e.target.value, "")
          }
        >
          <option value="">
            Categoria (tutte)
          </option>
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="border rounded-none px-2 py-1"
          value={subFilter}
          onChange={(e) =>
            onChangeFilters?.(catFilter, e.target.value)
          }
        >
          <option value="">
            Sottocategoria (tutte)
          </option>
          {subs.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          className="border rounded-none px-2 py-1 flex-1 min-w-[200px]"
          placeholder="Cerca nel magazzino…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {dateValue ? (
          <div className="ml-auto text-xs text-slate-600">
            Disponibilità dal{" "}
            <b>
              {dayjs(dateValue).format(
                "DD/MM/YYYY"
              )}
            </b>{" "}
            per{" "}
            <b>
              {Math.max(
                1,
                Number(
                  coperturaGiorni || 1
                )
              )}{" "}
              giorno/i
            </b>
          </div>
        ) : null}
      </div>

      {/* Liste groupée */}
      {Object.entries(grouped)
        .sort(([a], [b]) =>
          a.localeCompare(b)
        )
        .map(([subKey, items]) => (
          <section key={subKey}>
            <div className="px-3 py-2 font-semibold bg-slate-100">
              {subKey}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-2 py-1">
                    Categoria
                  </th>
                  <th className="text-left px-2 py-1">
                    Sottocategoria
                  </th>
                  <th className="text-left px-2 py-1">
                    Articolo
                  </th>

                  <th className="text-right px-2 py-1">
                    Qtà / Km / Ore
                  </th>
                  <th className="text-right px-2 py-1">
                    Prezzo (€/pz / €/km / €/ora)
                  </th>
                  <th className="text-right px-2 py-1">
                    Importo
                  </th>

                  <th className="text-right px-2 py-1">
                    Scorta
                  </th>
                  <th className="text-right px-2 py-1">
                    Prenotato
                  </th>
                  <th className="text-right px-2 py-1">
                    Disponibilità
                  </th>
                  <th className="text-left px-2 py-1">
                    Azione
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <Row key={m.id} m={m} />
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td
                      className="px-2 py-3 text-slate-500"
                      colSpan={10}
                    >
                      Nessun articolo.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        ))}
    </div>
  );
}
