# PKK Digital — Pre-Launch Checklist

## ✅ Fitur Utama (30 Screen)

### Auth
- [ ] Login dengan NIK & Password
- [ ] Aktivasi NIK (cek database)
- [ ] Setup akun baru (password, profil)
- [ ] Logout & session management
- [ ] Auto-redirect ke login jika token expired

### Beranda
- [ ] Feed postingan terbaru
- [ ] Stories (avatar anggota)
- [ ] Quick Actions (Laporan, Jadwal, Chat Admin)
- [ ] FAB Postingan (Text, Foto, Template)
- [ ] Like post (tanpa comment/share)
- [ ] Navigasi ke Detail Post
- [ ] Navigasi ke Profile (tap avatar)

### Laporan
- [ ] List laporan (filter, search)
- [ ] Form laporan (8 field, validation)
- [ ] Preview sebelum kirim
- [ ] Detail laporan
- [ ] Export PDF (sesuai template aktif)
- [ ] Nomor dokumen auto: PKK/YYYY/ROMAN/NNN
- [ ] Hapus laporan (owner only)

### Chat
- [ ] Chat List (Ruang Rumpi di atas, private di bawah)
- [ ] Room Chat (real-time, query param)
- [ ] Chat Admin (room_id = 'admin-pkk')
- [ ] Long-press hapus chat pribadi
- [ ] Push notification saat pesan baru
- [ ] Auto-scroll ke bawah

### Agenda
- [ ] List agenda (filter: Semua/Akan Datang/Berlangsung/Selesai)
- [ ] Detail kegiatan
- [ ] Form agenda (datetime picker)
- [ ] Edit/Delete (owner only)
- [ ] Status badge (kuning/tosca/abu)
- [ ] Terlewat indicator (merah)

### Postingan
- [ ] Post Options (FAB menu)
- [ ] Text-Only Post
- [ ] Gallery Picker (max 5 foto)
- [ ] Image Caption + Upload Storage
- [ ] Create Post (full form + template)
- [ ] Detail Post (Like only)
- [ ] Navigasi ke Profile dari post

### Profile
- [ ] My Profile (stats, info, grid)
- [ ] Other Profile (view-only, chat button)
- [ ] Tab switcher (Posts / Laporan)
- [ ] Logout
- [ ] Pull-to-refresh

### Arsip Dokumen
- [ ] List dokumen (filter kategori)
- [ ] Upload file (PDF/Word/Image)
- [ ] Detail + Download
- [ ] Delete (uploader only)
- [ ] Storage bucket integration

### Admin Dashboard
- [ ] Statistik cards (user, laporan, agenda, arsip)
- [ ] CRUD Anggota (NIK, Nama, Jabatan)
- [ ] Data Log User (login/logout/CRUD)
- [ ] Aduan Anggota (real-time)
- [ ] Broadcast pesan ke semua anggota
- [ ] Template PDF (pilih & aktifkan)

## ✅ Teknis

### Performance
- [ ] Loading skeleton saat fetch data
- [ ] Image caching (expo-image)
- [ ] Memoization (useMemo, useCallback)
- [ ] FlatList untuk list panjang
- [ ] Debounce search input

### Error Handling
- [ ] Error Boundary (crash recovery)
- [ ] Network status banner (offline indicator)
- [ ] Toast notification (success/error/info)
- [ ] Retry mechanism saat gagal fetch
- [ ] Form validation dengan pesan jelas

### Security
- [ ] RLS enabled di semua tabel
- [ ] Input sanitization
- [ ] No hardcoded credentials
- [ ] .env untuk secrets
- [ ] Supabase Anon Key tidak di-commit

### UI/UX Polish
- [ ] Splash screen tosca #7ECDC0
- [ ] App icon & adaptive icon
- [ ] Animation: slide, fade, shimmer
- [ ] Empty state (icon + teks) semua screen
- [ ] Loading state (skeleton) semua list
- [ ] Consistent spacing & typography
- [ ] Touch feedback (opacity/scale)
- [ ] Keyboard avoiding view
- [ ] ScrollView untuk form panjang

### Accessibility
- [ ] Screen reader labels
- [ ] Sufficient color contrast
- [ ] Touch target min 44x44
- [ ] Font scaling support

## ✅ Environment

### Supabase
- [ ] 10 migrations dijalankan
- [ ] Storage buckets: documents, post-images
- [ ] RLS policies aktif
- [ ] Edge functions deploy (jika ada)
- [ ] Push tokens table

### Expo
- [ ] app.json konfigurasi lengkap
- [ ] Android permissions
- [ ] Notification channel
- [ ] Splash & icon assets
- [ ] Build configuration

### GitHub
- [ ] Repo private
- [ ] .gitignore lengkap
- [ ] README.md
- [ ] CHECKPOINT.md
- [ ] Semua file committed

## ✅ Testing

### Device Testing
- [ ] Android 10+ (primary)
- [ ] Tablet (responsive)
- [ ] Dark mode (jika support)
- [ ] Rotation (portrait only)
- [ ] Back button behavior
- [ ] Deep linking

### User Flow Testing
- [ ] Register → Login → Beranda (new user)
- [ ] Login → Laporan → Form → Preview → Detail → PDF
- [ ] Login → Chat → Kirim pesan → Notifikasi
- [ ] Login → Agenda → Buat → Edit → Hapus
- [ ] Login → Post → Text → Like → Detail
- [ ] Login → Profile → Edit → Logout
- [ ] Admin → Dashboard → CRUD User → Broadcast

### Edge Cases
- [ ] No internet connection
- [ ] Empty list (first time user)
- [ ] Very long text input
- [ ] Special characters in input
- [ ] Rapid button taps (debounce)
- [ ] Background → Foreground (state restore)
- [ ] Low memory (image cleanup)

## ✅ Pre-Launch

- [ ] No console.log di production
- [ ] No placeholder/dummy data
- [ ] No TODO/FIXME comments
- [ ] Bundle size check (< 50MB)
- [ ] EAS Build test
- [ ] Internal testing (5 user)
- [ ] Feedback collection
- [ ] Play Store Internal Testing (jika publish)

---

**Status:** 🟡 In Progress (Polish Phase)
**Target:** 20 Juli 2026
**Tester:** Internal PKK 212
