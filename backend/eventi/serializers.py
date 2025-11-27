# backend/eventi/serializers.py
from decimal import Decimal
from django.db import transaction
from rest_framework import serializers

from .models import (
    Cliente,
    Luogo,
    Materiale,
    Evento,
    RigaEvento,
    CalendarioSlot,
    EventoRevision,
    Tecnico,
    Mezzo,
)

__all__ = [
    "ClienteSerializer",
    "LuogoSerializer",
    "MaterialeSerializer",
    "TecnicoSerializer",
    "MezzoSerializer",
    "RigaEventoSerializer",
    "EventoRevisionSerializer",
    "EventoSerializer",
]

# ---------------------------------------------------------------------------
# Anagrafe
# ---------------------------------------------------------------------------


class ClienteSerializer(serializers.ModelSerializer):
    """Clienti pour Anagrafe + sélecteur dans l’evento."""

    class Meta:
        model = Cliente
        fields = ["id", "nome", "email", "telefono"]


class LuogoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Luogo
        fields = ["id", "nome", "indirizzo", "distanza_km_ar"]


# ---------------------------------------------------------------------------
# Matériel / Tecnico / Mezzo
# ---------------------------------------------------------------------------


class MaterialeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Materiale
        fields = [
            "id",
            "nome",
            "prezzo_base",
            "categoria",
            "sottocategoria",
            "scorta",
            "is_tecnico",
            "is_messo",
            "is_archived",
            "image_url",
        ]
        read_only_fields = ["id", "is_archived"]


class TecnicoSerializer(serializers.ModelSerializer):
    """Tecnici, utilisés dans Anagrafe ou logistica."""

    class Meta:
        model = Tecnico
        fields = [
            "id",
            "nome",
            "email",
            "telefono",
            "note",
            "tariffa_oraria",
            "costo_km",
        ]


class MezzoSerializer(serializers.ModelSerializer):
    """Mezzi (véhicules)."""

    class Meta:
        model = Mezzo
        fields = ["id", "targa", "descrizione", "costo_km", "costo_uscita", "attivo"]


# ---------------------------------------------------------------------------
# Riga
# ---------------------------------------------------------------------------


class RigaEventoSerializer(serializers.ModelSerializer):
    materiale_nome = serializers.SerializerMethodField()

    class Meta:
        model = RigaEvento
        fields = [
            "id",
            "materiale",
            "materiale_nome",
            "qta",
            "prezzo",
            "importo",
            "is_tecnico",
            "is_trasporto",
            "copertura_giorni",
        ]

    def get_materiale_nome(self, obj):
        try:
            return obj.materiale.nome
        except Exception:
            return None


# ---------------------------------------------------------------------------
# Helpers internes
# ---------------------------------------------------------------------------


def _materiale_pk(val):
    """
    Accepte un Materiale, un dict {"id":..} ou un simple ID
    et renvoie toujours un int (pk).
    """
    if val is None:
        raise serializers.ValidationError({"materiale": "valeur manquante"})
    if isinstance(val, Materiale):
        return int(val.pk)
    if isinstance(val, dict):
        vid = val.get("id") or val.get("pk")
        if not vid:
            raise serializers.ValidationError({"materiale": "dict sans id"})
        return int(vid)
    try:
        return int(val)
    except Exception:
        raise serializers.ValidationError({"materiale": f"ID invalide: {val!r}"})


# ---------------------------------------------------------------------------
# Evento
# ---------------------------------------------------------------------------


