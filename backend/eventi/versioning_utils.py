# backend/eventi/models.py
from uuid import uuid4
from decimal import Decimal

from django.db import models
from django.db.models import F
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver

from .utils import next_external_id

from django.shortcuts import get_object_or_404
from django.db import transaction

from .serializers import EventoSerializer
from .views_history import create_revision_if_changed


# --------- Base ---------
class Timestamped(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)  # création
    updated_at = models.DateTimeField(auto_now=True)      # dernière modif

    class Meta:
        abstract = True


# --------- Anagrafica ---------
class Cliente(Timestamped):
    uid = models.UUIDField(default=uuid4, unique=True, editable=False)
    external_id = models.CharField(max_length=32, unique=True, blank=True)
    nome = models.CharField(max_length=200)
    email = models.EmailField(blank=True, null=True)
    telefono = models.CharField(max_length=50, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.external_id:
            self.external_id = next_external_id(Cliente, "CLT")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nome} ({self.external_id or 'n/a'})"


class Luogo(Timestamped):
    uid = models.UUIDField(default=uuid4, unique=True, editable=False)
    external_id = models.CharField(max_length=32, unique=True, blank=True)
    nome = models.CharField(max_length=200)
    indirizzo = models.CharField(max_length=300, blank=True, null=True)

    # distance utile (pour mezzo)
    distanza_km_ar = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        if not self.external_id:
            self.external_id = next_external_id(Luogo, "LUG")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nome


# --------- Catalogo & Magazzino ---------
class Materiale(models.Model):
    # base
    nome = models.CharField(max_length=200)
    categoria = models.CharField(max_length=100, blank=True, null=True)
    sottocategoria = models.CharField(max_length=100, blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)

    # tarification / stock
    prezzo_base = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit_label = models.CharField(
        max_length=8,
        choices=[("pz", "pz"), ("h", "h"), ("km", "km")],
        default="pz",
        help_text="pz=pièce, h=heure (tecnico), km=km (mezzo)",
    )
    scorta = models.IntegerField(default=0)

    # flags
    is_tecnico = models.BooleanField(default=False, help_text="Technicien (€/h)")
    is_messo = models.BooleanField(default=False, help_text="Mezzo/transport (€/km)")
    is_default_service = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False, db_index=True)

    def __str__(self) -> str:
        return self.nome


class MaterialeSuggerito(models.Model):
    """Quand on ajoute `trigger`, proposer automatiquement `suggested`."""
    trigger = models.ForeignKey(Materiale, on_delete=models.CASCADE, related_name='suggerimenti')
    suggested = models.ForeignKey(Materiale, on_delete=models.CASCADE, related_name='suggerito_da')
    qty_default = models.PositiveIntegerField(default=1)
    label = models.CharField(max_length=120, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('trigger', 'suggested')


class RegolaSuggerimento(models.Model):
    """Règle large: cat/sub X -> proposer cat/sub Y."""
    trigger_categoria = models.CharField(max_length=120, blank=True)
    trigger_sottocategoria = models.CharField(max_length=120, blank=True)
    suggest_categoria = models.CharField(max_length=120, blank=True)
    suggest_sottocategoria = models.CharField(max_length=120, blank=True)
    qty_default = models.PositiveIntegerField(default=1)
    label = models.CharField(max_length=120, blank=True)
    active = models.BooleanField(default=True)


class MagazzinoItem(Timestamped):
    materiale = models.ForeignKey(Materiale, on_delete=models.CASCADE, related_name="stock")
    qta_disponibile = models.IntegerField(default=0)
    qta_prenotata = models.IntegerField(default=0)


# --------- Eventi ---------
class Evento(Timestamped):
    STATO = (
        ("bozza", "bozza"),
        ("confermato", "confermato"),
        ("annullato", "annullato"),
        ("fatturato", "fatturato"),
    )

    gruppo_uid = models.UUIDField(default=uuid4, db_index=True)   # groupe logique
    versione = models.PositiveIntegerField(default=0)             # incrémentée à chaque modif

    titolo = models.CharField(max_length=200, default="Offerta")
    data_evento = models.DateField(db_index=True)
    location_index = models.PositiveSmallIntegerField(default=1)  # 1..8
    stato = models.CharField(max_length=20, choices=STATO, default="bozza")

    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="eventi")
    luogo = models.ForeignKey(Luogo, on_delete=models.PROTECT, related_name="eventi")

    note = models.TextField(blank=True, null=True)

    acconto_importo = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    acconto_data = models.DateField(null=True, blank=True)

    # Notes libres par catégorie (affichage client). Non critique côté back.
    categoria_notes = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["data_evento", "location_index"]),
        ]

    def __str__(self):
        return f"{self.titolo} v{self.versione} ({self.data_evento} L{self.location_index})"


