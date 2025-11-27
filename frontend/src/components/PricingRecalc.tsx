
/* chemin : /frontend/src/components/PricingRecalc.tsx */
"use client";

import { useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

type LineIn = {
  materiale: number;
  qta: number;
  prezzo?: number;
  materiale_nome?: string;
};

export default function PricingRecalc(props: {
  dateISO: string;
  luogoId?: number;
  distanzaKmAR?: number;
  mezzoId?: number;
  righe: LineIn[];
  /** callback qui reçoit { materialeId: nouveauPU } */
  onApply: (unitPrices: Record<number, number>) => void;
  className?: string;
}) {
  const { dateISO, luogoId, distanzaKmAR, mezzoId, righe, onApply, className } = props;

  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  /** Empêche de recalculer si les entrées n'ont pas changé */
  const lastSigRef = useRef<string>("");

  /** Signature stable des entrées (tri par id, coerce en nombres) */
  const sig = useMemo(() => {
    const core = {
      d: dateISO || "",
      luogoId: luogoId ?? null,
      mezzoId: mezzoId ?? null,
      dist: distanzaKmAR ?? null,
      righe: (righe || [])
        .map((r) => ({ id: Number(r.materiale), q: Number(r.qta || 0) }))
        .sort((a, b) => (a.id - b.id) || (a.q - b.q)),
    };
    return JSON.stringify(core);
  }, [dateISO, luogoId, mezzoId, distanzaKmAR, righe]);

  /** Essaie plusieurs endpoints possibles côté backend */
  async function callApi(payload: any) {
    const endpoints = ["/pricing/quote/", "/eventi/recalc/", "/pricing/recalc/"];
    for (const ep of endpoints) {
      try {
        const res = await api.post(ep, payload);
        if (res?.data?.unit_prices) return res.data.unit_prices as Record<number, number>;
        if (res?.data?.prices) return res.data.prices as Record<number, number>;
      } catch {
        // on tente le suivant
      }
    }
    throw new Error("Nessun endpoint di ricalcolo disponibile.");
  }

  async function handleRecalc() {
    setLastError(null);

    // rien n’a changé → on n’appelle pas l’API
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;

    setLoading(true);
    try {
      const payload = {
        dateISO,
        luogoId,
        distanzaKmAR,
        mezzoId,
        righe: righe.map((r) => ({ materiale: Number(r.materiale), qta: Number(r.qta || 0) })), // pas de PU courant
      };
      const mapPU = await callApi(payload);
      onApply(mapPU); // applique { materialeId: nuovoPU }
    } catch (err: any) {
      setLastError(err?.message || "Errore durante il ricalcolo.");
      lastSigRef.current = ""; // autoriser un nouveau clic pour retenter
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || (righe?.length ?? 0) === 0;

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <button
        type="button"
        className="px-2 py-1 border rounded-none disabled:opacity-60"
        onClick={handleRecalc}
        disabled={disabled}
        title="Ricalcola i prezzi dinamici"
      >
        {loading ? "Calcolo…" : "Ricalcola prezzi (dinamico)"}
      </button>
      {lastError ? <span className="text-xs text-rose-600">{lastError}</span> : null}
    </div>
  );
}
