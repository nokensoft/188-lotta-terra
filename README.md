# Lotta Terra
Aplikasi web Lotta Terra dengan dua area utama:
- **Landing page visitor** (branding, katalog pilihan, sosial media, kontak).
- **Dashboard admin** untuk manajemen produk dan kategori.

## Teknologi
- **Frontend:** Vue 3 + Vue Router + Vite
- **Backend API:** Node.js + Express 5
- **Database:** SQLite (`data/crud.sqlite`)
- **Utilities:** `cors`, `concurrently`

## Perkembangan terbaru
- Landing page sudah ditingkatkan dengan:
  - tagline brand
  - navigasi utama aktif + menu Instagram
  - section penuh: Beranda, Tentang, Katalog, Instagram, Kontak
  - efek parallax antar section
  - katalog pilihan dinamis dari API produk aktif
  - tombol CTA dengan ikon
  - tombol mengambang icon-only (WhatsApp, Instagram, Back to Top)
  - layout mobile lebih rapi (navigasi tetap tampil, teks konten center)
  - footer + powered by
  - embed peta Papua di section kontak
- SEO ditingkatkan:
  - meta description, keywords, robots, Open Graph, Twitter Card
  - structured data (JSON-LD `ClothingStore`)
  - `robots.txt` dan `sitemap.xml`
  - gambar SEO utama: `./images/lotta-terra-ig-mockup.png`

## Akun admin default
- Username: `admin`
- Password: `admin123`

## Menjalankan di lokal (development)
1. Install dependency:
   `npm install`
2. Jalankan frontend + backend:
   `npm run dev`
3. Akses:
   - Landing page: `http://localhost:5173/`
   - Dashboard admin: `http://localhost:5173/nokenpanel/dashboard`

## Setup di komputer lain (termasuk Git commands)
1. Clone repository:
   `git clone <URL_REPOSITORY_GIT> 037-lotta-terra`
2. Masuk ke project:
   `cd 037-lotta-terra`
3. Pindah ke branch utama:
   `git checkout main`
4. Ambil update terbaru:
   `git pull origin main`
5. Install dependency:
   `npm install`
6. Jalankan mode development:
   `npm run dev`

Untuk update berikutnya di komputer tersebut:
- `git checkout main`
- `git pull origin main`
- `npm install` (jika ada perubahan dependency)
- `npm run dev`

## Build & jalankan production
### 1) Build frontend
`npm run build`
### 2) Jalankan server production (API + frontend)
`PORT=3000 npm start`
Server Express akan otomatis:
- melayani API di path `/api/*`
- melayani frontend hasil build dari folder `dist`
- fallback SPA untuk route Vue Router (contoh `/nokenpanel/dashboard`)
- health check di `/healthz`
### 3) Akses aplikasi
- App + API: `http://localhost:3000`

## Deploy production di server baru (ringkas)
1. Install Node.js LTS.
2. Clone project:
   - `git clone <URL_REPOSITORY_GIT> 037-lotta-terra`
   - `cd 037-lotta-terra`
   - `git checkout main && git pull origin main`
3. Install dependency:
   - `npm ci`
4. Build frontend:
   - `npm run build`
5. Jalankan server (disarankan pakai process manager, contoh PM2):
   - `npm install -g pm2`
   - `pm2 start server.js --name lotta-terra-api`
   - `pm2 save`
6. Gunakan Nginx/Caddy sebagai reverse proxy ke Node (`localhost:3000`) jika memakai domain production.

## Lokasi file penting
- Frontend visitor: `src/views/VisitorView.vue`
- Styling utama: `src/style.css`
- Router: `src/router/index.js`
- Backend API: `server.js`
- Database SQLite: `data/crud.sqlite`
- SEO static files: `public/robots.txt`, `public/sitemap.xml`
