/* /frontend/src/lib/diffEventi.ts */

export type LineSnap = {
  materiale_id: number;
  nome: string;
  qta: number;                // quantité agrégée par matériel
  prezzo: number;             // prix unitaire
  is_tecnico?: boolean;
  is_messo?: boolean;
  categoria?: string | null;
  sottocategoria?: string | null;
};

export type RevSnapshot = {
  ref: string;                       // ex: "ref9"
  location_index?: number | null;    // 1..8
  // états métier utiles aux diffs de statut (optionnels selon ton backend)
  stato?: "bozza" | "confermato" | "annullato" | "fatturato";
  offerta_stato?: "da_eseguire" | "inviato" | "annullato";
  acconto_state?: "none" | "to_send" | "sent" | "paid";
  saldo_state?: "to_send" | "sent" | "paid";
  righe: LineSnap[];
};

export type FieldChange = {
  field: string;
  before: string | number | boolean | null | undefined;
  after: string | number | boolean | null | undefined;
};

export type DiffLine = {
  materiale_id: number;
  nome: string;
  delta: number;       // >0 ajouté, <0 supprimé
  prezzo?: number;
};

export type EventDiff = {
  modified: FieldChange[];      // champs modifiés (statuts, location, prix, flags…)
  added: DiffLine[];            // delta > 0
  removed: DiffLine[];          // delta < 0
  changedButSameQty: FieldChange[]; // ex: prix modifié mais même qta
};

function normStr(v: any) {
  return v === undefined ? undefined : v === null ? null : String(v);
}

function indexByMaterial(lines: LineSnap[]) {
  const m = new Map<number, { base: LineSnap; qty: number }>();
  for (const l of lines || []) {
    const cur = m.get(l.materiale_id);
    if (cur) cur.qty += Number(l.qta || 0);
    else m.set(l.materiale_id, { base: l, qty: Number(l.qta || 0) });
  }
  return m;
}

export function diffRevisions(oldSnap: RevSnapshot, newSnap: RevSnapshot): EventDiff {
  const out: EventDiff = { modified: [], added: [], removed: [], changedButSameQty: [] };

  // --------- champs haut-niveau (inclut les STATUTS) ----------
  const topFields: Array<[keyof RevSnapshot, string]> = [
    ["location_index", "location"],
    ["stato", "stato evento"],               // bozza ↔ confermato …
    ["offerta_stato", "stato offerta"],      // da_eseguire ↔ inviato …
    ["acconto_state", "stato acconto"],      // none/to_send/sent/paid
    ["saldo_state", "stato saldo"],          // to_send/sent/paid
  ];
  for (const [k, label] of topFields) {
    const a = oldSnap?.[k];
    const b = newSnap?.[k];
    if (normStr(a) !== normStr(b)) {
      out.modified.push({ field: label, before: a as any, after: b as any });
    }
  }

  // --------- lignes (ajouts / suppressions / modifs sans changement de qta) ----------
  const A = indexByMaterial(oldSnap?.righe || []);
  const B = indexByMaterial(newSnap?.righe || []);
  const ids = new Set<number>([...A.keys(), ...B.keys()]);

  for (const id of ids) {
    const pa = A.get(id);
    const pb = B.get(id);
    const qtyA = pa?.qty || 0;
    const qtyB = pb?.qty || 0;
    const delta = qtyB - qtyA;

    if (delta > 0) {
      out.added.push({
        materiale_id: id,
        nome: pb?.base?.nome || pa?.base?.nome || `#${id}`,
        delta,
        prezzo: pb?.base?.prezzo,
      });
    } else if (delta < 0) {
      out.removed.push({
        materiale_id: id,
        nome: pa?.base?.nome || pb?.base?.nome || `#${id}`,
        delta, // < 0
        prezzo: pa?.base?.prezzo,
      });
    } else if (pa && pb) {
      // même quantité → traquer modifs "qualitatives"
      const before = pa.base;
      const after  = pb.base;

      const changes: FieldChange[] = [];
      if (Number(before.prezzo) !== Number(after.prezzo)) {
        changes.push({ field: `prezzo @${after.nome}`, before: before.prezzo, after: after.prezzo });
      }
      if (!!before.is_tecnico !== !!after.is_tecnico) {
        changes.push({ field: `is_tecnico @${after.nome}`, before: !!before.is_tecnico, after: !!after.is_tecnico });
      }
      if (!!before.is_messo !== !!after.is_messo) {
        changes.push({ field: `is_messo @${after.nome}`, before: !!before.is_messo, after: !!after.is_messo });
      }
      if ((before.categoria || "") !== (after.categoria || "")) {
        changes.push({ field: `categoria @${after.nome}`, before: before.categoria, after: after.categoria });
      }
      if ((before.sottocategoria || "") !== (after.sottocategoria || "")) {
        changes.push({ field: `sottocategoria @${after.nome}`, before: before.sottocategoria, after: after.sottocategoria });
      }
      out.changedButSameQty.push(...changes);
    }
  }

  // Tri (facultatif)
  out.added.sort((x, y) => x.nome.localeCompare(y.nome));
  out.removed.sort((x, y) => x.nome.localeCompare(y.nome));
  out.modified.sort((a, b) => a.field.localeCompare(b.field));
  out.changedButSameQty.sort((a, b) => a.field.localeCompare(b.field));
  return out;
}
