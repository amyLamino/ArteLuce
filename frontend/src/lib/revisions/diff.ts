// /frontend/src/lib/revisions/diff.ts
export type QtyLine = {
  materiale_id: number;
  nome: string;
  qta: number;
  prezzo: number;
  categoria?: string | null;
  sottocategoria?: string | null;
  is_tecnico?: boolean;
  is_messo?: boolean;
};

export type Snap = {
  ref: string;
  location_index?: number | null;
  stato?: "bozza" | "confermato" | "annullato" | "fatturato";
  offerta_stato?: "da_eseguire" | "inviato" | "annullato";
  acconto_state?: "none" | "to_send" | "sent" | "paid";
  saldo_state?: "to_send" | "sent" | "paid";
  righe: QtyLine[];
};

export type FieldChange = { field: string; before: any; after: any };
export type DiffLine   = { materiale_id: number; nome: string; delta: number; prezzo?: number };

export type DiffResult = {
  modified: FieldChange[];
  added: DiffLine[];
  removed: DiffLine[];
};

function byId(lines: QtyLine[]) {
  const map = new Map<number, QtyLine>();
  for (const l of lines || []) {
    map.set(l.materiale_id, {
      materiale_id: Number(l.materiale_id),
      nome: String(l.nome || `#${l.materiale_id}`),
      qta: Number(l.qta || 0),
      prezzo: Number(l.prezzo || 0),
      categoria: l.categoria ?? null,
      sottocategoria: l.sottocategoria ?? null,
      is_tecnico: !!l.is_tecnico,
      is_messo: !!l.is_messo,
    });
  }
  return map;
}

export function diffRevisions(prev: Snap, curr: Snap): DiffResult {
  const out: DiffResult = { modified: [], added: [], removed: [] };

  // Modifs de haut niveau
  const top: Array<[keyof Snap, string]> = [
    ["location_index", "location"],
    ["stato", "stato evento"],
    ["offerta_stato", "stato offerta"],
    ["acconto_state", "stato acconto"],
    ["saldo_state", "stato saldo"],
  ];
  for (const [k, label] of top) {
    const a = prev?.[k]; const b = curr?.[k];
    if (String(a ?? "") !== String(b ?? "")) {
      out.modified.push({ field: label, before: a ?? "—", after: b ?? "—" });
    }
  }

  // Ajoutés / Supprimés / Modifs qualitatives (qte égale)
  const A = byId(prev?.righe || []);
  const B = byId(curr?.righe || []);
  const ids = new Set<number>([...A.keys(), ...B.keys()]);

  for (const id of ids) {
    const a = A.get(id);
    const b = B.get(id);
    const qa = a?.qta ?? 0;
    const qb = b?.qta ?? 0;
    const d = qb - qa;

    if (d > 0) out.added.push({ materiale_id: id, nome: b!.nome, delta: d, prezzo: b!.prezzo });
    else if (d < 0) out.removed.push({ materiale_id: id, nome: (a?.nome || b?.nome)!, delta: d, prezzo: a?.prezzo });
    else if (a && b) {
      if (Number(a.prezzo) !== Number(b.prezzo)) {
        out.modified.push({ field: `prezzo @${b.nome}`, before: a.prezzo, after: b.prezzo });
      }
      if (!!a.is_tecnico !== !!b.is_tecnico) {
        out.modified.push({ field: `is_tecnico @${b.nome}`, before: !!a.is_tecnico, after: !!b.is_tecnico });
      }
      if (!!a.is_messo !== !!b.is_messo) {
        out.modified.push({ field: `is_messo @${b.nome}`, before: !!a.is_messo, after: !!b.is_messo });
      }
      if ((a.categoria || "") !== (b.categoria || "")) {
        out.modified.push({ field: `categoria @${b.nome}`, before: a.categoria ?? "—", after: b.categoria ?? "—" });
      }
      if ((a.sottocategoria || "") !== (b.sottocategoria || "")) {
        out.modified.push({ field: `sottocategoria @${b.nome}`, before: a.sottocategoria ?? "—", after: b.sottocategoria ?? "—" });
      }
    }
  }

  out.added.sort((x,y)=>x.nome.localeCompare(y.nome));
  out.removed.sort((x,y)=>x.nome.localeCompare(y.nome));
  out.modified.sort((x,y)=>String(x.field).localeCompare(String(y.field)));

  return out;
}