class RigaEvento(Timestamped):
    evento = models.ForeignKey(Evento, on_delete=models.CASCADE, related_name="righe")
    materiale = models.ForeignKey(Materiale, on_delete=models.PROTECT)
    qta = models.IntegerField(default=1)
    prezzo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    importo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_tecnico = models.BooleanField(default=False)
    is_trasporto = models.BooleanField(default=False)
    copertura_giorni = models.IntegerField(default=1)  # nb de jours bloqués (ex: 3)

    def __str__(self):
        return f"{self.evento_id} · {self.materiale_id} x{self.qta}"


class CalendarioSlot(Timestamped):
    data = models.DateField(db_index=True)
    location_index = models.PositiveSmallIntegerField()
    evento = models.OneToOneField(Evento, on_delete=models.CASCADE, related_name="slot")


# --------- Historique ---------
class EventoRevision(models.Model):
    evento = models.ForeignKey('Evento', related_name='revisions', on_delete=models.CASCADE)
    ref = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True, null=True)
    payload = models.JSONField(blank=True, null=True)   # JSON natif Django

    class Meta:
        ordering = ["created_at", "ref"]
        unique_together = ("evento", "ref")

    def __str__(self):
        return f"rev {self.ref} @ {self.evento_id}"


# --------- Ressources ---------
class Tecnico(models.Model):
    nome = models.CharField(max_length=120)
    email = models.EmailField(blank=True, null=True)
    telefono = models.CharField(max_length=50, blank=True, null=True)
    note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nome


class Mezzo(models.Model):
    targa = models.CharField(max_length=32, unique=True)
    descrizione = models.CharField(max_length=200, blank=True)
    costo_km = models.DecimalField(max_digits=8, decimal_places=2, default=0)     # €/km
    costo_uscita = models.DecimalField(max_digits=8, decimal_places=2, default=0) # fisso
    attivo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.targa} ({self.descrizione})"


# (Facultatif : si tu veux des tables dédiées)
class Categoria(models.Model):
    nome = models.CharField(max_length=120)

    def __str__(self):
        return self.nome


