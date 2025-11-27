# backend/catalogo/views.py (exemple)
from datetime import date
from django.db.models import Sum
from rest_framework.decorators import api_view
from rest_framework.response import Response
from magazzino.models import Booking
from .models import Materiale

@api_view(["GET"])
def catalogo_search(request):
    term = request.query_params.get("term") or ""
    date_da = request.query_params.get("date_da")
    date_a = request.query_params.get("date_a")

    qs = Materiale.objects.all()
    if term:
        qs = qs.filter(nome__icontains=term)

    # range de dates pour le calcul "prenotato"
    if date_da and date_a:
        bookings = (
            Booking.objects.filter(
                materiale_id__in=qs.values("id"),
                data__gte=date_da,
                data__lte=date_a,
            )
            .values("materiale_id")
            .annotate(prenotato=Sum("qta"))
        )
        pren_map = {b["materiale_id"]: b["prenotato"] for b in bookings}
    else:
        pren_map = {}

    results = []
    for m in qs:
        scorta = m.scorta or 0
        pren = pren_map.get(m.id, 0)
        disp = max(0, scorta - pren)
        results.append(
            {
                "id": m.id,
                "nome": m.nome,
                "categoria": m.categoria,
                "sottocategoria": m.sottocategoria,
                "scorta": scorta,
                "prenotato": pren,
                "disponibilita": disp,
                "prezzo": m.prezzo_base,
                "prezzo_s": f"{m.prezzo_base:.2f} €" if m.prezzo_base is not None else None,
                "is_tecnico": m.is_tecnico,
                "is_messo": m.is_messo,
            }
        )

    return Response({"results": results})
