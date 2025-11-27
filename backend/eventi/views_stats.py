# /backend/eventi/views_stats.py
from __future__ import annotations
from datetime import date, datetime, timedelta
from collections import defaultdict
from decimal import Decimal
from django.db.models import Sum, F, Q, IntegerField
from django.db.models.functions import TruncDate
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Evento, RigaEvento, Materiale

STATI_ATTIVI = ("bozza", "inviata", "confermato", "acconto", "saldo", "fatturato")

def month_bounds(yyyy_mm: str):
    y, m = map(int, yyyy_mm.split("-"))
    d0 = date(y, m, 1)
    d1 = (date(y + (m // 12), (m % 12) + 1, 1) - timedelta(days=1))
    return d0, d1

class StatsMeseView(APIView):
    """
    GET /api/stats/mese?m=2025-11
    Retourne:
      - kpis (events, lignes, ricavo_totale, conversion, cout_logistique, cout_total)
      - ricavo_per_giorno [{date, ricavo}]
      - stati [{label,count}]
      - top_materiali [{nome,qta}]
      - ricavo_per_categoria [{categoria, ricavo}]
    """
    def get(self, request):
        m = request.GET.get("m")
        assert m, "Parametro m mancante (YYYY-MM)"
        d0, d1 = month_bounds(m)

        ev = Evento.objects.filter(data_evento__range=(d0, d1), stato__in=STATI_ATTIVI)

        # lignes + ricavo
        righe = (RigaEvento.objects
                 .filter(evento__in=ev)
                 .annotate(importo=F("qta") * F("prezzo")))
        ricavo_totale = righe.aggregate(t=Sum("importo"))["t"] or Decimal("0")
        lignes_tot = righe.aggregate(t=Sum("qta"))["t"] or 0

        # conversion (confermati / inviati+bozze)
        inviati = ev.filter(stato__in=("bozza", "inviata")).count()
        confermati = ev.filter(stato__in=("confermato","acconto","saldo","fatturato")).count()
        conversion = (confermati / max(1, inviati + confermati)) * 100

        # logistique: on considère categoria="Logistica" (adapte si besoin)
        ids_log = list(Materiale.objects.filter(categoria__iexact="Logistica").values_list("id", flat=True))
        cout_log = (righe.filter(materiale_id__in=ids_log).aggregate(t=Sum("importo"))["t"] or Decimal("0"))
        cout_total = ricavo_totale  # simple pour l’instant (si tu as costi/costo_tecnico, additionne-les ici)

        # ricavo par jour
        ric_giorno = (righe.annotate(d=TruncDate("evento__data_evento"))
                           .values("d").annotate(ricavo=Sum("importo")).order_by("d"))
        ricavo_per_giorno = [{"date": r["d"].isoformat(), "ricavo": float(r["ricavo"] or 0)} for r in ric_giorno]

        # répartitions
        stati = [{"label": s, "count": ev.filter(stato=s).count()} for s in ("annullato","bozza","confermato","fatturato")]
        # top matériels (quantité)
        top_q = (righe.values("materiale__nome")
                      .annotate(q=Sum("qta")).order_by("-q")[:10])
        top_materiali = [{"nome": x["materiale__nome"], "qta": int(x["q"] or 0)} for x in top_q]
        # ricavo par catégorie
        ric_cat = (righe.values("materiale__categoria")
                        .annotate(ric=Sum("importo")).order_by("-ric"))
        ricavo_per_categoria = [{"categoria": x["materiale__categoria"] or "-", "ricavo": float(x["ric"] or 0)} for x in ric_cat]

        data = {
            "kpis": {
                "eventi": ev.count(),
                "linee": int(lignes_tot),
                "ricavo_totale": float(ricavo_totale),
                "conversione": round(conversion, 1),
                "costo_logistica": float(cout_log),
                "costo_totale": float(cout_total),
            },
            "ricavo_per_giorno": ricavo_per_giorno,
            "stati": stati,
            "top_materiali": top_materiali,
            "ricavo_per_categoria": ricavo_per_categoria,
        }
        return Response(data)
