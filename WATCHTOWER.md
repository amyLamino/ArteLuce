# Watchtower Configuration

Per abilitare Watchtower sul server di produzione, aggiungi il servizio `watchtower` al `docker-compose.prod.yml`:

## Quick Start

```yaml
# Aggiungi questo servizio a docker-compose.prod.yml
watchtower:
  image: containrrr/watchtower
  container_name: watchtower
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  command: --interval 300 --cleanup arteluce-backend arteluce-frontend  # Controlla ogni 5 min
  restart: unless-stopped
  environment:
    - WATCHTOWER_CLEANUP=true
    - WATCHTOWER_REMOVE_VOLUMES=false
```

## Come Funziona

1. **Monitoraggio**: Watchtower controlla GHCR ogni N secondi per nuove versioni delle immagini
2. **Pull**: Se trova una versione più recente del tag `latest`, fa il pull
3. **Aggiornamento**: Ricrea i container con la nuova immagine
4. **Cleanup**: Rimuove le vecchie immagini per liberare spazio

## Configurazione Consigliata

```yaml
watchtower:
  image: containrrr/watchtower:latest
  container_name: watchtower
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  command: >
    --interval 600
    --cleanup
    --remove-volumes false
    arteluce-backend arteluce-frontend
  restart: unless-stopped
  environment:
    - WATCHTOWER_CLEANUP=true
    - WATCHTOWER_REMOVE_VOLUMES=false
    - WATCHTOWER_NOTIFICATIONS=email  # Opzionale: notifiche
```

## Parametri Comuni

| Parametro | Default | Descrizione |
|-----------|---------|-------------|
| `--interval` | 300s | Intervallo di polling in secondi (300 = 5 min) |
| `--cleanup` | - | Rimuove vecchie immagini |
| `--remove-volumes` | false | **ATTENZIONE**: Rimuove i volumi, NON usare |
| `--no-startup-message` | - | Disabilita messaggio di startup |

## Autenticazione GHCR

Se il registry è privato, aggiungi credenziali:

```yaml
watchtower:
  environment:
    - REPO_USER=your_github_username
    - REPO_PASS=your_github_token  # Personal Access Token con scope "read:packages"
```

## Docker Compose Completo (Produzione)

```yaml
version: '3.9'

services:
  backend:
    image: ghcr.io/amylamino/arteluce-backend:latest
    container_name: arteluce-backend
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1
      - DJANGO_SETTINGS_MODULE=backend.settings
    restart: unless-stopped
    pull_policy: always

  frontend:
    image: ghcr.io/amylamino/arteluce-frontend:latest
    container_name: arteluce-frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_BASE=http://localhost:8000/api
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api
    depends_on:
      - backend
    restart: unless-stopped
    pull_policy: always

  watchtower:
    image: containrrr/watchtower:latest
    container_name: watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 600 --cleanup arteluce-backend arteluce-frontend
    restart: unless-stopped
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_REMOVE_VOLUMES=false

networks:
  default:
    name: arteluce_net
```

## Verificare che Funziona

```bash
# Controlla i log di Watchtower
docker logs watchtower

# Esempio output (ogni 10 minuti scansiona):
# [watchtower] Checking all containers for updates ...
# [watchtower] Found new image for backend (sha256:...)
# [watchtower] Stopping and removing container...
# [watchtower] Starting new container...
```

## Disabilitare Watchtower Temporaneamente

```bash
# Pausa Watchtower
docker pause watchtower

# Riprendi
docker unpause watchtower
```

## Rimozione

```bash
docker-compose down  # Rimuove tutti i servizi incluso Watchtower
```

---

**Nota**: Con `pull_policy: always` nei docker-compose, i container verranno sempre aggiornati all'ultima immagine disponibile. Watchtower li ricrea automaticamente quando rileva nuove versioni.
