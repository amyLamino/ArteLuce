/* /frontend/src/app/eventi/[id]/SnapCompare.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { api } from "@/lib/api";

/* Types minimes, alignés sur page.tsx */
type Riga = {
  id?: number;
  materiale: number;
  materiale_nome?: string;
  qta: number;
  prezzo: number;
  importo?: number;
  is_tecnico?: boolean;
  is_trasporto?: boolean;
  copertura_giorni?: number;
};
type Evento = {
  id?: number;
  titolo?: string;
  data_evento?: string;
  location_index?: number;
  stato?: "bozza" | "confermato" | "annullato" | "fatturato";
  acconto_importo?: number | string | null;
  acconto_data?: string | null;
  righe?: Riga[];
};
type Revision = { ref: number; created_at: string; payload: Partial<Evento> };

/* util: normalise un listing de révisions hétérogène */
function normalizeRevisions(data: any): Revision[] {
  const raw = Array.isArray(data) ? data : (data?.results ?? data?.items ?? []);
  const out: Revision[] = raw.map((it: any, idx: number) => {
    const p = it.payload ?? it.data ?? it.evento ?? {};
    const payload: Partial<Evento> = {
      id: p.id,
      titolo: p.titolo,
      data_evento: p.data_evento,
      location_index: p.location_index,
      stato: p.stato,
      acconto_importo: p.acconto_importo,
      acconto_data: p.acconto_data,
      righe: Array.isArray(p.righe) ? p.righe : [],
    };
    const createdStr = String(
      it.created_at ?? it.timestamp ?? it.date ?? it.created ?? new Date().toISOString()
    );
    const refNum = Number(it.ref ?? it.id ?? idx + 1);
    return { ref: refNum, created_at: createdStr, payload };
  });
  out.sort((a, b) => {
    const ta = Date.parse(a.created_at);
    const tb = Date.parse(b.created_at);
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
    return a.ref - b.ref;
  });
  return out;
}

function euro(n: number) { return `${n.toFixed(2)} €`; }

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border rounded-none bg-white">
      <div className="px-3 py-2 font-semibold bg-slate-50">{title}</div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function LinesTable({ rows }: { rows: Riga[] }) {
  if (!rows?.length) {
    return <div className="text-sm text-slate-500">Nessuna riga.</div>;
  }
  const tot = rows.reduce((s, r) => s + Number(r.qta || 0) * Number(r.prezzo || 0), 0);
  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-2 py-1">Articolo</th>
            <th className="text-center px-2 py-1">Qtà</th>
            <th className="text-right px-2 py-1">PU</th>
            <th className="text-right px-2 py-1">Importo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const imp = Number(r.qta || 0) * Number(r.prezzo || 0);
            return (
              <tr key={`${r.materiale}-${i}`} className="border-t">
                <td className="px-2 py-1">
                  {r.materiale_nome || `#${r.materiale}`}
                  {r.is_tecnico ? <span className="ml-2 text-[10px] px-1 border rounded-none">tecnico</span> : null}
                  {r.is_trasporto ? <span className="ml-2 text-[10px] px-1 border rounded-none">mezzi</span> : null}
                </td>
                <td className="px-2 py-1 text-center">{r.qta}</td>
                <td className="px-2 py-1 text-right">{Number(r.prezzo || 0).toFixed(2)}</td>
                <td className="px-2 py-1 text-right">{imp.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="text-right font-semibold">Totale: {euro(tot)}</div>
    </div>
  );
}

export default function SnapCompare({ id, prevRef, curRef }: { id: string; prevRef: string; curRef: string }) {
  const [loading, setLoading] = useState(true);
  const [prev, setPrev] = useState<Revision | null>(null);
  const [cur, setCur] = useState<Revision | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // on tente endpoints “history/revisions”, sinon on retombe sur une liste unique
        const endpoints = [
          `/eventi/${id}/revisions/`,
          `/eventi/${id}/revisions`,
          `/eventi/${id}/history/`,
          `/eventi/${id}/history`,
          `/eventi/${id}/audit/`,
          `/eventi/${id}/audit`,
        ];
        let list: Revision[] = [];
        for (const ep of endpoints) {
          try {
            const r = await api.get(ep, { params: { _t: Date.now() } });
            list = normalizeRevisions(r.data);
            if (list.length) break;
          } catch { /* try next */ }
        }
        if (cancelled) return;
        const p = list.find(x => String(x.ref) === String(prevRef)) || null;
        const c = list.find(x => String(x.ref) === String(curRef)) || null;
        setPrev(p);
        setCur(c);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, prevRef, curRef]);

  if (loading) {
    return <div className="border rounded-none bg-white p-3 text-sm text-slate-600">Caricamento…</div>;
  }
  if (!prev || !cur) {
    return <div className="border rounded-none bg-white p-3 text-sm text-rose-600">Révision introuvable.</div>;
  }

  const A = prev.payload || {};
  const B = cur.payload || {};

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Block title={`AVANT — ref${prev.ref} • ${dayjs(prev.created_at).format("YYYY-MM-DD HH:mm")}`}>
          <div className="text-sm space-y-1 mb-2">
            <div><b>Titolo:</b> {A.titolo || "—"}</div>
            <div><b>Data:</b> {A.data_evento || "—"}</div>
            <div><b>Location:</b> {A.location_index ?? "—"}</div>
            <div><b>Stato:</b> {A.stato || "—"}</div>
            <div><b>Acconto:</b> {Number(A.acconto_importo || 0) ? `${Number(A.acconto_importo).toFixed(2)} €${A.acconto_data ? ` (${A.acconto_data})` : ""}` : "—"}</div>
          </div>
          <LinesTable rows={(A.righe as Riga[]) || []} />
        </Block>
      </div>

      <div>
        <Block title={`APRÈS — ref${cur.ref} • ${dayjs(cur.created_at).format("YYYY-MM-DD HH:mm")}`}>
          <div className="text-sm space-y-1 mb-2">
            <div><b>Titolo:</b> {B.titolo || "—"}</div>
            <div><b>Data:</b> {B.data_evento || "—"}</div>
            <div><b>Location:</b> {B.location_index ?? "—"}</div>
            <div><b>Stato:</b> {B.stato || "—"}</div>
            <div><b>Acconto:</b> {Number(B.acconto_importo || 0) ? `${Number(B.acconto_importo).toFixed(2)} €${B.acconto_data ? ` (${B.acconto_data})` : ""}` : "—"}</div>
          </div>
          <LinesTable rows={(B.righe as Riga[]) || []} />
        </Block>
      </div>
    </div>
  );
}
