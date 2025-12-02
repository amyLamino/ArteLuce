/* (chemin : /frontend/src/app/eventi/lista-mensile/page.tsx) */
"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

import {
  getVisualOffertaStato,
  getOffertaDotClass,
  EventoStatus,
} from "@/lib/eventStatus";
import EventStockBadge from "@/components/EventStockBadge";

type MensileItem = EventoStatus & {
  id: number;
  titolo: string;
  data_evento: string;
  data_evento_da?: string | null;
  data_evento_a?: string | null;
  location_index: number;
  cliente_nome?: string;
  stock_tot_scorta?: number | null;
  stock_tot_dispon?: number | null;
};
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter); // optionnel, seulement si utilisé


const OFFERTA_LABEL: Record<string, string> = {
  bozza: "BOZZA",
  da_eseguire: "DA ESEGUIRE",
  inviato: "INVIATO",
  confermato: "CONFERMATO",
  fatturato: "FATTURATO",
  annullato: "ANNULLATO",
  pagato: "PAGATO",
};

const LOCCOLS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

function isCoveredByMulti(ev: MensileItem, dateISO: string): boolean {
  const da = ev.data_evento_da || ev.data_evento;
  const a = ev.data_evento_a || ev.data_evento;
  if (!da || !a) return false;
  if (da === a) return false;
  return dateISO >= da && dateISO <= a && dateISO !== ev.data_evento;
}

