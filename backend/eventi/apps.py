# (chemin : /backend/eventi/apps.py)
from django.apps import AppConfig
class EventiConfig(AppConfig):
    name = 'eventi'
    default_auto_field = 'django.db.models.BigAutoField'
    def ready(self):
        from . import signals  # noqa
