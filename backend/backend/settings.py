# backend/backend/settings.py

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = "dev-secret-key"
DEBUG = True
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "eventi",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Autorise les origines du front (mets les deux, localhost et 127.0.0.1)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


# Autorise les méthodes utilisées par ton front
CORS_ALLOW_METHODS = [
    "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
]

# Autorise les en-têtes envoyés (dont X-Force-Revision)
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-language",
    "content-type",
    "authorization",
    "x-force-revision",
    "x-requested-with",
]

# Si tu n’utilises pas de cookies/session entre domaines :
CORS_ALLOW_CREDENTIALS = False

# ← ← AJOUT CRUCIAL
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "django.template.context_processors.i18n",
                "django.template.context_processors.media",
                "django.template.context_processors.static",
                "django.template.context_processors.tz",
            ],
        },
    },
]

ROOT_URLCONF = "backend.urls"
WSGI_APPLICATION = "backend.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

LANGUAGE_CODE = "it-it"
TIME_ZONE = "Europe/Rome"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOW_ALL_ORIGINS = True

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
}
# Montant de TVA par défaut
IVA_PERCENT = 22

# Données société + contact (utilisées par le .docx)
COMPANY = {
    "ragione": "ARTE LUCE di Kominek Joanna Alicja",
    "indirizzo": "Strada Murrieta, 5",
    "cap_citta": "10060 Cantalupa (TO)",
    "cf": "KMNKMN80L02CZZZ",
    "piva": "IT 10670630010",
    "cciaa": "CCIAA Torino REA 115258",
    "validita_giorni": 15,
    # chemin absolu du logo (facultatif)
    # "logo_path": BASE_DIR / "static" / "img" / "logo.png",
    "contact": {
        "nome": "Joanna Kominek",
        "ruolo": "Arte Luce - supporto eventi",
        "cell": "+39 3348789171",
        "email": "info@arteluce.info",
        "web": "www.arteluce.info",
    },
}

