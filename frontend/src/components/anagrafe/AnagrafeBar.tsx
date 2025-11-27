/* (chemin : /frontend/src/components/anagrafe/AnagrafeBar.tsx) */
"use client";

import { useState } from "react";
import { api } from "@/lib/api";

type Props = {
  clienteId?: number;
  clienteLabel?: string;
  onClienteCreated?: (id: number, label: string) => void;

  luogoId?: number;
  luogoLabel?: string;
  onLuogoCreated?: (id: number, label: string) => void;
};

export default function AnagrafeBar({
  clienteId,
  clienteLabel,
  onClienteCreated,
  luogoId,
  luogoLabel,
  onLuogoCreated,
}: Props) {
  // Client
  const [showNewCliente, setShowNewCliente] = useState(false);
  const [newCliNome, setNewCliNome] = useState("");
  const [newCliEmail, setNewCliEmail] = useState("");
  const [newCliTel, setNewCliTel] = useState("");

  // Luogo
  const [showNewLuogo, setShowNewLuogo] = useState(false);
  const [newLuoNome, setNewLuoNome] = useState("");
  const [newLuoInd, setNewLuoInd] = useState("");
  const [newLuoCitta, setNewLuoCitta] = useState("");
  const [newLuoCap, setNewLuoCap] = useState("");
  const [newLuoProv, setNewLuoProv] = useState("");
  const [newLuoDistAR, setNewLuoDistAR] = useState("0");

  async function createClienteQuick() {
    if (!newCliNome.trim()) return alert("Inserisci il nome cliente.");
    const r = await api.post("/clienti/", {
      nome: newCliNome,
      email: newCliEmail || null,
      telefono: newCliTel || null,
    });
    const id = Number(r.data?.id);
    const lbl = String(r.data?.nome ?? newCliNome);
    onClienteCreated?.(id, lbl);
    setShowNewCliente(false);
    setNewCliNome(""); setNewCliEmail(""); setNewCliTel("");
  }

  async function createLuogoQuick() {
    if (!newLuoNome.trim()) return alert("Inserisci il nome del luogo.");
    const r = await api.post("/luoghi/", {
      nome: newLuoNome,
      indirizzo: newLuoInd || null,
      citta: newLuoCitta || null,
      cap: newLuoCap || null,
      provincia: newLuoProv || null,
      distanza_km_ar: Number(newLuoDistAR || 0),
    });
    const id = Number(r.data?.id);
    const lbl = String(r.data?.nome ?? newLuoNome);
    onLuogoCreated?.(id, lbl);
    setShowNewLuogo(false);
    setNewLuoNome(""); setNewLuoInd(""); setNewLuoCitta("");
    setNewLuoCap(""); setNewLuoProv(""); setNewLuoDistAR("0");
  }

  return (
    <>
      {/* Barre Anagrafe */}
      <div className="p-3 bg-slate-50 border rounded-md">
        <div className="flex flex-wrap items-center gap-6">
          {/* Cliente */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Cliente</span>
            <span className="px-2 py-1 border bg-white rounded-none min-w-[160px]">
              {clienteLabel || (clienteId ? `#${clienteId}` : "—")}
            </span>
            <button className="px-2 py-1 border rounded-none" onClick={() => setShowNewCliente(true)}>
              + Nuovo
            </button>
          </div>

          {/* Luogo */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Luogo</span>
            <span className="px-2 py-1 border bg-white rounded-none min-w-[160px]">
              {luogoLabel || (luogoId ? `#${luogoId}` : "—")}
            </span>
            <button className="px-2 py-1 border rounded-none" onClick={() => setShowNewLuogo(true)}>
              + Nuovo
            </button>
          </div>
        </div>
      </div>

      {/* Modale — Nuovo cliente */}
      {showNewCliente && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => setShowNewCliente(false)}>
          <div className="bg-white w-[520px] p-4 border" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Nuovo cliente</div>
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm">Nome / Ragione sociale</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1"
                  value={newCliNome} onChange={(e)=>setNewCliNome(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm">Email</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1"
                  value={newCliEmail} onChange={(e)=>setNewCliEmail(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm">Telefono</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1"
                  value={newCliTel} onChange={(e)=>setNewCliTel(e.target.value)} />
              </label>
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <button className="px-3 py-1 border rounded-none" onClick={() => setShowNewCliente(false)}>Annulla</button>
              <button className="px-3 py-1 bg-black text-white rounded-none" onClick={createClienteQuick}>Crea</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale — Nuovo luogo */}
      {showNewLuogo && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => setShowNewLuogo(false)}>
          <div className="bg-white w-[560px] p-4 border" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Nuovo luogo</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block col-span-2">
                <span className="text-sm">Nome</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1"
                  value={newLuoNome} onChange={(e)=>setNewLuoNome(e.target.value)} />
              </label>
              <label className="block col-span-2">
                <span className="text-sm">Indirizzo</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1"
                  value={newLuoInd} onChange={(e)=>setNewLuoInd(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm">Città</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1"
                  value={newLuoCitta} onChange={(e)=>setNewLuoCitta(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm">CAP</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1"
                  value={newLuoCap} onChange={(e)=>setNewLuoCap(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm">Provincia</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1"
                  value={newLuoProv} onChange={(e)=>setNewLuoProv(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm">Distanza A/R (km)</span>
                <input type="number" min={0} step="0.1"
                  className="mt-1 w-full border rounded-none px-2 py-1 text-right"
                  value={newLuoDistAR} onChange={(e)=>setNewLuoDistAR(e.target.value)} />
              </label>
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <button className="px-3 py-1 border rounded-none" onClick={() => setShowNewLuogo(false)}>Annulla</button>
              <button className="px-3 py-1 bg-black text-white rounded-none" onClick={createLuogoQuick}>Crea</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
