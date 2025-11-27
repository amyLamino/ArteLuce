# (chemin : /README.md)
# Projet Arteluce — Backend (Django + DRF) & Frontend (Next.js 14 + Tailwind)
# Objectif: Offerta rapida, Calendario (5 locations / date), Magazzino, Tarification dynamique,
# Versioning (ref0, ref1...), pastilles d'état, persistance de brouillon, et synchro avec APIs.

## Lancer le backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

## Lancer le frontend
```bash
cd frontend
npm install
npm run dev
```

## Points clés
- Tarification dynamique: `/api/pricing/` (POST)
- Disponibilité Calendario (propose LOCATION 1..5 libre): `/api/calendario/availability?data=YYYY-MM-DD` (GET)
- Versioning d'une offerta: `/api/eventi/{id}/version/` (POST) → ref+1 (groupe conservé)
- Magazzino import: `/api/magazzino/import` (POST multipart) → preview + token, puis `/api/magazzino/import/confirm` (POST)
- Evento CRUD: `/api/eventi/` (DRF ViewSet), champs `location_index` garantis par `CalendarioSlot`
- Front: pages `calendario`, `eventi/offerta-rapida`, `magazzino`, `catalogo-magazzino`
