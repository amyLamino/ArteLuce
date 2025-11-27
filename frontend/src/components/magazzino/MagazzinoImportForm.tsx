/* /frontend/src/components/magazzino/MagazzinoImportForm.tsx */
"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function MagazzinoImportForm(){
  const [file, setFile] = useState<File|null>(null);
  const [msg, setMsg] = useState<string>("");

  async function handleSubmit(e:any){
    e.preventDefault();
    if(!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post("/magazzino/import", fd, { headers:{"Content-Type":"multipart/form-data"} });
    setMsg(`Caricato con successo — creati: ${res.data.created}, aggiornati: ${res.data.updated}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <input type="file" accept=".csv" onChange={e=> setFile(e.target.files?.[0] || null)} />
      <button className="px-3 py-2 border rounded">Importa</button>
      {msg && <span className="text-emerald-600 text-sm">{msg}</span>}
    </form>
  );
}
