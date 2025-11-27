# backend/eventi/admin.py
from django.contrib import admin
from .models import (
    Cliente, Luogo, Materiale, Evento, RigaEvento, CalendarioSlot,
    EventoRevision,
)

# backend/eventi/admin.py
from django.contrib import admin
from .models import Materiale

@admin.register(Materiale)
class MaterialeAdmin(admin.ModelAdmin):
    list_display = ("id","nome","categoria","sottocategoria","prezzo_base","scorta","is_tecnico","is_messo","is_archived")
    list_filter = ("categoria","sottocategoria","is_tecnico","is_messo","is_archived")
    search_fields = ("nome",)

def safe_register(model, admin_class=None):
    if model in admin.site._registry:
        return
    if admin_class:
        admin.site.register(model, admin_class)
    else:
        admin.site.register(model)

safe_register(Cliente)
safe_register(Luogo)
safe_register(Materiale, MaterialeAdmin)
safe_register(Evento)
safe_register(RigaEvento)
safe_register(CalendarioSlot)
safe_register(EventoRevision)
