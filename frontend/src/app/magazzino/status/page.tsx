"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import Link from "next/link";

type MatDay = { date: string; used: number; free: number; status: "ok" | "warn" | "ko" };
type MatRow = { id: number; nome: string; stock: number; by_day: MatDay[] };

type StatusPayload = {
  days: string[];
  materials: MatRow[];
};

/** Riga singola dell'elenco eventi ritornato da /magazzino/bookings */
type BookingRow = {
  evento_id: number;
  titolo: string;
  stato?: string;
  cliente?: string | null;
  data_evento_da: string;
  data_evento_a: string;
  qta: number;
  location_index?: number;
};

/** Payload completo di /magazzino/bookings */
type BookingsPayload = {
  materiale: number;
  scorta: number;
  prenotato: number;
  prenotato_max: number;
  disponibile: number;
  per_day: Record<string, number>; // "YYYY-MM-DD" -> qta
  rows: BookingRow[];
};

export default function MagazzinoStatusPage() {
  const [dateValue, setDateValue] = useState(dayjs().format("YYYY-MM-DD"));
  const [rows, setRows] = useState<MatRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selMat, setSelMat] = useState<MatRow | null>(null);
  const [bookings, setBookings] = useState<BookingsPayload | null>(null);
  const [bLoading, setBLoading] = useState(false);

  // Carica lo snapshot del giorno (Prenotato / Disponibilità)
  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/magazzino/status?from=${dateValue}&to=${dateValue}`)
      .then((r) => setRows((r.data as StatusPayload).materials || []))
      .catch((e) => setError(e?.message || "Errore inatteso"))
      .finally(() => setLoading(false));
  }, [dateValue]);

  // Filtra per testo
  const filt = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((m) => m.nome.toLowerCase().includes(q));
  }, [rows, search]);

  // Helpers sul singolo giorno (from=to ⇒ by_day[0])
  function prenotatoOf(m: MatRow): number {
    return m.by_day.length ? m.by_day[0].used : 0;
  }
  function liberoOf(m: MatRow): number {
    return m.by_day.length ? m.by_day[0].free : m.stock;
  }
  function statusOf(m: MatRow): MatDay["status"] {
    return m.by_day.length ? m.by_day[0].status : "ok";
  }

  /** Apri popup prenotazioni per il materiale selezionato.
   *
   *  Si chiede a /magazzino/bookings l'intero MESE della data selezionata,
   *  così tutti i giorni coperti da eventi multi-giorno compaiono in per_day.
   */
  function openBookings(m: MatRow) {
    setSelMat(m);
    setBookings(null);
    setBLoading(true);

    const center = dayjs(dateValue);
    const from = center.startOf("month").format("YYYY-MM-DD");
    const to = center.endOf("month").format("YYYY-MM-DD");

    api
      .get("/magazzino/bookings", {
        params: {
          material: m.id,
          from,
          to,
          on: dateValue, // giorno selezionato per il campo "prenotato"
        },
      })
      .then((r) => {
        setBookings(r.data as BookingsPayload);
      })
      .catch((e) => {
        console.error("errore bookings:", e);
      })
      .finally(() => setBLoading(false));
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Disponibilità magazzino</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            className="border rounded-none px-2 py-1"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            aria-label="Seleziona data"
          />
          <input
            placeholder="Cerca un materiale…"
            className="border rounded-none px-2 py-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Link href="/magazzino" className="px-3 py-2 border rounded-none">
            ← Torna al magazzino
          </Link>
        </div>
      </div>

      <div className="text-sm text-slate-600">
        Seleziona una data per vedere, per ciascun materiale: <b>Prenotato</b> (quantità
        impegnata quel giorno) e <b>Disponibilità</b> (stock libero). Clicca una riga per
        vedere quali offerte occupano lo stock.
      </div>

      {error ? (
        <div className="p-3 border bg-rose-50 text-rose-700 rounded-none">{error}</div>
      ) : null}

      <div className="border rounded-none overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="text-left px-2 py-2 w-[60px]">ID</th>
              <th className="text-left px-2 py-2">Articolo</th>
              <th className="text-right px-2 py-2 w-[120px]">Scorta</th>
              <th className="text-right px-2 py-2 w-[140px]">Prenotato</th>
              <th className="text-right px-2 py-2 w-[160px]">Disponibilità</th>
              <th className="text-left px-2 py-2 w-[80px]">Stato</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-2 py-3 text-slate-500" colSpan={6}>
                  Caricamento…
                </td>
              </tr>
            ) : filt.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-slate-500" colSpan={6}>
                  Nessun risultato.
                </td>
              </tr>
            ) : (
              filt.map((m) => {
                const pren = prenotatoOf(m);
                const libre = liberoOf(m);
                const st = statusOf(m);
                const dot =
                  st === "ok"
                    ? "bg-emerald-500"
                    : st === "warn"
                    ? "bg-amber-400"
                    : "bg-rose-500";
                return (
                  <tr
                    key={m.id}
                    className="border-t hover:bg-slate-50 cursor-pointer"
                    onClick={() => openBookings(m)}
                    title="Vedi le offerte che impegnano questo materiale"
                  >
                    <td className="px-2 py-2">{m.id}</td>
                    <td className="px-2 py-2">{m.nome}</td>
                    <td className="px-2 py-2 text-right">{m.stock}</td>
                    <td className="px-2 py-2 text-right">{pren}</td>
                    <td className="px-2 py-2 text-right">{libre}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-block w-3 h-3 rounded-sm ${dot}`} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Dettaglio prenotazioni per la data selezionata */}
      {selMat ? (
        <div className="border rounded-none bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">
              Prenotazioni —{" "}
              <span className="text-slate-600">
                {selMat.nome}
              </span>{" "}
              ({dayjs(dateValue).format("DD/MM/YYYY")})
            </div>
            <button className="px-2 py-1 border rounded-none" onClick={() => setSelMat(null)}>
              Chiudi
            </button>
          </div>

          {bLoading ? (
            <div className="mt-2 text-sm text-slate-500">Caricamento…</div>
          ) : !bookings ? (
            <div className="mt-2 text-sm text-slate-500">
              Nessuna informazione disponibile per questo materiale.
            </div>
          ) : (
            <>
              {/* Riepilogo per il giorno selezionato */}
              <div className="mt-2 text-sm">
                <span className="font-semibold">Scorta:</span> {bookings.scorta} •{" "}
                <span className="font-semibold">Prenotato il giorno selezionato:</span>{" "}
                {bookings.prenotato} •{" "}
                <span className="font-semibold">Disponibile:</span>{" "}
                {bookings.disponibile}
              </div>

              {/* Tabella per giorno (tutti i giorni coperti nel mese) */}
              <div className="mt-3 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-2 py-1">Data</th>
                      <th className="text-right px-2 py-1">Prenotato</th>
                      <th className="text-right px-2 py-1">Disponibile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(bookings.per_day)
                      .sort(([d1], [d2]) => d1.localeCompare(d2))
                      .map(([iso, q]) => {
                        const free = Math.max(0, bookings.scorta - q);
                        return (
                          <tr key={iso} className="border-t">
                            <td className="px-2 py-1">
                              {dayjs(iso).format("DD/MM/YYYY")}
                              {iso === dateValue ? " (giorno selezionato)" : ""}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {q} / {bookings.scorta}
                            </td>
                            <td className="px-2 py-1 text-right">{free}</td>
                          </tr>
                        );
                      })}
                    {Object.keys(bookings.per_day).length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-2 py-2 text-slate-500 text-sm"
                        >
                          Nessuna prenotazione nel periodo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Elenco eventi che impegnano questo materiale */}
              <div className="mt-4">
                <div className="font-semibold mb-1 text-sm">
                  Eventi che impegnano questo materiale nel periodo
                </div>
                {bookings.rows.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    Nessuna offerta trova nel periodo.
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-2 py-1">Offerta</th>
                          <th className="text-left px-2 py-1">Cliente</th>
                          <th className="text-left px-2 py-1">Dal</th>
                          <th className="text-left px-2 py-1">Al</th>
                          <th className="text-right px-2 py-1">Qtà/giorno</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.rows.map((b) => (
                          <tr key={b.evento_id} className="border-t">
                            <td className="px-2 py-1">
                              <Link href={`/eventi/${b.evento_id}`} className="underline">
                                #{b.evento_id} — {b.titolo}
                              </Link>
                            </td>
                            <td className="px-2 py-1">{b.cliente || "—"}</td>
                            <td className="px-2 py-1">
                              {dayjs(b.data_evento_da).format("DD/MM/YYYY")}
                            </td>
                            <td className="px-2 py-1">
                              {dayjs(b.data_evento_a).format("DD/MM/YYYY")}
                            </td>
                            <td className="px-2 py-1 text-right">{b.qta}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-2 text-xs text-slate-500">
                Nota: la quantità indicata è <b>per giorno</b> sull&apos;intervallo
                coperto dall&apos;evento.
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* Legenda stato */}
      <div className="flex items-center gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" /> OK (stock
          libero)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" /> Saturato (0
          libero)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-rose-500" /> KO (nessuna
          scorta)
        </span>
      </div>
    </div>
  );
}
