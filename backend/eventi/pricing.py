# (chemin : /backend/eventi/pricing.py)
from decimal import Decimal

from dataclasses import dataclass
from datetime import date
from typing import List, Dict, Any
from decimal import Decimal, ROUND_HALF_UP
# (chemin : /backend/eventi/pricing.py)
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional

from collections import defaultdict
from decimal import Decimal
from django.utils.dateparse import parse_date
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Materiale, Luogo


# (chemin : /backend/eventi/views_pricing.py)
from datetime import datetime
from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .models import Materiale, Mezzo, Luogo

# Mois/semaines pour ajustements
PEAK_MONTHS = {6, 7, 8, 9, 12}      # été + fêtes
SHOULDER_MONTHS = {5, 10, 11}       # intersaisons
WEEKEND = {4, 5, 6}                 # Fri=4, Sat=5, Sun=6

EUR = Decimal("0.01")
def eur(x): return Decimal(x).quantize(EUR, rounding=ROUND_HALF_UP)

def dynamic_price_from_base(mat, qty: Decimal, ev_date: date, luogo=None, mezzo=None) -> Decimal:
    base = Decimal(mat.prezzo or 0)             # <-- listino/catalogo
    # Exemple de facteurs déterministes (aucun random, pas “now()”)
    weekend = Decimal("1.10") if ev_date.weekday() in (4, 5) else Decimal("1.00")
    sconto_qta = Decimal("0.95") if qty >= 4 else Decimal("1.00")
    # … autres coefficients déterministes (distance, salle, etc.)
    return eur(base * weekend * sconto_qta)

class QuotePricingView(APIView):
    def post(self, request, *args, **kwargs):
        date_iso = request.data.get("dateISO")
        luogo_id = request.data.get("luogoId")
        righe = request.data.get("righe", [])  # [{materiale, qta, ...}]

        ev_date = parse_date(date_iso) if date_iso else None
        luogo = Luogo.objects.filter(pk=luogo_id).first() if luogo_id else None

        qty_by_mat = defaultdict(Decimal)
        for r in righe:
            mid = int(r.get("materiale"))
            qty_by_mat[mid] += Decimal(r.get("qta") or 0)

        unit_prices = {}
        for mid, qty in qty_by_mat.items():
            m = Materiale.objects.get(pk=mid)
            unit_prices[mid] = dynamic_price_from_base(m, qty, ev_date, luogo)

        return Response({"unit_prices": unit_prices})
import datetime as dt
SEASON_FACTORS = {"ete": Decimal("1.15"), "noel": Decimal("1.25"), "standard": Decimal("1.00")}
WEEKDAY_FACTORS = {5: Decimal("1.10"), 6: Decimal("1.15")}
QTY_TIERS = [(10, Decimal("0.05")), (20, Decimal("0.10")), (50, Decimal("0.15"))]
DIST_EUR_PER_KM = Decimal("0.80")
def season_for(date_: dt.date) -> str:
    if date_.month in (6,7,8): return "ete"
    if date_.month == 12: return "noel"
    return "standard"
def tier_discount(qta: int) -> Decimal:
    d = Decimal("0")
    for min_q, r in QTY_TIERS:
        if qta >= min_q: d = r
    return d
def dynamic_price(base: Decimal, date_: dt.date, qta: int, distance_km: Decimal) -> Decimal:
    price = base
    price *= SEASON_FACTORS.get(season_for(date_), Decimal("1"))
    price *= WEEKDAY_FACTORS.get(date_.weekday(), Decimal("1"))
    price *= (Decimal("1") - tier_discount(qta))
    total = (price * qta) + (distance_km * DIST_EUR_PER_KM)
    return total.quantize(Decimal("0.01"))


PEAK_MONTHS = {6, 7, 8, 9, 12}      # été + fêtes
SHOULDER_MONTHS = {5, 10, 11}       # intersaisons
WEEKEND = {4, 5, 6}                 # Fri=4, Sat=5, Sun=6

@dataclass
class Line:
    materiale: int
    nome: str
    qta: Decimal
    pu_base: Decimal

def _round2(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def season_factor(d: date) -> Decimal:
    if d.month in PEAK_MONTHS:
        return Decimal("1.15")
    if d.month in SHOULDER_MONTHS:
        return Decimal("1.05")
    return Decimal("1.00")

def weekday_factor(d: date) -> Decimal:
    return Decimal("1.10") if d.weekday() in WEEKEND else Decimal("1.00")

def qty_factor(qta: Decimal) -> Decimal:
    if qta >= 50:
        return Decimal("0.90")
    if qta >= 20:
        return Decimal("0.94")
    if qta >= 10:
        return Decimal("0.97")
    return Decimal("1.00")

def compute_quote(
    lines: List[Line],
    d: date,
    distanza_km_ar: Decimal = Decimal("0"),
    mezzo: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Calcule un devis complet (PU suggéré par ligne, totaux, logistica).
    """
    s = season_factor(d)
    w = weekday_factor(d)

    out_lines: List[Dict[str, Any]] = []
    subtot = Decimal("0")

    for L in lines:
        qf = qty_factor(L.qta)
        pu = _round2(L.pu_base * s * w * qf)
        tot = _round2(pu * L.qta)
        subtot += tot
        out_lines.append({
            "materiale": L.materiale,
            "nome": L.nome,
            "qta": float(L.qta),
            "pu_base": float(L.pu_base),
            "pu_suggerito": float(pu),
            "fattori": {
                "stagione": float(s),
                "giorno": float(w),
                "quantita": float(qf),
            },
            "importo": float(tot),
        })

    # Logistica (facultatif)
    logistica = Decimal("0")
    if mezzo:
        costo_km = Decimal(str(mezzo.get("costo_km", 0)))
        costo_uscita = Decimal(str(mezzo.get("costo_uscita", 0)))
        km = Decimal(str(distanza_km_ar or 0))
        logistica = _round2(costo_uscita + km * costo_km)

    total = _round2(subtot + logistica)
    return {
        "lines": out_lines,
        "totali": {
            "subtotale_materiali": float(subtot),
            "logistica": float(logistica),
            "totale": float(total),
        },
        "fattori": {"stagione": float(s), "giorno": float(w)},
    }

def dynamic_unit_price(
    pu_base: Decimal,
    qta: Decimal,
    d: date,
) -> Decimal:
    """
    Renvoie un PU suggéré pour UNE ligne (compat facile depuis du vieux code).
    """
    s = season_factor(d)
    w = weekday_factor(d)
    qf = qty_factor(qta)
    return _round2(pu_base * s * w * qf)


def add_logistica_to_total(base: Decimal, totale_logistica: Decimal) -> Decimal:
    try:
        base = Decimal(str(base or 0))
        totale_logistica = Decimal(str(totale_logistica or 0))
    except Exception:
        return base
    return base + totale_logistica