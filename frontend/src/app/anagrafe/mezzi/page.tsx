/* (chemin : /frontend/src/app/anagrafe/mezzi/page.tsx) */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Page(){
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ targa:"", descrizione:"", costo_km:"0", costo_uscita:"0", attivo:true });

  async function load(){ const r = await api.get("/mezzi/"); setRows(r.data?.results || r.data || []); }
  useEffect(()=>{ load(); },[]);

  async function add(){
    if(!form.targa.trim()) return alert("Inserisci la targa.");
    await api.post("/mezzi/", {
      targa: form.targa.trim(),
      descrizione: form.descrizione || "",
      costo_km: Number(form.costo_km || 0),
      costo_uscita: Number(form.costo_uscita || 0),
      attivo: !!form.attivo,
    });
    setForm({ targa:"", descrizione:"", costo_km:"0", costo_uscita:"0", attivo:true });
    load();
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Mezzi</h1>
      <div className="grid grid-cols-6 gap-2 max-w-4xl">
        <input className="border px-2 py-1" placeholder="Targa *" value={form.targa} onChange={e=>setForm({...form, targa:e.target.value})}/>
        <input className="border px-2 py-1 col-span-2" placeholder="Descrizione" value={form.descrizione} onChange={e=>setForm({...form, descrizione:e.target.value})}/>
        <input className="border px-2 py-1 text-right" type="number" step="0.01" placeholder="€/km" value={form.costo_km} onChange={e=>setForm({...form, costo_km:e.target.value})}/>
        <input className="border px-2 py-1 text-right" type="number" step="0.01" placeholder="Costo uscita" value={form.costo_uscita} onChange={e=>setForm({...form, costo_uscita:e.target.value})}/>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.attivo} onChange={e=>setForm({...form, attivo:e.target.checked})}/>
          Attivo
        </label>
        <button className="px-3 py-1 border rounded col-span-2" onClick={add}>Aggiungi mezzo</button>
      </div>

      <div className="border rounded bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr><th className="text-left px-2 py-1">Targa</th><th className="text-left px-2 py-1">Descrizione</th><th className="text-right px-2 py-1">€/km</th><th className="text-right px-2 py-1">Uscita €</th><th className="text-left px-2 py-1">Stato</th></tr>
          </thead>
          <tbody>
            {rows.map((m:any)=>(
              <tr key={m.id} className="border-t">
                <td className="px-2 py-1">{m.targa}</td>
                <td className="px-2 py-1">{m.descrizione || "—"}</td>
                <td className="px-2 py-1 text-right">{Number(m.costo_km||0).toFixed(2)}</td>
                <td className="px-2 py-1 text-right">{Number(m.costo_uscita||0).toFixed(2)}</td>
                <td className="px-2 py-1">{m.attivo ? "attivo" : "non attivo"}</td>
              </tr>
            ))}
            {rows.length===0 && <tr><td className="px-2 py-2 text-slate-500" colSpan={5}>Nessun mezzo.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
