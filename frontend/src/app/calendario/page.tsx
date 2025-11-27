/* (chemin : /frontend/src/app/calendario/page.tsx) */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import Link from "next/link";
import { api } from "@/lib/api";
import { usePersistentState } from "@/hooks/usePersistent";
import { getCalendarBadges } from "@/lib/eventStatus";

type Stato = "bozza" | "confermato" | "annullato" | "fatturato";
type OffertaStato = "da_eseguire" | "inviato" | "annullato";
type PayState = "none" | "to_send" | "sent" | "paid";

type MensileItem = {
  id: number;
  titolo: string;
  data_evento: string;         // jour de début
  data_evento_da?: string | null;
  data_evento_a?: string | null;
  location_index: number;
  stato: Stato;
  cliente_nome?: string;
  offerta_stato?: OffertaStato;
  saldo_state?: PayState;
};

const STATO_COLORS: Record<Stato, string> = {
  bozza: "bg-rose-500",
  confermato: "bg-emerald-500",
  annullato: "bg-slate-400",
  fatturato: "bg-orange-400",
};

function EventoBadge({ e }: { e: MensileItem }) {
  const b = getCalendarBadges({
    stato: e.stato,
    offerta_stato: e.offerta_stato,
    saldo_state: e.saldo_state,
  } as any);

  if (b.type === "paid") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px]">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" />
        <span className="font-semibold text-emerald-700">{b.label}</span>
      </span>
    );
  }

  if (b.type === "doppio") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px]">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500" />
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-500" />
        <span className="font-semibold text-rose-700">{b.label}</span>
      </span>
    );
  }

  const color = STATO_COLORS[e.stato] ?? "bg-slate-500";
  return (
    <span className="inline-flex items-center gap-1 text-[11px]">
      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${color}`} />
      <span className="font-semibold text-slate-700">{b.label}</span>
    </span>
  );
}

/** vrai si un évènement couvre ce jour (multi-jour) mais ne commence pas ce jour-là */
function isCoveredByMulti(ev: MensileItem, iso: string): boolean {
  const da = ev.data_evento_da || ev.data_evento;
  const a = ev.data_evento_a || ev.data_evento;
  if (!da || !a) return false;
  if (da === a) return false;
  return iso >= da && iso <= a && iso !== ev.data_evento;
}

export default function CalendarioPage() {
  const router = useRouter();

  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [quickLoc, setQuickLoc] = usePersistentState<number>("cal:quickLoc", 1);

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

  const calendarDays = useMemo(() => {
    const first = dayjs(`${month}-01`);
    const offset = first.day(); // 0=dimanche
    const start = first.subtract(offset, "day");
    return Array.from({ length: 42 }, (_, i) => start.add(i, "day"));
  }, [month]);

  // événements qui COMMENCENT un jour donné
  const byDate = useMemo(() => {
    const m = new Map<string, MensileItem[]>();
    for (const it of rows) {
      const k = it.data_evento;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    for (const [, arr] of m) {
      arr.sort((a, b) => a.location_index - b.location_index);
    }
    return m;
  }, [rows]);

  function shiftMonth(delta: number) {
    const d = dayjs(`${month}-01`).add(delta, "month");
    setMonth(d.format("YYYY-MM"));
  }

  function openOfferta(dateISO: string) {
    router.push(`/eventi/offerta-rapida?date=${dateISO}&loc=${quickLoc}`);
  }

  const monthNum = Number(month.slice(5, 7));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Calendario</h1>

        <div className="ml-auto flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <span>Location per “+”</span>
            <select
              className="border rounded-none px-2 py-1"
              value={quickLoc}
              onChange={(e) => setQuickLoc(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  L{n}
                </option>
              ))}
            </select>
          </label>

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
            href="/eventi/lista-mensile"
            className="px-3 py-2 border rounded-none"
          >
            Lista mensile →
          </Link>
        </div>
      </div>

      {err && (
        <div className="p-3 border bg-rose-50 text-rose-700 rounded-none">
          {err}
        </div>
      )}

      {/* Grille calendrier */}
      <div className="grid grid-cols-7 gap-px border bg-slate-200">
        {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((d) => (
          <div
            key={d}
            className="bg-slate-100 px-2 py-2 text-sm font-semibold text-center"
          >
            {d}
          </div>
        ))}

        {calendarDays.map((d) => {
          const iso = d.format("YYYY-MM-DD");
          const inMonth = d.month() + 1 === monthNum;

          const dayEvents = byDate.get(iso) || [];
          const coveredEvents = rows.filter((ev) => isCoveredByMulti(ev, iso));
          const hasCoverage = coveredEvents.length > 0;

          return (
            <div
              key={iso}
              className={
                "relative min-h-28 p-1.5 align-top cursor-pointer " +
                (hasCoverage
                  ? "bg-sky-50 border-2 border-sky-300"
                  : "bg-white hover:bg-slate-50")
              }
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("[data-evt]")) return;
                openOfferta(iso);
              }}
              title={`Nuova offerta il ${iso}`}
            >
              {/* Numéro de jour */}
              <div
                className={`text-xs mb-1 ${
                  inMonth ? "text-slate-800" : "text-slate-400"
                }`}
              >
                {d.format("D")}
              </div>

              {/* Ruban "copertura" pour bien voir */}
              {hasCoverage && (
                <div className="absolute left-0 right-0 top-[18px] h-[3px] bg-sky-400 rounded-full opacity-80 pointer-events-none" />
              )}

              {/* bouton + */}
              <button
                type="button"
                className="absolute top-1 right-1 w-5 h-5 leading-5 text-center text-xs border rounded-none bg-white hover:bg-black hover:text-white"
                title="Nuova offerta su questa data"
                onClick={(e) => {
                  e.stopPropagation();
                  openOfferta(iso);
                }}
              >
                +
              </button>

              {/* événements qui COMMENCENT ce jour-là */}
              <div className="mt-1 space-y-1">
                {dayEvents.length === 0 ? (
                  <div className="text-[11px] italic text-slate-400">
                    —
                  </div>
                ) : (
                  dayEvents.slice(0, 6).map((ev) => {
                    const da = ev.data_evento_da || ev.data_evento;
                    const a = ev.data_evento_a || ev.data_evento;
                    const isMulti = !!da && !!a && da !== a;

                    return (
                      <Link
                        key={ev.id}
                        href={`/eventi/${ev.id}`}
                        className="block border rounded-none px-1.5 py-1 bg-white/80 hover:bg-slate-50"
                        title={
                          isMulti
                            ? `Loc ${ev.location_index} — ${ev.titolo} (${dayjs(
                                da
                              ).format("DD/MM")} → ${dayjs(a).format("DD/MM")})`
                            : `Loc ${ev.location_index} — ${ev.titolo}`
                        }
                        data-evt
                      >
                        <div className="flex items-center justify-between text-[11px] leading-tight gap-1">
                          <span className="truncate">
                            L{ev.location_index}: {ev.titolo}
                          </span>
                          <EventoBadge e={ev} />
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          {ev.cliente_nome ? (
                            <div className="text-[10px] text-slate-500 truncate ml-0.5">
                              {ev.cliente_nome}
                            </div>
                          ) : (
                            <span />
                          )}
                          {isMulti && (
                            <span className="ml-1 inline-flex items-center px-1.5 py-[1px] rounded-full bg-sky-100 text-sky-700 border border-sky-300 text-[9px] font-semibold">
                              {dayjs(da).format("DD/MM")}→
                              {dayjs(a).format("DD/MM")}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>

              {/* pastilles BLEUES pour les jours COUVERTS (mais pas début) */}
              {coveredEvents.length > 0 && (
                <div className="mt-2 space-y-1">
                  {coveredEvents.slice(0, 3).map((ev) => {
                    const da = ev.data_evento_da || ev.data_evento;
                    const a = ev.data_evento_a || ev.data_evento;
                    return (
                      <Link
                        key={`cov-${ev.id}`}
                        href={`/eventi/${ev.id}`}
                        data-evt
                        className="block text-[10px] text-sky-800"
                        title={`Evento multi-giorno: ${dayjs(da).format(
                          "DD/MM"
                        )} → ${dayjs(a).format("DD/MM")}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500" />
                          <span className="truncate">
                            L{ev.location_index}: {ev.titolo}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                  {coveredEvents.length > 3 && (
                    <div className="text-[9px] text-sky-900 font-semibold">
                      +{coveredEvents.length - 3} altri…
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-rose-500" /> bozza
          / da eseguire
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />{" "}
          confermato
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-orange-400" />{" "}
          fatturato
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-slate-400" />{" "}
          annullato
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-sky-500" />{" "}
          copertura multi-giorno
        </span>
      </div>

      {loading && (
        <div className="text-sm text-slate-500">Chargement…</div>
      )}
    </div>
  );
}
