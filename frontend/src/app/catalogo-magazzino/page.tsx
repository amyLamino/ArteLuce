/* (chemin : /frontend/src/app/catalogo-magazzino/page.tsx) */
"use client";
import { useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { usePersistentState, useScrollRestoration } from "@/hooks/usePersistent";

type Mat = {
  id: number;
  nome: string;
  prezzo_base: string;
  is_tecnico: boolean;
  is_messo: boolean;
  categoria?: string;
  sottocategoria?: string;
};

export default function CatalogoMagazzino() {
  useScrollRestoration("scroll:catalogo");

  const [data, setData] = usePersistentState<Mat[]>("catalogo:data", []);
  const [tab, setTab] = usePersistentState<"tutto" | "materiali" | "tecnici" | "messi">(
    "catalogo:tab",
    "tutto"
  );
  const [q, setQ] = usePersistentState<string>("catalogo:q", "");
  const [cat, setCat] = usePersistentState<string>("catalogo:cat", "");
  const [sub, setSub] = usePersistentState<string>("catalogo:sub", "");

  useEffect(() => {
    if (data.length === 0) {
      api.get("/materiali/").then((r) => setData(r.data || []));
    }
  }, [data.length, setData]);

  const cats = useMemo(
    () =>
      Array.from(
        new Set((data || []).map((d) => (d.categoria || "").trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [data]
  );

  const subs = useMemo(
    () =>
      Array.from(
        new Set(
          (data || [])
            .filter((d) => !cat || d.categoria === cat)
            .map((d) => (d.sottocategoria || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [data, cat]
  );

  const filtered = useMemo(() => {
    return (data || [])
      .filter((m) => {
        const okTab =
          tab === "tutto"
            ? true
            : tab === "materiali"
            ? !m.is_tecnico && !m.is_messo
            : tab === "tecnici"
            ? m.is_tecnico
            : m.is_messo;
        const okCat = !cat || m.categoria === cat;
        const okSub = !sub || m.sottocategoria === sub;
        const okQ = !q || m.nome.toLowerCase().includes(q.toLowerCase());
        return okTab && okCat && okSub && okQ;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [data, tab, cat, sub, q]);

  const grouped: Record<string, Mat[]> = useMemo(() => {
    const g: Record<string, Mat[]> = {};
    for (const m of filtered) {
      const key = m.sottocategoria || "— Sans sous-catégorie —";
      (g[key] ||= []).push(m);
    }
    return g;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Catalogo & Magazzino</h1>

      <div className="flex flex-wrap gap-2 items-center">
        {(["tutto", "materiali", "tecnici", "messi"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={"px-3 py-2 border rounded-none " + (tab === t ? "bg-black text-white" : "")}
          >
            {t}
          </button>
        ))}

        <select
          className="ml-2 border rounded-none px-2 py-1"
          value={cat}
          onChange={(e) => {
            setCat(e.target.value);
            setSub("");
          }}
        >
          <option value="">Catégorie (toutes)</option>
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="border rounded-none px-2 py-1"
          value={sub}
          onChange={(e) => setSub(e.target.value)}
        >
          <option value="">Sous-catégorie (toutes)</option>
          {subs.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          className="border rounded-none px-2 py-1 flex-1 min-w-[220px]"
          placeholder="Rechercher…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <button
          className="px-3 py-2 border rounded-none"
          onClick={() => {
            setTab("tutto");
            setCat("");
            setSub("");
            setQ("");
          }}
        >
          Réinitialiser
        </button>
      </div>

      {/* Groupes par sous-catégorie */}
      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([subKey, items]) => (
          <section key={subKey} className="bg-white border rounded-none">
            <div className="px-3 py-2 font-semibold bg-slate-100">{subKey}</div>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2">Nome</th>
                  <th className="text-center px-3 py-2">Categoria</th>
                  <th className="text-right px-3 py-2">PU</th>
                  <th className="text-center px-3 py-2">Flags</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-3 py-2">{m.nome}</td>
                    <td className="text-center px-3 py-2">{m.categoria || "-"}</td>
                    <td className="text-right px-3 py-2">{m.prezzo_base}</td>
                    <td className="text-center px-3 py-2">
                      {m.is_tecnico ? "Tecnico " : ""}
                      {m.is_messo ? "Messo" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
    </div>
  );
}
