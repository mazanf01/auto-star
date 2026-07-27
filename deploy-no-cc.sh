#!/usr/bin/env bash
# ============================================================
#  STAR ASN Web — Deploy GRATIS TANPA CC (Vercel + Cloudflare)
#
#  Backend  → Vercel (serverless + cron, free, no CC required)
#  Frontend → Cloudflare Pages (CDN, free, no CC required)
#
#  Prasyarat: akun GitHub + repo sudah pushed
# ============================================================
set -e

echo "╔════════════════════════════════════════════════════╗"
echo "║  Deploy GRATIS TANPA CC (Vercel + Cloudflare)      ║"
echo "╚════════════════════════════════════════════════════╝"

# Generate secrets
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
CRON_SECRET=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | xxd -p)

cat << GUIDE

═══════════════════════════════════════════════════════════
 STEP 1: Backend → Vercel (https://vercel.com)
═══════════════════════════════════════════════════════════

 1. Login ke https://vercel.com dengan akun GitHub
    (TIDAK perlu kartu kredit/debit!)

 2. "Add New..." → Project → Import repo: auto-star

 3. Configure Project:
    - Framework Preset: Other
    - Root Directory: ./  (repo root)
    - Build Command: (kosongkan — backend sudah punya node_modules)
    - Output Directory: (kosongkan)
    - Install Command: cd backend && npm install

 4. Environment Variables (WAJIB set semua):

    PORT=3001
    NODE_ENV=production
    SCHEDULER_ENABLED=true
    SCHEDULER_TIMEZONE=Asia/Jakarta

    JWT_SECRET=${JWT_SECRET}
    ENCRYPTION_KEY=${ENCRYPTION_KEY}
    CRON_SECRET=${CRON_SECRET}

    SUPABASE_URL=https://<your-project>.supabase.co
    SUPABASE_SERVICE_KEY=eyJhbGciOi...

    CORS_ORIGIN=https://star-asn-web.pages.dev

    # Telegram (opsional)
    TELEGRAM_BOT_TOKEN=
    TELEGRAM_DEFAULT_CHAT_ID=

 5. Deploy → tunggu build selesai
    Backend URL: https://auto-star.vercel.app
    Health check: https://auto-star.vercel.app/api/cron/presensi
      (akan return 401 jika tanpa header — itu benar)

 6. ⚠️ PENTING: Vercel Cron untuk free tier:
    - Free: 2 cron jobs, jadwal minimum: 1x per hari (* * * * *)
      Vercel sebenarnya mendukung per-menit di free, tapi bisa
      dibatasi. Cek: Settings → Cron Jobs
    - Cron auto-call: https://auto-star.vercel.app/api/cron/presensi
      dengan header Authorization: Bearer ${CRON_SECRET}

═══════════════════════════════════════════════════════════
 STEP 2: Frontend → Cloudflare Pages
═══════════════════════════════════════════════════════════

 1. Login ke https://dash.cloudflare.com
    (Sign up pakai email — TIDAK perlu kartu kredit!)

 2. Workers & Pages → Create → Pages → Connect to Git

 3. Pilih repo: auto-star

 4. Build settings:
    - Framework preset: Vite
    - Build command: cd frontend && npm install && npm run build
    - Build output directory: frontend/dist

 5. Environment variables:
    VITE_API_BASE=https://auto-star.vercel.app/api

 6. Deploy!
    Frontend URL: https://auto-star.pages.dev
    (atau https://star-asn-web.pages.dev — tergantung nama project)

═══════════════════════════════════════════════════════════
 STEP 3: Supabase Migration
═══════════════════════════════════════════════════════════

 1. Supabase Dashboard → SQL Editor
 2. Paste & run: database/migrations/010_star_sessions.sql
 3. Verify table exists:
    SELECT tablename FROM pg_tables WHERE tablename = 'star_sessions';

═══════════════════════════════════════════════════════════
 STEP 4: Update CORS_ORIGIN (setelah frontend URL diketahui)
═══════════════════════════════════════════════════════════

 Jika frontend URL bukan star-asn-web.pages.dev:
 - Vercel Dashboard → Project → Settings → Environment Variables
 - Update CORS_ORIGIN=<actual frontend URL>

═══════════════════════════════════════════════════════════
 STEP 5: Verify
═══════════════════════════════════════════════════════════

 # Backend health (via cron endpoint, butuh auth header):
 curl -H "Authorization: Bearer ${CRON_SECRET}" \\
      https://auto-star.vercel.app/api/cron/presensi

 # Expected: {"ok":true,"timestamp":"...","checked":N,"triggered":0,...}

 # Frontend:
 curl -I https://auto-star.pages.dev

 # Login test:
 curl -X POST https://auto-star.vercel.app/api/auth/login \\
      -H "Content-Type: application/json" \\
      -d '{"email":"admin@star-asn.local","password":"admin123"}'

═══════════════════════════════════════════════════════════
 SECRETS — SIMPAN INI!
═══════════════════════════════════════════════════════════

 JWT_SECRET=${JWT_SECRET}
 ENCRYPTION_KEY=${ENCRYPTION_KEY}
 CRON_SECRET=${CRON_SECRET}

 ═══════════════════════════════════════════════════════════
 ✅ DONE — 100% GRATIS, NO CREDIT CARD, ALWAYS-ON VIA CRON
 ═══════════════════════════════════════════════════════════

 Backend:  Vercel Serverless + Cron (free, no CC)
 Frontend: Cloudflare Pages CDN (free, no CC)
 Database: Supabase 500MB (free, no CC)
 Sessions: DB-backed (no local files)

GUIDE
