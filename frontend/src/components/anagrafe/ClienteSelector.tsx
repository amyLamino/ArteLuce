/* (chemin : /frontend/src/components/anagrafe/ClienteSelector.tsx) */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Opt = { id: number; label: string };

export default function ClienteSelector({
  value,
  label,
  disabled,
  onChange,
  listEndpoint = "/clienti/",
  createEndpoint = "/clienti/",
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

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  useEffect(() => {
    if (disabled) return;
    const s = q.trim();
    api
      .get(listEndpoint, { params: s ? { q: s } : {} })
      .then((r) => {
        const arr = Array.isArray(r.data) ? r.data : (r.data?.results ?? []);
        const mapped: Opt[] = arr.map((c: any) => ({
          id: Number(c.id),
          label: String(c.nome ?? c.ragione_sociale ?? c.label ?? `#${c.id}`),
        }));
        setOpts(mapped);
      })
      .catch(() => setOpts([]));
  }, [q, listEndpoint, disabled]);

  async function createCliente() {
    if (!nome.trim()) return alert("Inserisci il nome cliente.");
    try {
      const payload = { nome, email: email || null, telefono: telefono || null };
      const r = await api.post(createEndpoint, payload);
      const id = Number(r.data?.id);
      const lbl = String(r.data?.nome ?? nome);
      onChange(id, lbl);
      setCreating(false);
      setQ("");
      setOpts([]);
      setNome("");
      setEmail("");
      setTelefono("");
    } catch {
      alert("Impossibile creare il cliente.");
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
          title="Crea nuovo cliente"
        >
          + Nuovo
        </button>

        {creating && (
          <div
            className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
            onClick={() => setCreating(false)}
          >
            <div className="bg-white w-[520px] p-4 border" onClick={(e) => e.stopPropagation()}>
              <div className="text-lg font-semibold mb-2">Nuovo cliente</div>
              <div className="space-y-2">
                <label className="block">
                  <span className="text-sm">Nome / Ragione sociale</span>
                  <input className="mt-1 w-full border rounded-none px-2 py-1" value={nome} onChange={(e) => setNome(e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm">Email</span>
                  <input className="mt-1 w-full border rounded-none px-2 py-1" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm">Telefono</span>
                  <input className="mt-1 w-full border rounded-none px-2 py-1" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                </label>
              </div>
              <div className="mt-3 flex gap-2 justify-end">
                <button className="px-3 py-1 border rounded-none" onClick={() => setCreating(false)}>Annulla</button>
                <button className="px-3 py-1 bg-black text-white rounded-none" onClick={createCliente}>Crea</button>
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
          placeholder="Cerca cliente…"
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
          <div className="bg-white w-[520px] p-4 border" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Nuovo cliente</div>
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm">Nome / Ragione sociale</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1" value={nome} onChange={(e) => setNome(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm">Email</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm">Telefono</span>
                <input className="mt-1 w-full border rounded-none px-2 py-1" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </label>
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <button className="px-3 py-1 border rounded-none" onClick={() => setCreating(false)}>Annulla</button>
              <button className="px-3 py-1 bg-black text-white rounded-none" onClick={createCliente}>Crea</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
