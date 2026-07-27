# STAR ASN Web App — Feature Roadmap v2

## 🎯 Requested Features

### 1. 🗺️ Map Location Picker (Manual + Auto)
**Status:** TODO
- Integrasi Leaflet.js + OpenStreetMap (gratis, no API key)
- Klik di map → auto-fill lat/lng
- Input manual lat/lng → marker move
- Search by address (Nominatim geocoding)
- Drag marker untuk adjust
- Preview radius lokasi kantor
- Dipakai di: Presensi, Auto Presensi, Saved Locations

### 2. ⚙️ Admin: Default Menu untuk User Baru
**Status:** TODO
- Setting global: menu apa saja yang aktif by default untuk user baru
- Saat admin create user → auto-assign default menus
- Configurable di admin panel (checkbox per menu)
- DB: table `system_settings` (key-value) atau column `is_default_for_new` di menus

### 3. ☑️ Bulk Select All User
**Status:** TODO
- Checkbox "Select All" di admin user list
- Bulk actions: assign menu, activate/deactivate, delete
- Bulk assign menu ke multiple users sekaligus
- Bulk toggle auto-presensi

### 4. 🎲 Random Range Presensi (Lebih Natural)
**Status:** TODO
- Input: `check_in_time` + `random_minutes` (e.g., 08:00 ± 15 menit)
- Scheduler jalan di random menit dalam range (07:45–08:15)
- `check_out_time` + `random_minutes` (16:00 ± 10 menit)
- Setiap hari random berbeda (tidak pola fixed)
- DB: add columns `check_in_random`, `check_out_random` (integer minutes)

### 5. 📍 Saved Locations (Primary + Random)
**Status:** TODO
- User simpan multiple lokasi (rumah, kantor, kantor cabang)
- Set primary location
- Auto-presensi bisa pilih: "primary only" atau "random from saved"
- Random mode: scheduler pilih random location dari saved list setiap hari
- DB: table `saved_locations` (id, user_id, name, lat, lng, is_primary)
- Auto-presensi setting: `location_mode` = 'primary' | 'random'

### 6. 🎨 UI Enhancement
**Status:** TODO
- Dark mode toggle
- Loading skeletons (bukan spinner saja)
- Toast notifications (bukan alert)
- Responsive table → card on mobile
- Better empty states dengan ilustrasi
- Progress indicators untuk presensi
- Search/filter di semua table

---

## 💡 Proposed Features (Usulan)

### 7. 📊 Analytics Dashboard
- Chart presensi 30 hari (bar chart)
- Success rate percentage
- Rata-rata jam masuk/keluar
- Total hari kerja vs absen
- Calendar view presensi (heatmap)

### 8. 🔔 Notification System
- Notif sebelum presensi (5 menit sebelum jam masuk)
- Notif setelah presensi berhasil/gagal
- Telegram bot integration
- DB: table `notifications`

### 9. 📅 Holiday Calendar
- Import hari libur nasional (API BPS / manual)
- Auto-skip presensi di hari libur
- Admin bisa tambah hari libur custom
- DB: table `holidays`

### 10. 👥 Multi-Account STAR ASN
- 1 user bisa simpan multiple STAR ASN accounts
- Switch antar account
- Auto-presensi per account
- DB: `star_credentials` ubah ke支持 multiple (drop unique user_id)

### 11. 🛡️ Session Management
- Lihat active sessions (device, IP, last active)
- Force logout session lain
- Auto-extend session jika aktif
- DB: table `sessions`

### 13. 🔄 Backup & Restore
- Export semua data user (JSON)
- Import data dari backup
- Admin: export semua user data

### 14. 📈 Presensi History Calendar
- Calendar view dengan color coding
- Hijau = masuk + keluar
- Kuning = hanya masuk
- Merah = absen
- Bisa klik tanggal → detail

### 15. 🌐 Multi-Language (i18n)
- Bahasa Indonesia / English
- Language switcher di profil

---

## 🎨 UI Enhancement Details

### Visual
- Dark mode (system preference + manual toggle)
- Gradient accent colors
- Glassmorphism cards
- Smooth transitions & micro-interactions
- Icon animations (presensi success → checkmark animation)

### UX
- Toast notifications (sonner / react-hot-toast)
- Confirmation dialogs (bukan confirm() browser)
- Loading skeletons
- Infinite scroll atau pagination yang smooth
- Keyboard shortcuts (Ctrl+K = search, etc.)
- Form validation real-time
- Error boundaries dengan friendly fallback

### Mobile
- Bottom navigation bar (mobile)
- Swipe gestures
- Pull to refresh
- Responsive tables → cards
- Touch-friendly buttons (min 44px)

---

## 📋 Implementation Priority

| Phase | Feature | Est. Effort |
|-------|---------|-------------|
| **1** | Map Location Picker (#1) | Medium |
| **1** | Saved Locations (#5) | Medium |
| **1** | Random Range Presensi (#4) | Small |
| **2** | Default Menu User Baru (#2) | Small |
| **2** | Bulk Select All (#3) | Medium |
| **2** | UI Enhancement (#6) | Medium |
| **3** | Holiday Calendar (#9) | Small |
| **3** | Analytics Dashboard (#7) | Medium |
| **3** | Notification System (#8) | Medium |
| **4** | Multi-Account (#10) | Medium |
| **4** | Session Management (#11) | Medium |
