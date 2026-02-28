---
description: Cara melakukan build aplikasi Android menggunakan EAS CLI
---

# Panduan Build Android (Expo EAS)

Ikuti langkah-langkah di bawah ini untuk membangun (build) aplikasi Android Anda.

## 1. Persiapan
Pastikan Anda sudah menginstal EAS CLI secara global:
```bash
npm install -g eas-cli
```
Dan pastikan Anda sudah login ke akun Expo Anda:
```bash
eas login
```

## 2. Generate Credentials (Pertama Kali)
Jika ini adalah build pertama, jalankan perintah ini untuk mengonfigurasi proyek:
```bash
eas build:configure
```

## 3. Build APK (untuk Testing/Preview)
Untuk mendapatkan file APK yang bisa diinstal langsung di HP (tidak lewat Play Store):
```bash
eas build --platform android --profile preview
```
*Hasil build akan berupa file `.apk` yang bisa didownload dari dashboard Expo setelah selesai.*

## 4. Build AAB (untuk Play Store)
Untuk mendapatkan file Android App Bundle (.aab) yang siap diupload ke Google Play Store:
```bash
eas build --platform android --profile production
```

## 5. Build Lokal (Opsional)
Jika Anda ingin melakukan build di komputer sendiri (memerlukan Android SDK & Java JDK yang terpasang):
```bash
eas build --platform android --profile preview --local
```

> [!TIP]
> Periksa status build Anda kapan saja di [Expo Dashboard](https://expo.dev/dashboard).
