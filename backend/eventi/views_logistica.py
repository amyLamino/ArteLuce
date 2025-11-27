# /backend/eventi/views_logistica.py
# --- NOUVEL ENDPOINT: calcule n.km et € dynamiques pour Mezzi & Tecnici ---
from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.dateparse import parse_date
from django.db.models import Q
from .models import Evento, Mezzo, Tecnico
from .serializers import EventoLogisticaPreviewSerializer

def _euro(v):
    try:
        v = Decimal(str(v))
    except Exception:
        v = Decimal("0")
    s = f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{s} €"

class LogisticaPreview(APIView):
    """
    GET /api/logistica/preview?evento=<id>&km_override=NN.nn
    - km_override (facultatif) prime su qualsiasi distanza configurata
    Retourne une structure prête à dessiner les colonnes:
      - distanza_km
      - mezzi: [{id,nome,costo_km, n_km, costo_totale_eur}, ...]
      - tecnici: [{id,nome,ruolo, costo_km, n_km, costo_totale_eur}, ...]
      - totals: string formattés en €
    """
    def get(self, request):
        evento_id = request.GET.get("evento")
        km_override = request.GET.get("km_override")
        if not evento_id:
            return Response({"error":"evento mancante"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            ev = Evento.objects.select_related("luogo").get(pk=int(evento_id))
        except Evento.DoesNotExist:
            return Response({"error":"evento non trovato"}, status=status.HTTP_404_NOT_FOUND)

        # km di riferimento
        if km_override is not None:
            try:
                distanza_km = Decimal(str(km_override))
            except Exception:
                distanza_km = ev.distanza_rilevante_km
        else:
            distanza_km = ev.distanza_rilevante_km

        # prendi l'elenco mezzi/tecnici disponibili (qui: tutti; filtri aggiuntivi a tua scelta)
        mezzi = Mezzo.objects.all().order_by("nome")
        tecnici = Tecnico.objects.all().order_by("nome")

        m_rows = []
        t_rows = []
        tot_m = Decimal("0")
        tot_t = Decimal("0")

        for m in mezzi:
            cost = (m.costo_km or 0) * (distanza_km or 0)
            tot_m += cost
            m_rows.append({
                "id": m.id,
                "nome": m.nome,
                "costo_km": _euro(m.costo_km or 0),
                "n_km": f"{distanza_km}",
                "costo_totale_eur": _euro(cost),
            })

        for t in tecnici:
            cost = (t.costo_km or 0) * (distanza_km or 0)
            tot_t += cost
            t_rows.append({
                "id": t.id,
                "nome": t.nome,
                "ruolo": t.ruolo,
                "costo_km": _euro(t.costo_km or 0),
                "n_km": f"{distanza_km}",
                "costo_totale_eur": _euro(cost),
            })

        resp = {
            "distanza_km": f"{distanza_km}",
            "mezzi": m_rows,
            "tecnici": t_rows,
            "totale_mezzi": _euro(tot_m),
            "totale_tecnici": _euro(tot_t),
            "totale_logistica": _euro(tot_m + tot_t),
        }
        return Response(resp, status=status.HTTP_200_OK)
