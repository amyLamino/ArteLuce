/* (chemin : /frontend/src/components/StockPills.tsx) */
"use client";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { api } from "@/lib/api";

type Item = { date:string; used:number; free:number; status:"ok"|"warn"|"ko" };
export default function StockPills({
  materialeId, from, days,
}: { materialeId:number; from:string; days:number; }) {
  const [data, setData] = useState<Item[]>([]);
  useEffect(()=>{
    const start = dayjs(from);
    const to = start.add(days-1, "day").format("YYYY-MM-DD");
    api.get(`/magazzino/status?from=${from}&to=${to}&materials=${materialeId}`)
      .then(r=>{
        const mat = (r.data.materials||[])[0];
        setData((mat?.by_day||[]) as Item[]);
      });
  },[materialeId, from, days]);
  function color(s:"ok"|"warn"|"ko"){ return s==="ok"?"bg-emerald-400":s==="warn"?"bg-amber-400":"bg-rose-400"; }
  return (
    <div className="flex gap-1">
      {data.map(d=>(
        <button key={d.date}
          title={`${d.date} • used: ${d.used} • free: ${d.free}`}
          className={`w-3 h-3 ${color(d.status)} rounded-sm`}
          onClick={()=>alert(`${d.date}\nUtilisés: ${d.used}\nLibres: ${d.free}`)}
        />
      ))}
    </div>
  );
}
