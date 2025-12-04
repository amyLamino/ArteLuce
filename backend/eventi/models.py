# (chemin : /backend/eventi/models.py)
from django.db import models
from uuid import uuid4
from .utils import next_external_id
from decimal import Decimal

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

    class Meta:
        verbose_name = "Cliente"  # singular correct
        verbose_name_plural = "Clienti"  # plural correc


class Luogo(Timestamped):
    distanza_km_ar = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    uid = models.UUIDField(default=uuid4, unique=True, editable=False)
    external_id = models.CharField(max_length=32, unique=True, blank=True)

    nome = models.CharField(max_length=200)
    indirizzo = models.CharField(max_length=300, blank=True, null=True)

    # 👇 nouveaux champs pour l’Anagrafe
    citta = models.CharField(max_length=120, blank=True, null=True)
    cap = models.CharField(max_length=20, blank=True, null=True)
    provincia = models.CharField(max_length=50, blank=True, null=True)

    # distances utilisées pour la logistique
    distanza_km = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        if not self.external_id:
            self.external_id = next_external_id(Luogo, "LUG")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nome
    class Meta:
        verbose_name = "Luogo"  # singular correct
        verbose_name_plural = "Luoghi"  # plural correc


# backend/eventi/models.py

from django.db import models

class Materiale(models.Model):
    # --- infos de base ---
    nome = models.CharField(max_length=200)
    categoria = models.CharField(max_length=100, blank=True, null=True)
    sottocategoria = models.CharField(max_length=100, blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)

    # --- tarification / stock ---
    # Pour un "matériel" -> prix par pièce
    # Pour un "tecnico"  -> prix par heure
    # Pour un "mezzo"    -> prix par km
    prezzo_base = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit_label = models.CharField(
        max_length=8,
        choices=[("pz", "pz"), ("h", "h"), ("km", "km")],
        default="pz",
        help_text="Unité de tarification: pz=pièce, h=heure (tecnico), km=km (mezzo)",
    )

    # Stock pour les matériels (ignoré pour tecnico/mezzo)
    scorta = models.IntegerField(default=0)

    # --- types / flags ---
    is_tecnico = models.BooleanField(default=False, help_text="Article de type technicien (facturé à l'heure)")
    is_messo = models.BooleanField(default=False, help_text="Article de type mezzo/transport (facturé au km)")
    # (si tu préfères, tu peux aussi ajouter is_trasporto et l'utiliser côté UI)

    is_default_service = models.BooleanField(
        default=False,
        help_text="Si actif, proposé comme service par défaut (Tecnico/Messo)."
    )
    is_archived = models.BooleanField(default=False, db_index=True)

    def __str__(self):
        return self.nome

    class Meta:
        verbose_name = "Materiale"  # singular correct
        verbose_name_plural = "Materiali"  # plural correc

class MaterialeSuggerito(models.Model):
    """Règle de suggestion: quand on ajoute `trigger`, proposer `suggested`."""
    trigger = models.ForeignKey(Materiale, on_delete=models.CASCADE, related_name='suggerimenti')
    suggested = models.ForeignKey(Materiale, on_delete=models.CASCADE, related_name='suggerito_da')
    qty_default = models.PositiveIntegerField(default=1)
    label = models.CharField(max_length=120, blank=True)  # ex. "Tavolo TV"
    active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('trigger', 'suggested')


class RegolaSuggerimento(models.Model):
    """Si on ajoute un élément de cat/sub X, proposer tout ce qui est en cat/sub Y."""
    trigger_categoria = models.CharField(max_length=120, blank=True)
    trigger_sottocategoria = models.CharField(max_length=120, blank=True)
    suggest_categoria = models.CharField(max_length=120, blank=True)
    suggest_sottocategoria = models.CharField(max_length=120, blank=True)
    qty_default = models.PositiveIntegerField(default=1)
    label = models.CharField(max_length=120, blank=True)
    active = models.BooleanField(default=True)



class MagazzinoItem(Timestamped):
    """Optionnel : vue détaillée par matériel si tu veux suivre réservé/disponible."""
    materiale = models.ForeignKey(Materiale, on_delete=models.CASCADE, related_name="stock")
    qta_disponibile = models.IntegerField(default=0)
    qta_prenotata = models.IntegerField(default=0)


