"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function QuickNewItem({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"mat" | "tec" | "mez">("mat");

  const [nome, setNome] = useState("");
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  const [scorta, setScorta] = useState<number>(1);

  // prix : pour Matériel = €/pz, pour Tecnico = €/h, pour Mezzo = €/km
  const [prezzo, setPrezzo] = useState<string>("0");

  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    try {
      if (tab === "mat") {
        await api.post("/materiali/", {
          nome,
          categoria: cat || null,
          sottocategoria: sub || null,
          scorta: Number(scorta || 0),
          prezzo_base: Number(prezzo || 0),
          is_tecnico: false,
          is_messo: false,
        });
      } else if (tab === "tec") {
        // backend forcera is_tecnico = True
        await api.post("/tecnici/", {
          nome,
          prezzo_base: Number(prezzo || 0),
        });
      } else {
        // backend forcera is_messo = True
        await api.post("/mezzi/", {
          nome,
          prezzo_base: Number(prezzo || 0),
        });
      }

      // reset + fermer
      setNome(""); setCat(""); setSub(""); setScorta(1); setPrezzo("0");
      setOpen(false);
      onCreated?.();
    } catch {
      setErr("Impossibile salvare.");
    }
  }

  return (
    <>
      <button className="px-3 py-2 border rounded-none" onClick={() => setOpen(true)}>
        + Nuovo
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className="bg-white w-[560px] p-4 border rounded-none" onClick={e => e.stopPropagation()}>
            <div className="flex gap-2 mb-3">
              <button className={"px-2 py-1 border rounded-none " + (tab==="mat"?"bg-black text-white":"")} onClick={()=>setTab("mat")}>Materiale</button>
              <button className={"px-2 py-1 border rounded-none " + (tab==="tec"?"bg-black text-white":"")} onClick={()=>setTab("tec")}>Tecnico (€/h)</button>
              <button className={"px-2 py-1 border rounded-none " + (tab==="mez"?"bg-black text-white":"")} onClick={()=>setTab("mez")}>Mezzo (€/km)</button>
            </div>

            <label className="block mb-2">
              <span className="text-sm">Nome</span>
              <input className="mt-1 w-full border rounded-none px-2 py-1" value={nome} onChange={e=>setNome(e.target.value)} />
            </label>

            {tab === "mat" && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                <label className="block">
                  <span className="text-sm">Categoria</span>
                  <input className="mt-1 w-full border rounded-none px-2 py-1" value={cat} onChange={e=>setCat(e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm">Sottocategoria</span>
                  <input className="mt-1 w-full border rounded-none px-2 py-1" value={sub} onChange={e=>setSub(e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm">Scorta iniziale</span>
                  <input type="number" min={0} className="mt-1 w-full border rounded-none px-2 py-1 text-right"
                         value={scorta} onChange={e=>setScorta(Number(e.target.value)||0)} />
                </label>
              </div>
            )}

            <label className="block mb-1">
              <span className="text-sm">
                {tab === "tec" ? "Costo orario (€/h)" : tab === "mez" ? "Costo chilometrico (€/km)" : "Prezzo unità (provv.)"}
              </span>
              <input type="number" step="0.01" className="mt-1 w-full border rounded-none px-2 py-1 text-right"
                     value={prezzo} onChange={e=>setPrezzo(e.target.value)} />
            </label>

            {err && <div className="text-sm text-rose-600 mt-2">{err}</div>}

            <div className="mt-3 flex gap-2 justify-end">
              <button className="px-3 py-1 border rounded-none" onClick={()=>setOpen(false)}>Annulla</button>
              <button className="px-3 py-1 bg-black text-white rounded-none" onClick={save}>Salva</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
