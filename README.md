# PKK Digital

[![EAS Update (OTA)](https://github.com/Skyfound212/laporpkk/actions/workflows/eas-update.yml/badge.svg)](https://github.com/Skyfound212/laporpkk/actions/workflows/eas-update.yml)

Aplikasi internal Android untuk anggota PKK — Kelurahan Warakas.

## Fitur

- **Auth**: Login, Aktivasi NIK, Setup Akun
- **Beranda**: Feed postingan, Stories, Quick Actions
- **Laporan**: Buat laporan dengan nomor dokumen otomatis
- **Chat**: Ruang Rumpi PKK, Chat Pribadi, Chat Admin
- **Agenda**: Jadwal kegiatan & rapat
- **Arsip Dokumen**: Upload & download dokumen PKK
- **Profile**: My Profile & Other Profile (Instagram-style)
- **Admin Dashboard**: Kelola anggota, data log, aduan, broadcast

## Teknologi

- Expo React Native
- NativeWind (Tailwind CSS)
- Supabase (Auth, Database, Realtime, Storage)
- Zustand (State Management)

## Setup

```bash
# Install dependencies
yarn install

# Setup environment
cp .env.example .env
# Edit .env dengan konfigurasi Supabase Anda

# Jalankan
npx expo start
```

## Supabase Setup

Jalankan migration SQL di Supabase SQL Editor (urut dari 001 sampai terakhir).

## Arsitektur

- **Frontend**: Expo Mobile → Supabase SDK langsung
- **Backend**: Supabase (Auth + DB + Realtime + Storage)
- **OTA Update**: EAS Update otomatis setiap push ke `main`
- **Max Users**: 20 anggota PKK

## Warna

- Primary: `#7ECDC0` (tosca)
- Primary Dark: `#5DB9AA`
- Primary Light: `#E8F6F3`

## Lisensi

Internal Use Only — PKK RW 212
