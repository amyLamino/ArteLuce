/* /frontend/src/components/LocationSelector.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Props = {
  /** Date sélectionnée (YYYY-MM-DD) */
  dateValue: string;
  /** Emplacement choisi (1..maxSlots) */
  value: number;
  /** Callback lors d’un clic sur un emplacement libre */
  onChange: (v: number) => void;
  /** Désactive toute interaction */
  disabled?: boolean;
  /** Nombre de locations par jour (défaut 8) */
  maxSlots?: number;
  /** Afficher la légende */
  showLegend?: boolean;
  /** Endpoint optionnel pour la dispo (défaut: /calendario/availability) */
  availabilityUrl?: string;
  /**
   * Doit-on changer automatiquement de slot si la location sélectionnée
   * est marquée comme "occupée" dans la dispo ?
   * - true  : utile pour la création rapide (Offerta rapida)
   * - false : édition d’un évènement existant -> on ne touche PAS à la location
   */
  autoReassignIfBusy?: boolean;
};

export function LocationSelector({
  dateValue,
  value,
  onChange,
  disabled,
  maxSlots = 8,
  showLegend = true,
  availabilityUrl = "/calendario/availability",
  autoReassignIfBusy = true,   // 👉 par défaut: comportement actuel
}: Props) {
  const [used, setUsed] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // Liste des slots [1..maxSlots]
  const slots = useMemo(
    () => Array.from({ length: Math.max(1, maxSlots) }, (_, i) => i + 1),
    [maxSlots]
  );

  // Charge les emplacements occupés pour la date donnée
  useEffect(() => {
    let alive = true;

    async function load() {
      if (!dateValue) {
        if (alive) setUsed([]);
        return;
      }
      setLoading(true);
      try {
        const r = await api.get(availabilityUrl, { params: { data: dateValue } });
        if (!alive) return;
        const arr = Array.isArray(r.data?.used) ? r.data.used : [];
        setUsed(arr.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)));
      } catch {
        // en cas d'erreur on réinitialise bien l'état
        if (alive) setUsed([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [dateValue, availabilityUrl]);

  // Si la sélection actuelle devient occupée, on bascule automatiquement
  // sur le premier slot libre — MAIS seulement si autoReassignIfBusy = true
  useEffect(() => {
    if (disabled) return;
    if (!autoReassignIfBusy) return;   // 👈 NE RIEN FAIRE en mode "édition"
    if (!value) return;
    if (!used.includes(value)) return;

    const firstFree = slots.find((s) => !used.includes(s));
    if (firstFree && firstFree !== value) {
      onChange(firstFree);
    }
  }, [used, value, disabled, slots, onChange, autoReassignIfBusy]);

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2"
        role="radiogroup"
        aria-label="Sélection de location"
      >
        <span className="text-sm">LOCATION (1..{maxSlots})</span>

        {slots.map((s) => {
          const busy = used.includes(s);
          const isSelected = s === value;
          const cls =
            "w-8 h-8 border rounded-none text-sm transition outline-none " +
            (isSelected ? "bg-black text-white " : "bg-white ") +
            (busy ? "opacity-60 line-through " : "") +
            (disabled ? "opacity-50 cursor-not-allowed " : "");

          return (
            <button
              key={s}
              type="button"
              className={cls}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={disabled || busy}
              title={busy ? "Occupato" : "Libero"}
              disabled={disabled || busy}
              onClick={() => onChange(s)}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  const idx = slots.indexOf(value);
                  const next = slots.slice(idx + 1).find((n) => !used.includes(n));
                  if (next) onChange(next);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const idx = slots.indexOf(value);
                  const prev = [...slots]
                    .slice(0, idx)
                    .reverse()
                    .find((n) => !used.includes(n));
                  if (prev) onChange(prev);
                }
              }}
            >
              {s}
            </button>
          );
        })}

        {loading ? (
          <span className="ml-2 text-xs text-slate-500">caricamento…</span>
        ) : null}
      </div>

      {showLegend ? (
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm bg-black/80" /> Selezionato
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm bg-slate-300" /> Libero
          </span>
          <span className="inline-flex items-center gap-2 line-through opacity-60">
            <span className="inline-block w-3 h-3 rounded-sm bg-rose-500" /> Occupato
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default LocationSelector;
