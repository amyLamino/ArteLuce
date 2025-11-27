
# (chemin : /backend/eventi/exporters/normalizers.py)
from dataclasses import dataclass
from typing import List, Optional
from decimal import Decimal
from ..lib.locale_it import euro, safe          # ⬅️ nouveau import
@dataclass
class Row:
    pos: int
    descr: str
    qta: Decimal
    pu: Decimal
    totale: Decimal

def _nice_desc(item) -> str:
    raw = f"{getattr(item, 'descrizione', '') or getattr(item, 'nome', '')}".strip()
    if raw.lower() in {"(fee)", "fee"}:
        return "Quota gestione"
    if raw.lower() in {"totto", "tutto", "totale"}:
        return "Totale servizio"
    return raw or "—"

def build_rows(righe) -> List[Row]:
    out: List[Row] = []
    pos = 1
    for r in righe:
        qta = Decimal(str(getattr(r, "quantita", 0) or 0))
        pu = Decimal(str(getattr(r, "prezzo_unitario", getattr(r, "prezzo", 0) or 0)))
        tot = Decimal(str(getattr(r, "importo", (qta * pu)) or (qta * pu)))
        out.append(Row(pos=pos, descr=_nice_desc(r), qta=qta, pu=pu, totale=tot))
        pos += 1
    return out

def totals(rows: List[Row], acconto: Optional[Decimal]) -> dict:
    tot = sum((r.totale for r in rows), Decimal("0"))
    acc = Decimal(str(acconto or 0))
    saldo = tot - acc
    return {
        "totale_raw": tot, "acconto_raw": acc, "saldo_raw": saldo,
        "totale": euro(tot), "acconto": euro(acc), "saldo": euro(saldo),
    }
