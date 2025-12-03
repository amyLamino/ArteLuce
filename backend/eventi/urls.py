# backend/eventi/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views_catalogo import CatalogoSearch
from .views_calendario import LocationCalendarView
from . import views_export
from .views import home
from .views_auth import LoginView, MeView  # ← AJOUT

from .views import (
    # ViewSets
    ClienteViewSet,
    LuogoViewSet,
    MaterialeViewSet,
    TecnicoViewSet,
    MezzoViewSet,
    EventoViewSet,

    # Calendario / liste mensili
    EventiMensiliView,
    eventi_mensili,
    eventi_mensili_alias,
    CalendarioAvailability,

    # Offerta rapida
    PricingView,
    SuggestionView,

    # Magazzino
    MagazzinoStatusView,
    MagazzinoBookingsView,
    magazzino_calendar,
)

router = DefaultRouter()
router.register(r"clienti", ClienteViewSet, basename="clienti")
router.register(r"luoghi", LuogoViewSet, basename="luoghi")
router.register(r"materiali", MaterialeViewSet, basename="materiali")
router.register(r"tecnici", TecnicoViewSet, basename="tecnici")
router.register(r"mezzi", MezzoViewSet, basename="mezzi")
router.register(r"eventi", EventoViewSet, basename="eventi")   # ✅ un seul register pour "eventi"


urlpatterns = [
    path("", home, name="home"),
    # ---------- CRUD génériques (ViewSets) ----------
    path("", include(router.urls)),

    # ---------- AUTH ----------
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/me", MeView.as_view(), name="auth-me"),

    # ---------- LISTA MENSILE / CALENDARIO ----------
    # utilisé par la liste mensile : /api/eventi/mese?year=YYYY&month=M
    path(
        "eventi/mese",
        EventiMensiliView.as_view(),
        name="eventi-mese",
    ),

    # utilisé par d’anciens appels : /api/eventi/mensile?month=YYYY-MM
    # (JSON direct, SANS redirection)
    path(
        "eventi/mensile",
        eventi_mensili,
        name="eventi-mensile",
    ),

    # alias HTTP → redirige vers /api/eventi/mese?year=YYYY&month=M
    # si jamais quelque chose l’utilise encore
    path(
        "eventi/mese-alias",
        eventi_mensili_alias,
        name="eventi-mese-alias",
    ),

    # disponibilité des slots pour une date (utilisé dans la page Evento)
    path(
        "calendario/availability",
        CalendarioAvailability.as_view(),
        name="calendario-availability",
    ),

    # calendrier par "location" (page Calendario)
    path(
        "calendario/location-calendar",
        LocationCalendarView.as_view(),
        name="calendario-location-calendar",
    ),

    # ---------- PRICING & SUGGESTIONS (offerta rapida) ----------
    path("pricing", PricingView.as_view(), name="pricing"),
    path("suggest", SuggestionView.as_view(), name="suggest"),

    # ---------- MAGAZZINO ----------
    # état du stock sur une période (page Magazzino)
    path(
        "magazzino/status",
        MagazzinoStatusView.as_view(),
        name="magazzino-status",
    ),

    # bookings détaillés d’un matériel
    path(
        "magazzino/bookings",
        MagazzinoBookingsView.as_view(),
        name="magazzino-bookings",
    ),

    # sinottico annuale : /api/magazzino/calendar?year=2025
    # 👉 attention : c’est une FONCTION, donc SANS .as_view()
    path(
        "magazzino/calendar",
        magazzino_calendar,
        name="magazzino-calendar",
    ),

    # ---------- CATALOGO ----------
    path("catalogo/search", CatalogoSearch.as_view(), name="catalogo-search"),

    # ---------- EXPORT WORD PREVENTIVO ----------
    path(
        "eventi/<int:pk>/preventivo-docx/",
        views_export.PreventivoDocxView.as_view(),
        name="evento-preventivo-docx",
    ),
]
