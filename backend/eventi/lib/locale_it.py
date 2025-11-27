# (chemin : /backend/eventi/lib/locale_it.py)
from decimal import Decimal, ROUND_HALF_UP
NBSP = "\u00A0"

def euro(val, with_symbol=True):
    if val is None:
        val = Decimal("0")
    val = Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    s = f"{val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{s}{NBSP}€" if with_symbol else s

def safe(val, default="—"):
    return val if (val is not None and f"{val}".strip()) else default
