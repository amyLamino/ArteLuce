# /backend/eventi/views_suggestions.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Q
from .models import Materiale

class SuggestionsByGuests(APIView):
    """
    GET /api/suggestions?guests=120&km=20&ore=8&allestimenti=10
    -> Suggerimenti per TECNICO e MEZZI.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        g = int(request.GET.get("guests") or 0)              # ospiti
        km = int(request.GET.get("km") or 0)                 # distanza (opz.)
        ore = float(request.GET.get("ore") or 8)             # ore lavoro (opz.)
        allest = int(request.GET.get("allestimenti") or 0)   # volume allestimento (opz.)

        # Regole semplici (adatta se vuoi)
        tecnici = max(1, round(g/80) + round(allest/10))
        caposquadra = 1 if (g > 150 or tecnici >= 3) else 0
        mezzi = max(1, round((tecnici + allest/8) / 2))
        autisti = mezzi

        def pick_one(qs):
            m = qs.order_by("prezzo_base").first()
            return {"id": m.id, "nome": m.nome} if m else None

        qs_tecnico = Materiale.objects.filter(
            Q(categoria__iexact="TECNICO") | Q(nome__icontains="tecnico")
        )
        qs_capo = Materiale.objects.filter(
            Q(categoria__iexact="TECNICO") &
            (Q(nome__icontains="capo") | Q(nome__icontains="chief") | Q(nome__icontains="responsabile"))
        )
        qs_autista = Materiale.objects.filter(
            Q(categoria__iexact="TECNICO") &
            (Q(nome__icontains="autista") | Q(nome__icontains="driver"))
        )
        qs_mezzo = Materiale.objects.filter(
            Q(categoria__in=["MEZZI", "AUTO"]) |
            Q(nome__icontains="furgone") | Q(nome__icontains="van") | Q(nome__icontains="camion")
        )

        scelti = []
        t = pick_one(qs_tecnico)
        if t and tecnici > 0:
            scelti.append({"categoria": "TECNICO", "materiale_id": t["id"], "nome": t["nome"], "qta": tecnici})

        c = pick_one(qs_capo)
        if c and caposquadra > 0:
            scelti.append({"categoria": "TECNICO", "materiale_id": c["id"], "nome": c["nome"], "qta": caposquadra})

        m = pick_one(qs_mezzo)
        if m and mezzi > 0:
            scelti.append({"categoria": "MEZZI", "materiale_id": m["id"], "nome": m["nome"], "qta": mezzi})

        a = pick_one(qs_autista)
        if a and autisti > 0:
            scelti.append({"categoria": "MEZZI", "materiale_id": a["id"], "nome": a["nome"], "qta": autisti})

        return Response({
            "params": {"guests": g, "km": km, "ore": ore, "allestimenti": allest},
            "suggerimenti": scelti
        })

# --- ALIAS de rétro-compatibilité (IMPORTANT : en dehors de la classe, après) ---
SuggestionView = SuggestionsByGuests
