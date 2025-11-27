# /backend/eventi/views_magazzino.py
from __future__ import annotations
from datetime import date, timedelta
from typing import Dict, List
from collections import defaultdict

from django.db.models import Sum, Q
from django.utils.dateparse import parse_date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from .models import Materiale, RigaEvento

from datetime import date, timedelta
from django.db.models import Q

from eventi.models import RigaEvento

from .models import Materiale, MagazzinoItem, Evento, RigaEvento

STATI_CONTEGGIATI = ("bozza", "inviata", "confermato", "acconto", "saldo", "fatturato")

def _daterange(d0: date, d1: date):
    cur = d0
    while cur <= d1:
        yield cur
        cur += timedelta(days=1)

class MagazzinoStatus(APIView):
    """
    GET /api/magazzino/status?from=YYYY-MM-DD&to=YYYY-MM-DD&materials=1,2,3
    - Si 1 id: renvoie une liste [{date,used,free,status}, ...]
    - Si plusieurs ids: renvoie un dict {<id>: [..], <id2>: [..]}

    """

    def get(self, request):
        dfrom = parse_date(request.GET.get("from", ""))
        dto = parse_date(request.GET.get("to", ""))
        if not dfrom or not dto or dfrom > dto:
            return Response({"error": "Parametri from/to invalidi"}, status=400)

        ids = [int(x) for x in (request.GET.get("materials","").split(",")) if x.strip().isdigit()]
        if not ids:
            return Response({"error": "Parametro materials mancante"}, status=400)

        # Stock de base par matériel
        stock = {m.id: (MagazzinoItem.objects.filter(materiale_id=m.id)
                        .aggregate(q=Sum("qta_disponibile")).get("q") or 0)
                 for m in Materiale.objects.filter(id__in=ids)}

        # Réservations par jour et par matériel
        prenotati: Dict[int, Dict[date, int]] = {i: defaultdict(int) for i in ids}
        righe = (RigaEvento.objects
                 .select_related("evento")
                 .filter(materiale_id__in=ids,
                         evento__data_evento__gte=dfrom,
                         evento__data_evento__lte=dto,
                         evento__stato__in=STATI_CONTEGGIATI))
        for r in righe:
            d = r.evento.data_evento
            prenotati[r.materiale_id][d] += int(r.qta or 0)

        # Construction sortie
        def rows_for(mid: int) -> List[dict]:
            out = []
            s = int(stock.get(mid, 0))
            for day in _daterange(dfrom, dto):
                used = int(prenotati[mid].get(day, 0))
                free = max(0, s - used)
                status = "ok" if free > 3 else ("warn" if 1 <= free <= 3 else "ko")
                out.append({
                    "date": day.isoformat(),
                    "used": used,
                    "free": free,
                    "status": status,
                })
            return out

        if len(ids) == 1:
            return Response(rows_for(ids[0]))

        return Response({mid: rows_for(mid) for mid in ids}, status=status.HTTP_200_OK)


