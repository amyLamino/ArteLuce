// /frontend/src/components/EventoMultiDayPill.tsx
"use client";

import dayjs from "dayjs";
import { getEventoDurationDays, EventoLike } from "@/lib/eventoDuration";

type Props = {
  evento: EventoLike;
};

/**
 * Pastille bleue "X giorni" pour les événements multi-jours.
 * - Affichée seulement si la durée > 1 jour
 * - Click → affiche un petit popup avec les dates DA / A
 */
export default function EventoMultiDayPill({ evento }: Props) {
  const days = getEventoDurationDays(evento);
  if (!days || days <= 1) return null;

  const da = (evento as any).data_evento_da || (evento as any).data_evento;
  const a = (evento as any).data_evento_a || (evento as any).data_evento;

  const daLabel = da ? dayjs(da).format("DD/MM/YYYY") : "?";
  const aLabel = a ? dayjs(a).format("DD/MM/YYYY") : "?";

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation(); // ne pas déclencher le clic sur le lien autour
    alert(
      `${(evento as any).titolo || "Evento"}\n` +
        `Copre ${days} giorni:\n` +
        `Dal ${daLabel} al ${aLabel}`
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center px-2 py-[2px] rounded-full text-[11px] font-medium
                 bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 ml-1"
      title={`Evento su ${days} giorni (dal ${daLabel} al ${aLabel})`}
    >
      {days} giorni
    </button>
  );
}