export default function ListaMensile() {
  const router = useRouter();
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [rows, setRows] = useState<MensileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const d = dayjs(`${month}-01`);
    setLoading(true);
    setErr(null);
    api
      .get(`/eventi/mese`, { params: { year: d.year(), month: d.month() + 1 } })
      .then((r) => setRows(r.data || []))
      .catch((e) => setErr(e?.message || "Erreur inattendue"))
      .finally(() => setLoading(false));
  }, [month]);

  const days = useMemo(() => {
    const d = dayjs(`${month}-01`);
    const n = d.daysInMonth();
    return Array.from({ length: n }, (_, i) =>
      d.date(i + 1).format("YYYY-MM-DD")
    );
  }, [month]);

  const byKey = useMemo(() => {
    const m = new Map<string, MensileItem>();
    for (const it of rows) m.set(`${it.data_evento}#${it.location_index}`, it);
    return m;
  }, [rows]);

  const coverageMap = useMemo(() => {
    const m = new Map<string, MensileItem[]>();
    for (const ev of rows) {
      const da = ev.data_evento_da || ev.data_evento;
      const a = ev.data_evento_a || ev.data_evento;
      if (!da || !a || da === a) continue;

      let cur = dayjs(da);
      const end = dayjs(a);
      while (cur.isSameOrBefore(end, "day")) {
        const iso = cur.format("YYYY-MM-DD");
        if (iso !== ev.data_evento) {
          const key = `${iso}#${ev.location_index}`;
          const arr = m.get(key) || [];
          arr.push(ev);
          m.set(key, arr);
        }
        cur = cur.add(1, "day");
      }
    }
    return m;
  }, [rows]);

  function shiftMonth(delta: number) {
    const d = dayjs(`${month}-01`).add(delta, "month");
    setMonth(d.format("YYYY-MM"));
  }

  function createOfferta(dateISO: string, loc: number) {
    router.push(`/eventi/offerta-rapida?date=${dateISO}&loc=${loc}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Lista mensile</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="px-2 py-1 border rounded-none"
            onClick={() => shiftMonth(-1)}
            aria-label="Mois précédent"
          >
            ◀
          </button>
          <input
            type="month"
            className="border rounded-none px-2 py-1"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button
            className="px-2 py-1 border rounded-none"
            onClick={() => shiftMonth(1)}
            aria-label="Mois suivant"
          >
            ▶
          </button>
          <Link
            href="/calendario"
            className="px-3 py-2 border rounded-none"
            title="Retour calendrier"
          >
            ← Calendario
          </Link>
        </div>
      </div>

      <div className="text-sm text-slate-500">
        Vue verticale par <b>giorno</b> × <b>8 locations</b>. Cliquez un
        évènement pour ouvrir sa fiche — ou cliquez un <b>slot vide</b> pour
        créer une <i>Offerta</i>. Les jours couverts par un évènement
        multi-giorno sont marqués par une pastille{" "}
        <span className="inline-block w-3 h-3 rounded-full bg-sky-500 align-middle" />.
      </div>

      {err && (
        <div className="p-3 border bg-rose-50 text-rose-700 rounded-none">
          {err}
        </div>
      )}

      <div className="border rounded-none overflow-auto">
        {/* En-tête */}
        <div
          className="grid sticky top-0 z-10"
          style={{ gridTemplateColumns: "140px repeat(8, minmax(160px, 1fr))" }}
        >
          <div className="bg-slate-100 px-2 py-2 font-semibold">Giorno</div>
          {LOCCOLS.map((i) => (
            <div
              key={i}
              className="bg-slate-100 px-2 py-2 font-semibold text-center"
            >
              L{i}
            </div>
          ))}
        </div>

        {/* Lignes (jours) */}
        {loading ? (
          <div className="px-3 py-6 text-sm text-slate-500">Chargement…</div>
        ) : (
          days.map((d) => (
            <div
              key={d}
              className="grid border-t"
              style={{
                gridTemplateColumns: "140px repeat(8, minmax(160px, 1fr))",
              }}
            >
              <div className="px-2 py-2 bg-slate-50">
                {dayjs(d).format("DD ddd")}
              </div>

              {LOCCOLS.map((i) => {
                const key = `${d}#${i}`;
                const ev = byKey.get(key);
                const covered = coverageMap.get(key) || [];

                if (ev) {
                  const visual = getVisualOffertaStato(ev);
                  const label =
                    OFFERTA_LABEL[visual] ?? visual.toUpperCase();
                  const da = ev.data_evento_da || ev.data_evento;
                  const a = ev.data_evento_a || ev.data_evento;
                  const isMulti = !!da && !!a && da !== a;

                  return (
                    <div key={i} className="px-2 py-2 min-h-[56px]">
                      <Link
                        href={`/eventi/${ev.id}`}
                        className="block border rounded-none p-2 hover:bg-slate-50"
                        title={
                          isMulti
                            ? `Evento multi-giorno: ${dayjs(da).format(
                                "DD/MM"
                              )} → ${dayjs(a).format("DD/MM")}`
                            : `Apri evento #${ev.id}`
                        }
                      >
                        <div className="flex items-center gap-2">
                          <span className={getOffertaDotClass(ev)} />
                          <div className="font-medium truncate">
                            L{i} — {ev.titolo}
                          </div>
                        </div>

                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-600 justify-between">
                          <div className="flex items-center gap-2">
                            {ev.cliente_nome ? (
                              <span className="truncate">
                                {ev.cliente_nome}
                              </span>
                            ) : null}
                            <span className="uppercase tracking-wide font-semibold">
                              {label}
                            </span>
                          </div>
                          {isMulti && (
                            <span className="ml-1 inline-flex items-center px-1.5 py-[1px] rounded-full bg-sky-100 text-sky-700 border border-sky-300 text-[9px] font-semibold">
                              {dayjs(da).format("DD/MM")}→
                              {dayjs(a).format("DD/MM")}
                            </span>
                          )}
                        </div>

                        {(ev.stock_tot_scorta != null ||
                          ev.stock_tot_dispon != null) && (
                          <div className="mt-0.5">
                            <EventStockBadge
                              total_scorta={ev.stock_tot_scorta ?? undefined}
                              total_free={ev.stock_tot_dispon ?? undefined}
                              label="Magazzino"
                            />
                          </div>
                        )}
                      </Link>
                    </div>
                  );
                }

                if (covered.length > 0) {
                  return (
                    <div key={i} className="px-2 py-2 min-h-[56px]">
                      {covered.map((evC) => {
                        const da = evC.data_evento_da || evC.data_evento;
                        const a = evC.data_evento_a || evC.data_evento;
                        return (
                          <Link
                            key={evC.id}
                            href={`/eventi/${evC.id}`}
                            className="block border rounded-none p-2 bg-sky-100 hover:bg-sky-200"
                            title={`Evento multi-giorno: ${dayjs(da).format(
                              "DD/MM"
                            )} → ${dayjs(a).format("DD/MM")}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500" />
                              <div className="font-medium truncate text-[12px]">
                                L{i} — {evC.titolo}
                              </div>
                            </div>
                            <div className="mt-0.5 text-[10px] text-slate-700">
                              {dayjs(da).format("DD/MM")} →{" "}
                              {dayjs(a).format("DD/MM")}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <div key={i} className="px-2 py-2 min-h-[56px]">
                    <button
                      type="button"
                      className="w-full h-[52px] border rounded-none text-xs text-slate-500 hover:bg-slate-50"
                      title={`Nuova offerta il ${dayjs(d).format(
                        "DD/MM/YYYY"
                      )} in L${i}`}
                      onClick={() => createOfferta(d, i)}
                    >
                      + Offerta
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-rose-500" />{" "}
          bozza / da eseguire
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-sky-500" />{" "}
          inviato
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-lime-400" />{" "}
          confermato
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-500" />{" "}
          fatturato
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-slate-500" />{" "}
          annullato
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />{" "}
          PAGATO
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-sky-500" />{" "}
          copertura multi-giorno
        </span>
      </div>
    </div>
  );
}
