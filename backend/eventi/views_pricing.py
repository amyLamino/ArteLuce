# (chemin : /backend/eventi/views_pricing.py)
from datetime import datetime
from decimal import Decimal
from django.apps import apps as django_apps
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from .pricing import compute_quote, Line  # ✅ OK depuis pricing.py (pas de boucle)
from .models import Materiale, Mezzo

class QuotePricingView(APIView):
    """
    POST /api/pricing/quote
    Body:
    {
      "data": "YYYY-MM-DD",
      "luogo": <id> | null,
      "distanza_km_ar": <numero> | null,
      "mezzo": <id> | null,
      "righe": [ { "materiale": id, "qta": n, "pu_base": n, "nome": "..." }, ... ]
    }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        js = request.data or {}

        # date
        try:
            d = datetime.strptime(js.get("data"), "%Y-%m-%d").date()
        except Exception:
            return Response({"detail": "data invalida (YYYY-MM-DD)."}, status=400)

        # distance : 1) param explicite 2) depuis le luogo si dispo 3) 0
        distanza = js.get("distanza_km_ar")

        if distanza is None and js.get("luogo"):
            LuogoModel = django_apps.get_model("eventi", "Luogo")  # ✅ pas d'import dur → pas d’erreur si pas de modèle
            if LuogoModel:
                try:
                    luogo = LuogoModel.objects.get(pk=js["luogo"])
                    distanza = getattr(luogo, "distanza_km_ar", None)
                except LuogoModel.DoesNotExist:
                    pass

        distanza = Decimal(str(distanza or 0))

        # mezzo (optionnel)
        mezzo_obj = None
        if js.get("mezzo"):
            try:
                m = Mezzo.objects.get(pk=js["mezzo"])
                mezzo_obj = {"costo_km": m.costo_km, "costo_uscita": m.costo_uscita}
            except Mezzo.DoesNotExist:
                pass

        # lignes
        lines = []
        for r in js.get("righe") or []:
            if not r.get("materiale"):
                continue
            nome = r.get("nome")
            pu = r.get("pu_base")
            if nome is None or pu is None:
                try:
                    mat = Materiale.objects.get(pk=r["materiale"])
                    nome = nome or mat.nome
                    pu = pu if pu is not None else (mat.prezzo_base or 0)
                except Materiale.DoesNotExist:
                    continue
            try:
                qta = Decimal(str(r.get("qta", 1)))
                pu_base = Decimal(str(pu))
            except Exception:
                continue
            lines.append(Line(
                materiale=int(r["materiale"]),
                nome=str(nome),
                qta=qta,
                pu_base=pu_base,
            ))

        res = compute_quote(lines, d, distanza, mezzo_obj)
        return Response(res)
