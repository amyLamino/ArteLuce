# eventi/views_utils.py
from __future__ import annotations
from datetime import date, datetime
from typing import Optional

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Evento


def _parse_iso_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").date()
    except Exception:
        pass
    for fmt in ("%Y/%m/%d", "%Y.%m.%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except Exception:
            continue
    return None


def _num_locations() -> int:
    return int(getattr(settings, "EVENTI_NUM_LOCATIONS", 8))


class NextSlotView(APIView):
    """
    GET /api/eventi/next-slot?date=YYYY-MM-DD
    → { "slot": <int 1..N> }
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        raw = request.query_params.get("date") or request.query_params.get("data")
        dt = _parse_iso_date(raw) or timezone.localdate()

        # ⚠️ filtre sur data_evento (et pas 'data')
        taken_qs = (
            Evento.objects
            .filter(data_evento=dt)
            .exclude(Q(stato="annullato"))
            .values_list("location_index", flat=True)
        )
        taken = {int(x) for x in taken_qs if isinstance(x, int) and x > 0}

        n = _num_locations()
        free = 1
        for i in range(1, max(1, n) + 1):
            if i not in taken:
                free = i
                break

        return Response({"slot": free}, status=status.HTTP_200_OK)


# Alias si import historique
NextSlot = NextSlotView
