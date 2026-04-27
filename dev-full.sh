#!/usr/bin/env bash
# dev-full.sh — Lance PostgreSQL (Docker), le backend Micronaut et le frontend connecté.
# Aucune configuration requise : tout démarre avec les valeurs par défaut.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"
BACKEND_PORT="${BACKEND_PORT:-8080}"
BACKEND_URL="http://localhost:$BACKEND_PORT"

PG_CONTAINER="locagest-pg"
PG_PORT="5432"
PG_DB="locagest"
PG_USER="locagest_app"
PG_PASSWORD="locagest"

# ── Docker ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "❌ Docker non trouvé. Installez Docker Desktop : https://docs.docker.com/get-docker/"
  exit 1
fi

# ── Java ───────────────────────────────────────────────────────────────────
if ! command -v java &>/dev/null; then
  echo "❌ Java non trouvé. Java 25 requis."
  exit 1
fi

# ── Node 20 via fnm ────────────────────────────────────────────────────────
if command -v fnm &>/dev/null; then
  eval "$(fnm env)"
  fnm use 20
elif command -v node &>/dev/null; then
  NODE_VERSION=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
  if [[ "$NODE_VERSION" -lt 20 ]]; then
    echo "⚠️  Node $NODE_VERSION détecté, Node 20 requis. Installez fnm : https://github.com/Schniz/fnm"
    exit 1
  fi
else
  echo "❌ Node non trouvé. Installez fnm : curl -fsSL https://fnm.vercel.app/install | bash"
  exit 1
fi

# ── PostgreSQL via Docker ──────────────────────────────────────────────────
CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' "$PG_CONTAINER" 2>/dev/null || echo "absent")

if [[ "$CONTAINER_STATUS" == "running" ]]; then
  echo "✅ PostgreSQL déjà actif (conteneur $PG_CONTAINER)"
elif [[ "$CONTAINER_STATUS" == "exited" ]]; then
  echo "▶️  Redémarrage du conteneur PostgreSQL existant..."
  docker start "$PG_CONTAINER" &>/dev/null
else
  echo "🐘 Création du conteneur PostgreSQL..."
  docker run -d \
    --name "$PG_CONTAINER" \
    -e POSTGRES_DB="$PG_DB" \
    -e POSTGRES_USER="$PG_USER" \
    -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    -p "${PG_PORT}:5432" \
    postgres:16 &>/dev/null
fi

# Attendre que PostgreSQL accepte les connexions
echo -n "⏳ Attente PostgreSQL"
until docker exec "$PG_CONTAINER" pg_isready -U "$PG_USER" -d "$PG_DB" &>/dev/null; do
  echo -n "."
  sleep 1
done
echo " ✅"

# ── Démarrage du backend ───────────────────────────────────────────────────
echo "🔧 Démarrage du backend Micronaut (port $BACKEND_PORT)..."
cd "$BACKEND_DIR"
./gradlew runLocal --no-daemon &
BACKEND_PID=$!

# Nettoyage à la sortie (Ctrl+C) : arrêt Micronaut uniquement, PostgreSQL persiste
cleanup() {
  echo ""
  echo "🛑 Arrêt du backend (PID $BACKEND_PID)..."
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  echo "   PostgreSQL conservé (docker stop $PG_CONTAINER pour l'éteindre manuellement)"
}
trap cleanup EXIT INT TERM

# Attendre que le backend soit prêt
echo -n "⏳ Attente du backend"
MAX_WAIT=120
ELAPSED=0
until curl -sf "$BACKEND_URL/api/v1/admin/config" &>/dev/null; do
  if [[ $ELAPSED -ge $MAX_WAIT ]]; then
    echo ""
    echo "❌ Le backend n'a pas démarré en ${MAX_WAIT}s. Vérifiez les logs ci-dessus."
    exit 1
  fi
  echo -n "."
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done
echo " ✅"

# ── Configuration frontend ─────────────────────────────────────────────────
cd "$FRONTEND_DIR"

if [[ ! -d node_modules ]]; then
  echo "📦 Installation des dépendances npm..."
  npm install
fi

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
fi

# Désactiver MSW pour pointer vers le backend réel
if grep -q "^VITE_USE_MOCK=" .env.local; then
  sed -i '' 's/^VITE_USE_MOCK=.*/VITE_USE_MOCK=false/' .env.local
else
  echo "VITE_USE_MOCK=false" >> .env.local
fi

# ── Lancement ──────────────────────────────────────────────────────────────
echo ""
echo "🚀 LocaGest — stack complète"
echo "   Frontend : http://localhost:5173"
echo "   Backend  : $BACKEND_URL"
echo "   Base     : postgresql://localhost:$PG_PORT/$PG_DB"
echo "   Comptes  : gardien@test.fr / resp@test.fr / tresorier@test.fr  (mdp : test)"
echo ""
npm run dev
