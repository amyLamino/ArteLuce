/* (chemin : /frontend/src/app/anagrafe/materiali/page.tsx) */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Materiale = {
  id: number; nome: string; categoria?: string; sottocategoria?: string;
  prezzo_base?: number; scorta?: number; image_url?: string; is_archived?: boolean;
};

export default function Page() {
  const [rows, setRows] = useState<Materiale[]>([]);
  const [form, setForm] = useState({ nome:"", categoria:"", sottocategoria:"", prezzo_base:"", scorta:"", image_url:"" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await api.get("/materiali/", { params: { ordering: "nome", page_size: 200 } });
    setRows(r.data?.results || r.data || []);
  }
  useEffect(()=>{ load(); },[]);

  async function add(){
    if(!form.nome.trim()) { alert("Inserisci il nome."); return; }
    setBusy(true);
    try{
      const payload = {
        nome: form.nome.trim(),
        categoria: form.categoria || null,
        sottocategoria: form.sottocategoria || null,
        prezzo_base: Number(form.prezzo_base || 0),
        scorta: Number(form.scorta || 0),
        image_url: form.image_url || null,
      };
      await api.post("/materiali/", payload);
      setForm({ nome:"", categoria:"", sottocategoria:"", prezzo_base:"", scorta:"", image_url:"" });
      await load();
    } finally { setBusy(false); }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Materiali — Nuovo</h1>
      <div className="grid grid-cols-6 gap-2 max-w-5xl">
        <input className="border px-2 py-1 col-span-2" placeholder="Nome *" value={form.nome} onChange={e=>setForm({...form, nome:e.target.value})}/>
        <input className="border px-2 py-1" placeholder="Categoria (es. Servizi, Logistica…)" value={form.categoria} onChange={e=>setForm({...form, categoria:e.target.value})}/>
        <input className="border px-2 py-1" placeholder="Sotto-categoria" value={form.sottocategoria} onChange={e=>setForm({...form, sottocategoria:e.target.value})}/>
        <input className="border px-2 py-1 text-right" type="number" step="0.01" placeholder="Prezzo base" value={form.prezzo_base} onChange={e=>setForm({...form, prezzo_base:e.target.value})}/>
        <input className="border px-2 py-1 text-right" type="number" placeholder="Scorta" value={form.scorta} onChange={e=>setForm({...form, scorta:e.target.value})}/>
        <input className="border px-2 py-1 col-span-3" placeholder="URL immagine (facoltativo)" value={form.image_url} onChange={e=>setForm({...form, image_url:e.target.value})}/>
        <button disabled={busy} className="px-3 py-1 border rounded col-span-2" onClick={add}>Aggiungi materiale</button>
      </div>

      <h2 className="text-lg font-semibold mt-4">Elenco</h2>
      <div className="border rounded bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr>
            <th className="text-left px-2 py-1">Nome</th>
            <th className="text-left px-2 py-1">Categoria</th>
            <th className="text-left px-2 py-1">Sottocategoria</th>
            <th className="text-right px-2 py-1">PU</th>
            <th className="text-right px-2 py-1">Scorta</th>
          </tr></thead>
          <tbody>
            {rows.map(m=>(
              <tr key={m.id} className="border-t">
                <td className="px-2 py-1">{m.nome}</td>
                <td className="px-2 py-1">{m.categoria || "—"}</td>
                <td className="px-2 py-1">{m.sottocategoria || "—"}</td>
                <td className="px-2 py-1 text-right">{Number(m.prezzo_base||0).toFixed(2)}</td>
                <td className="px-2 py-1 text-right">{m.scorta ?? 0}</td>
              </tr>
            ))}
            {rows.length===0 && <tr><td className="px-2 py-2 text-slate-500" colSpan={5}>Nessun materiale.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