class Sottocategoria(models.Model):
    nome = models.CharField(max_length=120)
    categoria = models.ForeignKey(Categoria, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.nome


# =========================
#  Historisation automatique
# =========================

def _snapshot_evento(ev: Evento) -> dict:
    """Payload JSON complet pour le diff côté frontend."""
    def _d(x):
        # Décimal -> float pour éviter les problèmes de sérialisation
        return float(x) if isinstance(x, Decimal) else x

    righe = []
    for r in ev.righe.select_related("materiale").all().order_by("id"):
        righe.append({
            "id": r.id,
            "materiale": r.materiale_id,
            "materiale_nome": getattr(r.materiale, "nome", None),
            "qta": r.qta,
            "prezzo": _d(r.prezzo),
            "importo": _d(r.importo),
            "is_tecnico": r.is_tecnico,
            "is_trasporto": r.is_trasporto,
            "copertura_giorni": r.copertura_giorni,
        })

    return {
        "id": ev.id,
        "titolo": ev.titolo,
        "data_evento": ev.data_evento.isoformat() if ev.data_evento else None,
        "location_index": ev.location_index,
        "stato": ev.stato,
        "cliente": ev.cliente_id,
        "cliente_nome": getattr(ev.cliente, "nome", None),
        "luogo": ev.luogo_id,
        "luogo_nome": getattr(ev.luogo, "nome", None),
        "versione": ev.versione,
        "acconto_importo": _d(ev.acconto_importo),
        "acconto_data": ev.acconto_data.isoformat() if ev.acconto_data else None,
        "righe": righe,
    }


def _create_revision(ev: Evento, note: str | None = None):
    """Crée une révision pour l'évènement courant (ref == versione)."""
    EventoRevision.objects.create(
        evento=ev,
        ref=ev.versione,
        note=note or "",
        payload=_snapshot_evento(ev),
    )


@receiver(pre_save, sender=Evento)
def _evento_pre_save_bump_version(sender, instance: Evento, **kwargs):
    """
    Avant chaque sauvegarde (création ou update), on positionne la version.
    - création : on démarre à 1
    - update   : version précédente + 1
    """
    if instance.pk:
        try:
            prev = Evento.objects.only("versione").get(pk=instance.pk)
            instance.versione = (prev.versione or 0) + 1
        except Evento.DoesNotExist:
            instance.versione = 1
    else:
        instance.versione = 1


@receiver(post_save, sender=Evento)
def _evento_post_save_revision(sender, instance: Evento, created: bool, **kwargs):
    # À chaque save d'Evento -> une révision (ref = versione en cours)
    _create_revision(instance)


@receiver(post_save, sender=RigaEvento)
def _rigariga_post_save(sender, instance: RigaEvento, created: bool, **kwargs):
    """
    À chaque modif/ajout d'une ligne -> on incrémente la version de l'évènement
    puis on écrit une révision.
    """
    ev_id = instance.evento_id
    Evento.objects.filter(id=ev_id).update(versione=F("versione") + 1)
    ev = Evento.objects.select_related("cliente", "luogo").get(id=ev_id)
    _create_revision(ev)


@receiver(post_delete, sender=RigaEvento)
def _rigariga_post_delete(sender, instance: RigaEvento, **kwargs):
    ev_id = instance.evento_id
    Evento.objects.filter(id=ev_id).update(versione=F("versione") + 1)
    ev = Evento.objects.select_related("cliente", "luogo").get(id=ev_id)
    _create_revision(ev)

@transaction.atomic
def clona_evento_as_nuova_versione(evento_id: int, note: str = ""):
    """Crée une nouvelle VERSION de l'événement, même date + même location."""
    orig = get_object_or_404(Evento, pk=evento_id)

    # 🔴 NE PAS APPELER next-slot ici
    # On garde la même date + location_index
    cloned = Evento.objects.create(
        gruppo_uid=orig.gruppo_uid,
        titolo=orig.titolo,
        data_evento=orig.data_evento,
        location_index=orig.location_index,   # 👈 important
        stato=orig.stato,
        cliente=orig.cliente,
        luogo=orig.luogo,
        note=orig.note,

    )

    # Clone des lignes
    bulk = []
    for r in orig.righe.all():
        bulk.append(RigaEvento(
            evento=cloned,
            materiale=r.materiale,
            qta=r.qta,
            prezzo=r.prezzo,
            importo=r.importo,
            is_tecnico=r.is_tecnico,
            is_trasporto=r.is_trasporto,
            copertura_giorni=r.copertura_giorni,
        ))
    if bulk:
        RigaEvento.objects.bulk_create(bulk)

    # Révision initiale pour la nouvelle version
    rev = create_revision_if_changed(cloned, note or "Nuova versione")

    return rev
