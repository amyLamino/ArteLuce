/* /frontend/src/app/location/sinottico/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import Link from "next/link";
import { api } from "@/lib/api";

type Stato = "bozza" | "confermato" | "annullato" | "fatturato";

type BookingCell = {
  date: string;        // "YYYY-MM-DD"
  slot: number;        // location_index
  count: number;       // nb d'événements sur ce slot (normalement 1)
  stato: Stato;
  titolo: string;
  cliente_nome?: string;
  luogo_nome?: string;
};

type LocationCalendarResponse = {
  year: number;
  days: string[];
  slots: number[];           // ex: [1,2,3,4,5,6,7,8]
  bookings: BookingCell[];
};

/** Couleurs par stato :
 *  - bozza / da eseguire : rouge
 *  - confermato         : vert
 *  - fatturato          : orange
 *  - annullato          : gris
 */
const STATO_BG: Record<Stato, string> = {
  bozza: "bg-rose-100",
  confermato: "bg-emerald-100",
  fatturato: "bg-amber-100",
  annullato: "bg-slate-200",
};

export default function LocationSinotticoPage() {
  const [year, setYear] = useState<number>(dayjs().year());
  const [data, setData] = useState<LocationCalendarResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filtre mois (1..12 ou "all")
  const [monthFilter, setMonthFilter] = useState<number | "all">("all");

  // map [date][slot] -> BookingCell
  const map = useMemo(() => {
    const m: Record<string, Record<number, BookingCell>> = {};
    if (!data) return m;
    for (const b of data.bookings) {
      if (!m[b.date]) m[b.date] = {};
      m[b.date][b.slot] = b; // on suppose 1 evento par (date, slot)
    }
    return m;
  }, [data]);

  // chargement des données
  useEffect(() => {
    setLoading(true);
    setErr(null);
    api
      .get("/calendario/location-calendar", { params: { year } })
      .then((r) => setData(r.data as LocationCalendarResponse))
      .catch((e) => {
        console.error("[location sinottico] error:", e);
        setErr(e?.message || "Errore durante il caricamento.");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [year]);

  const allDays = data?.days ?? [];
  const slots = data?.slots ?? [];

  // jours visibles (selon le mois choisi)
  const visibleDays = useMemo(() => {
    if (!allDays.length) return [];
    if (monthFilter === "all") return allDays;
    return allDays.filter((d) => Number(d.slice(5, 7)) === monthFilter);
  }, [allDays, monthFilter]);

  // Totaux par slot sur la période visible
  const totalsPerSlot: Record<number, number> = useMemo(() => {
    const t: Record<number, number> = {};
    for (const d of visibleDays) {
      const dayMap = map[d] || {};
      for (const sStr of Object.keys(dayMap)) {
        const s = Number(sStr);
        const cell = dayMap[s];
        t[s] = (t[s] || 0) + (cell?.count || 0);
      }
    }
    return t;
  }, [visibleDays, map]);

  // classe de fond selon le stato
  function cellBg(cell?: BookingCell) {
    if (!cell || cell.count <= 0) return "bg-white";
    return STATO_BG[cell.stato] || "bg-emerald-100";
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Location — Sinottico annuale</h1>
          <p className="text-xs text-slate-600">
            Prima colonna = data. Ogni colonna dopo = location.
            Colore in base allo stato dell&apos;evento.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/calendario" className="text-sm underline">
            ← Torna al calendario
          </Link>

          <label className="text-sm flex items-center gap-2">
            <span>Anno</span>
            <input
              type="number"
              className="border rounded-none px-2 py-1 w-24"
              value={year}
              onChange={(e) =>
                setYear(Number(e.target.value) || dayjs().year())
              }
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
        <div className="text-sm text-slate-600">Caricamento sinottico location…</div>
      )}

      {/* Tableau transposé : lignes = dates, colonnes = locations */}
      {!loading && data && (
        <div className="border rounded-none bg-white max-h-[70vh] overflow-y-auto">
          <div className="overflow-x-auto">
            <table className="text-[11px] w-full table-fixed border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-20">
                {/* Ligne 1 : noms des locations */}
                <tr>
                  {/* 1ère colonne : Date */}
                  <th className="px-2 py-1 text-left sticky left-0 bg-slate-50 z-30 border border-slate-200 w-20">
                    Data
                  </th>
                  {/* Colonnes L1..Lx */}
                  {slots.map((s) => (
                    <th
                      key={s}
                      className="px-2 py-1 text-center whitespace-nowrap border border-slate-200"
                      title={`Location L${s}`}
                    >
                      L{s}
                    </th>
                  ))}
                </tr>
                {/* Ligne 2 : totaux par location sur la période */}
                <tr>
                  <th className="px-2 py-1 text-left sticky left-0 bg-slate-50 z-30 border border-slate-200 text-[10px] font-semibold w-20">
                    Totale periodo
                  </th>
                  {slots.map((s) => (
                    <th
                      key={s}
                      className="px-2 py-1 text-center border border-slate-200 text-[10px] font-semibold"
                      title={`Totale eventi su L${s} nel periodo selezionato`}
                    >
                      {totalsPerSlot[s] ? totalsPerSlot[s] : "—"}
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
                          colSpan={1 + slots.length}
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
                      const monthLabel = dayjs(d)
                        .format("MMMM")
                        .toUpperCase();

                      rowsJsx.push(
                        <tr key={`month-${d}`} className="bg-slate-100">
                          <td
                            colSpan={1 + slots.length}
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
                        {/* cellule date */}
                        <td className="px-2 py-1 sticky left-0 bg-white z-20 text-left border border-slate-200 text-[11px] w-20">
                          {label}
                        </td>

                        {/* cellules par location */}
                        {slots.map((s) => {
                          const cell = dayMap[s];
                          const count = cell?.count || 0;

                          const title =
                            cell && count > 0
                              ? `${cell.titolo || "Offerta"} • ${
                                  cell.cliente_nome || "—"
                                } • ${cell.luogo_nome || "—"} [${cell.stato}]`
                              : "";

                          return (
                            <td
                              key={s}
                              className={
                                "px-1 py-0.5 text-center align-middle border border-slate-200 " +
                                cellBg(cell)
                              }
                              title={title}
                            >
                              {count > 0 && cell ? (
                                <span className="text-[10px] font-medium block truncate max-w-[140px]">
                                  {cell.titolo || "Evento"}
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
        </div>
      )}

      {/* Légende */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-rose-500" />
          bozza / da eseguire
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />
          confermato
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" />
          fatturato
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-slate-400" />
          annullato
        </span>
      </div>
    </div>
  );
}
