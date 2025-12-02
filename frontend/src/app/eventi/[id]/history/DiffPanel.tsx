// /frontend/src/app/eventi/[id]/history/DiffPanel.tsx
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DiffResult, Snap, diffRevisions } from "@/lib/revisions/diff";

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

export default function DiffPanel({ id, prevRef, curRef }:{
  id: number|string; prevRef: string; curRef: string;
}) {
  const [diff, setDiff] = useState<DiffResult | null>(null);

  useEffect(() => {
    let stop = false;
    (async () => {
      const [a, b] = await Promise.all([
        api.get(`/eventi/${id}/revisions/${prevRef}`).then(r => toSnap(r.data)),
        api.get(`/eventi/${id}/revisions/${curRef}`).then(r => toSnap(r.data)),
      ]);
      if (!stop) setDiff(diffRevisions(a, b));
      console.debug("[history] diff ready", { prevRef, curRef, a, b });
    })();
    return () => { stop = true; };
  }, [id, prevRef, curRef]);

  if (!diff) return <div>Caricamento…</div>;

  return (
    <div className="space-y-3">
      {diff.modified.length > 0 && (
        <section>
          <div className="font-semibold mb-1">Modifiés</div>
          <ul className="list-disc pl-5">
            {diff.modified.map((m, i) => (
              <li key={i}>• {m.field}: <b>{String(m.before)}</b> → <b>{String(m.after)}</b></li>
            ))}
          </ul>
        </section>
      )}

      {diff.added.length > 0 && (
        <section>
          <div className="font-semibold mb-1">Ajoutés</div>
          <ul className="list-disc pl-5">
            {diff.added.map(a => (
              <li key={a.materiale_id}>• {a.nome} @{a.prezzo?.toFixed?.(2) ?? "-"}: +{a.delta}</li>
            ))}
          </ul>
        </section>
      )}

      {diff.removed.length > 0 && (
        <section>
          <div className="font-semibold mb-1">Supprimés</div>
          <ul className="list-disc pl-5">
            {diff.removed.map(r => (
              <li key={r.materiale_id}>• {r.nome} @{r.prezzo?.toFixed?.(2) ?? "-"}: {r.delta}</li>
            ))}
          </ul>
        </section>
      )}

      {diff.modified.length === 0 && diff.added.length === 0 && diff.removed.length === 0 && (
        <div>Aucune différence.</div>
      )}
    </div>
  );
}
