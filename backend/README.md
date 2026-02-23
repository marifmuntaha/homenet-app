# Homenet Backend

Backend AdonisJS untuk aplikasi Homenet ISP.

## Cara Menjalankan

```bash
# Development
node ace serve --hmr

# Queue Worker (wajib dijalankan terpisah)
node ace queue:work
```

---

## Perintah Ace

| Perintah | Deskripsi |
|---|---|
| `node ace invoices:auto-generate` | Generate tagihan otomatis untuk pelanggan yang anniversary-nya 3 hari lagi |
| `node ace invoices:check-isolation` | Cek invoice jatuh tempo di hari anniversary, isolir pelanggan yang belum bayar |
| `node ace invoices:generate --month=YYYY-MM` | Generate tagihan manual untuk semua pelanggan di bulan tertentu |
| `node ace queue:work` | Jalankan background queue (WhatsApp, dll) |

---

## Cron Job (Jadwal Harian)

Tambahkan ke crontab server dengan `crontab -e`:

```
# Generate tagihan otomatis 3 hari sebelum anniversary (setiap jam 00:05)
5 0 * * * cd /home/kangKoding/projects/homenet-app/backend && node ace invoices:auto-generate >> /var/log/homenet-generate.log 2>&1

# Cek & isolir pelanggan yang belum bayar di hari anniversary (setiap jam 00:10)
10 0 * * * cd /home/kangKoding/projects/homenet-app/backend && node ace invoices:check-isolation >> /var/log/homenet-isolation.log 2>&1
```

> **Catatan**: Pastikan profil PPPoE bernama `isolir` sudah dibuat di semua perangkat Mikrotik sebelum mengaktifkan cron `check-isolation`.

### Alur Otomasi Billing

```
Hari H-3 (00:05) → invoices:auto-generate
  ↳ Generate invoice
  ↳ Generate Midtrans payment link
  ↳ Kirim notifikasi WhatsApp ke pelanggan

Hari H (00:10) → invoices:check-isolation
  ↳ Jika invoice BELUM DIBAYAR → ubah profil PPPoE ke "isolir" + kick koneksi aktif
  ↳ Jika sudah dibayar → skip

Saat Invoice Dibayar (otomatis, tidak perlu cron):
  ↳ Profil PPPoE dikembalikan ke paket langganan
  ↳ Koneksi aktif di-kick agar reconnect dengan profil benar
```

---

## API Endpoint Utama

### Billing Manual
| Method | Path | Deskripsi |
|---|---|---|
| `POST` | `/api/v1/invoices/bulk-generate` | Generate tagihan masal (body: `{ month: "YYYY-MM" }`) |
| `POST` | `/api/v1/customers/:id/generate-invoice` | Generate tagihan per pelanggan |

### Webhook Midtrans
| Method | Path |
|---|---|
| `POST` | `/api/v1/callback/midtrans` |

---

## Environment Variables

```env
PORT=3333
HOST=0.0.0.0
APP_KEY=...

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_DATABASE=homenet

MIDTRANS_SERVER_KEY=SB-Mid-server-...
MIDTRANS_CLIENT_KEY=SB-Mid-client-...

WHATSAPP_API_URL=http://...
WHATSAPP_USERNAME=...
WHATSAPP_PASSWORD=...
```
