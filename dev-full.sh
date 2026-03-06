#!/usr/bin/env bash
# dev-full.sh — Lance le backend Micronaut + le frontend connecté (sans mocks MSW)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"
BACKEND_PORT="${BACKEND_PORT:-8080}"
BACKEND_URL="http://localhost:$BACKEND_PORT"

# ── Java 25 ────────────────────────────────────────────────────────────────
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

# ── Démarrage du backend ───────────────────────────────────────────────────
echo "🔧 Démarrage du backend Micronaut (port $BACKEND_PORT)..."
cd "$BACKEND_DIR"
./gradlew runLocal --no-daemon &
BACKEND_PID=$!

# Nettoyage du backend à la sortie du script
cleanup() {
  echo ""
  echo "🛑 Arrêt du backend (PID $BACKEND_PID)..."
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Attendre que le backend soit prêt
echo -n "⏳ Attente du backend"
MAX_WAIT=60
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
  echo "📄 .env.local créé depuis .env.example"
fi

# Désactiver MSW pour pointer vers le backend réel
if grep -q "^VITE_USE_MOCK=" .env.local; then
  sed -i '' 's/^VITE_USE_MOCK=.*/VITE_USE_MOCK=false/' .env.local
else
  echo "VITE_USE_MOCK=false" >> .env.local
fi
echo "✅ VITE_USE_MOCK=false (appels vers $BACKEND_URL)"

# ── Lancement du frontend ──────────────────────────────────────────────────
echo ""
echo "🚀 Frontend LocaGest — connecté au backend local"
echo "   Frontend : http://localhost:5173"
echo "   Backend  : $BACKEND_URL"
echo "   Comptes  : gardien@test.fr / resp@test.fr / tresorier@test.fr  (mdp : test)"
echo ""
npm run dev