# --------- Eventi ---------
class Evento(Timestamped):
    OFFERTA_STATO = [
        ('da_eseguire', 'DA ESEGUIRE'),
        ('inviato', 'INVIATO'),
        ('annullato', 'ANNULLATO'),
    ]
    PAY_STATE = [
        ('none', 'none'),
        ('to_send', 'to_send'),
        ('sent', 'sent'),
        ('paid', 'paid'),
    ]

    STATO = (
        ("bozza", "bozza"),
        ("confermato", "confermato"),
        ("annullato", "annullato"),
        ("fatturato", "fatturato"),


    )
    gruppo_uid = models.UUIDField(default=uuid4, db_index=True)  # groupe de versions (ref0, ref1…)
    versione = models.PositiveIntegerField(default=0)            # incrémenté à chaque modif
    titolo = models.CharField(max_length=200, default="Offerta")
    data_evento = models.DateField(db_index=True)
    location_index = models.PositiveSmallIntegerField(default=1)  # 1..5
    stato = models.CharField(max_length=20, choices=STATO, default="bozza")
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="eventi")
    luogo = models.ForeignKey(Luogo, on_delete=models.PROTECT, related_name="eventi")
    note = models.TextField(blank=True, null=True)
    acconto_importo = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    acconto_data = models.DateField(null=True, blank=True)

    data_evento_da = models.DateField(null=True, blank=True)
    data_evento_a = models.DateField(null=True, blank=True)

    offerta_stato = models.CharField(
        max_length=12, choices=OFFERTA_STATO, default='da_eseguire'
    )
    acconto_importo = models.DecimalField(
        max_digits=9, decimal_places=2, default=Decimal('0.00')
    )
    acconto_state = models.CharField(
        max_length=8, choices=PAY_STATE, default='none'
    )
    saldo_state = models.CharField(
        max_length=8, choices=PAY_STATE, default='to_send'
    )
    categoria_notes = models.JSONField(blank=True, null=True, default=dict)

    class Meta:

        indexes = [
            models.Index(fields=["data_evento", "location_index"]),
        ]

    class Meta:
        verbose_name = "Evento"  # singular correct
        verbose_name_plural = "Eventi"  # plural correc

    versione = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.titolo} v{self.versione} ({self.data_evento} L{self.location_index})"

    categoria_notes = models.JSONField(default=dict, blank=True)  # { "<cat_id>" ou "<cat_nome>": "ma note" }

    distanza_km = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="km usati per logistica")

    @property
    def distanza_rilevante_km(self):
        """Priorità: evento.distanza_km -> luogo.distanza_km -> 0"""
        if self.distanza_km is not None:
            return self.distanza_km
        try:
            return self.luogo.distanza_km
        except Exception:
            return Decimal("0")




class RigaEvento(Timestamped):
    evento = models.ForeignKey(Evento, on_delete=models.CASCADE, related_name="righe")
    materiale = models.ForeignKey(Materiale, on_delete=models.PROTECT)
    qta = models.IntegerField(default=1)
    prezzo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    importo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_tecnico = models.BooleanField(default=False)
    is_trasporto = models.BooleanField(default=False)
    copertura_giorni = models.IntegerField(default=1)  # nb de jours bloqués (ex: 3)

    class Meta:
        verbose_name = "RigaEvento"  # singular correct
        verbose_name_plural = "RigaEventi"  # plural correc



class CalendarioSlot(Timestamped):
    data = models.DateField(db_index=True)
    location_index = models.PositiveSmallIntegerField()
    evento = models.OneToOneField(Evento, on_delete=models.CASCADE, related_name="slot")

class EventoRevision(models.Model):
    # Chemin: /backend/eventi/models.py
    evento = models.ForeignKey('Evento', related_name='revisions', on_delete=models.CASCADE)
    ref = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True, null=True)
    payload = models.JSONField(blank=True, null=True)   # ⬅️ JSONField natif Django, pas Postgres

    class Meta:
        ordering = ["created_at", "ref"]
        unique_together = ("evento", "ref")

class Tecnico(models.Model):
    nome = models.CharField(max_length=120)
    email = models.EmailField(blank=True, null=True)
    telefono = models.CharField(max_length=50, blank=True, null=True)
    note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    tariffa_oraria = models.DecimalField(max_digits=8, decimal_places=2, default=0, help_text="€/h")
    costo_km = models.DecimalField(max_digits=7, decimal_places=2, default=0, help_text="€/km (opz., rimborso viaggio)")

    def costo_viaggio(self, km: Decimal | float | int) -> Decimal:
        try:
            km = Decimal(str(km or 0))
        except Exception:
            km = Decimal("0")
        return (self.costo_km or Decimal("0")) * km

    def __str__(self):
        return self.nome
    class Meta:
        verbose_name = "Tecnico"  # singular correct
        verbose_name_plural = "Tecnici"  # plural correc


class Mezzo(models.Model):
    targa = models.CharField(max_length=32, unique=True)
    descrizione = models.CharField(max_length=200, blank=True)
    costo_km = models.DecimalField(max_digits=7, decimal_places=2, default=0, help_text="€/km")

    def costo_km_totale(self, km: Decimal | float | int) -> Decimal:
        try:
            km = Decimal(str(km or 0))
        except Exception:
            km = Decimal("0")
        return (self.costo_km or Decimal("0")) * km

    costo_uscita = models.DecimalField(max_digits=8, decimal_places=2, default=0) # fisso
    attivo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.targa} ({self.descrizione})"

    class Meta:
        verbose_name = "Mezzo"  # singular correct
        verbose_name_plural = "Mezzi"  # plural correc


from django.db import models


class Categoria(models.Model):
    nome = models.CharField(max_length=120)


class Sottocategoria(models.Model):
    nome = models.CharField(max_length=120)
    categoria = models.ForeignKey(Categoria, on_delete=models.SET_NULL, null=True, blank=True)

