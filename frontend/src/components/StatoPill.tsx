/* (chemin : /frontend/src/components/StatoPill.tsx) */
/* /frontend/src/components/StockPills.tsx  (remplace l’alert par l’ouverture du panneau) */
"use client";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import PillInfo from "./PillInfo";

type Item = { date:string; used:number; free:number; status:"ok"|"warn"|"ko" };

export default function StockPills({
  materialeId, from, days,
}: { materialeId:number; from:string; days:number; }) {
  const [data, setData] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(()=>{
    const start = dayjs(from);
    const to = start.add(days-1, "day").format("YYYY-MM-DD");
    api.get(`/magazzino/status?from=${from}&to=${to}&materials=${materialeId}`)
      .then(r=> setData(r.data || []));
  },[materialeId, from, days]);

  function color(s:"ok"|"warn"|"ko"){ return s==="ok"?"bg-emerald-400":s==="warn"?"bg-amber-400":"bg-rose-400"; }

  return (
    <>
      <div className="flex gap-1">
        {data.map(d=>(
          <button key={d.date}
            title={`${d.date} • prenotati: ${d.used} • liberi: ${d.free}`}
            className={`w-3 h-3 ${color(d.status)} rounded-sm`}
            onClick={()=> setOpen(true)}
          />
        ))}
      </div>
      {open && <PillInfo materialeId={materialeId} from={from} days={days} onClose={()=>setOpen(false)} />}
    </>
  );
}


export function StatoPill({ stato }: { stato: string }) {
  const cls: Record<string,string> = {
    bozza: "bg-gray-300 text-gray-900",
    confermato: "bg-green-300 text-green-900",
    annullato: "bg-red-300 text-red-900",
    fatturato: "bg-blue-300 text-blue-900",
  };
  return <span className={"inline-flex items-center px-2 py-0.5 text-xs font-medium border border-black/10 rounded-none " + (cls[stato] || "bg-slate-300")}>{stato}</span>
}
