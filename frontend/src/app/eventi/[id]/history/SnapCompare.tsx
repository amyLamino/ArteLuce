// /frontend/src/app/eventi/[id]/history/SnapCompare.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type QtyLine = {
  materiale_id: number;
  nome: string;
  qta: number;
  prezzo: number;
  categoria?: string | null;
  sottocategoria?: string | null;
  is_tecnico?: boolean;
  is_messo?: boolean;
};
type Snap = {
  ref: string;
  location_index?: number | null;
  stato?: "bozza" | "confermato" | "annullato" | "fatturato";
  offerta_stato?: "da_eseguire" | "inviato" | "annullato";
  acconto_state?: "none" | "to_send" | "sent" | "paid";
  saldo_state?: "to_send" | "sent" | "paid";
  righe: QtyLine[];
};

function toSnap(raw: any): Snap {
  return {
    ref: String(raw.ref || ""),
    location_index: raw.location_index ?? raw.location ?? null,
    stato: raw.stato,
    offerta_stato: raw.offerta_stato,
    acconto_state: raw.acconto_state,
    saldo_state: raw.saldo_state,
    righe: (raw.righe || []).map((r: any) => ({
      materiale_id: Number(r.materiale_id ?? r.materiale ?? r.id),
      nome: String(r.nome ?? r.label ?? r.articolo ?? ""),
      qta: Number(r.qta ?? r.qty ?? 0),
      prezzo: Number(r.prezzo ?? r.unit_price ?? r.pu ?? 0),
      categoria: r.categoria ?? null,
      sottocategoria: r.sottocategoria ?? null,
      is_tecnico: !!r.is_tecnico,
      is_messo: !!r.is_trasporto || !!r.is_messo,
    })),
  };
}

function SnapshotCard({ title, snap }: { title: string; snap: Snap | null }) {
  if (!snap) return <div className="border rounded p-3 bg-white">Caricamento…</div>;
  const total = snap.righe.reduce((s, r) => s + r.qta * r.prezzo, 0);

  return (
    <div className="border rounded p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-slate-600">ref: {snap.ref || "—"}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div><span className="text-slate-500">Location</span>: <b>{snap.location_index ?? "—"}</b></div>
        <div><span className="text-slate-500">Stato evento</span>: <b>{snap.stato ?? "—"}</b></div>
        <div><span className="text-slate-500">Stato offerta</span>: <b>{snap.offerta_stato ?? "—"}</b></div>
        <div><span className="text-slate-500">Acconto</span>: <b>{snap.acconto_state ?? "—"}</b></div>
        <div><span className="text-slate-500">Saldo</span>: <b>{snap.saldo_state ?? "—"}</b></div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-2 py-1">Articolo</th>
            <th className="text-right px-2 py-1">Qtà</th>
            <th className="text-right px-2 py-1">Prezzo</th>
            <th className="text-right px-2 py-1">Importo</th>
            <th className="text-left px-2 py-1">Flag</th>
            <th className="text-left px-2 py-1">Cat / Sub</th>
          </tr>
        </thead>
        <tbody>
          {snap.righe.length === 0 ? (
            <tr><td colSpan={6} className="px-2 py-3 text-slate-500">Nessuna riga.</td></tr>
          ) : snap.righe.map(r => (
            <tr key={r.materiale_id} className="border-t">
              <td className="px-2 py-1">{r.nome}</td>
              <td className="px-2 py-1 text-right">{r.qta}</td>
              <td className="px-2 py-1 text-right">{r.prezzo.toFixed(2)} €</td>
              <td className="px-2 py-1 text-right">{(r.qta * r.prezzo).toFixed(2)} €</td>
              <td className="px-2 py-1">
                {r.is_messo ? <span className="text-[11px] border px-1 mr-1">mezzi</span> : null}
                {r.is_tecnico ? <span className="text-[11px] border px-1">tecnico</span> : null}
              </td>
              <td className="px-2 py-1">
                {(r.categoria || "—")}{r.sottocategoria ? ` / ${r.sottocategoria}` : ""}
              </td>
            </tr>
          ))}
          <tr className="border-t bg-slate-50">
            <td className="px-2 py-1 font-semibold" colSpan={3}>Totale</td>
            <td className="px-2 py-1 text-right font-semibold">{total.toFixed(2)} €</td>
            <td colSpan={2}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function SnapCompare({ id, prevRef, curRef }:{
  id: number|string; prevRef: string; curRef: string;
}) {
  const [prevSnap, setPrevSnap] = useState<Snap | null>(null);
  const [currSnap, setCurrSnap] = useState<Snap | null>(null);

  useEffect(() => {
    let stop = false;
    (async () => {
      const [a, b] = await Promise.all([
        api.get(`/eventi/${id}/revisions/${prevRef}`).then(r => toSnap(r.data)),
        api.get(`/eventi/${id}/revisions/${curRef}`).then(r => toSnap(r.data)),
      ]);
      if (!stop) { setPrevSnap(a); setCurrSnap(b); }
    })();
    return () => { stop = true; };
  }, [id, prevRef, curRef]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SnapshotCard title="De (révision précédente)" snap={prevSnap} />
      <SnapshotCard title="À (révision actuelle)" snap={currSnap} />
    </div>
  );
}
