# backend/calendario/views.py
from datetime import date, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from eventi.models import Evento

class LocationCalendarView(APIView):
    def get(self, request):
        year = int(request.GET.get("year") or date.today().year)

        # tous les jours de l'année
        start = date(year, 1, 1)
        end   = date(year, 12, 31)
        days: list[str] = []
        cur = start
        while cur <= end:
            days.append(cur.isoformat())
            cur += timedelta(days=1)

        # slots fixes 1..8
        slots = list(range(1, 9))

        # agrégation par date + location_index
        qs = (
            Evento.objects
            .filter(data_evento__year=year)
            .values("data_evento", "location_index")
            .order_by("data_evento", "location_index")
        )

        counts: dict[tuple[str, int], int] = {}
        for row in qs:
            key = (row["data_evento"].isoformat(), int(row["location_index"]))
            counts[key] = counts.get(key, 0) + 1

        bookings = [
            {"date": d, "slot": s, "count": c}
            for (d, s), c in counts.items()
        ]

        return Response({
            "year": year,
            "days": days,
            "slots": slots,
            "bookings": bookings,
        })
