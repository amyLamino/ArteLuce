/* /frontend/src/components/offerta/SuggerisciTecnicoMezzi.tsx */
"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function SuggerisciTecnicoMezzi({ onPick }:{ onPick:(items:{materiale_id:number; qta:number}[])=>void }){
  const [guests,setGuests]=useState(120);
  const [km,setKm]=useState(20);
  const [allest,setAllest]=useState(10);
  const [busy,setBusy]=useState(false);
  const [res,setRes]=useState<any>(null);

  async function run(){
    setBusy(true);
    const r = await api.get("/suggestions",{ params:{ guests, km, allestimenti: allest }});
    setRes(r.data);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input type="number" value={guests} onChange={e=>setGuests(+e.target.value)} className="border px-2 py-1" placeholder="Ospiti"/>
        <input type="number" value={km} onChange={e=>setKm(+e.target.value)} className="border px-2 py-1" placeholder="Km"/>
        <input type="number" value={allest} onChange={e=>setAllest(+e.target.value)} className="border px-2 py-1" placeholder="Allest."/>
        <button onClick={run} disabled={busy} className="border px-3 py-1">{busy?"Calcolo…":"Suggerisci (Tecnico/Mezzi)"}</button>
      </div>
      {res?.suggerimenti?.length ? (
        <ul className="text-sm">
          {res.suggerimenti.map((s:any)=>(
            <li key={`${s.categoria}-${s.materiale_id}`} className="flex items-center gap-2">
              <span className="px-1 rounded bg-slate-100">{s.categoria}</span>
              <span className="font-medium">{s.nome}</span>
              <span className="text-xs text-slate-500">x{s.qta}</span>
              <button className="ml-2 text-blue-600 underline" onClick={()=>onPick([{materiale_id:s.materiale_id, qta:s.qta}])}>Aggiungi</button>
            </li>
          ))}
        </ul>
      ):null}
    </div>
  );
}
