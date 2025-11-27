# (chemin : /backend/eventi/views_export.py)

from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.views import APIView

from .models import Evento
from .exporters.preventivo_docx import export_preventivo_docx


class PreventivoDocxView(APIView):
    """
    GET /eventi/<pk>/preventivo-docx/

    Cette vue appelle la fonction export_preventivo_docx(request, evento_id)
    définie dans exporters/preventivo_docx.py et renvoie le fichier Word
    du preventivo au navigateur.
    """

    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, pk: int, *args, **kwargs) -> HttpResponse:
        # on laisse toute la logique d’export à export_preventivo_docx
        return export_preventivo_docx(request, evento_id=pk)
