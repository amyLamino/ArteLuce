/* (chemin : /frontend/src/components/EventStockBadge.tsx) */
"use client";

import React from "react";
import { StockBadge } from "@/components/StockBadge";

type Props = {
  /**
   * Stock total disponible (scorta totale) sur le magazzino
   * pour les matériels liés à l’evento.
   */
  total_scorta?: number;

  /**
   * Quantità totale déjà utilisée pour cet événement
   * (somme des qta des righe).
   */
  total_used?: number;

  /**
   * Quantità totale encore libre (facultatif, on peut la recalculer).
   */
  total_free?: number;

  /**
   * Petit texte optionnel à côté de la pastille
   * (par ex. "Stock", "Magazzino", etc.).
   */
  label?: string;
};

export default function EventStockBadge({
  total_scorta,
  total_used,
  total_free,
  label,
}: Props) {
  const scorta = Number(total_scorta ?? 0);
  const used = Number(total_used ?? 0);

  // Si le backend ne renvoie pas déjà total_free,
  // on recalcule: free = scorta - used (min 0)
  const free =
    total_free != null
      ? Number(total_free)
      : Math.max(0, scorta - used);

  // On réutilise la même pastille que dans le magazzino/catalogo
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <StockBadge scorta={scorta} dispon={free} />
      {label ? (
        <span className="text-slate-600">
          {label}
        </span>
      ) : null}
    </span>
  );
}
