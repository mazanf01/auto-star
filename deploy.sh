#!/usr/bin/env bash
# ============================================================
#  STAR ASN Web — Deploy Script (Free + Always-On)
#  Platform: Koyeb (backend) + Cloudflare Pages (frontend)
# ============================================================
set -e

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"

echo "╔══════════════════════════════════════════════╗"
echo "║  STAR ASN Web — Deploy (Free + Always-On)    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ─── 0. Prerequisites check ──────────────────────────────
echo "[0] Checking prerequisites..."
command -v git >/dev/null 2>&1 || { echo "✗ git not found"; exit 1; }
echo "  ✓ git"

# ─── 1. Generate secrets if not set ──────────────────────
echo ""
echo "[1] Generating secrets..."
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
echo "  JWT_SECRET=$JWT_SECRET"
echo "  ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "  ⚠️  Save these! Backend env vars."

# ─── 2. Backend: Koyeb deploy ────────────────────────────
echo ""
echo "[2] Backend → Koyeb"
echo "  1. Push repo to GitHub (if not already)"
echo "  2. Go to https://app.koyeb.com → Create Service → GitHub"
echo "  3. Select repo: star-asn-web"
echo "  4. Build settings:"
echo "     - Builder: Dockerfile"
echo "     - Dockerfile location: backend/Dockerfile"
echo "     - Port: 3001"
echo "     - Health check path: /health"
echo "  5. Environment variables (set ALL):"
echo "     PORT=3001"
echo "     NODE_ENV=production"
echo "     JWT_SECRET=$JWT_SECRET"
echo "     ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "     SUPABASE_URL=<your-supabase-url>"
echo "     SUPABASE_SERVICE_KEY=<your-supabase-service-key>"
echo "     CORS_ORIGIN=https://star-asn-web.pages.dev"
echo "     SCHEDULER_ENABLED=true"
echo "     SCHEDULER_TIMEZONE=Asia/Jakarta"
echo "  6. Instance: Eco (Free) — 512MB RAM, always-on"
echo "  7. Deploy → backend URL: https://star-asn-backend-<hash>.koyeb.app"
echo ""
echo "  Backend URL: (set after deploy)"

# ─── 3. Frontend: Cloudflare Pages ───────────────────────
echo ""
echo "[3] Frontend → Cloudflare Pages"
echo "  1. Go to https://dash.cloudflare.com → Workers & Pages → Create"
echo "  2. Connect Git repo: star-asn-web"
echo "  3. Build settings:"
echo "     - Framework preset: Vite"
echo "     - Build command: cd frontend && npm install && npm run build"
echo "     - Build output: frontend/dist"
echo "  4. Environment variables:"
echo "     VITE_API_BASE=https://star-asn-backend-<hash>.koyeb.app/api"
echo "  5. Deploy → frontend URL: https://star-asn-web.pages.dev"
echo ""
echo "  Frontend URL: https://star-asn-web.pages.dev"

# ─── 4. Supabase migration ───────────────────────────────
echo ""
echo "[4] Supabase — run migration 010"
echo "  1. Go to Supabase Dashboard → SQL Editor"
echo "  2. Paste & run: database/migrations/010_star_sessions.sql"
echo "  3. Verify: SELECT * FROM star_sessions; (should be empty, table exists)"

# ─── 5. Post-deploy verification ─────────────────────────
echo ""
echo "[5] Post-deploy verification"
echo "  # Backend health:"
echo "  curl https://star-asn-backend-<hash>.koyeb.app/health"
echo ""
echo "  # Login test:"
echo "  curl -X POST https://star-asn-backend-<hash>.koyeb.app/api/auth/login \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"admin@star-asn.local\",\"password\":\"admin123\"}'"
echo ""
echo "  # Frontend:"
echo "  curl -I https://star-asn-web.pages.dev"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ Deploy checklist complete!               ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Backend:  Koyeb (always-on, free)           ║"
echo "║  Frontend: Cloudflare Pages (CDN, free)      ║"
echo "║  Database: Supabase (500MB, free)            ║"
echo "║  Sessions: DB (no local files!)              ║"
echo "╚══════════════════════════════════════════════╝"
