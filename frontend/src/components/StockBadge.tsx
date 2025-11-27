/* (chemin : /frontend/src/components/StockBadge.tsx) */
"use client";

export type StockLevel = "ok" | "warn" | "danger";

export const LOW_STOCK_PERCENT = 0.2;   // 20% de la scorta
export const LOW_STOCK_ABS = 3;         // OU 3 pièces max

export function computeStockLevel(scorta: number, dispon: number): StockLevel {
  const s = Number(scorta || 0);
  const d = Number(dispon || 0);

  if (d <= 0) return "danger";
  if (s <= 0) return "danger";

  const ratio = d / s;
  if (d <= LOW_STOCK_ABS || ratio <= LOW_STOCK_PERCENT) {
    return "warn";
  }
  return "ok";
}

export function StockBadge({
  scorta,
  dispon,
  className = "",
}: {
  scorta: number;
  dispon: number;
  className?: string;
}) {
  const level = computeStockLevel(scorta, dispon);

  const map = {
    ok: {
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      label: "OK",
    },
    warn: {
      dot: "bg-amber-500",
      text: "text-amber-700",
      label: "Bassa scorta",
    },
    danger: {
      dot: "bg-red-500",
      text: "text-red-700",
      label: "Esaurito",
    },
  }[level];

  return (
    <span
      className={
        "inline-flex items-center gap-1 px-2 py-0.5 border rounded-none text-xs " +
        map.text +
        " " +
        className
      }
    >
      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${map.dot}`} />
      <span>{map.label}</span>
      <span className="ml-1 text-[10px] text-slate-500">
        ({dispon}/{scorta})
      </span>
    </span>
  );
}
