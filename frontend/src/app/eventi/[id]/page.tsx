/* (chemin : /frontend/src/app/eventi/[id]/page.tsx) */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { LocationSelector } from "@/components/LocationSelector";
import CatalogoSelector from "@/components/CatalogoSelector";
import { Toast, useToast } from "@/components/Toast";
import SnapCompare from "./SnapCompare";

import EventoMultiDayPill from "@/components/EventoMultiDayPill";

/* ---------- Types ---------- */
type Riga = {
  id?: number;
  materiale: number;
  materiale_nome?: string;
  qta: number;
  prezzo: number;
  importo: number;
  is_tecnico?: boolean;
  is_trasporto?: boolean;
  copertura_giorni?: number;
};

type Evento = {
  id: number;
  titolo: string;
  data_evento: string; // "YYYY-MM-DD"
  location_index: number; // 1..8
  stato: "bozza" | "confermato" | "annullato" | "fatturato";
  cliente: number;
  cliente_nome?: string;
  luogo: number;
  luogo_nome?: string;
  versione: number;
  acconto_importo?: number | string | null;
  acconto_data?: string | null;
  note?: string | null; // note globale
  righe: Riga[];
  categoria_notes?: Record<string, string>; // notes par catégorie
};

type Revision = { ref: number; created_at: string; payload: Partial<Evento> };

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/* ---------- UI helpers ---------- */
const STATO_COLORS: Record<Evento["stato"], string> = {
  bozza: "bg-blue-400",
  confermato: "bg-emerald-500",
  annullato: "bg-rose-500",
  fatturato: "bg-amber-400",
};
const StatoPill = ({ v }: { v: Evento["stato"] }) => (
  <span className={`inline-block w-3 h-3 rounded-sm mr-2 ${STATO_COLORS[v]}`} />
);
const euro = (n: number) => `${n.toFixed(2)} €`;

/* ---------- Métadonnées matériel ---------- */
type MatMeta = { categoria: string; sottocategoria: string };
const FALLBACK_META: MatMeta = {
  categoria: "— Senza categoria —",
  sottocategoria: "— Senza sottocategoria —",
};

async function fetchMatMeta(id: number): Promise<MatMeta> {
  try {
    const r = await api.get(`/materiali/${id}/`);
    const cat =
      r.data?.categoria_nome || r.data?.categoria || FALLBACK_META.categoria;
    const sub =
      r.data?.sottocategoria_nome ||
      r.data?.sottocategoria ||
      FALLBACK_META.sottocategoria;
    return { categoria: String(cat), sottocategoria: String(sub) };
  } catch {
    return FALLBACK_META;
  }
}

/* ---------- Diff helpers ---------- */
type DiffGroups = { changed: string[]; added: string[]; removed: string[] };

function fmtAcconto(importo?: number | string | null, data?: string | null) {
  const n = Number(importo || 0);
  const left = n ? `${n.toFixed(2)} €` : "—";
  const right = data ? ` (${data})` : "";
  return `${left}${n ? right : ""}`;
}

/** Clé robuste : priorise l'id de la ligne, sinon (materiale, prezzo normalisé) */
function lineKey(r: any): string {
  if (r && r.id != null) return `id#${r.id}`;
  const mid = r?.materiale ?? "";
  const pu = Number(r?.prezzo ?? 0);
  return `mat#${mid}@pu#${pu.toFixed(2)}`;
}

function humanDiffGrouped(a?: Partial<Evento>, b?: Partial<Evento>): DiffGroups {
  const out: DiffGroups = { changed: [], added: [], removed: [] };
  if (!a || !b) return out;

  const val = (o: any, k: keyof Evento) => (o && o[k] != null ? o[k] : "");

  const pushChanged = (label: string, oldV: string, newV: string) => {
    if (oldV !== newV) out.changed.push(`• ${label}: “${oldV}” → “${newV}”`);
  };

  // champs simples
  pushChanged("stato", String(val(a, "stato")), String(val(b, "stato")));
  pushChanged("titolo", String(val(a, "titolo")), String(val(b, "titolo")));
  pushChanged(
    "data",
    String(val(a, "data_evento")),
    String(val(b, "data_evento"))
  );
  pushChanged(
    "location",
    String(val(a, "location_index")),
    String(val(b, "location_index"))
  );

  const aAcc = fmtAcconto(a.acconto_importo as any, a.acconto_data as any);
  const bAcc = fmtAcconto(b.acconto_importo as any, b.acconto_data as any);
  if (aAcc !== bAcc) out.changed.push(`• acconto: “${aAcc}” → “${bAcc}”`);

  // lignes
  const aRighe: any[] = Array.isArray(a.righe) ? a.righe : [];
  const bRighe: any[] = Array.isArray(b.righe) ? b.righe : [];

  const A = new Map<string, any>(aRighe.map((r) => [lineKey(r), r]));
  const B = new Map<string, any>(bRighe.map((r) => [lineKey(r), r]));

  for (const [k, rA] of A.entries()) {
    const rB = B.get(k);
    const nomeA = rA.materiale_nome || `#${rA.materiale}`;
    const puA = Number(rA.prezzo ?? 0);
    if (!rB) {
      out.removed.push(`• ${nomeA} @${puA.toFixed(2)}: -${rA.qta}`);
      continue;
    }
    const qA = Number(rA.qta ?? 0);
    const qB = Number(rB.qta ?? 0);
    const puB = Number(rB.prezzo ?? 0);
    if (qA !== qB || puA !== puB) {
      const nome = rB.materiale_nome || nomeA;
      out.changed.push(
        `• ${nome}: qté ${qA} → ${qB}` +
          (puA !== puB ? `, PU ${puA.toFixed(2)} → ${puB.toFixed(2)}` : "")
      );
    }
  }

  for (const [k, rB] of B.entries()) {
    if (!A.has(k)) {
      const nome = rB.materiale_nome || `#${rB.materiale}`;
      const pu = Number(rB.prezzo ?? 0);
      out.added.push(`• ${nome} @${pu.toFixed(2)}: +${rB.qta}`);
    }
  }

  return out;
}