class MagazzinoCalendarView(APIView):
    """
    GET /api/magazzino/calendar?year=2025

    Réponse:
    {
      "year": 2025,
      "days": ["2025-01-01", "2025-01-02", ...],
      "materials": [
        { "id": 1, "nome": "...", "categoria": "...", "scorta": 10 },
        ...
      ],
      "bookings": [
        { "materiale": 1, "date": "2025-01-05", "qta": 3 },
        ...
      ]
    }
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # ---- année demandée ----
        try:
            year = int(request.GET.get("year") or date.today().year)
        except ValueError:
            year = date.today().year

        start = date(year, 1, 1)
        end = date(year, 12, 31)

        # ---- liste de tous les jours de l'année ----
        days = []
        cur = start
        while cur <= end:
            days.append(cur.isoformat())
            cur += timedelta(days=1)

        # ---- matériels (non archivés) ----
        mats_qs = (
            Materiale.objects
            .filter(is_archived=False)
            .order_by("categoria", "nome")
        )
        materials = [
            {
                "id": m.id,
                "nome": m.nome,
                "categoria": m.categoria or "— Senza categoria —",
                "scorta": int(m.scorta or 0),
            }
            for m in mats_qs
        ]

        # ---- lignes d'événement qui touchent l'année ----
        # On considère un événement si sa plage [da, a] chevauche [start, end].
        righe_qs = (
            RigaEvento.objects
            .select_related("evento")
            .exclude(evento__stato="annullato")
            .filter(
                Q(
                    evento__data_evento_da__isnull=False,
                    evento__data_evento_a__isnull=False,
                    evento__data_evento_da__lte=end,
                    evento__data_evento_a__gte=start,
                )
                |
                Q(
                    # compat pour les anciens événements 1 jour
                    evento__data_evento__range=(start, end)
                )
            )
        )

        # ---- étaler sur chaque jour + agréger ----
        agg: dict[tuple[int, str], int] = {}

        for r in righe_qs:
            ev = r.evento

            # pour les vieux enregistrements sans da/a,
            # on retombe sur data_evento.
            ev_start = getattr(ev, "data_evento_da", None) or ev.data_evento
            ev_end = getattr(ev, "data_evento_a", None) or ev.data_evento

            if ev_start is None or ev_end is None:
                continue

            # on coupe la plage à l'année demandée
            d0 = max(ev_start, start)
            d1 = min(ev_end, end)

            cur_day = d0
            while cur_day <= d1:
                key = (r.materiale_id, cur_day.isoformat())
                agg[key] = agg.get(key, 0) + int(r.qta or 0)
                cur_day += timedelta(days=1)

        bookings = [
            {"materiale": mid, "date": day, "qta": qta}
            for (mid, day), qta in agg.items()
        ]

        return Response(
            {
                "year": year,
                "days": days,
                "materials": materials,
                "bookings": bookings,
            }
        )

    from datetime import datetime, date

    from django.db.models import Q
    from rest_framework.decorators import api_view, permission_classes
    from rest_framework.response import Response
    from rest_framework import permissions


    from eventi.models import Evento, RigaEvento

    def _parse_iso_date(s: str | None) -> date | None:
        if not s:
            return None
        return datetime.strptime(s, "%Y-%m-%d").date()

    @api_view(["GET"])
    @permission_classes([permissions.IsAuthenticated])
    def materiale_day_detail(request):
        """
        GET /magazzino/day-detail?material=<id>&date=YYYY-MM-DD

        Renvoie la liste des événements qui utilisent ce matériel ce jour-là,
        avec Dal / Al / Stato / Cliente / Loc / qta_giorno.
        """
        mat_id = request.query_params.get("material")
        d_s = request.query_params.get("date")

        if not mat_id or not d_s:
            return Response(
                {"detail": "Parametri 'material' e 'date' sono obbligatori."},
                status=400,
            )

        try:
            materiale = Materiale.objects.get(pk=int(mat_id))
        except Materiale.DoesNotExist:
            return Response({"detail": "Materiale non trovato."}, status=404)

        giorno = _parse_iso_date(d_s)
        if not giorno:
            return Response({"detail": "Data non valida."}, status=400)

        righe = (
            RigaEvento.objects.filter(materiale_id=materiale.id)
            .select_related("evento", "evento__cliente", "evento__luogo")
            .filter(
                Q(evento__data_evento_da__lte=giorno, evento__data_evento_a__gte=giorno)
                | Q(evento__data_evento=giorno)  # compat pour les vieux eventi
            )
            .filter(evento__stato__in=["bozza", "confermato", "fatturato"])
        )

        items = []
        for r in righe:
            ev: Evento = r.evento
            ev_start = getattr(ev, "data_evento_da", None) or ev.data_evento
            ev_end = getattr(ev, "data_evento_a", None) or ev.data_evento

            items.append(
                {
                    "id": ev.id,
                    "titolo": ev.titolo,
                    "cliente_nome": getattr(getattr(ev, "cliente", None), "nome", None),
                    "luogo_nome": getattr(getattr(ev, "luogo", None), "nome", None),
                    "loc": ev.location_index,
                    "stato": ev.stato,
                    "dal": ev_start.isoformat() if ev_start else None,
                    "al": ev_end.isoformat() if ev_end else None,
                    "qta_giorno": int(r.qta or 0),
                }
            )

        items.sort(key=lambda x: (x["dal"] or "", x["titolo"] or ""))

        return Response(
            {
                "materiale": {
                    "id": materiale.id,
                    "nome": materiale.nome,
                    "scorta": int(materiale.scorta or 0),
                },
                "giorno": giorno.isoformat(),
                "items": items,
            }
        )

    from datetime import datetime

    def parse_date(value: str | None, default: date | None = None) -> date | None:
        """
        Convertit 'YYYY-MM-DD' -> date. Si vide ou invalide, retourne default.
        """
        if not value:
            return default
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except Exception:
            return default

    def daterange(start: date, end: date):
        """
        Générateur de dates de start à end inclus.
        """
        cur = start
        while cur <= end:
            yield cur
            cur += timedelta(days=1)


