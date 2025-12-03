/* chemin : /frontend/src/app/sinottico/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import Link from "next/link";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

/* ---------- Types ---------- */
type MensileItem = {
  id: number;
  titolo: string;
  data_evento: string; // "YYYY-MM-DD"
  location_index: number; // 1..8
  stato: "bozza" | "confermato" | "annullato" | "fatturato";
  cliente_nome?: string;
  offerta_stato?: "da_eseguire" | "inviato" | "annullato";
};

type Riga = {
  materiale: number;
  materiale_nome?: string;
  qta: number;
  prezzo: number;
  is_tecnico?: boolean;
  is_trasporto?: boolean;
};

type MatMeta = { categoria?: string; sottocategoria?: string; costo?: number };

/* ---------- NEW: support API aggregata (facoltativa) ---------- */
type AggKPIs = {
  eventi: number;
  linee: number;
  ricavo_totale: number;
  conversione: number;
  costo_logistica: number;
  costo_totale: number;
};

type AggResp = {
  kpis: AggKPIs;
  ricavo_per_giorno: { date: string; ricavo: number }[];
  stati: { label: "bozza" | "confermato" | "annullato" | "fatturato"; count: number }[];
  top_materiali: { nome: string; qta: number }[];
  ricavo_per_categoria: { categoria: string; ricavo: number }[];
};

/* ---------- Utilitaires ---------- */
const euro = (n: number) => `${n.toFixed(2)} €`;

const STATO_COLORS: Record<MensileItem["stato"], string> = {
  bozza: "#60a5fa",
  confermato: "#10b981",
  annullato: "#f43f5e",
  fatturato: "#f59e0b",
};

const PIE_COLORS = Object.values(STATO_COLORS);

