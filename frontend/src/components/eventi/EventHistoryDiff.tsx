/* /frontend/src/components/eventi/EventHistoryDiff.tsx */
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type HistRow = { id:number; versione:number; updated_at?:string };
type Diff = { modifiche:any[]; aggiunti:any[]; rimossi:any[] };

export default function EventHistoryDiff({eventoId}:{eventoId:number}){
  const [rows,setRows]=useState<HistRow[]>([]);
  const [diff,setDiff]=useState<Diff|null>(null);
  const [target,setTarget]=useState<number|undefined>(undefined);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    api.get(`/eventi/${eventoId}/history`).then(r=> setRows(r.data||[]));
  },[eventoId]);

  async function loadDiff(withId:number){
    setBusy(true);
    const r = await api.get(`/eventi/${eventoId}/diff`,{ params:{ with: withId }});
    setDiff(r.data);
    setTarget(withId);
    setBusy(false);
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-2 py-1">Ref</th>
              <th className="text-left px-2 py-1">Date</th>
              <th className="text-left px-2 py-1">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t">
                <td className="px-2 py-1">ref{r.versione ?? 0}</td>
                <td className="px-2 py-1">{r.updated_at?.slice(0,16).replace("T"," ") || "—"}</td>
                <td className="px-2 py-1">
                  <button className="px-2 py-0.5 border rounded"
                          onClick={()=>loadDiff(r.id)} disabled={busy && target===r.id}>
                    {busy && target===r.id ? "…" : "Voir diff"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length===0 && <tr><td className="px-2 py-2 text-slate-500" colSpan={3}>Aucune révision.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="border rounded p-2">
        <div className="font-semibold mb-1">Différence</div>
        {!diff ? (
          <div className="text-sm text-slate-500">Sélectionne une révision pour voir le diff.</div>
        ) : (
          <div className="text-sm space-y-2">
            <Section title="Modifiés" items={diff.modifiche}/>
            <Section title="Ajoutés" items={diff.aggiunti}/>
            <Section title="Supprimés" items={diff.rimossi}/>
          </div>
        )}
      </div>
    </div>
  );
}
function Section({title, items}:{title:string; items:any[]}) {
  return (
    <div>
      <div className="font-medium">{title}</div>
      <ul className="list-disc ml-5">
        {items?.length ? items.map((m,i)=><li key={i}><code>{JSON.stringify(m)}</code></li>) : <li>—</li>}
      </ul>
    </div>
  );
}
