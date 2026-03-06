#!/usr/bin/env bash
# dev-frontend.sh — Lance le frontend seul avec les mocks MSW (sans backend requis)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

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

# ── Installation des dépendances si nécessaire ─────────────────────────────
cd "$FRONTEND_DIR"
if [[ ! -d node_modules ]]; then
  echo "📦 Installation des dépendances npm..."
  npm install
fi

# ── Fichier .env.local par défaut ──────────────────────────────────────────
if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  echo "📄 .env.local créé depuis .env.example"
fi

# S'assurer que VITE_USE_MOCK est activé
if grep -q "^VITE_USE_MOCK=false" .env.local; then
  sed -i '' 's/^VITE_USE_MOCK=false/VITE_USE_MOCK=true/' .env.local
  echo "✅ VITE_USE_MOCK=true (mocks MSW activés)"
fi

# ── Lancement ──────────────────────────────────────────────────────────────
echo ""
echo "🚀 Frontend LocaGest — mode mocké (sans backend)"
echo "   http://localhost:5173"
echo "   Comptes : gardien@test.fr / resp@test.fr / tresorier@test.fr  (mdp : test)"
echo ""
npm run dev
