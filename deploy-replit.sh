#!/usr/bin/env bash
# ============================================================
#  STAR ASN Web — Deploy ke Replit (Pro, Always-On)
#  Backend:  Replit Pro (node-cron native, always-on)
#  Frontend: Cloudflare Pages (static CDN, free)
# ============================================================

cat << 'GUIDE'

═══════════════════════════════════════════════════════════
 STEP 1: Backend → Replit (Pro)
═══════════════════════════════════════════════════════════

 1. Login https://replit.com (akun Pro)

 2. Create Repl → Import from GitHub → pilih: mazanf01/auto-star

 3. Replit auto-detect .replit config:
    - run = "cd backend && npm install && npm start"
    - Language: Node.js 20

 4. Set Secrets (Replit → Tools → Secrets / 🔒):
    ════════════════════════════════════════════
    Key                    Value
    ════════════════════════════════════════════
    PORT                   3001
    NODE_ENV               production
    SCHEDULER_ENABLED      true
    SCHEDULER_TIMEZONE     Asia/Jakarta
    JWT_SECRET             (generate: openssl rand -hex 32)
    ENCRYPTION_KEY         (harus sama dengan yang dipakai sebelumnya!)
    SUPABASE_URL           https://xxx.supabase.co
    SUPABASE_SERVICE_KEY   eyJhbGciOi...
    CORS_ORIGIN            https://star-asn-web.pages.dev
    TELEGRAM_BOT_TOKEN     (opsional)
    TELEGRAM_DEFAULT_CHAT_ID (opsional)
    ════════════════════════════════════════════

    ⚠️ ENCRYPTION_KEY WAJIB sama dengan yang dipakai di development!
    Kalau beda, credentials STAR ASN yang sudah tersimpan tidak bisa di-decrypt.

 5. Enable Always-On (Pro feature):
    Repl → Settings (⚙️) → Always-On → ON ✅

 6. Click Run ▶️
    Backend URL: https://<repl-name>.<username>.repl.co
    Health check: https://<repl-name>.<username>.repl.co/health

    Example: https://auto-star.mazanf01.repl.co/health

═══════════════════════════════════════════════════════════
 STEP 2: Frontend → Cloudflare Pages (free, no CC)
═══════════════════════════════════════════════════════════

 1. Login https://dash.cloudflare.com (email saja)

 2. Workers & Pages → Create → Pages → Connect to Git

 3. Pilih repo: auto-star

 4. Build settings:
    - Framework preset: Vite
    - Build command: cd frontend && npm install && npm run build
    - Build output: frontend/dist

 5. Environment variables:
    VITE_API_BASE=https://<repl-name>.<username>.repl.co/api

    Example: VITE_API_BASE=https://auto-star.mazanf01.repl.co/api

 6. Deploy!
    Frontend URL: https://star-asn-web.pages.dev

═══════════════════════════════════════════════════════════
 STEP 3: Supabase Migration
═══════════════════════════════════════════════════════════

 1. Supabase Dashboard → SQL Editor
 2. Paste & run: database/migrations/010_star_sessions.sql
 3. Verify:
    SELECT tablename FROM pg_tables WHERE tablename = 'star_sessions';

═══════════════════════════════════════════════════════════
 STEP 4: Update CORS_ORIGIN
═══════════════════════════════════════════════════════════

 Setelah frontend URL diketahui, update CORS_ORIGIN di Replit Secrets:
    CORS_ORIGIN=https://star-asn-web.pages.dev

 Restart Repl setelah update.

═══════════════════════════════════════════════════════════
 STEP 5: Verify
═══════════════════════════════════════════════════════════

 # Backend health:
 curl https://<repl-name>.<username>.repl.co/health

 # Login test:
 curl -X POST https://<repl-name>.<username>.repl.co/api/auth/login \
   -H "Content-Type: application/json" \
   -d '{"email":"admin@star-asn.local","password":"admin123"}'

 # Frontend:
 curl -I https://star-asn-web.pages.dev

 # Cron scheduler running? Check Replit console:
 # Should see: "[scheduler] Cron job started (every minute check)"

═══════════════════════════════════════════════════════════
 DONE!
═══════════════════════════════════════════════════════════

 Backend:  Replit Pro (always-on, node-cron native) ✅
 Frontend: Cloudflare Pages (CDN, free)              ✅
 Database: Supabase (500MB, free)                    ✅
 Sessions: DB-backed (no local files)                ✅

GUIDE
