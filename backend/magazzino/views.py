# backend/magazzino/views.py
from datetime import datetime, date, timedelta

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import permissions

from magazzino.models import Materiale
from eventi.models import RigaEvento, Evento



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

def parse_iso_date(s: str | None) -> date | None:
    if not s:
        return None
    return datetime.strptime(s, "%Y-%m-%d").date()

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def materiale_bookings(request):
    """
    GET /magazzino/bookings?material=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD&on=YYYY-MM-DD

    - calcule les quantités réservées pour CHAQUE jour de l'intervalle [from, to]
    - renvoie :
        scorta      = stock du matériel
        prenotato   = quantité réservée le jour "on" (ou le max sur l'intervalle)
        disponibile = min(scorta - prenotato_giorno) sur toutes les dates de l’intervalle
        per_day     = détail par jour (optionnel, très pratique pour les modales)
    """
    material_id = request.query_params.get("material")
    if not material_id:
        return Response({"detail": "Paramètre 'material' manquant"}, status=400)

    try:
        materiale = Materiale.objects.get(pk=int(material_id))
    except Materiale.DoesNotExist:
        return Response({"detail": "Materiale non trovato"}, status=404)

    from_s = request.query_params.get("from")
    to_s = request.query_params.get("to")
    on_s = request.query_params.get("on")

    today = date.today()
    d_from = parse_date(from_s, today)
    d_to = parse_date(to_s, d_from or today)
    if d_from is None or d_to is None:
        return Response({"detail": "Parametri 'from'/'to' non validi"}, status=400)
    if d_to < d_from:
        d_to = d_from

    d_on = parse_date(on_s)

    # Evénements qui se chevauchent avec l’intervalle demandé
    righe = (
        RigaEvento.objects.filter(materiale_id=material_id)
        .select_related("evento")
        .filter(
            Q(evento__data_evento_da__lte=d_to, evento__data_evento_a__gte=d_from)
            | Q(evento__data_evento__gte=d_from, evento__data_evento__lte=d_to)
        )
        .filter(evento__stato__in=["bozza", "confermato", "fatturato"])
    )

    # Carte jour -> quantité totale réservée ce jour
    per_day: dict[date, int] = {}

    for r in righe:
        ev: Evento = r.evento
        # support à la fois data_evento (ancien champ) et data_evento_da/a (nouveaux champs)
        ev_start = getattr(ev, "data_evento_da", None) or ev.data_evento
        ev_end = getattr(ev, "data_evento_a", None) or ev.data_evento

        if not ev_start or not ev_end:
            continue

        # intersection avec l’intervalle demandé
        start = max(ev_start, d_from)
        end = min(ev_end, d_to)
        if end < start:
            continue

        for g in daterange(start, end):
            per_day[g] = per_day.get(g, 0) + int(r.qta or 0)

    scorta = int(materiale.scorta or 0)
    if per_day:
        prenotato_max = max(per_day.values())
        # disponibilité minimale sur toute la période
        disp_min = min(scorta - q for q in per_day.values())
    else:
        prenotato_max = 0
        disp_min = scorta

    # pour rester compatible avec l’UI actuelle "Prenotato (ON): x"
    if d_on is not None:
        pren_on = per_day.get(d_on, 0)
    else:
        pren_on = prenotato_max

    return Response(
        {
            "materiale": materiale.id,
            "scorta": scorta,
            "prenotato": pren_on,
            "prenotato_max": prenotato_max,
            "disponibile": max(0, disp_min),
            # détail optionnel (peut être utilisé par la modale de détail)
            "per_day": {
                d.isoformat(): per_day.get(d, 0)
                for d in daterange(d_from, d_to)
            },
        }
    )
