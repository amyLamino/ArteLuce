# /backend/eventi/views_catalogo.py
from datetime import datetime, date, timedelta
from decimal import Decimal

from django.db.models import Sum, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Materiale, RigaEvento


def _as_euro(v):
    try:
        v = Decimal(str(v or 0))
    except Exception:
        v = Decimal("0")
    s = f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{s} €"


def _get_cat_name(m: Materiale) -> str:
    """
    Gère à la fois le cas où `categoria` est un CharField
    et le cas (ancien) où c'est un FK.
    """
    try:
        val = getattr(m, "categoria", "") or ""
        if hasattr(val, "nome"):
            return (val.nome or "").strip()
        return str(val).strip()
    except Exception:
        return ""


def _get_sub_name(m: Materiale) -> str:
    try:
        val = getattr(m, "sottocategoria", "") or ""
        if hasattr(val, "nome"):
            return (val.nome or "").strip()
        return str(val).strip()
    except Exception:
        return ""


class CatalogoSearch(APIView):
    """
    GET /api/catalogo/search?term=&categoria=&sottocategoria=&luogo=&data=&data_a=
    Retourne les lignes de catalogue filtrées + disponibilità (scorta, prenotato, disponibile)
    """

    def get(self, request):
        term = (request.GET.get("term") or "").strip()
        cat = request.GET.get("categoria") or ""
        sub = request.GET.get("sottocategoria") or ""
        luogo_id = request.GET.get("luogo") or None
        data_s = request.GET.get("data") or ""
        data_a_s = request.GET.get("data_a") or ""

        try:
            data_da = date.fromisoformat(data_s) if data_s else None
        except Exception:
            data_da = None
        try:
            data_a = date.fromisoformat(data_a_s) if data_a_s else None
        except Exception:
            data_a = None

        if data_da and not data_a:
            data_a = data_da
        if data_a and not data_da:
            data_da = data_a

        qs = (
            Materiale.objects
            .all()
            .filter(is_archived=False)
        )

        if term:
            qs = qs.filter(
                Q(nome__icontains=term)
                | Q(categoria__icontains=term)
                | Q(sottocategoria__icontains=term)
            )

        if cat:
            qs = qs.filter(categoria__iexact=cat)
        if sub:
            qs = qs.filter(sottocategoria__iexact=sub)

        items = []

        for m in qs.order_by("categoria", "sottocategoria", "nome")[:300]:
            scorta = int(m.scorta or 0)

            pren = 0
            if data_da and data_a:
                righe = (
                    RigaEvento.objects
                    .filter(materiale=m)
                    .select_related("evento")
                )
                if luogo_id:
                    righe = righe.filter(evento__luogo_id=luogo_id)

                for r in righe:
                    start = r.evento.data_evento
                    end = start + timedelta(days=max(1, r.copertura_giorni or 1) - 1)
                    if end < data_da or start > data_a:
                        continue
                    pren += int(r.qta or 0)

            dispon = max(0, scorta - pren)

            items.append({
                "id": m.id,
                "categoria": _get_cat_name(m) or "—",
                "sottocategoria": _get_sub_name(m) or "—",
                "nome": m.nome,
                "prezzo": float(m.prezzo_base or 0),
                "prezzo_s": _as_euro(m.prezzo_base or 0),
                "scorta": scorta,
                "prenotato": pren,
                "disponibilita": dispon,
                "unit_label": m.unit_label,
                "is_tecnico": bool(getattr(m, "is_tecnico", False)),
                "is_messo": bool(getattr(m, "is_messo", False)),
            })

        return Response({"results": items}, status=status.HTTP_200_OK)
