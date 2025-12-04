# (chemin : /backend/backend/urls.py)
from django.contrib import admin
from django.urls import path, include

from .views import root  # ← AJOUT
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('eventi.urls')),

    path("", root, name="root"),  # ← AJOUT : GET / → petite page HTML
]
