# backend/eventi/views_versioning.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .versioning_utils import clona_evento_as_nuova_versione
from .serializers import EventoRevisionSerializer
# backend/eventi/views_versioning.py
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Evento
from .serializers import EventoSerializer
from .views_history import create_revision_if_changed


class EventoVersionaView(APIView):
    def post(self, request, pk):
        evento = get_object_or_404(Evento, pk=pk)

        # ta logique actuelle de création de nouvelle version
        # par ex. :
        cloned = Evento.objects.create(
            gruppo_uid=evento.gruppo_uid,
            titolo=evento.titolo,
            data_evento=evento.data_evento,
            location_index=evento.location_index,
            stato=evento.stato,
            cliente=evento.cliente,
            luogo=evento.luogo,
            note=evento.note,
            distanza_km=evento.distanza_km,
        )
        # (et éventuel clonage de righe...)

        create_revision_if_changed(cloned, note="Nuova versione")

        return Response(EventoSerializer(cloned).data)

