/* chemin : /frontend/src/app/magazzino/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { usePersistentState, useScrollRestoration } from "@/hooks/usePersistent";
import { useToast, Toast } from "@/components/Toast";
import QuickNewItem from "@/components/QuickNewItem";
import { StockBadge } from "@/components/StockBadge";
import { AppShell } from "@/components/layout/AppShell";

/* ====== Constantes tarifaires locales (simulation) ====== */
const DEFAULT_EUR_KM = 1.2; // €/km par défaut
const DEFAULT_EUR_ORA = 30; // €/ora par défaut

type Mat = {
  id: number;
  nome: string;
  prezzo_base: number | string;
  categoria?: string | null;
  sottocategoria?: string | null;
  is_tecnico: boolean;
  is_messo: boolean;
  scorta: number;
};

type Bucket = "tutto" | "materiali" | "tecnici" | "mezzi";

type BookRow = {
  id: number;
  prenotato: number;
  disponibilita: number;
  status: "ok" | "warn" | "ko";
};

/* ---------- Booking rows pour la modale ---------- */

type BookingRow = {
  evento_id: number;
  titolo: string;
  data_evento: string;
  fine_evento: string;
  qta: number;
  copertura_giorni: number;
  cliente?: string | null;
  luogo?: string | null;
  stato?: "bozza" | "confermato" | "annullato" | "fatturato";
  location_index?: number;
};

