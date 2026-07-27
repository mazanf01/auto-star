# STAR ASN Web App

Full-stack web application untuk auto-presensi STAR ASN (Kemenimipas) dengan admin panel, RBAC, dan auto-presensi scheduler.

## Arsitektur

```
star-asn-web/
├── database/migrations/     # Supabase SQL migrations
├── backend/                 # Express REST API + scheduler
│   ├── lib/
│   │   ├── StarAsnAuth.js   # STAR ASN auth client (dari CLI project)
│   │   ├── crypto.js        # AES-256 encryption for credentials
│   │   └── supabase.js      # Supabase client
│   ├── middleware/
│   │   └── auth.js          # JWT auth + RBAC
│   ├── routes/
│   │   ├── auth.js          # Login, register, change password
│   │   ├── users.js         # Admin: CRUD users
│   │   ├── menus.js         # Menus + access control
│   │   ├── star-asn.js      # Proxy ke STAR ASN API
│   │   ├── presensi-settings.js  # Auto presensi config
│   │   ├── dashboard.js     # Dashboard stats
│   │   └── activity.js      # Activity logs
│   ├── services/
│   │   ├── scheduler.js     # Cron auto-presensi
│   │   └── activity.js      # Activity logger
│   └── server.js            # Express app entry
└── frontend/                # React + Vite + TailwindCSS
    └── src/
        ├── context/AuthContext.jsx
        ├── components/       # Sidebar, Topbar, Layout, ProtectedRoute
        ├── lib/api.js        # API client
        └── pages/
            ├── Login.jsx, Register.jsx
            ├── Dashboard.jsx
            ├── Presensi.jsx
            ├── AutoPresensi.jsx
            ├── PresensiLogs.jsx
            ├── Tunkin.jsx
            ├── Identity.jsx
            ├── Profile.jsx
            └── admin/        # Admin-only pages
                ├── AdminUsers.jsx
                ├── AdminMenus.jsx
                ├── AdminActivity.jsx
                └── AdminAutoPresensi.jsx
```

## Setup

### 1. Database (Supabase)

1. Buat project gratis di [supabase.com](https://supabase.com)
2. Buka SQL Editor di dashboard Supabase
3. Jalankan `database/migrations/001_initial.sql`
4. Jalankan `database/migrations/002_rls.sql`
5. Catat: **Project URL** dan **service_role key** (Settings → API)

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env:
#   SUPABASE_URL=https://xxx.supabase.co
#   SUPABASE_SERVICE_KEY=eyJhbG...
#   JWT_SECRET=generate-random-32+chars
#   ENCRYPTION_KEY=generate-random-64-hex-chars
#   SCHEDULER_ENABLED=true

npm install
npm start
```

Server berjalan di `http://localhost:3001`

**Default admin login:**
- Email: `admin@star-asn.local`
- Password: `admin123`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di `http://localhost:5173` (auto-proxy ke backend)

## Fitur

### Admin
- ✅ Login admin
- ✅ CRUD users (create, edit, delete, activate/deactivate)
- ✅ CRUD menus/fitur (create, edit, delete, activate/deactivate)
- ✅ Atur hak akses menu per user
- ✅ Tentukan menu yang muncul di dashboard tiap user
- ✅ Lihat aktivitas semua user
- ✅ Dashboard admin lengkap (stats: total user, menu, auto-presensi aktif)
- ✅ Pantau semua auto-presensi settings

### User
- ✅ Registrasi (atau dibuat oleh admin)
- ✅ Login
- ✅ Hanya akses menu yang diberikan admin
- ✅ Endpoint protection (403 jika tidak ada akses)
- ✅ Kelola data sendiri (kredensial STAR ASN, presensi, auto-presensi)

### Auto Presensi
- ✅ Set jam masuk/keluar per user
- ✅ Set hari kerja
- ✅ Set lokasi GPS kantor
- ✅ Force mode (IPv4, TLS bypass, HTTP/1.1)
- ✅ Cron scheduler berjalan setiap menit
- ✅ Log semua eksekusi (success/failed/skipped)
- ✅ Auto re-login jika session expired

### STAR ASN Integration
- ✅ Simpan kredensial STAR ASN (encrypted AES-256)
- ✅ Presensi manual (masuk/keluar)
- ✅ Cek status presensi
- ✅ Lihat identitas pegawai
- ✅ Cek tunjangan kinerja per periode

## API Endpoints

### Auth
| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/api/auth/register` | Registrasi user baru |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Info user current |
| POST | `/api/auth/change-password` | Ubah password |

### Users (admin only)
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/users` | List semua user |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| POST | `/api/users/:id/toggle` | Activate/deactivate |

### Menus
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/menus/my` | Menu user current |
| GET | `/api/admin/menus` | List semua menu (admin) |
| POST | `/api/admin/menus` | Create menu (admin) |
| PUT | `/api/admin/menus/:id` | Update menu (admin) |
| DELETE | `/api/admin/menus/:id` | Delete menu (admin) |
| POST | `/api/admin/menus/:id/toggle` | Toggle menu (admin) |
| PUT | `/api/admin/menus/users/:id/menus` | Assign menus ke user (admin) |

### STAR ASN
| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/api/star-asn/credentials` | Simpan kredensial STAR ASN |
| GET | `/api/star-asn/credentials` | Cek kredensial |
| POST | `/api/star-asn/login` | Test login STAR ASN |
| GET | `/api/star-asn/identity` | Get identitas |
| POST | `/api/star-asn/presensi` | Do presensi |
| GET | `/api/star-asn/presensi-status` | Cek status |
| GET | `/api/star-asn/tunjangan` | Cek tunjangan |

### Presensi Settings
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/presensi-settings` | Get settings |
| PUT | `/api/presensi-settings` | Update settings |
| GET | `/api/presensi-settings/logs` | Log presensi |
| GET | `/api/presensi-settings/all` | All users (admin) |

### Dashboard & Activity
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/dashboard` | Dashboard stats |
| GET | `/api/activity` | Activity logs |

## Deploy

### Backend (Render/Railway/Fly.io)
1. Push repo ke GitHub
2. Connect ke platform
3. Set env vars
4. Build command: `npm install`
5. Start command: `npm start`

### Frontend (Vercel/Netlify)
1. Push repo ke GitHub
2. Connect ke platform
3. Build command: `npm run build`
4. Output dir: `dist`
5. Set `VITE_API_BASE` = URL backend production

## Tech Stack
- **DB**: Supabase (PostgreSQL) — free tier 500MB
- **Backend**: Node.js + Express + JWT + node-cron
- **Frontend**: React 19 + Vite + TailwindCSS v4
- **Icons**: lucide-react
- **Auth**: bcryptjs + JWT
- **Encryption**: AES-256-CBC
