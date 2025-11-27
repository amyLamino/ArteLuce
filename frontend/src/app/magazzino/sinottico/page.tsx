"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import Link from "next/link";
import { api } from "@/lib/api";

type MaterialCol = {
  id: number;
  nome: string;
  categoria: string;
  scorta: number;
};

type BookingCell = {
  materiale: number;
  date: string; // "YYYY-MM-DD"
  qta: number;
};

type CalendarResponse = {
  year: number;
  days: string[];
  materials: MaterialCol[];
  bookings: BookingCell[];
};

export default function MagazzinoSinotticoPage() {
  const [year, setYear] = useState<number>(dayjs().year());
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filtre mois (1..12 ou "all")
  const [monthFilter, setMonthFilter] = useState<number | "all">("all");

  const allDays = data?.days ?? [];
  const materials = data?.materials ?? [];

  // map [date][materialeId] -> qta
  const map = useMemo(() => {
    const m: Record<string, Record<number, number>> = {};
    if (!data) return m;
    for (const b of data.bookings) {
      if (!m[b.date]) m[b.date] = {};
      m[b.date][b.materiale] = (m[b.date][b.materiale] || 0) + b.qta;
    }
    return m;
  }, [data]);

  // chargement des données
  useEffect(() => {
    setLoading(true);
    setErr(null);
    api
      .get("/magazzino/calendar", { params: { year } })
      .then((r) => setData(r.data as CalendarResponse))
      .catch((e) => {
        console.error("[magazzino sinottico] error:", e);
        setErr(e?.message || "Errore durante il caricamento.");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [year]);

  // jours visibles (selon le mois choisi)
  const visibleDays = useMemo(() => {
    if (!allDays.length) return [];
    if (monthFilter === "all") return allDays;
    return allDays.filter((d) => Number(d.slice(5, 7)) === monthFilter);
  }, [allDays, monthFilter]);

  // Totaux par produit sur la période visible
  const totalsPerMaterial: Record<number, number> = useMemo(() => {
    const t: Record<number, number> = {};
    for (const d of visibleDays) {
      const dayMap = map[d] || {};
      for (const midStr of Object.keys(dayMap)) {
        const mid = Number(midStr);
        t[mid] = (t[mid] || 0) + (dayMap[mid] || 0);
      }
    }
    return t;
  }, [visibleDays, map]);

  // Couleur cellule :
  // - vert = il y a des pièces occupées mais il reste du stock
  // - rouge = stock complètement pris (qta >= scorta)
  // - blanc = aucune réservation
  function cellBg(qta: number, scorta: number) {
    if (qta <= 0) return "";
    if (scorta > 0 && qta >= scorta) {
      return "bg-rose-100 border-rose-200";
    }
    return "bg-emerald-100 border-emerald-300";
  }

  /** Calcola l'intervallo CONTIGUO di giorni in cui il materiale
   *  ha almeno 1 pezzo prenotato.
   *  Serve solo per il tooltip (dal ... al ...).
   */
  function findCoverageSpan(dateIso: string, matId: number) {
    if (!data) return null;
    const days = allDays;
    const idx = days.indexOf(dateIso);
    if (idx === -1) return null;

    let start = idx;
    while (start > 0 && (map[days[start - 1]]?.[matId] || 0) > 0) {
      start -= 1;
    }

    let end = idx;
    while (end + 1 < days.length && (map[days[end + 1]]?.[matId] || 0) > 0) {
      end += 1;
    }

    return { from: days[start], to: days[end] };
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Magazzino — Sinottico annuale</h1>
          <p className="text-xs text-slate-600">
            Prima colonna = data. Ogni colonna dopo = prodotto. Ogni cella mostra quante
            unità del prodotto sono prenotate in quel giorno.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/magazzino" className="text-sm underline">
            ← Torna al magazzino
          </Link>

          <label className="text-sm flex items-center gap-2">
            <span>Anno</span>
            <input
              type="number"
              className="border rounded-none px-2 py-1 w-24"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || dayjs().year())}
            />
          </label>

          <label className="text-sm flex items-center gap-2">
            <span>Mese</span>
            <select
              className="border rounded-none px-2 py-1"
              value={monthFilter === "all" ? "all" : String(monthFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setMonthFilter(v === "all" ? "all" : Number(v));
              }}
            >
              <option value="all">Tutto l&apos;anno</option>
              <option value="1">Gennaio</option>
              <option value="2">Febbraio</option>
              <option value="3">Marzo</option>
              <option value="4">Aprile</option>
              <option value="5">Maggio</option>
              <option value="6">Giugno</option>
              <option value="7">Luglio</option>
              <option value="8">Agosto</option>
              <option value="9">Settembre</option>
              <option value="10">Ottobre</option>
              <option value="11">Novembre</option>
              <option value="12">Dicembre</option>
            </select>
          </label>
        </div>
      </div>

      {err && (
        <div className="border bg-rose-50 text-rose-700 text-sm px-3 py-2 rounded-none">
          {err}
        </div>
      )}

      {loading && (
        <div className="text-sm text-slate-600">Caricamento sinottico…</div>
      )}

      {/* Tableau transposé : lignes = dates, colonnes = materiali */}
      {!loading && data && (
        <div className="border rounded-none bg-white overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="text-[11px] min-w-max border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-20">
              {/* Ligne 1 : nom des produits */}
              <tr>
                {/* 1ère colonne : Date */}
                <th className="px-2 py-1 text-left sticky left-0 bg-slate-50 z-30 border border-slate-200">
                  Data
                </th>
                {/* Colonnes produits */}
                {materials.map((m) => (
                  <th
                    key={m.id}
                    className="px-2 py-1 text-center whitespace-nowrap border border-slate-200"
                    title={`${m.categoria || ""} • Scorta: ${m.scorta}`}
                  >
                    {m.nome}
                  </th>
                ))}
              </tr>
              {/* Ligne 2 : totaux par produit */}
              <tr>
                <th className="px-2 py-1 text-left sticky left-0 bg-slate-50 z-30 border border-slate-200 text-[10px] font-semibold">
                  Totale periodo
                </th>
                {materials.map((m) => (
                  <th
                    key={m.id}
                    className="px-2 py-1 text-center border border-slate-200 text-[10px] font-semibold"
                    title={`Totale ${m.nome} nel periodo selezionato`}
                  >
                    {totalsPerMaterial[m.id] ? totalsPerMaterial[m.id] : "—"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                if (!visibleDays.length) {
                  return (
                    <tr>
                      <td
                        colSpan={1 + materials.length}
                        className="px-3 py-3 text-center text-slate-500 border border-slate-200"
                      >
                        Nessun giorno da mostrare.
                      </td>
                    </tr>
                  );
                }

                const rowsJsx: JSX.Element[] = [];
                let lastMonth = -1;

                for (const d of visibleDays) {
                  const currentMonth = dayjs(d).month(); // 0..11

                  // Séparateur de mois quand on affiche toute l'année
                  if (monthFilter === "all" && currentMonth !== lastMonth) {
                    lastMonth = currentMonth;
                    const monthLabel = dayjs(d).format("MMMM").toUpperCase();

                    rowsJsx.push(
                      <tr key={`month-${d}`} className="bg-slate-100">
                        <td
                          colSpan={1 + materials.length}
                          className="px-2 py-1 text-xs font-semibold text-slate-700 border-t border-b border-slate-300"
                        >
                          {monthLabel} {year}
                        </td>
                      </tr>
                    );
                  }

                  const dayMap = map[d] || {};
                  const label =
                    monthFilter === "all"
                      ? dayjs(d).format("DD")
                      : dayjs(d).format("DD/MM");

                  rowsJsx.push(
                    <tr key={d} className="border-t">
                      {/* cellule date à gauche */}
                      <td className="px-2 py-1 sticky left-0 bg-white z-20 text-left border border-slate-200 text-[11px]">
                        {label}
                      </td>

                      {/* cellules de qta pour chaque produit */}
                      {materials.map((m) => {
                        const qta = dayMap[m.id] || 0;
                        const hasBooking = qta > 0;
                        const bg = cellBg(qta, m.scorta);

                        let tooltip = "";
                        if (hasBooking) {
                          const span = findCoverageSpan(d, m.id);
                          const base = `${m.nome} — ${qta} pezzi prenotati su ${m.scorta}`;
                          if (span && span.from !== span.to) {
                            tooltip = `${base} dal ${dayjs(span.from).format(
                              "DD/MM/YYYY"
                            )} al ${dayjs(span.to).format("DD/MM/YYYY")}`;
                          } else {
                            tooltip = `${base} il ${dayjs(d).format("DD/MM/YYYY")}`;
                          }
                        }

                        return (
                          <td
                            key={m.id}
                            className={
                              "px-1 py-0.5 text-center align-middle border border-slate-200 " +
                              (hasBooking ? bg : "")
                            }
                            title={tooltip}
                          >
                            {hasBooking ? (
                              <span className="text-[11px] font-medium">
                                {qta}/{m.scorta}
                              </span>
                            ) : (
                              ""
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }

                return rowsJsx;
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* Légende détaillée */}
      <div className="space-y-2 text-[11px] text-slate-600">
        <p>
          Ogni cella mostra il numero di pezzi <b>prenotati / scorta</b> per quel
          materiale in quella data. Esempio: <b>3/6</b> = 3 pezzi occupati, 3 ancora
          disponibili.
        </p>

        <div className="flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300" />
            Giorno in cui almeno 1 pezzo è prenotato (il numero nella cella = pezzi
            occupati, ma non tutta la scorta).
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm bg-rose-100 border border-rose-200" />
            Giorno in cui la scorta è completamente occupata
            (<b>prenotato = scorta</b>): il materiale <u>non è più disponibile</u> per
            altri eventi in quel giorno.
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm bg-white border border-slate-300" />
            Nessuna prenotazione: tutta la scorta è disponibile.
          </span>
        </div>

        <p className="italic">
          Più celle colorate consecutive in verticale per lo stesso prodotto indicano un
          evento che copre più giorni (copertura &gt; 1 giorno). Il tooltip mostra il
          periodo completo <b>dal / al</b>.
        </p>
      </div>
    </div>
  );
}