/* ---------- Chargement événement & révisions ---------- */
function normalizeRevisions(data: any): Revision[] {
  const raw = Array.isArray(data)
    ? data
    : data?.results ?? data?.items ?? [];
  const out: Revision[] = raw.map((it: any, idx: number) => {
    const p = it.payload ?? it.data ?? it.evento ?? {};
    const payload: Partial<Evento> = {
      id: p.id,
      titolo: p.titolo,
      data_evento: p.data_evento,
      location_index: p.location_index,
      stato: p.stato,
      cliente: p.cliente,
      cliente_nome: p.cliente_nome,
      luogo: p.luogo,
      luogo_nome: p.luogo_nome,
      versione: p.versione,
      acconto_importo: p.acconto_importo,
      acconto_data: p.acconto_data,
      righe: Array.isArray(p.righe) ? p.righe : [],
      note: p.note,
      categoria_notes: p.categoria_notes,
    };
    const createdStr = String(
      it.created_at ??
        it.timestamp ??
        it.date ??
        it.created ??
        new Date().toISOString()
    );
    const refNum = Number(it.ref ?? it.id ?? idx + 1);
    return { ref: refNum, created_at: createdStr, payload };
  });

  out.sort((a, b) => {
    const ta = Date.parse(a.created_at);
    const tb = Date.parse(b.created_at);
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
    return a.ref - b.ref;
  });

  return out;
}

async function loadEvento(
  id: string,
  setE: (e: Evento) => void,
  hydrate: (ev: Evento) => void,
  setLoading: (b: boolean) => void
) {
  setLoading(true);
  try {
    const { data } = await api.get(`/eventi/${id}/`, {
      params: { _t: Date.now(), expand: "righe" },
    });

    const lineKeys = ["righe", "righe_list", "lines", "items", "dettaglio"];
    let righe: any[] | undefined = undefined;
    for (const k of lineKeys) {
      if (Array.isArray((data as any)[k])) {
        righe = (data as any)[k];
        break;
      }
    }

    if (!righe || righe.length === 0) {
      const candidates = [
        `/eventi/${id}/righe/`,
        `/eventi/${id}/lines/`,
        `/eventi/${id}/items/`,
      ];
      for (const url of candidates) {
        try {
          const r2 = await api.get(url, { params: { _t: Date.now() } });
          const arr = Array.isArray(r2.data?.results)
            ? r2.data.results
            : r2.data;
          if (Array.isArray(arr) && arr.length) {
            righe = arr;
            break;
          }
        } catch {
          /* try next */
        }
      }
    }

    const ev: Evento = { ...(data as any), righe: Array.isArray(righe) ? righe : [] };
    setE(ev);
    hydrate(ev);
  } finally {
    setLoading(false);
  }
}

async function loadRevisions(id: string): Promise<Revision[]> {
  const endpoints = [
    `/eventi/${id}/revisions/`,
    `/eventi/${id}/revisions`,
    `/eventi/${id}/history/`,
    `/eventi/${id}/history`,
    `/eventi/${id}/audit/`,
    `/eventi/${id}/audit`,
  ];
  for (const ep of endpoints) {
    try {
      const r = await api.get(ep, { params: { _t: Date.now() } });
      return normalizeRevisions(r.data);
    } catch {
      // try next endpoint
    }
  }
  return [];
}

