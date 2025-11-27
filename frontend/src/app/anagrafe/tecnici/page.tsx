/* (chemin : /frontend/src/app/anagrafe/tecnici/page.tsx) */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Page(){
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ nome:"", email:"", telefono:"", note:"" });

  async function load(){ const r = await api.get("/tecnici/"); setRows(r.data?.results || r.data || []); }
  useEffect(()=>{ load(); },[]);

  async function add(){
    if(!form.nome.trim()) return alert("Inserisci il nome del tecnico.");
    await api.post("/tecnici/", { ...form, email: form.email || null, telefono: form.telefono || null, note: form.note || null });
    setForm({ nome:"", email:"", telefono:"", note:"" });
    load();
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Tecnici</h1>
      <div className="grid grid-cols-5 gap-2 max-w-3xl">
        <input className="border px-2 py-1" placeholder="Nome *" value={form.nome} onChange={e=>setForm({...form, nome:e.target.value})}/>
        <input className="border px-2 py-1" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
        <input className="border px-2 py-1" placeholder="Telefono" value={form.telefono} onChange={e=>setForm({...form, telefono:e.target.value})}/>
        <input className="border px-2 py-1 col-span-2" placeholder="Note" value={form.note} onChange={e=>setForm({...form, note:e.target.value})}/>
        <button className="px-3 py-1 border rounded col-span-2" onClick={add}>Aggiungi</button>
      </div>

      <div className="border rounded bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr><th className="text-left px-2 py-1">Nome</th><th className="text-left px-2 py-1">Email</th><th className="text-left px-2 py-1">Telefono</th></tr>
          </thead>
          <tbody>
            {rows.map((t:any)=>(
              <tr key={t.id} className="border-t">
                <td className="px-2 py-1">{t.nome}</td>
                <td className="px-2 py-1">{t.email || "—"}</td>
                <td className="px-2 py-1">{t.telefono || "—"}</td>
              </tr>
            ))}
            {rows.length===0 && <tr><td className="px-2 py-2 text-slate-500" colSpan={3}>Nessun tecnico.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