/* ---------- Page ---------- */
export default function SinotticoPage() {
  const router = useRouter();

  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [rows, setRows] = useState<MensileItem[]>([]);
  const [details, setDetails] = useState<
    Record<number, { righe: Riga[]; offerta_stato?: MensileItem["offerta_stato"] }>
  >({});
  const [meta, setMeta] = useState<Record<number, MatMeta>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [agg, setAgg] = useState<AggResp | null>(null);

  /* ---------- Protezione: redirect se non loggato ---------- */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
      }
    }
  }, [router]);

  /* ---------- Tenta l’API aggregata (se esiste) ---------- */
  useEffect(() => {
    let cancelled = false;
    setAgg(null);
    api
      .get(`/stats/mese`, { params: { m: month } })
      .then((r) => {
        if (!cancelled && r?.data) setAgg(r.data as AggResp);
      })
      .catch(() => {
        /* opzionale → nessun errore visibile */
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  /* ---------- Carica eventi + dettagli ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      setDetails({});
      try {
        const [y, m] = month.split("-");
        const r = await api.get(`/eventi/mese`, { params: { year: y, month: m } });
        const list: MensileItem[] = r.data || [];
        if (cancelled) return;
        setRows(list);

        const chunks = Array.from({ length: Math.ceil(list.length / 8) }, (_, i) =>
          list.slice(i * 8, i * 8 + 8),
        );
        const map: Record<number, { righe: Riga[]; offerta_stato?: MensileItem["offerta_stato"] }> =
          {};
        for (const group of chunks) {
          const resps = await Promise.all(
            group.map((it) => api.get(`/eventi/${it.id}/`).catch(() => null)),
          );
          for (const resp of resps) {
            if (resp?.data?.id && Array.isArray(resp.data.righe)) {
              map[resp.data.id] = {
                righe: resp.data.righe as Riga[],
                offerta_stato: resp.data.offerta_stato || undefined,
              };
            }
          }
        }
        if (cancelled) return;
        setDetails(map);
      } catch {
        if (!cancelled) setErr("Errore di caricamento");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month]);

  /* ---------- Récup meta (catégories / coûts) ---------- */
  useEffect(() => {
    const allIds = new Set<number>();
    for (const evId of Object.keys(details)) {
      for (const r of details[+evId]?.righe || []) allIds.add(r.materiale);
    }
    const missing = Array.from(allIds).filter((id) => !meta[id]);
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const patch: Record<number, MatMeta> = {};
      const chunks = Array.from({ length: Math.ceil(missing.length / 12) }, (_, i) =>
        missing.slice(i * 12, i * 12 + 12),
      );
      for (const group of chunks) {
        const resps = await Promise.all(
          group.map((mid) => api.get(`/materiali/${mid}/`).catch(() => null)),
        );
        for (const resp of resps) {
          if (resp?.data?.id) {
            const d = resp.data;
            patch[d.id] = {
              categoria: d.categoria_nome || d.categoria || "Altro",
              sottocategoria: d.sottocategoria_nome || d.sottocategoria,
              costo: Number(d.costo ?? d.costo_base ?? d.cost ?? 0) || undefined,
            };
          }
        }
      }
      if (!cancelled) setMeta((prev) => ({ ...prev, ...patch }));
    })();
    return () => {
      cancelled = true;
    };
  }, [details, meta]);

  /* ---------- KPIs ---------- */
  const kpis = useMemo(() => {
    const eventi = rows.length;

    let righeTot = 0;
    let ricavoTot = 0;
    let ricavoMat = 0;
    let ricavoLog = 0;

    let costoTot = 0;
    let costoLog = 0;
    let costoCount = 0;
    let costoUsed = 0;

    for (const e of rows) {
      const d = details[e.id];
      const righe = d?.righe || [];
      righeTot += righe.length;

      for (const r of righe) {
        const qty = Number(r.qta || 0);
        const pu = Number(r.prezzo || 0);
        const ric = qty * pu;
        ricavoTot += ric;

        const isLog = !!(r.is_tecnico || r.is_trasporto);
        if (isLog) ricavoLog += ric;
        else ricavoMat += ric;

        const m = meta[r.materiale];
        if (m && typeof m.costo === "number") {
          const c = qty * Number(m.costo || 0);
          costoTot += c;
          if (isLog) costoLog += c;
          costoCount++;
          if ((m.costo || 0) > 0) costoUsed++;
        }
      }
    }

    const margeEstimee = ricavoTot - costoTot;
    const coverage = costoCount > 0 ? Math.round((costoUsed * 100) / costoCount) : 0;

    let inviato = 0,
      confermato = 0;
    for (const e of rows) {
      const offSt = details[e.id]?.offerta_stato ?? e.offerta_stato;
      if (offSt === "inviato") inviato++;
      if (e.stato === "confermato") confermato++;
    }
    const convDen = Math.max(1, inviato + confermato);
    const conversion = Math.round((confermato * 100) / convDen);

    return {
      eventi,
      righeTot,
      ricavoTot,
      ricavoMat,
      ricavoLog,
      costoTot,
      costoLog,
      margeEstimee,
      coverage,
      inviato,
      confermato,
      conversion,
    };
  }, [rows, details, meta]);

  /* ---------- Séries graphiques ---------- */
  const dailySerie = useMemo(() => {
    if (agg?.ricavo_per_giorno?.length) {
      return agg.ricavo_per_giorno.map((p) => ({
        date: dayjs(p.date).format("DD"),
        ricavo: p.ricavo,
      }));
    }
    const d0 = dayjs(`${month}-01`);
    const n = d0.daysInMonth();
    const byDate: Record<string, number> = {};
    for (let i = 1; i <= n; i++) byDate[d0.date(i).format("YYYY-MM-DD")] = 0;
    for (const e of rows) {
      const righe = details[e.id]?.righe || [];
      const k = e.data_evento;
      if (byDate[k] == null) continue;
      let sum = 0;
      for (const r of righe) sum += Number(r.qta) * Number(r.prezzo);
      byDate[k] += sum;
    }
    return Object.entries(byDate).map(([date, ricavo]) => ({
      date: dayjs(date).format("DD"),
      ricavo,
    }));
  }, [agg, rows, details, month]);

  const topMateriali = useMemo(() => {
    if (agg?.top_materiali?.length) {
      return agg.top_materiali.map((t) => ({ nome: t.nome, qty: t.qta, ricavo: 0 }));
    }
    const acc = new Map<string, { nome: string; qty: number; ricavo: number }>();
    for (const e of rows) {
      for (const r of details[e.id]?.righe || []) {
        const key = r.materiale_nome || `#${r.materiale}`;
        const prev = acc.get(key) || { nome: key, qty: 0, ricavo: 0 };
        prev.qty += Number(r.qta || 0);
        prev.ricavo += Number(r.qta || 0) * Number(r.prezzo || 0);
        acc.set(key, prev);
      }
    }
    return Array.from(acc.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [agg, rows, details]);

  const statoPie = useMemo(() => {
    if (agg?.stati?.length) {
      return agg.stati.map((s) => ({ name: s.label, value: s.count }));
    }
    const m: Record<MensileItem["stato"], number> = {
      bozza: 0,
      confermato: 0,
      annullato: 0,
      fatturato: 0,
    };
    for (const e of rows) m[e.stato] = (m[e.stato] || 0) + 1;
    return (Object.keys(m) as (keyof typeof m)[]).map((k) => ({ name: k, value: m[k] }));
  }, [agg, rows]);

  const categoriaBar = useMemo(() => {
    if (agg?.ricavo_per_categoria?.length) {
      return agg.ricavo_per_categoria
        .map((x) => ({ name: x.categoria || "-", ricavo: x.ricavo }))
        .sort((a, b) => b.ricavo - a.ricavo)
        .slice(0, 12);
    }
    const cat = new Map<string, number>();
    for (const e of rows) {
      for (const r of details[e.id]?.righe || []) {
        const c = meta[r.materiale]?.categoria || "Altro";
        const v = Number(r.qta) * Number(r.prezzo);
        cat.set(c, (cat.get(c) || 0) + v);
      }
    }
    return Array.from(cat.entries())
      .map(([name, ricavo]) => ({ name, ricavo }))
      .sort((a, b) => b.ricavo - a.ricavo)
      .slice(0, 12);
  }, [agg, rows, details, meta]);

  /* ---------- UI (version moderne) ---------- */
  return (
    <AppShell title="Sinottico eventi">
      <div className="space-y-6">
        {/* Header + selettore mese */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-100">
              Panoramica mensile
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Andamento degli eventi, ricavi e utilizzo dei materiali.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            {err && <span className="text-xs text-rose-400">{err}</span>}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Eventi (mese)
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-900">
              {kpis.eventi}
            </div>
            <div className="mt-1 text-xs text-slate-500">Numero totale eventi</div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Righe totali
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-900">
              {kpis.righeTot}
            </div>
            <div className="mt-1 text-xs text-slate-500">Linee di dettaglio</div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Ricavo totale
            </div>
            <div className="mt-1 text-2xl font-semibold text-emerald-600">
              {euro(kpis.ricavoTot)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Materiale: {euro(kpis.ricavoMat)} • Logistica: {euro(kpis.ricavoLog)}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Conversione (offerta → confermato)
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-900">
              {kpis.conversion}%
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              inviato: {kpis.inviato} • confermato: {kpis.confermato}
            </div>
          </div>
        </div>


        {/* KPI costi / margine */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Costo logistica (se disponibile)
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {kpis.costoLog > 0 ? euro(kpis.costoLog) : "—"}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Costo totale (se disponibile)
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {kpis.costoTot > 0 ? euro(kpis.costoTot) : "—"}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Copertura costi: {kpis.coverage}%
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Margine stimato
            </div>
            <div className="mt-1 text-2xl font-semibold text-emerald-600">
              {kpis.costoTot > 0 ? euro(kpis.margeEstimee) : "—"}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Basato sui campi <code>costo</code>/<code>costo_base</code> dei materiali.
            </div>
          </div>
        </div>


        {/* Grafici */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Ricavo per giorno */}
          <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-slate-900">
              Ricavo per giorno
            </div>
                        <div className="h-64 min-h-[256px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySerie}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => euro(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="ricavo" name="Ricavo" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stato eventi (Pie) */}
          <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-slate-900">
              Stato eventi
            </div>
            <div className="h-64 min-h-[256px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statoPie} nameKey="name" dataKey="value" label>
                    {statoPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top materiali (Qtà) */}
          <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-slate-900">
              Top materiali (quantità)
            </div>
            <div className="h-64 min-h-[256px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMateriali}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" hide />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="qty" name="Qtà" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Suggerimento: passa il mouse per i nomi completi.
            </div>
          </div>

          {/* Ricavo per categoria */}
          <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-slate-900">
              Ricavo per categoria
            </div>
            <div className="h-64 min-h-[256px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoriaBar}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => euro(v as number)} />
                  <Legend />
                  <Bar dataKey="ricavo" name="Ricavo" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Elenco eventi */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-900">
              Eventi ({rows.length})
            </div>
            {loading && (
              <div className="text-xs text-slate-400">Caricamento…</div>
            )}
          </div>
          <div className="max-h-[380px] overflow-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-700">
                    Data
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-slate-700">
                    Titolo
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-slate-700">
                    Cliente
                  </th>
                  <th className="text-center px-3 py-2 font-medium text-slate-700">
                    Loc
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-slate-700">
                    Stato
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-slate-700">
                    Righe
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-slate-700">
                    Importo
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((ev) => {
                  const righe = details[ev.id]?.righe || [];
                  const importo = righe.reduce(
                    (s, r) => s + Number(r.qta) * Number(r.prezzo),
                    0,
                  );
                  return (
                    <tr
                      key={ev.id}
                      className="border-t border-slate-200 hover:bg-slate-100"
                    >
                      <td className="px-3 py-1.5 text-slate-800">
                        {ev.data_evento}
                      </td>
                      <td className="px-3 py-1.5">
                        <Link
                          href={`/eventi/${ev.id}`}
                          className="hover:underline text-emerald-700"
                        >
                          {ev.titolo}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5 text-slate-700">
                        {ev.cliente_nome || "-"}
                      </td>
                      <td className="px-3 py-1.5 text-center text-slate-700">
                        L{ev.location_index}
                      </td>
                      <td className="px-3 py-1.5 text-slate-700">
                        {ev.stato}
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-800">
                        {righe.length}
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-800">
                        {euro(importo)}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-4 text-slate-500 italic text-center"
                      colSpan={7}
                    >
                      Nessun evento per questo mese.
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
