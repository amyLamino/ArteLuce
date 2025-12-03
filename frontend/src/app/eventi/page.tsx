/* chemin : /frontend/src/app/eventi/page.tsx */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";

type Stato = "bozza" | "confermato" | "annullato" | "fatturato";

type Evento = {
  id: number;
  titolo: string;
  data_evento: string;
  data_evento_da?: string | null;
  data_evento_a?: string | null;
  location_index: number;
  stato: Stato;
  cliente_nome?: string;
};

export default function EventiIndex() {
  const router = useRouter();

  const [events, setEvents] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /* Protection: si pas loggé → /login */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
      }
    }
  }, [router]);

  /* Chargement liste événements */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);

    api
      .get("/eventi/")
      .then((r) => {
        if (cancelled) return;
        const data = Array.isArray(r.data)
          ? r.data
          : r.data?.results || [];
        setEvents(data as Evento[]);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e?.message || "Errore di caricamento");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell title="Eventi">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-100">
              Eventi
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Elenco sintetico degli eventi con accesso rapido al dettaglio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/calendario"
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs md:text-sm text-slate-800 bg-white hover:bg-slate-50"
            >
              Calendario →
            </Link>
            <Link
              href="/eventi/offerta-rapida"
              className="px-3 py-1.5 rounded-xl text-xs md:text-sm bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Nuova offerta rapida
            </Link>
          </div>
        </div>

        {err && (
          <div className="p-3 border border-rose-200 bg-rose-50 text-rose-700 rounded-2xl text-sm">
            {err}
          </div>
        )}
        {/* Tableau des événements */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-800">
              Eventi ({events.length})
            </div>
            {loading && (
              <div className="text-xs text-slate-400">Caricamento…</div>
            )}
          </div>

          <div className="max-h-[500px] overflow-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-slate-900/85 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-200">
                    Data
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-slate-200">
                    Titolo
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-slate-200">
                    Cliente
                  </th>
                  <th className="text-center px-3 py-2 font-medium text-slate-200">
                    Loc
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-slate-200">
                    Stato
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-slate-200">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const da = ev.data_evento_da || ev.data_evento;
                  const a = ev.data_evento_a || ev.data_evento;
                  const isMulti = !!da && !!a && da !== a;

                  return (
                    <tr
                      key={ev.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-3 py-2 text-slate-800">
                        {dayjs(ev.data_evento).format("DD/MM/YYYY")}
                      </td>
                      <td className="px-3 py-2 text-slate-900">
                        <Link
                          href={`/eventi/${ev.id}`}
                          className="hover:underline text-emerald-700"
                        >
                          {ev.titolo}
                        </Link>
                        {isMulti && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-[1px] rounded-full bg-sky-100 text-sky-700 border border-sky-300 text-[10px] font-semibold">
                            {dayjs(da).format("DD/MM")} →{" "}
                            {dayjs(a).format("DD/MM")}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {ev.cliente_nome || "—"}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-700">
                        L{ev.location_index}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {ev.stato}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/eventi/${ev.id}`}
                          className="px-2 py-1 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 hover:bg-slate-100"
                        >
                          Apri
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {events.length === 0 && !loading && (
                  <tr>
                    <td
                      className="px-3 py-4 text-slate-500 italic text-center"
                      colSpan={6}
                    >
                      Nessun evento trovato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
