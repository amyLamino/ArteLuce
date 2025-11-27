# backend/eventi/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Evento, CalendarioSlot

@receiver(post_save, sender=Evento)
def ensure_slot(sender, instance: Evento, created, **kwargs):
    # 1 seul slot par evento (OneToOne) ; on met à jour data/location
    CalendarioSlot.objects.update_or_create(
        evento=instance,
        defaults={
            "data": instance.data_evento,
            "location_index": instance.location_index,
        },
    )
