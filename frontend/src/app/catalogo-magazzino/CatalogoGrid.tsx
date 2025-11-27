/* /frontend/src/app/catalogo-magazzino/CatalogoGrid.tsx */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Item = { id:number; nome:string; categoria?:string; prezzo_base?:number; immagine_url?:string };

export default function CatalogoGrid(){
  const [items,setItems] = useState<Item[]>([]);
  const [q,setQ] = useState("");

  useEffect(()=>{ api.get("/catalogo/materiali").then(r=> setItems(r.data||[])); },[]);

  const filtered = items.filter(i=> i.nome.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cerca…" className="border rounded px-2 py-1"/>
        <span className="text-xs text-gray-500">{filtered.length} elementi</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {filtered.map(i=>(
          <div key={i.id} className="border rounded-lg p-2 hover:shadow transition">
            <div className="aspect-video bg-gray-50 rounded overflow-hidden">
              {i.immagine_url ? <img src={i.immagine_url} className="w-full h-full object-cover"/> : null}
            </div>
            <div className="mt-2 text-sm font-medium">{i.nome}</div>
            <div className="text-xs text-gray-500">{i.categoria || "-"}</div>
            <div className="text-sm">{fmtEur(i.prezzo_base)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function fmtEur(n?:number){ return n==null ? "—" : n.toLocaleString("it-IT",{style:"currency",currency:"EUR"}); }
