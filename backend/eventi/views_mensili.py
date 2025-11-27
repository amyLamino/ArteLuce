# (chemin : /backend/eventi/views_mensili.py)
from datetime import date
import calendar
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from .models import Evento

class EventiMensiliView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """
        Retourne la liste des événements d’un mois donné.
        Querystring: ?month=YYYY-MM (ex: 2025-10). Par défaut = mois courant.
        """
        month_str = (request.GET.get("month") or "").strip()
        if month_str:
            try:
                y, m = month_str.split("-")
                y, m = int(y), int(m)
            except Exception:
                return Response({"error": "Paramètre 'month' invalide. Attendu: YYYY-MM"}, status=400)
        else:
            now = timezone.localdate()
            y, m = now.year, now.month

        start = date(y, m, 1)
        end = date(y, m, calendar.monthrange(y, m)[1])

        qs = (
            Evento.objects
            .select_related("cliente")
            .filter(data_evento__gte=start, data_evento__lte=end)
            .only("id", "titolo", "data_evento", "location_index", "stato", "cliente_id")
            .order_by("data_evento", "location_index", "id")
        )

        rows = []
        for ev in qs:
            rows.append({
                "id": ev.id,
                "titolo": ev.titolo or "",
                "data_evento": ev.data_evento.isoformat(),
                "location_index": getattr(ev, "location_index", 1) or 1,
                "stato": getattr(ev, "stato", "bozza"),
                "cliente_nome": getattr(getattr(ev, "cliente", None), "nome", None),
            })

        return Response(rows)
