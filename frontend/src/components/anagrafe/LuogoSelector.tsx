/* (chemin : /frontend/src/components/anagrafe/LuogoSelector.tsx) */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Opt = { id: number; label: string };

export default function LuogoSelector({
  value,
  label,
  disabled,
  onChange,
  listEndpoint = "/luoghi/",
  createEndpoint = "/luoghi/",
}: {
  value?: number;
  label?: string;
  disabled?: boolean;
  onChange: (id: number, label: string) => void;
  listEndpoint?: string;
  createEndpoint?: string;
}) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<Opt[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // form nuovo luogo
  const [nome, setNome] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [citta, setCitta] = useState("");
  const [cap, setCap] = useState("");
  const [provincia, setProvincia] = useState("");
  const [distanzaAR, setDistanzaAR] = useState<string>("0");

  useEffect(() => {
    if (disabled) return;
    const s = q.trim();
    api
      .get(listEndpoint, { params: s ? { q: s } : {} })
      .then((r) => {
        const arr = Array.isArray(r.data) ? r.data : (r.data?.results ?? []);
        const mapped: Opt[] = arr.map((l: any) => {
          const id = Number(l.id);
          const addr = `${(l.indirizzo ?? "")} ${(l.citta ?? "")}`.trim();
          const base = (l.nome ?? l.label ?? (addr ? addr : undefined));
          const lbl = String(base ?? `#${id}`);
          return { id, label: lbl };
        });
        setOpts(mapped);
      })
      .catch(() => setOpts([]));
  }, [q, listEndpoint, disabled]);

  async function createLuogo() {
    if (!nome.trim()) return alert("Inserisci il nome del luogo.");
    try {
      const payload = {
        nome,
        indirizzo: indirizzo || null,
        citta: citta || null,
        cap: cap || null,
        provincia: provincia || null,
        distanza_km_ar: Number(distanzaAR || 0),
      };
      const r = await api.post(createEndpoint, payload);
      const id = Number(r.data?.id);
      const lbl = String(r.data?.nome ?? nome);
      onChange(id, lbl);
      setCreating(false);
      setQ("");
      setOpts([]);
      setNome("");
      setIndirizzo("");
      setCitta("");
      setCap("");
      setProvincia("");
      setDistanzaAR("0");
    } catch {
      alert("Impossibile creare il luogo.");
    }
  }

  // ✅ Même en mode "disabled", on montre le label + un bouton "+ Nuovo" qui ouvre la modale de création
  if (disabled) {
    return (
      <div className="relative flex items-center gap-2">
        <span className="px-2 py-1 border rounded-none bg-slate-50">
          {label || (value ? `#${value}` : "—")}
        </span>
        <button
          type="button"
          className="px-2 py-1 border rounded-none"
          onClick={() => setCreating(true)}
          title="Crea nuovo luogo"
        >
          + Nuovo
        </button>

        {creating && (
          <div
            className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
            onClick={() => setCreating(false)}
          >
            <div className="bg-white w-[560px] p-4 border" onClick={(e) => e.stopPropagation()}>
              <div className="text-lg font-semibold mb-2">Nuovo luogo</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block col-span-2">
                  <span className="text-sm">Nome</span>
                  <input className="mt-1 w-full border rounded-none px-2 py-1" value={nome} onChange={(e) => setNome(e.target.value)} />
                </label>
                <label className="block col-span-2">
                  <span className="text-sm">Indirizzo</span>
                  <input className="mt-1 w-full border rounded-none px-2 py-1" value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm">Città</span>
                  <input className="mt-1 w-full border rounded-none px-2 py-1" value={citta} onChange={(e) => setCitta(e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm">CAP</span>
                  <input className="mt-1 w-full border rounded-none px-2 py-1" value={cap} onChange={(e) => setCap(e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm">Provincia</span>
                  <input className="mt-1 w-full border rounded-none px-2 py-1" value={provincia} onChange={(e) => setProvincia(e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm">Distanza A/R (km)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className="mt-1 w-full border rounded-none px-2 py-1 text-right"
                    value={distanzaAR}
                    onChange={(e) => setDistanzaAR(e.target.value)}
                  />
                </label>
              </div>
              <div className="mt-3 flex gap-2 justify-end">
                <button className="px-3 py-1 border rounded-none" onClick={() => setCreating(false)}>Annulla</button>
                <button className="px-3 py-1 bg-black text-white rounded-none" onClick={createLuogo}>Crea</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mode interactif (recherche + création)
  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          className="border rounded-none px-2 py-1 w-full"
          placeholder="Cerca luogo…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <button type="button" className="px-2 py-1 border rounded-none" onClick={() => setCreating(true)}>
          + Nuovo
        </button>
      </div>

      {open && (
        <div className="absolute z-10 mt-1 w-full border bg-white max-h-56 overflow-auto">
          {opts.map((o) => (
            <button
              key={o.id}
              type="button"
              className="w-full text-left px-2 py-1 hover:bg-slate-50"
              onClick={() => {
                onChange(o.id, o.label);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
          {opts.length === 0 && <div className="px-2 py-2 text-sm text-slate-500">Nessun risultato.</div>}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setCreating(false)}>
          <div className="bg-white w-[560px] p-4 border" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Nuovo luogo</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block col-span-2">
                <span className="text-sm">Nome</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1" value={nome} onChange={(e) => setNome(e.target.value)} />
              </label>
              <label className="block col-span-2">
                <span className="text-sm">Indirizzo</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1" value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm">Città</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1" value={citta} onChange={(e) => setCitta(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm">CAP</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1" value={cap} onChange={(e) => setCap(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm">Provincia</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1" value={provincia} onChange={(e) => setProvincia(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm">Distanza A/R (km)</span>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  className="mt-1 w-full border rounded-none px-2 py-1 text-right"
                  value={distanzaAR}
                  onChange={(e) => setDistanzaAR(e.target.value)}
                />
              </label>
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <button className="px-3 py-1 border rounded-none" onClick={() => setCreating(false)}>Annulla</button>
              <button className="px-3 py-1 bg-black text-white rounded-none" onClick={createLuogo}>Crea</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
