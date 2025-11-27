# backend/eventi/views_history.py
from rest_framework import generics, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Evento, EventoRevision
from .serializers import EventoRevisionSerializer, EventoSerializer


def create_revision_if_changed(evento: Evento, note: str | None = None) -> EventoRevision | None:
    """
    Crée UNE révision seulement si le payload actuel de l'événement
    est différent de la dernière révision enregistrée.
    """

    # 1) Payload actuel
    payload = EventoSerializer(evento).data

    # 2) Dernière révision
    last = evento.revisions.order_by("-ref").first()

    # 3) Si même payload -> ne rien créer
    if last is not None and last.payload == payload:
        return None

    # 4) Sinon, ref suivante
    next_ref = 0 if last is None else (last.ref + 1)

    rev = EventoRevision.objects.create(
        evento=evento,
        ref=next_ref,
        payload=payload,
        note=note or "",
    )
    return rev


class EventoHistoryView(generics.ListAPIView):
    """
    GET /api/eventi/<evento_id>/history
    -> liste des révisions pour un évènement.
    """
    serializer_class = EventoRevisionSerializer

    def get_queryset(self):
        evento_id = self.kwargs["evento_id"]
        return EventoRevision.objects.filter(evento_id=evento_id).order_by("ref")


class EventoDiffView(generics.GenericAPIView):
    """
    GET /api/eventi/<evento_id>/diff?from=0&to=2
    -> comparaison entre deux refs.
    """
    serializer_class = EventoRevisionSerializer

    def get(self, request, evento_id):
        evento = get_object_or_404(Evento, pk=evento_id)
        try:
            ref_from = int(request.GET.get("from"))
            ref_to = int(request.GET.get("to"))
        except (TypeError, ValueError):
            return Response(
                {"detail": "Paramètres 'from' et 'to' obligatoires."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rev_from = get_object_or_404(EventoRevision, evento=evento, ref=ref_from)
        rev_to = get_object_or_404(EventoRevision, evento=evento, ref=ref_to)

        return Response({
            "evento": evento_id,
            "from": EventoRevisionSerializer(rev_from).data,
            "to": EventoRevisionSerializer(rev_to).data,
        })
