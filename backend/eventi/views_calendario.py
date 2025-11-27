# backend/eventi/views_calendario.py
from datetime import date, timedelta

from django.db.models import Count
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Evento


class LocationCalendarView(APIView):
    """
    GET /api/calendario/location-calendar?year=2025

    Réponse:
    {
      "year": 2025,
      "days": ["2025-01-01", ...],
      "slots": [1,2,3,4,5,6,7,8],
      "bookings": [
        {
          "date": "2025-01-03",
          "slot": 1,
          "count": 1,
          "stato": "bozza",
          "titolo": "Offerta",
          "cliente_nome": "Mario Rossi",
          "luogo_nome": "SALA A"
        },
        ...
      ]
    }
    """

    def get(self, request, *args, **kwargs):
        try:
            year = int(request.GET.get("year") or date.today().year)
        except ValueError:
            year = date.today().year

        # --- liste des jours de l'année ---
        start = date(year, 1, 1)
        end = date(year, 12, 31)

        days: list[str] = []
        d = start
        while d <= end:
            days.append(d.isoformat())
            d += timedelta(days=1)

        # slots 1..8 (ou adapte si tu as plus)
        slots = list(range(1, 9))

        # --- événements de l'année ---
        # On suppose 1 evento max par (date, location_index)
        qs = (
            Evento.objects.filter(data_evento__year=year)
            .select_related("cliente", "luogo")
            .values(
                "id",
                "data_evento",
                "location_index",
                "stato",
                "titolo",
                "cliente__nome",
                "luogo__nome",
            )
        )

        bookings = []
        for row in qs:
            bookings.append(
                {
                    "date": row["data_evento"].isoformat(),
                    "slot": row["location_index"],
                    "count": 1,
                    "stato": row["stato"],
                    "titolo": row["titolo"] or "",
                    "cliente_nome": row["cliente__nome"] or "",
                    "luogo_nome": row["luogo__nome"] or "",
                }
            )

        return Response(
            {
                "year": year,
                "days": days,
                "slots": slots,
                "bookings": bookings,
            }
        )
