# Homenet App — Docker Deployment Guide

Repository ini berisi konfigurasi Docker lengkap untuk menjalankan **Homenet App** (Backend AdonisJS, Frontend React Vite, MySQL, Queue Worker, dan Scheduler).

## 🚀 Fitur Deployment
- **Multi-container Orchestration**: App, DB, Worker, Scheduler, dan Frontend berjalan harmonis.
- **Timezone Synchronized**: Seluruh sistem berjalan pada zona waktu **Asia/Jakarta (GMT+7)**.
- **Automatic Billing**: Scheduler otomatis menjalankan pembuatan tagihan dan isolasi pelanggan setiap hari.
- **Background Jobs**: Worker siap memproses notifikasi WhatsApp tanpa menggangu API utama.
- **Production Ready**: Menggunakan multi-stage build untuk image yang ringan dan aman.

---

## 📋 Prasyarat
Pastikan Anda sudah menginstal:
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

---

## ⚙️ Konfigurasi Environment
Salin file `.env.example` (jika ada) atau buat file `.env` di direktori root (sejajar dengan `docker-compose.yml`) dengan isi minimal berikut:

```env
# Database
DB_PASSWORD=root_password_anda
DB_DATABASE=homenet

# App Key (Generate menggunakan node ace generate:key)
APP_KEY=NLq0-5bnoFfb88NbNEl0mEysw2GV99Iv

# WhatsApp Gateway
WHATSAPP_API_URL=https://gowa.own-server.web.id
WHATSAPP_USERNAME=username_anda
WHATSAPP_PASSWORD=password_anda

# Midtrans
MIDTRANS_SERVER_KEY=SB-Mid-server-xxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxx
MIDTRANS_IS_PRODUCTION=false
```

---

## 🛠️ Cara Menjalankan

### 1. Build dan Jalankan Container
Jalankan perintah ini di direktori root:
```bash
docker compose up --build -d
```
Ekstensi `-d` menjalankan container di background (*detached mode*).

### 2. Inisialisasi Database (Otomatis)
Sistem telah dikonfigurasi untuk menjalankan **migrasi database** dan **seeder** secara otomatis saat container `homenet-backend` pertama kali dijalankan. Anda tidak perlu menjalankan perintah manual lagi.

Jika Anda ingin menjalankan migrasi ulang secara manual dikemudian hari:
```bash
docker exec -it homenet-backend node build/bin/console.js migration:run --force
```

---

## 🖥️ Akses Aplikasi
- **Frontend (Web App)**: [http://localhost:3021](http://localhost:3021)
- **Backend API**: [http://localhost:3011](http://localhost:3011)

---

## ⛓️ Layanan Background

### WhatsApp Worker
Service `homenet-worker` akan berjalan otomatis untuk memproses antrean pesan WhatsApp. Anda bisa memantau log-nya dengan:
```bash
docker logs -f homenet-worker
```

### Scheduler (Cron Job)
Service `homenet-scheduler` menjalankan tugas otomatis setiap hari:
- **01:00 AM**: Pembuatan tagihan bulanan pelanggan (`invoices:auto-generate`).
- **01:30 AM**: Cek tunggakan dan isolasi otomatis di Mikrotik (`invoices:check-isolation`).

Log scheduler dapat dilihat di:
```bash
docker exec homenet-scheduler cat /var/log/cron.log
```

---

## 🕒 Pengaturan Waktu
Sistem telah disetel ke **Asia/Jakarta**. Jika Anda ingin mengubahnya, perbarui variabel `TZ` di `docker-compose.yml` dan `backend/Dockerfile`.

---

## 🧹 Maintenance
- **Menghentikan Container**: `docker compose down`
- **Melihat Log Seluruh System**: `docker compose logs -f`
- **Update Kode**: `git pull` lalu jalankan kembali `docker compose up --build -d`

---

## 📦 Building & Portable Deployment (Tanpa Source Code)

Jika Anda ingin membuild image di PC lokal lalu mengirimnya ke server (tanpa perlu mengupload source code ke server), ikuti langkah berikut:

### 1. Build Image di Lokal
Gunakan Docker Compose untuk membuild semua image:
```bash
docker compose build
```

### 2. Export Image ke File (.tar)
Gunakan perintah `docker save` untuk mengekspor image menjadi file:
```bash
# Export Backend (digunakan juga oleh worker & scheduler)
docker save homenet-app-backend > homenet-backend.tar

# Export Frontend
docker save homenet-app-frontend > homenet-frontend.tar
```

### 3. Upload dan Load di Server
Upload file `.tar` ke server, lalu jalankan perintah load:
```bash
docker load < homenet-backend.tar
docker load < homenet-frontend.tar
```

### 4. Jalankan di Server
Di server, Anda tetap membutuhkan file `docker-compose.yml` (tanpa folder source code). Ubah bagian `build:` menjadi `image:` yang sesuai, lalu jalankan:
```bash
docker compose up -d
```

> [!TIP]
> Cara paling profesional adalah menggunakan **Docker Registry** (seperti Docker Hub). Anda tinggal `docker push` dari lokal dan `docker pull` di server.
