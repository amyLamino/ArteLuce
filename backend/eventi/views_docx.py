# backend/eventi/views_docx.py

from datetime import date
import os

from django.conf import settings
from django.http import Http404, HttpResponse
from docxtpl import DocxTemplate

from .models import Evento, RigaEvento


def docx_preventivo(request, pk: int):
    """
    Génère le fichier Word (.docx) pour un Evento.

    Contexte passé au template `preventivo.docx` :

        oggi              -> date du jour (string dd/mm/YYYY)
        evento            -> dict avec infos principales de l'événement
        righe             -> liste de lignes (catégorie, sottocategoria, articolo, qta, pu, importo)
        categoria_notes   -> dict { "Audio": "note...", "Luci": "note..." }
        note_generali     -> texte (note globale de l'evento)
    """

    # ---- chargement de l'événement ----
    try:
        ev = (
            Evento.objects
            .select_related("cliente", "luogo")
            .get(pk=pk)
        )
    except Evento.DoesNotExist:
        raise Http404("Evento non trovato")

    # ---- lignes de devis (RigaEvento) ----
    righe_qs = (
        RigaEvento.objects
        .filter(evento=ev)
        .select_related("materiale")
        .order_by("id")
    )

    righe = []
    totale = 0.0

    for r in righe_qs:
        qta = float(r.qta or 0)
        pu = float(r.prezzo or 0)
        imp = qta * pu
        totale += imp

        categoria = (
            getattr(r.materiale, "categoria_nome", "") or
            getattr(r.materiale, "categoria", "") or
            ""
        )
        sottocategoria = (
            getattr(r.materiale, "sottocategoria_nome", "") or
            getattr(r.materiale, "sottocategoria", "") or
            ""
        )
        articolo = (
            r.materiale.nome if r.materiale_id
            else (r.materiale_nome or "")
        )

        righe.append(
            {
                "categoria": categoria,
                "sottocategoria": sottocategoria,
                "articolo": articolo,
                "qta": int(qta) if qta.is_integer() else qta,
                "pu": f"{pu:.2f}",
                "importo": f"{imp:.2f}",
            }
        )

    # ---- notes (par catégorie + globale) ----
    # JSONField sur le modèle Evento : peut être None -> on force un dict vide
    categoria_notes = getattr(ev, "categoria_notes", None) or {}
    note_generali = ev.note or ""

    # ---- données principales de l'événement ----
    cliente_label = (
        getattr(ev, "cliente_nome", None)
        or (ev.cliente.nome if ev.cliente_id else "")
    )
    luogo_label = (
        getattr(ev, "luogo_nome", None)
        or (ev.luogo.nome if ev.luogo_id else "")
    )

    evento_dict = {
        "id": ev.id,
        "titolo": ev.titolo,
        "data_evento": ev.data_evento.strftime("%d/%m/%Y") if ev.data_evento else "",
        "cliente": cliente_label,
        "luogo": luogo_label,
        "location_index": ev.location_index,
        "acconto": f"{float(ev.acconto_importo or 0):.2f}",
        "stato": ev.stato,
        "totale": f"{totale:.2f}",
    }

    # ---- contexte pour le template docxtpl ----
    context = {
        "oggi": date.today().strftime("%d/%m/%Y"),
        "evento": evento_dict,
        "righe": righe,
        "categoria_notes": categoria_notes,
        "note_generali": note_generali,
    }

    # ---- rendu du .docx ----
    tpl_path = os.path.join(settings.BASE_DIR, "templates", "preventivo.docx")
    if not os.path.exists(tpl_path):
        raise Http404("Template preventivo.docx mancante")

    tpl = DocxTemplate(tpl_path)
    tpl.render(context)

    out_name = f"Preventivo_{ev.id}.docx"
    response = HttpResponse(
        content_type=(
            "application/vnd.openxmlformats-officedocument."
            "wordprocessingml.document"
        )
    )
    response["Content-Disposition"] = f'attachment; filename="{out_name}"'
    tpl.save(response)
    return response
