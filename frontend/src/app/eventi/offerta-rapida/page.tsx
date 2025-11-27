/* ============================================================================
   chemin : /frontend/src/app/eventi/offerta-rapida/page.tsx
   Offerta rapida multi-jours + tecnico/mezzi + distanza_km
============================================================================ */

"use client";

import { useState, useEffect, useMemo, useRef, ReactNode } from "react";
import dayjs from "dayjs";
import { useSearchParams, useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { LocationSelector } from "@/components/LocationSelector";
import { useCart } from "@/components/Cart";
import { useToast, Toast } from "@/components/Toast";
import { usePersistentState } from "@/hooks/usePersistent";
import AnagrafeBar from "@/components/anagrafe/AnagrafeBar";
import CatalogoModal from "@/components/CatalogoModal";

/* ============================================================================
   TYPES
============================================================================ */

type Client = { id: number; nome: string; external_id?: string };
type Luogo = {
  id: number;
  nome: string;
  external_id?: string;
  distanza_km?: string;
};

type CartRow = {
  materiale_id: number;
  nome: string;
  qta: number;
  prezzo: number;
  importo: number;
  categoria?: string | null;
  sottocategoria?: string | null;
  is_tecnico?: boolean;
  is_messo?: boolean;
};

type OffertaStato = "da_eseguire" | "inviato" | "annullato";
type BackendStato = "bozza" | "confermato" | "annullato" | "fatturato";
type PayState = "none" | "to_send" | "sent" | "paid";

/* -------------------------------------------------------------------------
   CartGrouped : carrello raggruppato per categoria / sottocategoria
   avec affichage spécial TECNICO / MEZZO
---------------------------------------------------------------------------*/

type AggItem = {
  materiale_id: number;
  nome: string;
  qty: number;
  prezzo: number;
  totale: number;
  is_tecnico?: boolean;
  is_messo?: boolean;
};

function CartGrouped({
  rows,
  onRemove,
  onQtyChange,
}: {
  rows: CartRow[];
  onRemove: (id: number) => void;
  onQtyChange?: (id: number, newQta: number) => void;
}) {
  const grouped = useMemo(() => {
    const g: Record<string, Record<string, Record<number, AggItem>>> = {};

    for (const r of rows) {
      const cat = (r.categoria || "— Senza categoria —").trim();
      const sub = (r.sottocategoria || "— Senza sottocategoria —").trim();

      if (!g[cat]) g[cat] = {};
      if (!g[cat][sub]) g[cat][sub] = {};

      const bucket = g[cat][sub];
      const k = r.materiale_id;

      if (!bucket[k]) {
        bucket[k] = {
          materiale_id: r.materiale_id,
          nome: r.nome,
          qty: 0,
          prezzo: Number(r.prezzo || 0),
          totale: 0,
          is_tecnico: r.is_tecnico,
          is_messo: r.is_messo,
        };
      }

      const qty = Number(r.qta || 0);
      const price = Number(r.prezzo || 0);
      bucket[k].qty += qty;
      bucket[k].totale += qty * price;
    }

    return g;
  }, [rows]);

  if (!rows.length) {
    return (
      <div className="border rounded-none bg-white p-3 text-sm text-slate-600">
        Carrello vuoto.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cat, bySub]) => (
          <section key={cat} className="bg-white border rounded-none">
            <div className="px-3 py-2 font-semibold">{cat}</div>

            {Object.entries(bySub)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([sub, itemsMap]) => {
                const items = Object.values(itemsMap);

                const anyTec = items.some((i) => i.is_tecnico);
                const anyMezzi = items.some((i) => i.is_messo);

                const qtyHeader =
                  anyTec && !anyMezzi
                    ? "N. ore"
                    : anyMezzi && !anyTec
                    ? "N. km"
                    : "Qtà";

                const prezzoHeader =
                  anyTec && !anyMezzi
                    ? "€/ora"
                    : anyMezzi && !anyTec
                    ? "€/km"
                    : "Prezzo unitario";

                return (
                  <div key={sub} className="border-t px-3 py-2">
                    <div className="text-sm font-medium text-slate-600 mb-1">
                      {sub}
                    </div>

                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-2 py-1 w-[55%]">
                            Articolo
                          </th>
                          <th className="text-right px-2 py-1">
                            {qtyHeader}
                          </th>
                          <th className="text-right px-2 py-1">
                            {prezzoHeader}
                          </th>
                          <th className="text-right px-2 py-1">Importo</th>
                          <th className="text-right px-2 py-1">Azione</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items
                          .sort((a, b) => a.nome.localeCompare(b.nome))
                          .map((it) => (
                            <tr key={it.materiale_id} className="border-t">
                              <td className="px-2 py-1">
                                {it.nome}
                                {it.is_tecnico && (
                                  <span className="ml-2 text-[10px] px-1 border rounded-none">
                                    TECNICO
                                  </span>
                                )}
                                {it.is_messo && (
                                  <span className="ml-2 text-[10px] px-1 border rounded-none">
                                    MEZZO
                                  </span>
                                )}
                              </td>

                              {/* Qtà / N. ore / N. km avec +/- */}
                              <td className="px-2 py-1 text-right">
                                {onQtyChange ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      className="px-1 py-0.5 border rounded-none text-xs"
                                      onClick={() =>
                                        onQtyChange(
                                          it.materiale_id,
                                          Math.max(1, it.qty - 1)
                                        )
                                      }
                                    >
                                      −
                                    </button>
                                    <input
                                      type="number"
                                      min={1}
                                      className="w-16 border rounded-none text-right px-1 text-xs"
                                      value={it.qty}
                                      onChange={(e) =>
                                        onQtyChange(
                                          it.materiale_id,
                                          Math.max(
                                            1,
                                            Number(e.target.value) || 1
                                          )
                                        )
                                      }
                                    />
                                    <button
                                      type="button"
                                      className="px-1 py-0.5 border rounded-none text-xs"
                                      onClick={() =>
                                        onQtyChange(it.materiale_id, it.qty + 1)
                                      }
                                    >
                                      +
                                    </button>
                                    <span className="ml-1 text-xs text-slate-500">
                                      {it.is_tecnico
                                        ? "h"
                                        : it.is_messo
                                        ? "km"
                                        : ""}
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    {it.qty}
                                    {it.is_tecnico
                                      ? " h"
                                      : it.is_messo
                                      ? " km"
                                      : ""}
                                  </>
                                )}
                              </td>

                              {/* Prezzo unitario / €/ora / €/km */}
                              <td className="px-2 py-1 text-right">
                                {it.prezzo.toFixed(2)}{" "}
                                {it.is_tecnico
                                  ? "€/h"
                                  : it.is_messo
                                  ? "€/km"
                                  : "€"}
                              </td>

                              <td className="px-2 py-1 text-right font-semibold">
                                {it.totale.toFixed(2)} €
                              </td>

                              <td className="px-2 py-1 text-right">
                                <button
                                  type="button"
                                  className="px-2 py-1 border rounded-none"
                                  onClick={() => onRemove(it.materiale_id)}
                                >
                                  Rimuovi
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
          </section>
        ))}
    </div>
  );
}

/* ============================================================================
   COMPOSANT PRINCIPAL
============================================================================ */

export default function OffertaRapida() {
  const router = useRouter();
  const search = useSearchParams();
  const { msg, setMsg } = useToast();

  // si date= existe dans l’URL, on initialise dessus
  const initialDate = search.get("date") ?? dayjs().format("YYYY-MM-DD");
  const initialLoc = Number(search.get("loc") ?? 1);

  // Dates DA / A
  const [dateDa, setDateDa] = useState<string>(initialDate);
  const [dateA, setDateA] = useState<string>(initialDate);

  // Location (L1..L8)
  const [locationIndex, setLocationIndex] = useState<number>(initialLoc);

  // ANAGRAFE
  const [clienti, setClienti] = useState<Client[]>([]);
  const [luoghi, setLuoghi] = useState<Luogo[]>([]);
  const [clienteId, setClienteId] = useState<number | undefined>(undefined);
  const [luogoId, setLuogoId] = useState<number | undefined>(undefined);
  const [clienteLabel, setClienteLabel] = useState<string>("");
  const [luogoLabel, setLuogoLabel] = useState<string>("");

  // Titre
  const [titolo, setTitolo] = useState("Offerta");

  // clé session
  const sessionKey = useMemo(
    () => `${dateDa}|${dateA}|L${String(locationIndex)}`,
    [dateDa, dateA, locationIndex]
  );
  const draftKey = useMemo(() => `offerta:draft:${sessionKey}`, [sessionKey]);

  // CART
  const { rows, add, remove, updateQty, clear, total } = useCart();

  // Tab
  const [tab, setTab] = usePersistentState<"catalogo" | "carrello">(
    "offerta:tab",
    "catalogo"
  );

  // Note
  const [note, setNote] = usePersistentState<string>(
    `offerta:note:${sessionKey}`,
    ""
  );

  // Stato offerta
  const [offertaStato, setOffertaStato] =
    useState<OffertaStato>("da_eseguire");

  const [acconto, setAcconto] = useState<string>("0");
  const [accState, setAccState] = useState<PayState>("none");
  const [salState, setSalState] = useState<PayState>("to_send");

  const [askInviato, setAskInviato] = useState(false);
  const [inviatoConfirmed, setInviatoConfirmed] = useState(false);
  const [prevOffertaStato, setPrevOffertaStato] =
    useState<OffertaStato>("da_eseguire");

  // Suggestions
  const [suggests, setSuggests] = useState<any[]>([]);

  // Popup "ajouté"
  const [addedPopup, setAddedPopup] =
    useState<{ name: string; qty: number } | null>(null);

  // Ref PREVENTIVO
  const preventivoRef = useRef<HTMLDivElement>(null);

  // Modale catalogue
  const [catalogoOpen, setCatalogoOpen] = useState(false);

  // Distance Km du luogo sélectionné
  const distanzaKmSelezionata = useMemo(() => {
    if (!luogoId) return undefined;
    const l = luoghi.find((x) => x.id === luogoId);
    if (!l) return undefined;
    const raw = (l as any).distanza_km ?? (l as any).distanza_km_ar;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [luogoId, luoghi]);

  // Vider le panier au chargement
  useEffect(() => {
    clear();
  }, []);

  // Charger brouillon
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.titolo) setTitolo(d.titolo);
      if (d.clienteId) setClienteId(d.clienteId);
      if (d.luogoId) setLuogoId(d.luogoId);
      if (d.acconto != null) setAcconto(String(d.acconto));
      if (d.note != null) setNote(d.note);
    } catch {}
  }, [draftKey]);

  // Sauvegarder brouillon
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        titolo,
        clienteId,
        luogoId,
        acconto,
        note,
      })
    );
  }, [draftKey, titolo, clienteId, luogoId, acconto, note]);

  // Mappers
  function mapCliente(x: any): Client {
    return {
      id: Number(x.id),
      nome: String(
        x.nome ??
          x.denominazione ??
          x.ragione_sociale ??
          x.label ??
          x.name ??
          ""
      ).trim(),
      external_id: x.external_id ?? x.codice ?? undefined,
    };
  }

  function mapLuogo(x: any): Luogo {
    return {
      id: Number(x.id),
      nome: String(x.nome ?? x.label ?? x.name ?? "").trim(),
      external_id: x.external_id ?? x.codice ?? undefined,
      distanza_km: x.distanza_km ?? x.distanza_km_ar ?? undefined,
    };
  }

  // Charger clienti + luoghi
  useEffect(() => {
    let stop = false;

    (async () => {
      try {
        const rc = await api.get("/clienti/").catch(() => ({ data: [] }));
        const rl = await api.get("/luoghi/").catch(() => ({ data: [] }));
        const clientiList = Array.isArray(rc.data)
          ? rc.data
          : rc.data?.results ?? [];
        const luoghiList = Array.isArray(rl.data)
          ? rl.data
          : rl.data?.results ?? [];

        if (stop) return;
        setClienti(clientiList.map(mapCliente));
        setLuoghi(luoghiList.map(mapLuogo));
      } catch {
        if (stop) return;
        setClienti([]);
        setLuoghi([]);
      }
    })();

    return () => {
      stop = true;
    };
  }, []);

  // Labels
  useEffect(() => {
    if (!clienteId) {
      setClienteLabel("");
      return;
    }
    const c = clienti.find((x) => x.id === clienteId);
    setClienteLabel(c ? c.nome : "");
  }, [clienteId, clienti]);

  useEffect(() => {
    if (!luogoId) {
      setLuogoLabel("");
      return;
    }
    const l = luoghi.find((x) => x.id === luogoId);
    setLuogoLabel(l ? l.nome : "");
  }, [luogoId, luoghi]);

  // Sync acconto <-> stato
  useEffect(() => {
    const val = Number(acconto || 0);

    if (val === 0 && accState !== "none") {
      setAccState("none");
    }

    if (
      val > 0 &&
      accState === "none" &&
      offertaStato === "inviato" &&
      inviatoConfirmed
    ) {
      setAccState("to_send");
    }
  }, [acconto, offertaStato, inviatoConfirmed, accState]);

  // Helpers erreurs
  function explainApiError(err: any): string {
    const data = err?.response?.data;
    if (!data || typeof data !== "object") {
      return err?.message || "Errore sconosciuto";
    }
    try {
      const lines: string[] = [];
      Object.entries(data).forEach(([k, v]) => {
        const arr = Array.isArray(v) ? v : [String(v)];
        lines.push(`${k}: ${arr.join(" · ")}`);
      });
      return lines.join("\n");
    } catch {
      return JSON.stringify(data);
    }
  }

  // Quantità già presente nel carrello per un materiale (in termini di STOCK)
  function getCartStockFor(materiale_id: number): number {
    return rows
      .filter((r) => r.materiale_id === materiale_id)
      .reduce((sum, r) => {
        // Per tecnici / mezzi lo stock è "numero di risorse", non km/ore
        const stockQta =
          r.is_messo || r.is_tecnico ? 1 : Number(r.qta || 0);
        return sum + stockQta;
      }, 0);
  }

  // Chiamata a /magazzino/bookings per avere la disponibilità minima sul periodo [dateDa, dateA]
  async function getDisponibilitaMagazzino(materiale_id: number): Promise<{
    scorta: number;
    dispInterval: number;
  }> {
    const r = await api.get("/magazzino/bookings", {
      params: {
        material: materiale_id,
        from: dateDa,
        to: dateA,
        on: dateDa,
      },
    });

    const scorta = Number(r.data?.scorta || 0);
    const dispInterval =
      r.data?.disponibile != null
        ? Number(r.data.disponibile)
        : Math.max(0, scorta - Number(r.data?.prenotato || 0)); // fallback

    return { scorta, dispInterval };
  }


  // Suggestions intelligentes
  async function loadSuggestions(triggerMatId: number) {
    try {
      const r = await api.get("/suggestions", {
        params: {
          materiale: triggerMatId,
          date_da: dateDa,
          date_a: dateA,
        },
      });
      setSuggests(r.data?.items || []);
    } catch (err) {
      console.error("Errore caricamento suggerimenti:", err);
      setSuggests([]);
    }
  }

  // AJOUT AU PANIER (avec distanza_km pour mezzi)

    // AJOUT AU PANIER (avec distanza_km pour mezzi + limite stock)
    // AJOUT AU PANIER (avec distanza_km pour mezzi + limite stock SANS popup)
  async function handleAdd(row: {
    materiale_id: number;
    nome: string;
    qta: number;
    prezzo: number;
    categoria?: string;
    sottocategoria?: string;
    is_tecnico?: boolean;
    is_messo?: boolean;
  }) {
    // Quantità usata per il PREZZO
    // - materiale normale  : qta (pezzi)
    // - mezzo              : km (presi dal luogo se disponibile)
    // - tecnico            : ore (qta standard)
    let qtaPrezzo = row.qta;
    if (row.is_messo && distanzaKmSelezionata != null) {
      qtaPrezzo = distanzaKmSelezionata; // es. 70 km
    }

    // Quantità usata per lo STOCK
    // - per mezzi / tecnici si considera "1 risorsa"
    const qtaStockRichiesta =
      row.is_messo || row.is_tecnico ? 1 : qtaPrezzo;

    // 1) Disponibilità magazzino su tutto il periodo
    let dispInterval = Infinity;
    try {
      const { dispInterval: d } = await getDisponibilitaMagazzino(
        row.materiale_id
      );
      dispInterval = d;
    } catch (err) {
      console.error("Errore controllo disponibilità magazzino:", err);
      // Se l'API fallisce, non blocchiamo ma non mettiamo popup
      dispInterval = Infinity;
    }

    // 2) Stock già impegnato nel carrello per questo materiale
    const alreadyInCart = getCartStockFor(row.materiale_id);

    // 3) Disponibilità residua = (dispInterval) - (già nel carrello)
    const remaining =
      dispInterval === Infinity
        ? Infinity
        : Math.max(0, dispInterval - alreadyInCart);

    // Nessuna disponibilità residua → non aggiungere nulla (senza popup)
    if (remaining <= 0) {
      return;
    }

    let effectivePrezzoQta = qtaPrezzo;

    // 4) Se l'utente chiede più dello stock residuo
    if (dispInterval !== Infinity && qtaStockRichiesta > remaining) {
      if (!row.is_messo && !row.is_tecnico) {
        // Materiale normale: clamp automatico alla quantità disponibile
        effectivePrezzoQta = remaining;
        // (qtaStock = remaining anche, ma non ci serve fuori)
      } else {
        // Tecnici / mezzi: o 1 (se c'è) oppure niente
        if (remaining < 1) {
          return;
        }
        // qtaStockRichiesta è sempre 1 → ok, non serve cambiare qtaPrezzo
      }
    }

    // 5) Aggiunta effettiva al carrello con la quantità "clampata"
    const cartRow: CartRow = {
      materiale_id: row.materiale_id,
      nome: row.nome,
      qta: effectivePrezzoQta,
      prezzo: row.prezzo,
      importo: effectivePrezzoQta * row.prezzo,
      categoria: row.categoria ?? null,
      sottocategoria: row.sottocategoria ?? null,
      is_tecnico: row.is_tecnico,
      is_messo: row.is_messo,
    };

    add(cartRow);

    // Petit toast sympa (tu peux même le retirer si tu veux zéro message)
    setMsg(`Aggiunto: ${row.nome} ×${effectivePrezzoQta}`);
    setAddedPopup({ name: row.nome, qty: effectivePrezzoQta });

    await loadSuggestions(row.materiale_id);
  }


  // Stato offerta
  function onChangeStatoOfferta(v: OffertaStato) {
    if (v === "inviato") {
      setPrevOffertaStato(offertaStato);
      setOffertaStato("inviato");
      setAskInviato(true);
      setInviatoConfirmed(false);
    } else {
      setOffertaStato(v);
      setAskInviato(false);
      setInviatoConfirmed(false);
    }
  }

  function confirmInviato() {
    setInviatoConfirmed(true);
    setAskInviato(false);
    setAccState(Number(acconto || 0) > 0 ? "to_send" : "none");
    setSalState("to_send");

    setTimeout(() => {
      preventivoRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function cancelInviato() {
    setOffertaStato(prevOffertaStato || "da_eseguire");
    setAskInviato(false);
    setInviatoConfirmed(false);
  }

  const showConfirmedBadge =
    (offertaStato === "inviato" && inviatoConfirmed) ||
    salState === "paid";

  const eventoStato: BackendStato = useMemo(
    () => (showConfirmedBadge ? "confermato" : "bozza"),
    [showConfirmedBadge]
  );

  // CREATE EVENTO
  async function createEvento() {
    if (!clienteId || !luogoId) {
      alert("Seleziona cliente e luogo.");
      return;
    }

    if (rows.length === 0) {
      alert("Aggiungi almeno un articolo al carrello.");
      return;
    }

    const today = dayjs().format("YYYY-MM-DD");
    if (dateDa < today) {
      alert("Non puoi creare eventi nel passato.");
      return;
    }
    if (dateA < dateDa) {
      alert("La data di fine non può essere prima di quella di inizio.");
      return;
    }

    if (offertaStato === "annullato") {
      const ok = confirm("Annullare l’offerta (non verrà salvata)?");
      if (ok) history.back();
      return;
    }

    const payload: any = {
      titolo,
      data_evento: dateDa,
      data_evento_da: dateDa,
      data_evento_a: dateA,
      stato: eventoStato,
      offerta_stato: offertaStato,

      acconto_importo: Number(acconto || 0),
      acconto_state: accState,
      saldo_state: salState,

      cliente: clienteId,
      luogo: luogoId,
      location_index: Number(locationIndex),

      note,
      categoria_notes: {},

      righe: rows.map((r) => ({
        materiale: r.materiale_id,
        qta: r.qta,
        prezzo: r.prezzo,
        importo: r.importo,
        copertura_giorni: dayjs(dateA).diff(dayjs(dateDa), "day") + 1,
        is_tecnico: !!r.is_tecnico,
        is_trasporto: !!r.is_messo,
      })),
    };

    try {
      const res = await api.post("/eventi/", payload);
      setMsg(`Offerta registrata (stato: ${offertaStato}) • id ${res.data.id}`);

      if (typeof window !== "undefined") {
        localStorage.removeItem(draftKey);
      }

      router.push(`/eventi/${res.data.id}`);
    } catch (err: any) {
      alert("Impossibile creare l'offerta:\n" + explainApiError(err));
      console.error(err);
    }
  }
const [suggestions, setSuggestions] = useState<any[]>([]);


async function addMaterial(materiale_id: number, qta: number) {
  // 1) Ajoute l'article normalement
  await reallyAddMaterial(materiale_id, qta);

  // 2) Appelle l’API de suggestion
  try {
    const r = await api.get("/suggest", {
      params: {
        materiale: materiale_id,
        date: dateDa, // ou date_evento, selon ton fichier
      },
    });

    const items = r.data?.items || [];

    if (items.length > 0) {
      setSuggestions(items); // ⬅ crée une state React
    } else {
      setSuggestions([]);
    }
  } catch (e) {
    console.error("Erreur suggestion :", e);
  }
}


  /* ============================================================================
     UI
  ============================================================================ */

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Eventi — Offerta rapida</h1>

      <AnagrafeBar
        clienteId={clienteId}
        clienteLabel={clienteLabel}
        luogoId={luogoId}
        luogoLabel={luogoLabel}
        onClienteCreated={(id, label) => {
          setClienteId(id);
          setClienteLabel(label);
          setClienti((prev) => [{ id, nome: label }, ...prev]);
        }}
        onLuogoCreated={(id, label) => {
          setLuogoId(id);
          setLuogoLabel(label);
          setLuoghi((prev) => [{ id, nome: label }, ...prev]);
        }}
      />

      <div className="grid grid-cols-2 gap-4">
        {/* COLONNE GAUCHE */}
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm">Titolo</span>
            <input
              className="mt-1 w-full border rounded-none px-2 py-1"
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-sm">Data (DA)</span>
              <input
                className="mt-1 w-full border rounded-none px-2 py-1"
                type="date"
                min={dayjs().format("YYYY-MM-DD")}
                value={dateDa}
                onChange={(e) => {
                  const v = e.target.value;
                  setDateDa(v);
                  if (v > dateA) setDateA(v);
                }}
              />
            </label>

            <label className="block">
              <span className="text-sm">Data (A)</span>
              <input
                className="mt-1 w-full border rounded-none px-2 py-1"
                type="date"
                min={dateDa}
                value={dateA}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v >= dateDa) setDateA(v);
                }}
              />
            </label>
          </div>

          <LocationSelector
            dateValue={dateDa}
            value={locationIndex}
            onChange={setLocationIndex}
            autoReassignIfBusy={true}
          />

          <div className="block">
            <span className="text-sm">Stato offerta</span>

            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-block w-3 h-3 rounded-sm ${
                  offertaStato === "da_eseguire"
                    ? "bg-rose-500"
                    : offertaStato === "inviato"
                    ? "bg-blue-500"
                    : "bg-slate-400"
                }`}
              />
              <select
                className="border rounded-none px-2 py-1"
                value={offertaStato}
                onChange={(e) =>
                  onChangeStatoOfferta(e.target.value as OffertaStato)
                }
              >
                <option value="da_eseguire">DA ESEGUIRE</option>
                <option value="inviato">INVIATO</option>
                <option value="annullato">ANNULLATO</option>
              </select>
            </div>

            {askInviato &&
              offertaStato === "inviato" &&
              !inviatoConfirmed && (
                <div className="mt-2 inline-flex items-center gap-2 border rounded-none bg-white p-2">
                  <span className="text-sm mr-2">Confermi?</span>
                  <button
                    className="px-2 py-1 border rounded-none text-xs bg-emerald-600 text-white"
                    onClick={confirmInviato}
                  >
                    CONFERMA
                  </button>
                  <button
                    className="px-2 py-1 border rounded-none text-xs"
                    onClick={cancelInviato}
                  >
                    ANNULLA
                  </button>
                </div>
              )}
          </div>

          <div
            ref={preventivoRef}
            className="border rounded-none bg-white p-3"
          >
            <div className="mb-1 flex justify-end gap-4">
              <div className="inline-flex items-center gap-2">
                <span className="text-xs text-slate-600">Acconto</span>
                <span
                  className={`inline-block w-3 h-3 rounded-sm ${
                    accState === "none"
                      ? "bg-slate-400"
                      : accState === "to_send"
                      ? "bg-rose-500"
                      : accState === "sent"
                      ? "bg-blue-500"
                      : "bg-emerald-500"
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">PREVENTIVO</div>

              {offertaStato === "inviato" && inviatoConfirmed ? (
                <div className="inline-flex items-center gap-2 px-2 py-1 border bg-emerald-50 text-emerald-700 rounded-none">
                  <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />
                  CONFERMATO
                </div>
              ) : offertaStato === "da_eseguire" ? (
                <div className="inline-flex items-center gap-2 px-2 py-1 border bg-rose-50 text-rose-700 rounded-none">
                  <span className="inline-block w-3 h-3 rounded-sm bg-rose-500" />
                  DA ESEGUIRE
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-2 py-1 border bg-slate-50 text-slate-700 rounded-none">
                  <span className="inline-block w-3 h-3 rounded-sm bg-slate-500" />
                  ANNULLATO
                </div>
              )}
            </div>

            <div className="grid grid-cols-12 gap-3 items-start">
              <label className="block col-span-12 md:col-span-4">
                <span className="text-sm">Acconto (€)</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className="mt-1 w-full border rounded-none px-2 py-1 text-right"
                  value={acconto}
                  onChange={(e) => setAcconto(e.target.value)}
                />
              </label>

              <div className="col-span-12 md:col-span-4">
                <span className="text-sm">Stato acconto</span>
                <div className="mt-1 grid grid-rows-4 gap-2">
                  {["none", "to_send", "sent", "paid"].map((state) => (
                    <button
                      key={state}
                      type="button"
                      className={
                        "px-3 py-1 border rounded-none text-xs w-full flex items-center gap-2 " +
                        (accState === state
                          ? "bg-black text-white"
                          : "bg-white")
                      }
                      disabled={
                        Number(acconto || 0) === 0 && state !== "none"
                      }
                      onClick={() => setAccState(state as PayState)}
                    >
                      <span
                        className={
                          "inline-block w-2.5 h-2.5 rounded-sm " +
                          (state === "none"
                            ? "bg-slate-400"
                            : state === "to_send"
                            ? "bg-rose-500"
                            : state === "sent"
                            ? "bg-blue-500"
                            : "bg-emerald-500")
                        }
                      />
                      {{
                        none: "NO",
                        to_send: "DA INVIARE",
                        sent: "INVIATO",
                        paid: "PAGATO",
                      }[state]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-12 md:col-span-4">
                <span className="text-sm">Stato saldo</span>

                <div className="mt-1 grid grid-rows-3 gap-2">
                  {["to_send", "sent", "paid"].map((state) => (
                    <button
                      key={state}
                      type="button"
                      className={
                        "px-3 py-1 border rounded-none text-xs w-full flex items-center gap-2 " +
                        (salState === state
                          ? "bg-black text-white"
                          : "bg-white")
                      }
                      onClick={() => setSalState(state as PayState)}
                    >
                      <span
                        className={
                          "inline-block w-2.5 h-2.5 rounded-sm " +
                          (state === "to_send"
                            ? "bg-rose-500"
                            : state === "sent"
                            ? "bg-blue-500"
                            : "bg-emerald-500")
                        }
                      />
                      {{
                        to_send: "DA INVIARE",
                        sent: "INVIATO",
                        paid: "PAGATO",
                      }[state]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CLIENTE / LUOGO */}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-sm">Cliente</span>
              <select
                className="mt-1 w-full border rounded-none px-2 py-1"
                value={clienteId != null ? String(clienteId) : ""}
                onChange={(e) => {
                  const id = e.target.value
                    ? Number(e.target.value)
                    : undefined;
                  setClienteId(id);
                  const c = clienti.find((x) => String(x.id) === e.target.value);
                  setClienteLabel(c ? c.nome : "");
                }}
              >
                <option value="" disabled hidden>
                  -- Scegli --
                </option>
                {clienti.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nome}
                    {c.external_id ? ` (${c.external_id})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm">Luogo</span>
              <select
                className="mt-1 w-full border rounded-none px-2 py-1"
                value={luogoId != null ? String(luogoId) : ""}
                onChange={(e) => {
                  const id = e.target.value
                    ? Number(e.target.value)
                    : undefined;
                  setLuogoId(id);
                  const l = luoghi.find((x) => String(x.id) === e.target.value);
                  setLuogoLabel(l ? l.nome : "");
                }}
              >
                <option value="" disabled hidden>
                  -- Scegli --
                </option>
                {luoghi.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.nome}
                    {l.external_id ? ` (${l.external_id})` : ""}
                  </option>
                ))}
              </select>
              {distanzaKmSelezionata != null && (
                <div className="text-xs text-slate-500 mt-1">
                  Distanza: {distanzaKmSelezionata} km (usata di default per i
                  MEZZI)
                </div>
              )}
            </label>
          </div>

          {/* Onglets */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab("catalogo")}
              className={
                "px-3 py-2 border rounded-none " +
                (tab === "catalogo" ? "bg-black text-white" : "")
              }
            >
              Catalogo
            </button>
            <button
              onClick={() => setTab("carrello")}
              className={
                "px-3 py-2 border rounded-none " +
                (tab === "carrello" ? "bg-black text-white" : "")
              }
            >
              Carrello
            </button>
          </div>

          {tab === "catalogo" && (
            <>
              <button
                onClick={() => setCatalogoOpen(true)}
                className="px-3 py-2 bg-blue-600 text-white rounded-none"
              >
                Aggiungere dal catalogo
              </button>

              {suggests.length > 0 && (
                <div className="mt-3 border rounded-none bg-white p-2">
                  <div className="text-sm font-medium mb-2">
                    Suggerimenti aggiuntivi
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {suggests.map((s) => (
                      <button
                        key={`${s.materiale_id}-${s.nome}`}
                        className="px-2 py-1 border rounded-none text-xs hover:bg-slate-50"
                        onClick={() =>
                          handleAdd({
                            materiale_id: s.materiale_id,
                            nome: s.nome,
                            qta: s.qty_default || 1,
                            prezzo: s.prezzo,
                            categoria: undefined,
                            sottocategoria: undefined,
                            is_tecnico: s.is_tecnico,
                            is_messo: s.is_messo,
                          })
                        }
                      >
                        {s.nome} ×{s.qty_default || 1}
                      </button>
                    ))}
                  </div>
                    {suggessions.length > 0 && (
                      <div className="mt-4 p-3 border bg-blue-50 rounded">
                        <h3 className="font-semibold mb-2">Suggerimenti</h3>

                        {suggestions.map((s) => (
                          <div key={s.materiale_id} className="flex items-center justify-between mb-2">
                            <div>
                              <b>{s.nome}</b>
                              <div className="text-xs text-slate-600">{s.label}</div>
                            </div>

                            <button
                              className="px-2 py-1 border rounded bg-white hover:bg-slate-100"
                              onClick={() => addMaterial(s.materiale_id, s.qty_default)}
                            >
                              + Aggiungi
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                </div>
              )}
            </>
          )}

          <button
            onClick={createEvento}
            className="px-3 py-2 bg-black text-white rounded-none"
          >
            Salva l’offerta
          </button>
        </div>

        {/* COLONNE DROITE */}
        <div className="space-y-3">
          {tab !== "catalogo" && (
            <button
              onClick={() => setCatalogoOpen(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-none"
            >
              Aggiungere dal catalogo
            </button>
          )}

          <CartGrouped
            rows={rows}
            onRemove={(id) => remove(id)}
            onQtyChange={(id, newQta) => updateQty(id, newQta)}
          />

          <div className="text-right font-semibold text-lg">
            Totale: {Number(total || 0).toFixed(2)} €
          </div>

          <div className="bg-white border rounded-none p-3">
            <div className="font-semibold mb-1">Note</div>
            <textarea
              className="w-full min-h-[120px] border rounded-none px-2 py-1"
              placeholder="Annotazioni interne / richieste del cliente…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* POPUP : AGGIUNTO AL CARRELLO */}
      {addedPopup && (
        <div className="fixed bottom-4 right-4 z-[9999]">
          <div className="bg-black text-white px-4 py-2 rounded-none shadow-lg text-sm">
            Aggiunto al carrello:
            <br />
            <span className="font-semibold">
              {addedPopup.name} ×{addedPopup.qty}
            </span>
          </div>
        </div>
      )}

      {/* MODALE CATALOGUE */}
      <CatalogoModal
        open={catalogoOpen}
        onClose={() => setCatalogoOpen(false)}
        dateDa={dateDa}
        dateA={dateA}
        selectedLuogo={luogoId}
        mezziKmDefault={distanzaKmSelezionata}
        onAdd={handleAdd}
      />

      <Toast msg={msg} />
    </div>
  );
}
