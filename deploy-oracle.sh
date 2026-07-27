#!/usr/bin/env bash
# ============================================================
#  STAR ASN Web — Oracle Cloud Always-Free Deploy
#  True always-on (no sleep, no credit limit)
#  Prasyarat: Oracle Cloud always-free ARM VM (Ampere A1)
# ============================================================
set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║  Oracle Cloud Always-Free Deploy                 ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

cat << 'ORACLE_INSTRUCTIONS'

═══════════════════════════════════════════════════════════
 STEP 1: Buat Oracle Cloud Always-Free VM
═══════════════════════════════════════════════════════════

 1. Daftar https://cloud.oracle.com (kartu kredit diminta,
    tapi tidak ditarik — verifikasi saja)
 2. Compute → Instances → Create Instance
    - Shape: Ampere A1 Flex (ARM) — FREE
    - OCPUs: 4, Memory: 24GB (max free tier)
    - OS: Canonical Ubuntu 22.04
    - SSH key: upload public key Anda
    - VCN: default (buka port 80, 443, 3001)
 3. Save public IP (misal: 129.150.xx.xx)
 4. SSH ke VM:
    ssh ubuntu@129.150.xx.xx

═══════════════════════════════════════════════════════════
 STEP 2: Setup Docker di VM
═══════════════════════════════════════════════════════════

 # Update + install Docker
 sudo apt update && sudo apt install -y docker.io docker-compose git
 sudo usermod -aG docker $USER
 newgrp docker

 # Clone repo
 git clone https://github.com/mazanf01/auto-star.git
 cd auto-star

═══════════════════════════════════════════════════════════
 STEP 3: Run dengan Docker Compose
═══════════════════════════════════════════════════════════

 # Create .env
 cp backend/.env.production.example backend/.env
 nano backend/.env  # isi semua nilai

 # Run (backend + frontend + nginx reverse proxy)
 docker-compose up -d --build

 # Cek:
 curl http://localhost:3001/health
 curl http://localhost/   # frontend

═══════════════════════════════════════════════════════════
 STEP 4: Setup Nginx Reverse Proxy + SSL (opsional)
═══════════════════════════════════════════════════════════

 # Install nginx + certbot
 sudo apt install -y nginx certbot python3-certbot-nginx

 # Config (ganti domain.com)
 sudo tee /etc/nginx/sites-available/star-asn << 'NGINX'
 server {
     listen 80;
     server_name star-asn.yourdomain.com;

     # Frontend
     location / {
         proxy_pass http://127.0.0.1:8080;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
     }

     # Backend API
     location /api/ {
         proxy_pass http://127.0.0.1:3001;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
     }
 }
 NGINX

 sudo ln -sf /etc/nginx/sites-available/star-asn /etc/nginx/sites-enabled/
 sudo nginx -t && sudo systemctl reload nginx

 # SSL gratis (Let's Encrypt)
 sudo certbot --nginx -d star-asn.yourdomain.com

═══════════════════════════════════════════════════════════
 STEP 5: Auto-restart + Update
═══════════════════════════════════════════════════════════

 # Docker auto-restart on boot
 sudo systemctl enable docker

 # Update script (save sebagai /home/ubuntu/update.sh)
 cat > update.sh << 'UPDATE'
 #!/bin/bash
 cd /home/ubuntu/auto-star
 git pull
 docker-compose down
 docker-compose up -d --build
 docker image prune -f
 UPDATE
 chmod +x update.sh

 # Cron auto-update tiap jam 3 pagi (opsional)
 (crontab -l 2>/dev/null; echo "0 3 * * * /home/ubuntu/update.sh >> /home/ubuntu/update.log 2>&1") | crontab -

═══════════════════════════════════════════════════════════
 DONE!
═══════════════════════════════════════════════════════════

 Backend:  http://129.150.xx.xx:3001/api  (atau https://star-asn.yourdomain.com/api)
 Frontend: http://129.150.xx.xx           (atau https://star-asn.yourdomain.com)

 ✅ True always-on, no sleep, no credit limit
 ✅ 4 OCPU + 24GB RAM (Ampere ARM) — jauh lebih powerful dari VPS gratis lain
 ✅ Unlimited bandwidth

ORACLE_INSTRUCTIONS
