// /frontend/src/lib/eventStatus.ts

export type BackendStato = "bozza" | "confermato" | "annullato" | "fatturato";
export type OffertaStato =
  | "da_eseguire"
  | "inviato"
  | "annullato"
  | "confermato"
  | "fatturato"
  | "bozza";

export type PayState = "none" | "to_send" | "sent" | "paid";

/** Ce que renvoie l'API pour un evento côté statuts */
export type EventoStatus = {
  stato: BackendStato;
  offerta_stato?: OffertaStato;
  saldo_state?: PayState;
};

/** Statut "visuel" simplifié pour les pastilles */
export type VisualStato =
  | "bozza"
  | "da_eseguire"
  | "inviato"
  | "confermato"
  | "fatturato"
  | "annullato"
  | "pagato";

/**
 * Règles de mapping :
 * - PAGATO  -> vert (prioritaire)
 * - inviato -> bleu vif
 * - da_eseguire (bozza) -> rouge vif
 * - confermato -> vert/jaune vif
 * - fatturato -> orange vif
 * - annullato -> gris
 * - sinon -> bozza (rouge)
 */
export function getVisualOffertaStato(e: EventoStatus): VisualStato {
  if (e.saldo_state === "paid") return "pagato";

  if (e.offerta_stato === "inviato") return "inviato";

  if (e.offerta_stato === "da_eseguire") return "da_eseguire";

  if (e.stato === "confermato") return "confermato";

  if (e.stato === "fatturato") return "fatturato";

  if (e.stato === "annullato" || e.offerta_stato === "annullato") {
    return "annullato";
  }

  return "bozza";
}

/** Couleurs vives pour chaque état visuel */
export const OFFERTA_COLORS: Record<VisualStato, string> = {
  bozza: "bg-rose-500",        // bozza
  da_eseguire: "bg-rose-500",  // da eseguire = rouge vif
  inviato: "bg-sky-500",       // bleu vif
  confermato: "bg-lime-400",   // vert/jaune vif
  fatturato: "bg-amber-500",   // orange vif
  annullato: "bg-slate-500",   // gris
  pagato: "bg-emerald-500",    // vert vif
};

/**
 * Helper pour la pastille : renvoie la classe Tailwind à appliquer sur un <span>.
 * Exemple d’usage:
 *   <span className={getOffertaDotClass(ev)} />
 */
export function getOffertaDotClass(
  e: EventoStatus,
  extraClassName?: string
): string {
  const visual = getVisualOffertaStato(e);
  const base =
    "inline-block w-2.5 h-2.5 rounded-sm " +
    (OFFERTA_COLORS[visual] || "bg-slate-400");

  return extraClassName ? `${base} ${extraClassName}` : base;
}

/**
 * Ancien helper pour Calendario (si tu l’utilises encore) :
 * - type "paid"    -> PAGATO
 * - type "doppio"  -> DA ESEGUIRE avec double pastille
 * - type "simple"  -> stato brut
 */
export function getCalendarBadges(e: EventoStatus) {
  const isPaid = e.saldo_state === "paid";
  const isDaEseguireBozza =
    e.offerta_stato === "da_eseguire" && e.stato === "bozza";

  if (isPaid) {
    return {
      label: "PAGATO",
      type: "paid" as const,
    };
  }

  if (isDaEseguireBozza) {
    return {
      label: "DA ESEGUIRE",
      type: "doppio" as const, // bleu + rouge, si tu veux l’utiliser en Calendario
    };
  }

  return {
    label: (e.stato || "").toUpperCase(),
    type: "simple" as const,
  };
}
