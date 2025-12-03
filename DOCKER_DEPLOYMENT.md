# Docker Deployment Guide

## 🐳 Monolithic Container (feat/docker-monolithic-multicontainer-fix)

Questa è la versione containerizzata con Django, Next.js e Nginx in un'unica immagine.

### Automatic Builds

La GitHub Action **`.github/workflows/build-monolithic.yml`** builda e pusha automaticamente l'immagine su ogni commit del branch `feat/docker-monolithic-multicontainer-fix`.

- **Registry**: GitHub Container Registry (ghcr.io)
- **Image**: `ghcr.io/amylamino/arteluce:monolithic-latest`
- **Trigger**: Push su `feat/docker-monolithic-multicontainer-fix` o push manuale (workflow_dispatch)

### Utilizzo locale

#### 1. Autenticazione su GitHub Container Registry
```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin
```

#### 2. Eseguire con docker-compose
```bash
# Opzione 1: Usare l'immagine precompilata da GitHub
docker-compose -f docker-compose.monolithic.yml up -d

# Opzione 2: Buildare localmente (durante lo sviluppo)
docker build -f Dockerfile.monolithic -t arteluce:monolithic .
docker run -d --name arteluce -p 80:80 arteluce:monolithic
```

#### 3. Verificare che tutto funziona
```bash
# Homepage
curl http://localhost/

# Login
curl http://localhost/login

# API
curl http://localhost/api/

# Admin Django
curl -i http://localhost/admin/

# Docx export (se evento con ID 24 esiste)
curl http://localhost/api/eventi/24/docx/ -o preventivo.docx
```

### Struttura del Monolithic Container

```
┌─────────────────────────────────────┐
│     Monolithic Container (80)       │
│  ┌───────────────────────────────┐  │
│  │    Nginx (Reverse Proxy)      │  │
│  │  Port: 80                     │  │
│  └────────┬─────────┬────────────┘  │
│           │         │                │
│    ┌──────▼──┐  ┌──▼──────────┐    │
│    │ Django  │  │  Next.js    │    │
│    │ (8000)  │  │  (3000)     │    │
│    └─────────┘  └─────────────┘    │
│                                     │
│  Supervisor: Gestisce i processi   │
└─────────────────────────────────────┘
```

### Ports Mapping

- **80**: Nginx (public - Frontend + API)
- **8000**: Django (interno - solo tramite Nginx)
- **3000**: Next.js (interno - solo tramite Nginx)

### Environment Variables

```bash
PYTHONUNBUFFERED=1              # Django output immediato
DJANGO_SETTINGS_MODULE=backend.settings
NEXT_PUBLIC_API_BASE=/api       # Client API endpoint (relativo)
NEXT_PUBLIC_API_URL=/api        # Client API URL (relativo)
```

---

## 🏗️ Multi-Container Setup (main)

Per lo sviluppo locale con servizi separati, usa il `docker-compose.yml`:

```bash
docker-compose up -d
```

**Services**:
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

### Automatic Builds (main)

La GitHub Action **`.github/workflows/build-multicontainer.yml`** builda e pusha le immagini di backend e frontend su ogni commit di `main`.

- **Registry**: GitHub Container Registry (ghcr.io)
- **Images**:
  - `ghcr.io/amylamino/arteluce-backend:latest`
  - `ghcr.io/amylamino/arteluce-frontend:latest`

---

## 📋 File di Configurazione

### `.github/workflows/build-monolithic.yml`
- Builda il Dockerfile.monolithic su push su `feat/docker-monolithic-multicontainer-fix`
- Pusha su GHCR con tag `monolithic-latest` e `monolithic-<branch-name>`
- Utilizza GitHub Actions cache per speedup

### `.github/workflows/build-multicontainer.yml`
- Builda backend e frontend separatamente su push su `main`
- Pusha su GHCR con tag `latest`

### `docker-compose.monolithic.yml`
- Usa l'immagine precompilata da GHCR
- Mappa solo la porta 80 (Nginx)
- Include healthcheck

### `Dockerfile.monolithic`
- Multi-stage build: frontend (node), backend (python), final
- Copia `.next`, `node_modules`, backend code, Nginx config, Supervisor config
- **IMPORTANTE**: Copia anche la cartella `public/` per i static assets (logo, etc.)

---

## 🚀 Deployment su Cloud

### Option 1: Container Registry Pubblico
```bash
# Pull da GitHub Container Registry
docker pull ghcr.io/amylamino/arteluce:monolithic-latest

# Tag per registry aziendale (es. Docker Hub)
docker tag ghcr.io/amylamino/arteluce:monolithic-latest myregistry/arteluce:monolithic
docker push myregistry/arteluce:monolithic
```

### Option 2: Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: arteluce
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: arteluce
        image: ghcr.io/amylamino/arteluce:monolithic-latest
        ports:
        - containerPort: 80
        env:
        - name: PYTHONUNBUFFERED
          value: "1"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 40
          periodSeconds: 30
```

### Option 3: Docker Swarm
```bash
docker service create \
  --name arteluce \
  --publish 80:80 \
  --replicas 1 \
  ghcr.io/amylamino/arteluce:monolithic-latest
```

---

## 🔍 Troubleshooting

### Container non parte
```bash
# Controlla i log
docker logs arteluce_monolithic

# Controlla se le porte sono libere
sudo lsof -i :80

# Controlla il healthcheck
docker ps --filter name=arteluce
```

### Logo non carica
- Verifica che la cartella `public/` sia copiata nel Dockerfile
- Controlla che `arte-luce-logo.png` esista in `frontend/public/`
- Accedi al container e verifica: `ls -la /app/frontend/public/`

### API endpoints ritornano 502
- Controlla che Django sia partito: `docker logs arteluce | grep django`
- Verifica che Supervisor sia attivo: `docker exec arteluce supervisorctl status`
- Controlla che `INSTALLED_APPS` abbia tutte le dipendenze

---

## ✅ Checklist Deployment

- [ ] Branch `feat/docker-monolithic-multicontainer-fix` è sincronizzato con main
- [ ] `Dockerfile.monolithic` include la cartella `public/`
- [ ] GitHub Action `build-monolithic.yml` è attivato
- [ ] Immagine builda con successo su GHCR
- [ ] `docker-compose.monolithic.yml` usa l'immagine corretta
- [ ] Container parte con `docker-compose up -d`
- [ ] Test smoke: `/`, `/login`, `/api/`, `/admin/` rispondono 200
- [ ] Logo e static assets caricano correttamente
- [ ] DOCX export funziona

---

## 📚 Resources

- [GitHub Container Registry Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/dockerfile_best-practices/)