/* ---------- Révisions explicites ---------- */
function buildRevisionNote(prev: Partial<Evento> | null, next: Partial<Evento>) {
  try {
    const d = humanDiffGrouped(prev || {}, next || {});
    const lines = [...d.changed, ...d.added, ...d.removed];
    return lines.length
      ? lines.slice(0, 10).join(" | ")
      : "Aggiornamento preventivo";
  } catch {
    return "Aggiornamento preventivo";
  }
}

async function tryCreateRevision(
  eventoId: number | string,
  note?: string,
  snapshot?: Partial<Evento>
) {
  const headers = { "X-Force-Revision": "1" };
  const body = {
    note: note || null,
    payload: snapshot || null,
    at: new Date().toISOString(),
  };
  const urls = [
    `/eventi/${eventoId}/revisions/`,
    `/eventi/${eventoId}/revisions`,
    `/eventi/${eventoId}/history/`,
    `/eventi/${eventoId}/history/commit`,
    `/eventi/${eventoId}/audit/commit`,
  ];
  for (const url of urls) {
    try {
      await api.post(url, body, { params: { _t: Date.now() }, headers });
      return true;
    } catch {}
  }
  return false;
}

/* ---------- Composant principal ---------- */
export default function EventoPage() {
  const params = useParams();
  const id = String((params as any).id);
  const router = useRouter();
  const { msg, setMsg } = useToast();

  const [e, setE] = useState<Evento | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "history">("view");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [km, setKm] = useState<number>(0);
  const [luogoId, setLuogoId] = useState<number | null>(null);
  // champs éditables
  const [titolo, setTitolo] = useState("");
  const [dataEvento, setDataEvento] = useState(dayjs().format("YYYY-MM-DD"));
  const [locIdx, setLocIdx] = useState<number>(1);
  const [stato, setStato] = useState<Evento["stato"]>("bozza");
  const [righe, setRighe] = useState<Riga[]>([]);
  const [acconto, setAcconto] = useState<string>("0");
  const [accontoData, setAccontoData] = useState<string>("");

  // anagrafe
  const [clienteId, setClienteId] = useState<number | undefined>(undefined);
  const [clienteLabel, setClienteLabel] = useState<string>("");
  const [luogoLabel, setLuogoLabel] = useState<string>("");

  // modales
  const [showNewCliente, setShowNewCliente] = useState(false);
  const [newCliNome, setNewCliNome] = useState("");
  const [newCliEmail, setNewCliEmail] = useState("");
  const [newCliTel, setNewCliTel] = useState("");

  const [showNewLuogo, setShowNewLuogo] = useState(false);
  const [newLuoNome, setNewLuoNome] = useState("");
  const [newLuoInd, setNewLuoInd] = useState("");
  const [newLuoCitta, setNewLuoCitta] = useState("");
  const [newLuoCap, setNewLuoCap] = useState("");
  const [newLuoProv, setNewLuoProv] = useState("");
  const [newLuoDistAR, setNewLuoDistAR] = useState<string>("0");

  // révisions
  const [revs, setRevs] = useState<Revision[]>([]);
  const [revSel, setRevSel] = useState<number | null>(null);

  // note globale (synchronisée avec backend)
  const [note, setNote] = useState<string>("");

  // cache meta + notes par catégorie
  const [meta, setMeta] = useState<Record<number, MatMeta>>({});
  const [catNotes, setCatNotes] = useState<Record<string, string>>({});

  // durée en jours (événement simple → 1 jour)
  const coperturaGiorni = 1;

  /* --- chargement évènement + révisions --- */
  useEffect(() => {
    const hydrate = (ev: Evento) => {
      setTitolo(ev.titolo || "Offerta");
      setDataEvento(ev.data_evento);
      setLocIdx(ev.location_index ?? 1);
      setStato(ev.stato || "bozza");
      setRighe(ev.righe || []);
      setAcconto(String(ev.acconto_importo ?? "0"));
      setAccontoData(ev.acconto_data || "");
      setClienteId(ev.cliente);
      setClienteLabel(ev.cliente_nome || (ev.cliente ? `#${ev.cliente}` : ""));
      setLuogoId(ev.luogo);
      setLuogoLabel(ev.luogo_nome || (ev.luogo ? `#${ev.luogo}` : ""));
      setNote(ev.note || "");
      setCatNotes(ev.categoria_notes || {});
    };

    loadEvento(id, setE as any, hydrate, setLoading as any);
    loadRevisions(id)
      .then((list) => {
        setRevs(list);
        setRevSel(list.length ? list[list.length - 1].ref : null);
      })
      .catch(() => setRevs([]));

    try {
      const stored = localStorage.getItem(`evento:${id}:catNotes`);
      if (stored) setCatNotes(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, [id]);

  // persiste catNotes (optionnel)
  useEffect(() => {
    try {
      localStorage.setItem(
        `evento:${id}:catNotes`,
        JSON.stringify(catNotes || {})
      );
    } catch {}
  }, [id, catNotes]);

  /* --- resolve catégories/sous-catégories --- */
  useEffect(() => {
    const ids = Array.from(
      new Set((righe || []).map((r) => r.materiale).filter(Boolean))
    );
    const missing = ids.filter((i) => !meta[i]);
    if (missing.length === 0) return;
    (async () => {
      const patch: Record<number, MatMeta> = {};
      for (const mid of missing) patch[mid] = await fetchMatMeta(mid);
      setMeta((prev) => ({ ...prev, ...patch }));
    })();
  }, [righe, meta]);

  const total = useMemo(
    () =>
      righe.reduce(
        (s, r) => s + (Number(r.qta) * Number(r.prezzo) || 0),
        0
      ),
    [righe]
  );

  // récupère distance km (evento → luogo)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ev = await api.get(`/eventi/${id}`);
        const luogo = ev.data?.luogo?.id ?? null;
        const distanza = Number(
          ev.data?.distanza_km ?? ev.data?.luogo?.distanza_km ?? 0
        );
        if (!cancelled) {
          setLuogoId(luogo);
          setKm(distanza);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* --- regroupement Categoria → Sottocategoria --- */
  type AggLine = {
    nome: string;
    qty: number;
    pu: number;
    tot: number;
    is_tecnico?: boolean;
  };
  type Grouped = Record<
    string,
    { sub: Record<string, AggLine[]>; subtot: number }
  >;

  const grouped: Grouped = useMemo(() => {
    const g: Grouped = {};
    for (const r of righe) {
      const m = meta[r.materiale] || FALLBACK_META;
      const cat = (m.categoria || FALLBACK_META.categoria).trim();
      const sub = (m.sottocategoria || FALLBACK_META.sottocategoria).trim();
      g[cat] ||= { sub: {}, subtot: 0 };
      g[cat].sub[sub] ||= [];

      const list = g[cat].sub[sub];
      const nome = r.materiale_nome || `#${r.materiale}`;
      const pu = Number(r.prezzo || 0);
      const found = list.find(
        (x) => x.nome === nome && Number(x.pu) === pu
      );
      if (found) {
        found.qty += Number(r.qta || 0);
        found.tot += Number(r.qta || 0) * pu;
      } else {
        list.push({
          nome,
          qty: Number(r.qta || 0),
          pu,
          tot: Number(r.qta || 0) * pu,
          is_tecnico: r.is_tecnico,
        });
      }
      g[cat].subtot += Number(r.qta || 0) * pu;
    }
    return g;
  }, [righe, meta]);

  /* --- mode édition / annulation --- */
  function openEdit() {
    setMode("edit");
    setRevSel(null);
    setMsg("Modalità modifica attivata.");
  }

  function cancelEdit() {
    if (!e) return;
    setTitolo(e.titolo);
    setDataEvento(e.data_evento);
    setLocIdx(e.location_index);
    setStato(e.stato);
    setRighe(e.righe);
    setAcconto(String(e.acconto_importo ?? "0"));
    setAccontoData(e.acconto_data || "");
    setClienteId(e.cliente);
    setClienteLabel(e.cliente_nome || (e.cliente ? `#${e.cliente}` : ""));
    setLuogoId(e.luogo);
    setLuogoLabel(e.luogo_nome || (e.luogo ? `#${e.luogo}` : ""));
    setNote(e.note || "");
    setCatNotes(e.categoria_notes || {});
    setMode("view");
    setMsg("Modifiche annullate.");
  }

  function updateRiga(idx: number, patch: Partial<Riga>) {
    setRighe((rows) => {
      const next = [...rows];
      const r = { ...next[idx], ...patch } as Riga;
      const qty = Number(r.qta || 0);
      const pu = Number(r.prezzo || 0);
      r.importo = qty * pu;
      next[idx] = r;
      return next;
    });
  }

  function removeRiga(idx: number) {
    setRighe((rows) => rows.filter((_, i) => i !== idx));
  }

  function addFromCatalog(row: {
    materiale_id: number;
    nome: string;
    qta: number;
    prezzo: number;
    is_tecnico?: boolean;
  }) {
    setRighe((rows) => {
      const i = rows.findIndex(
        (r) =>
          r.materiale === row.materiale_id &&
          Number(r.prezzo) === Number(row.prezzo)
      );
      if (i >= 0) {
        const next = [...rows];
        const curr = next[i];
        const newQ = Number(curr.qta) + Number(row.qta);
        next[i] = {
          ...curr,
          qta: newQ,
          importo: newQ * Number(curr.prezzo),
        };
        return next;
      }
      return [
        ...rows,
        {
          materiale: row.materiale_id,
          materiale_nome: row.nome,
          qta: Number(row.qta),
          prezzo: Number(row.prezzo),
          importo: Number(row.qta) * Number(row.prezzo),
          is_tecnico: !!row.is_tecnico,
          copertura_giorni: 1,
        },
      ];
    });
  }

  // Enregistrer (avec création de révision)
  async function save() {
    if (!e) return;

    const payload: any = {
      titolo,
      data_evento: dataEvento,
      location_index: Number(locIdx),
      stato,
      cliente: Number(clienteId ?? e.cliente),
      luogo: Number(luogoId ?? e.luogo),

      righe_replace: 1,
      righe: righe.map((r) => ({
        ...(r.id ? { id: r.id } : {}),
        materiale: r.materiale,
        qta: Number(r.qta),
        prezzo: Number(r.prezzo),
        importo: Number(r.qta) * Number(r.prezzo),
        is_tecnico: !!r.is_tecnico,
        is_trasporto: !!r.is_trasporto,
        copertura_giorni: Number(r.copertura_giorni || 1),
      })),

      acconto_importo: Number(acconto || 0),
      acconto_data:
        Number(acconto || 0) > 0
          ? accontoData || dayjs().format("YYYY-MM-DD")
          : null,

      note,
      categoria_notes: catNotes || {},
    };

    setSaving(true);
    try {
      const before = e;

      let res;
      try {
        res = await api.patch(`/eventi/${e.id}/`, payload, {
          params: { force_revision: 1, _t: Date.now() },
          headers: { "X-Force-Revision": "1" },
        });
      } catch (err: any) {
        const code = err?.response?.status;
        if (code === 405 || code === 400) {
          res = await api.put(`/eventi/${e.id}/`, payload, {
            params: { force_revision: 1, _t: Date.now() },
            headers: { "X-Force-Revision": "1" },
          });
        } else {
          throw err;
        }
      }

      const after: Evento = res.data;

      const noteRev = buildRevisionNote(before, after);
      await tryCreateRevision(e.id, noteRev, after);

      await loadEvento(
        String(e.id),
        setE as any,
        (ev) => {
          setTitolo(ev.titolo || "Offerta");
          setDataEvento(ev.data_evento);
          setLocIdx(ev.location_index ?? 1);
          setStato(ev.stato || "bozza");
          setRighe(ev.righe || []);
          setAcconto(String(ev.acconto_importo ?? "0"));
          setAccontoData(ev.acconto_data || "");
          setClienteId(ev.cliente);
          setClienteLabel(
            ev.cliente_nome || (ev.cliente ? `#${ev.cliente}` : "")
          );
          setLuogoId(ev.luogo);
          setLuogoLabel(
            ev.luogo_nome || (ev.luogo ? `#${ev.luogo}` : "")
          );
          setNote(ev.note || "");
          setCatNotes(ev.categoria_notes || {});
        },
        setLoading as any
      );

      const latest = await loadRevisions(String(e.id));
      setRevs(latest);
      setRevSel(latest.length ? latest[latest.length - 1].ref : null);

      setMsg("Modifiche salvate.");
      setMode("view");
    } catch (err) {
      console.error(err);
      setMsg("Errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !e) {
    return (
      <div className="p-6 text-sm text-slate-600">Caricamento…</div>
    );
  }

  const isPast = dayjs(e.data_evento).isBefore(dayjs(), "day");

  async function creaNuovoCliente() {
    if (!newCliNome.trim()) return;

    try {
      const payload = {
        nome: newCliNome.trim(),
        email: newCliEmail.trim() || null,
        telefono: newCliTel.trim() || null,
      };

      const res = await api.post("/clienti/", payload);
      const cli = res.data;

      setClienteId(cli.id);
      setClienteLabel(cli.nome || `#${cli.id}`);

      setShowNewCliente(false);
      setNewCliNome("");
      setNewCliEmail("");
      setNewCliTel("");

      setMsg("Cliente creato.");
    } catch (err) {
      console.error(err);
      setMsg("Errore nella creazione del cliente.");
    }
  }

  async function deleteEvento(id: number) {
    if (!confirm("Vuoi davvero eliminare questo evento?")) return;
    try {
      await api.delete(`/eventi/${id}/`);
      router.push("/calendario");
    } catch (err) {
      alert("Errore durante l'eliminazione dell'evento.");
    }
  }

  return (
    <div className="space-y-4">
      {/* header : titre + boutons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {titolo || e.titolo}
            <EventoMultiDayPill evento={e as any} />
          </h1>
          <div className="text-sm text-slate-600 mt-1">
            {dayjs(e.data_evento).format("DD/MM/YYYY")} • Location L
            {e.location_index}
          </div>
        </div>

        <div className="flex gap-2">
          <a
            href={`${API}/eventi/${id}/docx/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 border rounded-none bg-white hover:bg-slate-50 text-sm"
          >
            Scarica preventivo Word
          </a>

          {mode !== "history" ? (
            <button
              className="px-3 py-2 border rounded-none"
              onClick={async () => {
                const latest = await loadRevisions(id);
                setRevs(latest);
                setRevSel(
                  latest.length ? latest[latest.length - 1].ref : null
                );
                setMode("history");
              }}
            >
              Storico
            </button>
          ) : (
            <button
              className="px-3 py-2 border rounded-none"
              onClick={() => setMode("view")}
            >
              Chiudi storico
            </button>
          )}

          {mode === "view" ? (
            <>
              <button
                className="px-3 py-2 border rounded-none"
                onClick={openEdit}
              >
                Apri evento (éditer)
              </button>
              <button
                className="px-3 py-2 border rounded-none text-rose-600"
                onClick={() => deleteEvento(e.id)}
              >
                Elimina
              </button>
            </>
          ) : null}

          {mode === "edit" ? (
            <>
              <button
                className="px-3 py-2 border rounded-none"
                onClick={cancelEdit}
                disabled={saving}
              >
                Annulla
              </button>
              <button
                className="px-3 py-2 bg-black text-white rounded-none"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Enregistrement..." : "Salva"}
              </button>

              <button
                className="px-3 py-2 border rounded-none"
                onClick={() => setShowNewCliente(true)}
              >
                Nuovo cliente
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Barre ANAGRAFE */}
      <div className="p-3 bg-slate-50 border rounded-none space-y-2">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm">Cliente</span>
            <span className="px-2 py-1 border bg-white rounded-none">
              {clienteLabel || (clienteId ? `#${clienteId}` : "—")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Luogo</span>
            <span className="px-2 py-1 border bg-white rounded-none">
              {luogoLabel || (luogoId ? `#${luogoId}` : "—")}
            </span>
          </div>
        </div>
      </div>

      {mode !== "history" ? (
        <>
          {/* colonnes : infos + devis */}
          <div className="grid grid-cols-2 gap-4">
            {/* Infos */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <StatoPill v={stato} />
                  {mode === "edit" ? (
                    <select
                      className="border rounded-none px-2 py-1"
                      value={stato}
                      onChange={(ev) =>
                        setStato(ev.target.value as Evento["stato"])
                      }
                    >
                      <option value="bozza">Da eseguire</option>
                      <option value="confermato">Confermato</option>
                      <option value="fatturato">Fatturato</option>
                      <option value="annullato">Annullato</option>
                    </select>
                  ) : (
                    <span className="text-sm font-medium">{stato}</span>
                  )}
                </div>

                <div className="ml-4 flex items-center gap-2">
                  <span className="text-sm text-slate-600">Acconto:</span>
                  {mode === "edit" ? (
                    <>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="border rounded-none w-28 text-right px-2 py-1"
                        value={acconto}
                        onChange={(ev) => setAcconto(ev.target.value)}
                      />
                      <input
                        type="date"
                        className="border rounded-none px-2 py-1"
                        value={accontoData}
                        onChange={(ev) =>
                          setAccontoData(ev.target.value)
                        }
                      />
                    </>
                  ) : (
                    <span className="text-sm">
                      {Number(acconto || 0) > 0
                        ? `${Number(acconto).toFixed(2)} €`
                        : "—"}
                      {accontoData ? ` • ${accontoData}` : ""}
                    </span>
                  )}
                </div>
              </div>

              <label className="block">
                <span className="text-sm">Titre</span>
                <input
                  disabled={mode === "view"}
                  className="mt-1 w-full border rounded-none px-2 py-1"
                  value={titolo}
                  onChange={(ev) => setTitolo(ev.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-sm">Date</span>
                <input
                  disabled={mode === "view" || isPast}
                  type="date"
                  className="mt-1 w-full border rounded-none px-2 py-1"
                  value={dataEvento}
                  onChange={(ev) => setDataEvento(ev.target.value)}
                />
              </label>

              <div>
                <span className="text-sm">Location</span>
                <LocationSelector
                  dateValue={dataEvento}
                  value={locIdx}
                  onChange={setLocIdx}
                  autoReassignIfBusy={false}
                  disabled={mode === "view"}
                />
              </div>
            </div>

            {/* Lignes + Devis groupé */}
            <div className="space-y-4">
              {/* Lignes “brutes” */}
              <div className="border rounded-none bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-2 py-1">
                        Matériel
                      </th>
                      <th className="text-center px-2 py-1">Qté</th>
                      <th className="text-right px-2 py-1">PU</th>
                      <th className="text-right px-2 py-1">
                        Importo
                      </th>
                      <th className="text-right px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {righe.map((r, i) => (
                      <tr
                        key={`${r.materiale}-${i}`}
                        className="border-t"
                      >
                        <td className="px-2 py-1">
                          {r.materiale_nome || `#${r.materiale}`}{" "}
                          {r.is_tecnico ? (
                            <span className="ml-2 text-[10px] border px-1">
                              tecnico
                            </span>
                          ) : null}
                        </td>
                        <td className="text-center px-2 py-1">
                          {mode === "view" ? (
                            r.qta
                          ) : (
                            <input
                              type="number"
                              min={0}
                              className="border rounded-none w-20 text-right px-1"
                              value={r.qta}
                              onChange={(ev) => {
                                const v = Number(ev.target.value);
                                updateRiga(i, {
                                  qta: Number.isNaN(v) ? 0 : v,
                                });
                              }}
                            />
                          )}
                        </td>

                        <td className="text-right px-2 py-1">
                          {mode === "view" ? (
                            Number(r.prezzo).toFixed(2)
                          ) : (
                            <input
                              type="number"
                              step="0.01"
                              className="border rounded-none w-24 text-right px-1"
                              value={r.prezzo}
                              onChange={(ev) =>
                                updateRiga(i, {
                                  prezzo:
                                    Number(
                                      ev.target.value
                                    ) || 0,
                                })
                              }
                            />
                          )}
                        </td>
                        <td className="text-right px-2 py-1">
                          {(
                            Number(r.qta) * Number(r.prezzo)
                          ).toFixed(2)}
                        </td>
                        <td className="text-right px-2 py-1">
                          {mode === "edit" ? (
                            <button
                              className="px-2 py-1 border rounded-none"
                              onClick={() => removeRiga(i)}
                            >
                              Supprimer
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-right font-semibold">
                Total: {euro(total)}
              </div>

              {mode === "edit" ? (
                <div className="space-y-2">
                  <div className="text-sm text-slate-600">
                    Ajouter depuis le catalogue :
                  </div>
                  <CatalogoSelector
                    onAdd={addFromCatalog}
                    dateValue={dataEvento}
                    coperturaGiorni={coperturaGiorni}
                    defaultKmFromLuogo={km}
                  />
                </div>
              ) : null}

              {/* PREVENTIVO raggruppato + Note par catégorie */}
              <div className="border rounded-none bg-white">
                <div className="px-3 py-2 font-semibold">
                  Preventivo (raggruppato)
                </div>

                {Object.keys(grouped).length === 0 ? (
                  <div className="px-3 py-4 text-sm text-slate-600">
                    Nessun articolo.
                  </div>
                ) : (
                  <div className="px-3 pb-3 space-y-4">
                    {Object.entries(grouped)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([cat, block]) => {
                        const subs = Object.entries(block.sub).sort(
                          ([a], [b]) => a.localeCompare(b)
                        );
                        return (
                          <section
                            key={cat}
                            className="border rounded-none"
                          >
                            <div className="px-2 py-1 bg-slate-50 font-medium">
                              {cat}
                            </div>

                            {subs.map(([sub, items]) => {
                              const subTot = items.reduce(
                                (s, x) => s + x.tot,
                                0
                              );
                              return (
                                <div
                                  key={sub}
                                  className="border-t"
                                >
                                  <div className="px-2 py-1 text-sm text-slate-600 italic">
                                    {sub}
                                  </div>
                                  <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                      <tr>
                                        <th className="text-left px-2 py-1 w-[55%]">
                                          Articolo
                                        </th>
                                        <th className="text-right px-2 py-1">
                                          Qtà
                                        </th>
                                        <th className="text-right px-2 py-1">
                                          Prezzo unitario
                                        </th>
                                        <th className="text-right px-2 py-1">
                                          Importo
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {items
                                        .sort((a, b) =>
                                          a.nome.localeCompare(
                                            b.nome
                                          )
                                        )
                                        .map((it, i) => (
                                          <tr
                                            key={i}
                                            className="border-t"
                                          >
                                            <td className="px-2 py-1">
                                              {it.nome}
                                              {it.is_tecnico ? (
                                                <span className="ml-2 text-[10px] px-1 border rounded-none">
                                                  tecnico
                                                </span>
                                              ) : null}
                                            </td>
                                            <td className="px-2 py-1 text-right">
                                              {it.qty}
                                            </td>
                                            <td className="px-2 py-1 text-right">
                                              {euro(it.pu)}
                                            </td>
                                            <td className="px-2 py-1 text-right font-semibold">
                                              {euro(it.tot)}
                                            </td>
                                          </tr>
                                        ))}
                                      <tr className="border-t bg-slate-50">
                                        <td
                                          className="px-2 py-1 text-right italic"
                                          colSpan={3}
                                        >
                                          Subtotale {sub}
                                        </td>
                                        <td className="px-2 py-1 text-right font-semibold">
                                          {euro(subTot)}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })}

                            <div className="px-2 py-1 bg-slate-100 text-right font-semibold">
                              <span className="mr-1">{cat}:</span> {euro(block.subtot)}
                            </div>

                            {/* Notes par catégorie */}
                            <div className="px-2 py-2 bg-white border-t">
                              <label className="text-sm font-medium">
                                Note — {cat}
                              </label>
                              <textarea
                                className="mt-1 w-full min-h-[60px] border rounded-none px-2 py-1"
                                placeholder="Note per questa categoria"
                                value={catNotes[cat] ?? ""}
                                onChange={(ev) =>
                                  setCatNotes((prev) => ({
                                    ...prev,
                                    [cat]: ev.target.value,
                                  }))
                                }
                              />
                            </div>
                          </section>
                        );
                      })}

                    <div className="text-right text-base font-semibold">
                      Subtotale:{" "}
                      {euro(
                        Object.values(grouped).reduce(
                          (s, b) => s + b.subtot,
                          0
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Note globale */}
              <div className="bg-white border rounded-none p-3">
                <div className="font-semibold mb-1">Note</div>
                <textarea
                  className="w-full min-h-[120px] border rounded-none px-2 py-1"
                  placeholder="Conditions de règlement, remarques, etc."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="px-3 py-2 border rounded-none"
              onClick={() => router.push("/calendario")}
            >
              ← Retour calendrier
            </button>
          </div>
        </>
      ) : (
        /* -------- Historique: vue “de → à” -------- */
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">
              Historique des révisions
            </h2>
            <div className="border rounded-none bg-white max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-2 py-1">Ref</th>
                    <th className="text-left px-2 py-1">Date</th>
                    <th className="text-left px-2 py-1">Comparer</th>
                  </tr>
                </thead>
                <tbody>
                  {revs.map((r) => (
                    <tr key={r.ref} className="border-t">
                      <td className="px-2 py-1">ref{r.ref}</td>
                      <td className="px-2 py-1">
                        {dayjs(r.created_at).format(
                          "YYYY-MM-DD HH:mm"
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <button
                          className={
                            "px-2 py-1 border rounded-none " +
                            (revSel === r.ref
                              ? "bg-black text-white"
                              : "")
                          }
                          onClick={async () => {
                            const latest =
                              await loadRevisions(id);
                            setRevs(latest);
                            setRevSel(r.ref);
                          }}
                        >
                          De → À
                        </button>
                      </td>
                    </tr>
                  ))}
                  {revs.length === 0 ? (
                    <tr>
                      <td
                        className="px-2 py-3 text-slate-500"
                        colSpan={3}
                      >
                        Aucune révision enregistrée.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {/* panneau “de → à” */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">
              Comparaison (rév. N-1 → N)
            </h2>
            <div className="min-h-[200px]">
              {(() => {
                if (revSel == null || revs.length === 0) {
                  return (
                    <div className="border rounded-none bg-white p-3 text-sm text-slate-600">
                      Sélectionne une révision à gauche…
                    </div>
                  );
                }
                const idx = revs.findIndex(
                  (r) => r.ref === revSel
                );
                if (idx < 0) {
                  return (
                    <div className="border rounded-none bg-white p-3 text-sm text-slate-600">
                      Révision inconnue.
                    </div>
                  );
                }
                if (idx === 0) {
                  return (
                    <div className="border rounded-none bg-white p-3 text-sm text-slate-600">
                      Première révision : pas de comparaison
                      disponible.
                    </div>
                  );
                }
                const prevRef = String(revs[idx - 1].ref);
                const curRef = String(revs[idx].ref);
                return (
                  <SnapCompare
                    id={id}
                    prevRef={prevRef}
                    curRef={curRef}
                  />
                );
              })()}
            </div>

            {/* Modale nouveau client en mode historique */}
            {showNewCliente && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white border rounded-none p-4 w-[420px] space-y-3">
                  <h2 className="text-lg font-semibold">
                    Nuovo cliente
                  </h2>

                  <label className="block text-sm">
                    Nome / Ragione sociale
                    <input
                      className="mt-1 border rounded-none w-full px-2 py-1"
                      value={newCliNome}
                      onChange={(e) =>
                        setNewCliNome(e.target.value)
                      }
                    />
                  </label>

                  <label className="block text-sm">
                    Email
                    <input
                      className="mt-1 border rounded-none w-full px-2 py-1"
                      value={newCliEmail}
                      onChange={(e) =>
                        setNewCliEmail(e.target.value)
                      }
                    />
                  </label>

                  <label className="block text-sm">
                    Telefono
                    <input
                      className="mt-1 border rounded-none w-full px-2 py-1"
                      value={newCliTel}
                      onChange={(e) =>
                        setNewCliTel(e.target.value)
                      }
                    />
                  </label>

                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      className="px-3 py-1 border rounded-none"
                      onClick={() => setShowNewCliente(false)}
                    >
                      Annulla
                    </button>
                    <button
                      className="px-3 py-1 bg-black text-white rounded-none"
                      onClick={creaNuovoCliente}
                    >
                      Salva
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Toast msg={msg} />
    </div>
  );
}
