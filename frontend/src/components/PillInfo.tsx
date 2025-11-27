/* /frontend/src/components/PillInfo.tsx */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Item = { date:string; used:number; free:number; status:"ok"|"warn"|"ko" };

export default function PillInfo({
  materialeId, from, days, onClose
}: { materialeId:number; from:string; days:number; onClose:()=>void }) {
  const [rows, setRows] = useState<Item[]>([]);
  useEffect(()=>{
    const end = new Date(from);
    end.setDate(end.getDate() + (days-1));
    const to = end.toISOString().slice(0,10);
    api.get(`/magazzino/status?from=${from}&to=${to}&materials=${materialeId}`)
      .then(r=> setRows(r.data || []));
  }, [materialeId, from, days]);

  return (
    <div className="fixed right-0 top-0 h-full w-[380px] bg-white shadow-2xl p-4 overflow-auto z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Disponibilità</h3>
        <button className="px-2 py-1 border" onClick={onClose}>Chiudi</button>
      </div>
      <ul className="space-y-2">
        {rows.map(r=>(
          <li key={r.date} className="flex items-center justify-between text-sm">
            <span className="font-medium">{r.date}</span>
            <span className="inline-flex items-center gap-2">
              <span title={r.status}
                className={`w-3 h-3 rounded-sm ${r.status==="ok"?"bg-emerald-400":r.status==="warn"?"bg-amber-400":"bg-rose-400"}`} />
              <span>pren.: {r.used}</span>
              <span>liberi: {r.free}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