function DettagliModal({
  open,
  onClose,
  mat,
  day,
}: {
  open: boolean;
  onClose: () => void;
  mat: { id: number; nome: string } | null;
  day: string;
}) {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [from, setFrom] = useState<string>(() => day);
  const [to, setTo] = useState<string>(() =>
    dayjs(day).add(30, "day").format("YYYY-MM-DD"),
  );
  const [resume, setResume] = useState<{ scorta: number; pren: number }>({
    scorta: 0,
    pren: 0,
  });

  useEffect(() => {
    if (!open || !mat) return;
    api
      .get(
        `/magazzino/bookings?material=${mat.id}&from=${from}&to=${to}&on=${day}`,
      )
      .then((r) => {
        const res = r.data || {};
        const list = (res.rows || []).map((row: any): BookingRow => {
          const start = String(row.data_evento);
          const giorni = Math.max(1, Number(row.copertura_giorni || 1));
          const fine = dayjs(start)
            .add(giorni - 1, "day")
            .format("YYYY-MM-DD");
          return {
            evento_id: Number(row.evento_id),
            titolo: String(row.titolo || ""),
            data_evento: start,
            fine_evento: fine,
            qta: Number(row.qta || 0),
            copertura_giorni: giorni,
            cliente: row.cliente ?? null,
            luogo: row.luogo ?? null,
            stato: row.stato,
            location_index: row.location_index,
          };
        });
        setRows(list);
        setResume({
          scorta: Number(res.scorta || 0),
          pren: Number(res.prenotato || 0),
        });
      })
      .catch(() => {
        setRows([]);
        setResume({ scorta: 0, pren: 0 });
      });
  }, [open, mat, from, to, day]);

  if (!open || !mat) return null;

  const free = Math.max(0, (resume.scorta || 0) - (resume.pren || 0));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white text-slate-900 w-[840px] max-w-[95vw] max-height-[80vh] max-h-[80vh] overflow-auto border border-slate-200 rounded-2xl p-4 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">
            Dettagli prenotazioni — {mat.nome}
          </h3>
          <button
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100"
            onClick={onClose}
          >
            Chiudi
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
          <div className="inline-flex items-center gap-2">
            <span>Da</span>
            <input
              type="date"
              className="rounded-xl border border-slate-300 bg-white px-2 py-1 text-xs md:text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span>a</span>
            <input
              type="date"
              className="rounded-xl border border-slate-300 bg-white px-2 py-1 text-xs md:text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs md:text-sm">
            <span>
              Scorta: <b>{resume.scorta}</b>
            </span>
            <span>
              Prenotato ({day}): <b>{resume.pren}</b>
            </span>
            <span>
              Disponibilità: <b>{free}</b>
            </span>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <table className="w-full text-xs md:text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-2 py-1 text-slate-700">Data</th>
                <th className="text-left px-2 py-1 text-slate-700">Fine</th>
                <th className="text-right px-2 py-1 text-slate-700">
                  Qtà/giorno
                </th>
                <th className="text-left px-2 py-1 text-slate-700">Titolo</th>
                <th className="text-left px-2 py-1 text-slate-700">Cliente</th>
                <th className="text-left px-2 py-1 text-slate-700">Luogo</th>
                <th className="text-center px-2 py-1 text-slate-700">Loc</th>
                <th className="text-center px-2 py-1 text-slate-700">Stato</th>
                <th className="text-center px-2 py-1 text-slate-700">Apri</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className="border-t border-slate-200 odd:bg-white even:bg-slate-50"
                >
                  <td className="px-2 py-1 text-slate-800">{r.data_evento}</td>
                  <td className="px-2 py-1 text-slate-800">{r.fine_evento}</td>
                  <td className="px-2 py-1 text-right text-slate-800">
                    {r.qta}
                  </td>
                  <td className="px-2 py-1 text-slate-800">{r.titolo}</td>
                  <td className="px-2 py-1 text-slate-700">
                    {r.cliente || "—"}
                  </td>
                  <td className="px-2 py-1 text-slate-700">
                    {r.luogo || "—"}
                  </td>
                  <td className="px-2 py-1 text-center text-slate-700">
                    {r.location_index ?? "—"}
                  </td>
                  <td className="px-2 py-1 text-center text-slate-700">
                    {r.stato || "—"}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <a
                      className="underline text-emerald-700"
                      href={`/eventi/${r.evento_id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      evento
                    </a>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    className="px-2 py-3 text-slate-500 text-center"
                    colSpan={9}
                  >
                    Nessuna prenotazione nel periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Riga editabile ------------------------- */

function EditableRow({
  m,
  day,
  live,
  selected,
  onToggle,
  onSaved,
  onDeleted,
  onDettagli,
  bucket,
  nKm,
  setNKm,
  eurKm,
  setEurKm,
  nOre,
  setNOre,
  eurOra,
  setEurOra,
}: {
  m: Mat;
  day: string;
  live?: BookRow;
  selected: boolean;
  onToggle: (id: number) => void;
  onSaved: (updated: Mat) => void;
  onDeleted: (id: number) => void;
  onDettagli: (m: Mat) => void;

  bucket: Bucket;
  nKm: number;
  setNKm: (v: number) => void;
  eurKm: number;
  setEurKm: (v: number) => void;
  nOre: number;
  setNOre: (v: number) => void;
  eurOra: number;
  setEurOra: (v: number) => void;
}) {
  const [nome, setNome] = useState(m.nome);
  const [cat, setCat] = useState(m.categoria || "");
  const [sub, setSub] = useState(m.sottocategoria || "");
  const [scorta, setScorta] = useState<number>(Number(m.scorta || 0));
  const [prezzo, setPrezzo] = useState<number>(Number(m.prezzo_base || 0));
  const [isTec, setIsTec] = useState(!!m.is_tecnico);
  const [isMes, setIsMes] = useState(!!m.is_messo);

  const dirty =
    nome !== m.nome ||
    cat !== (m.categoria || "") ||
    sub !== (m.sottocategoria || "") ||
    scorta !== Number(m.scorta || 0) ||
    Number(prezzo) !== Number(m.prezzo_base || 0) ||
    isTec !== m.is_tecnico ||
    isMes !== m.is_messo;

  async function save() {
    const payload = {
      nome,
      categoria: cat || null,
      sottocategoria: sub || null,
      scorta,
      prezzo_base: Number(prezzo),
      is_tecnico: isTec,
      is_messo: isMes,
    };
    const r = await api.patch(`/materiali/${m.id}/`, payload);
    onSaved(r.data as Mat);
  }

  async function del() {
    if (!confirm(`Eliminare "${m.nome}" ?`)) return;
    await api.delete(`/materiali/${m.id}/`);
    onDeleted(m.id);
  }

  const pren = live?.prenotato ?? 0;
  const disp = live?.disponibilita ?? Math.max(0, scorta - pren);

  const importoKm = (nKm ?? 0) * (eurKm ?? 0);
  const importoOra = (nOre ?? 1) * (eurOra ?? 0);

  return (
    <tr className="border-t border-slate-200 align-middle odd:bg-white even:bg-slate-50 hover:bg-slate-100">
      <td className="px-2 py-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(m.id)}
        />
      </td>

      <td className="px-2 py-1">
        <input
          className="border border-slate-300 rounded-xl bg-white px-2 py-1 w-44 text-xs md:text-sm text-slate-800"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          placeholder="Categoria"
        />
      </td>

      <td className="px-2 py-1">
        <input
          className="border border-slate-300 rounded-xl bg-white px-2 py-1 w-44 text-xs md:text-sm text-slate-800"
          value={sub}
          onChange={(e) => setSub(e.target.value)}
          placeholder="Sottocategoria"
        />
      </td>

      <td className="px-2 py-1">
        <input
          className="border border-slate-300 rounded-xl bg-white px-2 py-1 w-72 text-xs md:text-sm text-slate-800"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Articolo"
        />
      </td>

      <td className="px-2 py-1 text-right">
        <input
          type="number"
          min={0}
          className="border border-slate-300 rounded-xl bg-white px-2 py-1 w-24 text-right text-xs md:text-sm text-slate-800"
          value={scorta}
          onChange={(e) => setScorta(Number(e.target.value) || 0)}
        />
      </td>

      <td className="px-2 py-1 text-right">
        <input
          type="number"
          step="0.01"
          className="border border-slate-300 rounded-xl bg-white px-2 py-1 w-28 text-right text-xs md:text-sm text-slate-800"
          value={prezzo}
          onChange={(e) => setPrezzo(Number(e.target.value) || 0)}
        />
      </td>

      <td className="px-2 py-1 text-center">
        <input
          type="checkbox"
          checked={isTec}
          onChange={(e) => setIsTec(e.target.checked)}
        />
      </td>

      <td className="px-2 py-1 text-center">
        <input
          type="checkbox"
          checked={isMes}
          onChange={(e) => setIsMes(e.target.checked)}
        />
      </td>

      {bucket === "mezzi" && (
        <>
          <td className="px-2 py-1 text-right">
            <input
              type="number"
              min={0}
              step="0.1"
              className="w-24 border border-slate-300 rounded-xl bg-white px-1 text-right text-xs md:text-sm text-slate-800"
              value={nKm}
              onChange={(e) => setNKm(Number(e.target.value) || 0)}
            />
          </td>
          <td className="px-2 py-1 text-right">
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-24 border border-slate-300 rounded-xl bg-white px-1 text-right text-xs md:text-sm text-slate-800"
              value={eurKm}
              onChange={(e) => setEurKm(Number(e.target.value) || 0)}
            />
          </td>
          <td className="px-2 py-1 text-right font-semibold text-emerald-700 text-xs md:text-sm">
            {importoKm.toFixed(2)} €
          </td>
        </>
      )}

      {bucket === "tecnici" && (
        <>
          <td className="px-2 py-1 text-right">
            <input
              type="number"
              min={0}
              step="0.5"
              className="w-24 border border-slate-300 rounded-xl bg-white px-1 text-right text-xs md:text-sm text-slate-800"
              value={nOre}
              onChange={(e) => setNOre(Number(e.target.value) || 0)}
            />
          </td>
          <td className="px-2 py-1 text-right">
            <input
              type="number"
              min={0}
              step="0.5"
              className="w-24 border border-slate-300 rounded-xl bg-white px-1 text-right text-xs md:text-sm text-slate-800"
              value={eurOra}
              onChange={(e) => setEurOra(Number(e.target.value) || 0)}
            />
          </td>
          <td className="px-2 py-1 text-right font-semibold text-emerald-700 text-xs md:text-sm">
            {importoOra.toFixed(2)} €
          </td>
        </>
      )}

      <td className="px-2 py-1 text-right text-xs md:text-sm text-slate-700">
        {pren}
      </td>

      <td className="px-2 py-1 text-right">
        <StockBadge scorta={scorta} dispon={disp} />
      </td>

      <td className="px-2 py-1 text-xs md:text-sm text-slate-700">
        {m.is_messo && (
          <span className="text-[11px] border border-slate-300 rounded-md px-1 mr-1">
            mezzi
          </span>
        )}
        {m.is_tecnico && (
          <span className="text-[11px] border border-slate-300 rounded-md px-1">
            tecnico
          </span>
        )}
      </td>

      <td className="px-2 py-1 whitespace-nowrap text-right text-xs md:text-sm">
        <button
          className="px-2 py-0.5 border border-slate-300 rounded-xl text-[11px] mr-2 bg-white hover:bg-slate-100"
          onClick={() => onDettagli(m)}
          title="Disponibilità giornaliera"
        >
          Dettagli
        </button>
        <button
          className={
            "px-2 py-1 border rounded-xl text-[11px] mr-2 transition " +
            (dirty
              ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-400"
              : "border-slate-300 text-slate-400 bg-white cursor-not-allowed")
          }
          disabled={!dirty}
          onClick={save}
        >
          Registra
        </button>
        <button
          className="px-2 py-1 border border-rose-400 rounded-xl text-[11px] text-rose-600 bg-white hover:bg-rose-50"
          onClick={del}
        >
          Elimina
        </button>
      </td>
    </tr>
  );
}

/* ----------------------------- Pagina principale ----------------------------- */

export default function MagazzinoPage() {
  const router = useRouter();
  useScrollRestoration("scroll:magazzino");

  // protection login
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
      }
    }
  }, [router]);

  const [tab, setTab] = usePersistentState<"import" | "liste">(
    "magazzino:tab",
    "liste",
  );

  // IMPORT
  const [file, setFile] = useState<File | undefined>();
  const [token, setToken] = useState<string | undefined>();
  const [preview, setPreview] = useState<any[]>([]);
  const [purgeUnused, setPurgeUnused] = useState(false);

  // LISTE
  const [data, setData] = useState<Mat[]>([]);
  const [bucket, setBucket] = usePersistentState<Bucket>(
    "magazzino:bucket",
    "tutto",
  );
  const [q, setQ] = usePersistentState("magazzino:q", "");
  const [cat, setCat] = usePersistentState("magazzino:cat", "");
  const [sub, setSub] = usePersistentState("magazzino:sub", "");
  const [day, setDay] = usePersistentState(
    "magazzino:day",
    dayjs().format("YYYY-MM-DD"),
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { msg, setMsg } = useToast();

  // Modale dettagli
  const [detOpen, setDetOpen] = useState(false);
  const [detMat, setDetMat] = useState<Mat | null>(null);

  // Etats pour colonnes dynamiques
  const [nKmMap, setNKm] = useState<Record<number, number>>({});
  const [eurKmMap, setEurKm] = useState<Record<number, number>>({});
  const [nOreMap, setNOre] = useState<Record<number, number>>({});
  const [eurOraMap, setEurOra] = useState<Record<number, number>>({});

  useEffect(() => {
    if (tab === "liste") refresh();
  }, [tab]);

  async function refresh() {
    const r = await api.get("/materiali/");
    setData(r.data || []);
    setSelected(new Set());
  }

  const cats = useMemo(
    () =>
      Array.from(
        new Set(
          data
            .map((d) => (d.categoria || "").trim())
            .filter(Boolean),
        ),
      ).sort(),
    [data],
  );

  const subs = useMemo(
    () =>
      Array.from(
        new Set(
          data
            .filter((d) => !cat || d.categoria === cat)
            .map((d) => (d.sottocategoria || "").trim())
            .filter(Boolean),
        ),
      ).sort(),
    [data, cat],
  );

  const filtered = useMemo(() => {
    return data
      .filter((m) => {
        const okBucket =
          bucket === "tutto"
            ? true
            : bucket === "materiali"
            ? !m.is_tecnico && !m.is_messo
            : bucket === "tecnici"
            ? m.is_tecnico
            : m.is_messo;
        const okCat = !cat || m.categoria === cat;
        const okSub = !sub || m.sottocategoria === sub;
        const okQ = !q || m.nome.toLowerCase().includes(q.toLowerCase());
        return okBucket && okCat && okSub && okQ;
      })
      .sort(
        (a, b) =>
          (a.sottocategoria || "").localeCompare(b.sottocategoria || "") ||
          a.nome.localeCompare(b.nome),
      );
  }, [data, bucket, cat, sub, q]);

  const grouped = useMemo(() => {
    const g: Record<string, Mat[]> = {};
    for (const m of filtered) {
      const k = m.sottocategoria || "— Senza sottocategoria —";
      (g[k] ||= []).push(m);
    }
    return g;
  }, [filtered]);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Eliminare ${selected.size} elemento/i ?`)) return;
    for (const id of Array.from(selected)) {
      try {
        await api.delete(`/materiali/${id}/`);
      } catch {}
    }
    setMsg("Elementi eliminati.");
    refresh();
  }

  // import helpers
  async function upload() {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    const r = await fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api") +
        "/magazzino/import",
      { method: "POST", body: form },
    );
    const j = await r.json();
    setToken(j.token);
    setPreview(j.preview || []);
    setMsg("File caricato (anteprima).");
  }

  async function confirm() {
    if (!token) return;
    await api.post("/magazzino/import/confirm", {
      token,
      purge_unused: purgeUnused,
    });
    setMsg("Import confermato.");
    setToken(undefined);
    setPreview([]);
    setPurgeUnused(false);
    setTab("liste");
    refresh();
  }

  // live bookings per la data selezionata
  const [live, setLive] = useState<Record<number, BookRow>>({});

  useEffect(() => {
    if (!day) return;

    if (!data.length) {
      setLive({});
      return;
    }

    api
      .get(`/magazzino/status?from=${day}&to=${day}`)
      .then((r) => {
        const next: Record<number, BookRow> = {};
        for (const m of r.data?.materials || []) {
          const cell = m.by_day?.[0];
          next[m.id] = {
            id: m.id,
            prenotato: Number(cell?.used || 0),
            disponibilita: Number(cell?.free || m.stock || 0),
            status: (cell?.status || "ok") as "ok" | "warn" | "ko",
          };
        }
        setLive(next);
      })
      .catch((e) => {
        console.error("[magazzino] errore nel caricamento stato:", e);
        setLive({});
      });
  }, [day, data]);

  return (
    <AppShell title="Magazzino & materiali">
      <div className="space-y-5">
        {/* barre d’onglets + liens + date */}
        <div className="mt-1 flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
          <div className="inline-flex rounded-2xl overflow-hidden border border-slate-200">
            <button
              className={
                "px-3 py-1.5 text-xs md:text-sm " +
                (tab === "import"
                  ? "bg-emerald-500 text-white font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-50")
              }
              onClick={() => setTab("import")}
            >
              Importa
            </button>
            <button
              className={
                "px-3 py-1.5 text-xs md:text-sm border-l border-slate-200 " +
                (tab === "liste"
                  ? "bg-emerald-500 text-white font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-50")
              }
              onClick={() => setTab("liste")}
            >
              Elenchi e gestione
            </button>
          </div>

          <Link
            href="/magazzino/status"
            className="ml-1 px-3 py-1.5 border border-slate-200 rounded-xl text-[11px] md:text-xs text-slate-700 bg-white hover:bg-slate-50"
          >
            Disponibilità giornaliera →
          </Link>

          <Link
            href="/magazzino/sinottico"
            className="text-[11px] md:text-xs underline text-emerald-700 hover:text-emerald-500"
          >
            Sinottico annuale →
          </Link>

          <Link
            href="/catalogo"
            className="text-[11px] md:text-xs underline text-emerald-700 hover:text-emerald-500"
          >
            Catalogo →
          </Link>

          <div className="ml-auto flex items-center gap-2 text-[11px] md:text-xs text-slate-700">
            <span>Data:</span>
            <input
              type="date"
              className="border border-slate-300 rounded-xl bg-white px-2 py-1 text-xs md:text-sm"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </div>
        </div>

        {/* IMPORT */}
        {tab === "import" && (
          <section className="space-y-3 rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-slate-800">
              <input
                type="file"
                className="text-xs md:text-sm"
                onChange={(e) => setFile(e.target.files?.[0])}
              />
              <button
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs md:text-sm hover:bg-slate-50"
                onClick={upload}
              >
                Carica
              </button>
              <button
                className="px-3 py-1.5 rounded-xl border border-emerald-500 bg-emerald-500/10 text-xs md:text-sm text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-50"
                disabled={!token}
                onClick={confirm}
              >
                Conferma
              </button>
              <label className="ml-3 text-xs md:text-sm inline-flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={purgeUnused}
                  onChange={(e) => setPurgeUnused(e.target.checked)}
                />
                Elimina i materiali non utilizzati
              </label>
            </div>
            <pre className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-[11px] md:text-xs max-h-80 overflow-auto text-slate-800">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </section>
        )}

        {/* LISTE */}
        {tab === "liste" && (
          <section className="space-y-3">
            {/* Filtres + actions */}
            <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm text-xs md:text-sm">
              {(["tutto", "materiali", "tecnici", "mezzi"] as Bucket[]).map(
                (b) => (
                  <button
                    key={b}
                    className={
                      "px-3 py-1.5 rounded-xl border text-xs md:text-sm " +
                      (bucket === b
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")
                    }
                    onClick={() => setBucket(b)}
                  >
                    {b}
                  </button>
                ),
              )}

              <select
                className="ml-2 border border-slate-300 rounded-xl bg-white px-2 py-1 text-xs md:text-sm text-slate-700"
                value={cat}
                onChange={(e) => {
                  setCat(e.target.value);
                  setSub("");
                }}
              >
                <option value="">Categoria (tutti)</option>
                {cats.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                className="border border-slate-300 rounded-xl bg-white px-2 py-1 text-xs md:text-sm text-slate-700"
                value={sub}
                onChange={(e) => setSub(e.target.value)}
              >
                <option value="">Sottocategoria (tutti)</option>
                {subs.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                className="border border-slate-300 rounded-xl bg-white px-2 py-1 flex-1 min-w-[200px] text-xs md:text-sm text-slate-800"
                placeholder="Cerca…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs md:text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setBucket("tutto");
                  setCat("");
                  setSub("");
                  setQ("");
                }}
              >
                Reimposta
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  className="px-3 py-1.5 rounded-xl border border-rose-400 bg-rose-50 text-xs md:text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  disabled={selected.size === 0}
                  onClick={deleteSelected}
                >
                  Elimina elementi selezionati
                </button>
                <button
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs md:text-sm text-slate-700 hover:bg-slate-50"
                  onClick={refresh}
                >
                  Ricarica
                </button>
                <div className="flex items-center gap-2">
                  <QuickNewItem onCreated={refresh} />
                </div>
              </div>
            </div>

            {/* Groupes par sottocategoria */}
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([subKey, items]) => (
                <section
                  key={subKey}
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="px-4 py-2 flex items-center justify-between bg-slate-50 border-b border-slate-200">
                    <div className="font-semibold text-xs md:text-sm text-slate-800">
                      {subKey}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {items.length} articolo
                      {items.length !== 1 ? "i" : ""}
                    </div>
                  </div>
                  <table className="w-full text-xs md:text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-2 py-1 w-8"></th>
                        <th className="text-left px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                          Categoria
                        </th>
                        <th className="text-left px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                          Sottocategoria
                        </th>
                        <th className="text-left px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                          Articolo
                        </th>
                        <th className="text-right px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                          Quantità
                        </th>
                        <th className="text-right px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                          Prezzo unità (provv.)
                        </th>
                        <th className="text-center px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                          Tecnico
                        </th>
                        <th className="text-center px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                          Mezzi
                        </th>

                        {bucket === "mezzi" && (
                          <>
                            <th className="text-right px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                              N.km
                            </th>
                            <th className="text-right px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                              €/km
                            </th>
                            <th className="text-right px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                              Importo (sim.)
                            </th>
                          </>
                        )}
                        {bucket === "tecnici" && (
                          <>
                            <th className="text-right px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                              N.ore
                            </th>
                            <th className="text-right px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                              €/ora
                            </th>
                            <th className="text-right px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                              Importo (sim.)
                            </th>
                          </>
                        )}

                        <th className="text-right px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                          Prenotato
                        </th>
                        <th className="text-right px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                          Disponibilità
                        </th>
                        <th className="px-2 py-1 w-[220px]"></th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((m) => (
                        <EditableRow
                          key={m.id}
                          m={m}
                          day={day}
                          live={live[m.id]}
                          selected={selected.has(m.id)}
                          onToggle={toggleSelect}
                          onSaved={(u) =>
                            setData((prev) =>
                              prev.map((x) => (x.id === u.id ? (u as Mat) : x)),
                            )
                          }
                          onDeleted={(id) => {
                            setData((prev) => prev.filter((x) => x.id !== id));
                            setSelected((prev) => {
                              const next = new Set(prev);
                              next.delete(id);
                              return next;
                            });
                          }}
                          onDettagli={(mat) => {
                            setDetMat(mat);
                            setDetOpen(true);
                          }}
                          bucket={bucket}
                          nKm={nKmMap[m.id] ?? 0}
                          setNKm={(v) =>
                            setNKm((prev) => ({ ...prev, [m.id]: v }))
                          }
                          eurKm={eurKmMap[m.id] ?? DEFAULT_EUR_KM}
                          setEurKm={(v) =>
                            setEurKm((prev) => ({ ...prev, [m.id]: v }))
                          }
                          nOre={nOreMap[m.id] ?? 1}
                          setNOre={(v) =>
                            setNOre((prev) => ({ ...prev, [m.id]: v }))
                          }
                          eurOra={eurOraMap[m.id] ?? DEFAULT_EUR_ORA}
                          setEurOra={(v) =>
                            setEurOra((prev) => ({ ...prev, [m.id]: v }))
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
          </section>
        )}

        {/* Modale dettagli */}
        <DettagliModal
          open={detOpen}
          onClose={() => setDetOpen(false)}
          mat={detMat ? { id: detMat.id, nome: detMat.nome } : null}
          day={day}
        />

        <Toast msg={msg} />
      </div>
    </AppShell>
  );
}