class EventoSerializer(serializers.ModelSerializer):
    stock_tot_scorta = serializers.SerializerMethodField()
    stock_tot_dispon = serializers.SerializerMethodField()

    cliente_nome = serializers.SerializerMethodField()
    luogo_nome = serializers.SerializerMethodField()
    righe = RigaEventoSerializer(many=True, read_only=True, source="righe.all")

    class Meta:
        model = Evento
        fields = (
            "id",
            "titolo",
            "data_evento",
            "data_evento_da",
            "data_evento_a",
            "location_index",
            "stato",
            "offerta_stato",
            "acconto_importo",
            "acconto_state",
            "saldo_state",
            "acconto_data",
            "cliente",
            "cliente_nome",
            "luogo",
            "luogo_nome",
            "note",
            "categoria_notes",
            "versione",
            "righe",
            "stock_tot_scorta",
            "stock_tot_dispon",
        )

    # ---- champs calculés simples (tu peux les enrichir plus tard) ----

    def get_cliente_nome(self, obj):
        return getattr(getattr(obj, "cliente", None), "nome", None)

    def get_luogo_nome(self, obj):
        return getattr(getattr(obj, "luogo", None), "nome", None)

    def get_stock_tot_scorta(self, obj):
        # placeholder pour éviter une erreur ; adapte si tu veux un vrai calcul
        return None

    def get_stock_tot_dispon(self, obj):
        # placeholder pour éviter une erreur ; adapte si tu veux un vrai calcul
        return None

    # ---- validation globale ----

    def validate(self, attrs):
        """
        Validation légère :
        - contrôle de double booking de location (CalendarioSlot)
        - pas de blocage sur les dates passées pour ne pas casser les mises à jour.
        """
        instance = getattr(self, "instance", None)

        data_evento = attrs.get("data_evento", getattr(instance, "data_evento", None))
        loc_index = attrs.get(
            "location_index", getattr(instance, "location_index", None)
        )

        # contrôle double booking de location
        if data_evento and loc_index:
            qs = CalendarioSlot.objects.filter(
                data=data_evento, location_index=loc_index
            )
            if instance and hasattr(instance, "slot"):
                qs = qs.exclude(pk=getattr(instance.slot, "pk", None))
            if qs.exists():
                raise serializers.ValidationError(
                    {
                        "location_index": "Questa location è già occupata per questa data."
                    }
                )

        return attrs

    # ---- création / mise à jour des righe ----

    @transaction.atomic
    def create(self, validated_data):
        righe_in = list(self.initial_data.get("righe", []) or [])

        ev = Evento.objects.create(**validated_data)

        bulk = []
        for r in righe_in:
            qta = int(r.get("qta", 1) or 1)
            prezzo = Decimal(str(r.get("prezzo", 0) or 0))
            imp = r.get("importo")
            importo = (
                Decimal(str(imp))
                if imp not in (None, "", 0, "0")
                else (prezzo * qta)
            )
            bulk.append(
                RigaEvento(
                    evento=ev,
                    materiale_id=_materiale_pk(r.get("materiale")),
                    qta=qta,
                    prezzo=prezzo,
                    importo=importo,
                    is_tecnico=bool(r.get("is_tecnico", False)),
                    is_trasporto=bool(r.get("is_trasporto", False)),
                    copertura_giorni=int(r.get("copertura_giorni", 1) or 1),
                )
            )
        if bulk:
            RigaEvento.objects.bulk_create(bulk)

        return ev

    @transaction.atomic
    def update(self, instance, validated_data):
        # champs simples de l’evento
        for f in (
            "titolo",
            "data_evento",
            "data_evento_da",
            "data_evento_a",
            "location_index",
            "stato",
            "offerta_stato",
            "acconto_importo",
            "acconto_state",
            "saldo_state",
            "cliente",
            "luogo",
            "note",
            "categoria_notes",
        ):
            if f in validated_data:
                setattr(instance, f, validated_data[f])

        # incrémente la version
        instance.versione = (instance.versione or 0) + 1
        instance.save()

        # gestion des righe si présentes dans la requête
        righe_in = self.initial_data.get("righe", None)
        if righe_in is not None:
            instance.righe.all().delete()
            bulk = []
            for r in (righe_in or []):
                qta = int(r.get("qta", 1) or 1)
                prezzo = Decimal(str(r.get("prezzo", 0) or 0))
                imp = r.get("importo")
                importo = (
                    Decimal(str(imp))
                    if imp not in (None, "",)
                    else (prezzo * qta)
                )
                bulk.append(
                    RigaEvento(
                        evento=instance,
                        materiale_id=_materiale_pk(r.get("materiale")),
                        qta=qta,
                        prezzo=prezzo,
                        importo=importo,
                        is_tecnico=bool(r.get("is_tecnico", False)),
                        is_trasporto=bool(r.get("is_trasporto", False)),
                        copertura_giorni=int(r.get("copertura_giorni", 1) or 1),
                    )
                )
            if bulk:
                RigaEvento.objects.bulk_create(bulk)

        return instance


# ---------------------------------------------------------------------------
# Révisions
# ---------------------------------------------------------------------------


class EventoRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventoRevision
        fields = ("ref", "created_at", "payload", "note")


# ---------------------------------------------------------------------------
# Aperçu logistica (si tu l’utilises encore)
# ---------------------------------------------------------------------------


class EventoLogisticaPreviewSerializer(serializers.Serializer):
    """Réponse de calcul dynamique pour le tableau UI."""
    distanza_km = serializers.DecimalField(max_digits=8, decimal_places=2)
    mezzi = serializers.ListField(child=serializers.DictField())
    tecnici = serializers.ListField(child=serializers.DictField())
    totale_mezzi = serializers.CharField()
    totale_tecnici = serializers.CharField()
    totale_logistica = serializers.CharField()
