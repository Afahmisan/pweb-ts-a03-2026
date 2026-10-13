# Sistem Antrian Rumah Sakit (Hospital Queue System)

> **Tugas Praktikum Modul 3: Pemrograman Web 2026**  
> Proyek aplikasi web antrian rumah sakit yang dibangun murni secara native (*from scratch*) menggunakan **HTML5, Native CSS, dan TypeScript** tanpa framework atau pustaka eksternal.

🌐 **Live Production Deployment**: [https://antrian-rumah-sakit.vercel.app](https://antrian-rumah-sakit.vercel.app)

---

## 📋 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [5 Halaman Utama](#-5-halaman-utama)
3. [Akun Pengujian (Credentials Matrix)](#-akun-pengujian-credentials-matrix)
4. [Arsitektur & Standar Teknis](#-arsitektur--standar-teknis)
5. [Fitur Nilai Tambahan (Bonus)](#-fitur-nilai-tambahan-bonus)
6. [Panduan Menjalankan di Komputer Lokal](#-panduan-menjalankan-di-komputer-lokal)
7. [Struktur Direktori](#-struktur-direktori)

---

## 🌟 Fitur Utama

- **100% Native TypeScript & CSS**: Tidak menggunakan framework seperti React, Vue, jQuery, Bootstrap, atau Tailwind.
- **Autentikasi DummyJSON API**: Integrasi endpoint POST `https://dummyjson.com/auth/login` dengan pembagian hak akses (*Role-Based Access Control*).
- **Penjadwalan Antrian Berprioritas (*Priority Queue*)**:
  - `VIP` (Bobot 4) &rarr; `Disabilitas` (Bobot 3) &rarr; `Lansia` (Bobot 2) &rarr; `Normal` (Bobot 1).
  - Tiket dengan prioritas setara diproses secara **FIFO** (*First-In, First-Out*).
- **Persistensi Data Penuh (LocalStorage)**:
  - Sesi login (`hospital_session`)
  - Master layanan (`hospital_services`)
  - Tiket antrian (`hospital_tickets`)
  - Penghitung nomor antrian 3-digit (`hospital_counters`)
- **Sinkronisasi Real-Time Multi-Tab**: Menggunakan `BroadcastChannel`, `StorageEvent`, dan fallback polling berkala (2–3 detik) tanpa reload halaman.
- **Format Tiket Standar Rumah Sakit**: Format `Kode-3 Digit` (contoh: `A-001`, `B-012`).

---

## 🖥️ 5 Halaman Utama

| Halaman | Berkas | Akses | Deskripsi & Fungsi |
| :--- | :--- | :---: | :--- |
| **Login** | [`login.html`](login.html) | Publik | Formulir masuk petugas dengan animasi loading state, verifikasi DummyJSON, visual error alert, dan auto-redirect sesuai role. |
| **Kiosk Pasien** | [`ambil-antrian.html`](ambil-antrian.html) | Publik | Layanan mandiri pengunjung untuk memilih poliklinik dan kategori prioritas, dengan modal cetak struk virtual (`window.print()`). |
| **Layar Monitor** | [`layar.html`](layar.html) | Publik | Monitor display TV ruang tunggu, menampilkan nomor yang sedang dipanggil per loket, jumlah antrian tersisa, dan tombol Fullscreen. |
| **Panel Operator** | [`operator.html`](operator.html) | Petugas | Panel kendali pemanggilan antrian: *Panggil Berikutnya*, *Lewati*, *Selesai*, dan *Panggil Ulang*. |
| **Dashboard Admin** | [`index.html`](index.html) | Admin / Mod | CRUD Master Layanan (validasi regex 1 huruf kapital `^[A-Z]$`, pencegahan duplikasi *case-insensitive*, toggle aktif/nonaktif, delete), Reset Antrian ke `001`, dan penerbitan tiket manual. |

---

## 🔐 Akun Pengujian (Credentials Matrix)

Berdasarkan referensi akun resmi DummyJSON:

| Username | Password | Role API | Hak Akses Sistem | Halaman Tujuan Pasca Login |
| :--- | :--- | :--- | :--- | :--- |
| **`emilys`** | `emilyspass` | `admin` | Administrator | `index.html` (Dashboard Admin) |
| **`oliviaw`** | `oliviawpass` | `moderator` | Disetarakan Admin | `index.html` (Dashboard Admin) |
| **`averyp`** | `averyppass` | `user` | Operator Loket | `operator.html` (Panel Operator) |
| **`michaelw`** | `michaelwpass` | `user` | Operator Loket | `operator.html` (Panel Operator) |

*Catatan: Halaman `layar.html` dan `ambil-antrian.html` bersifat publik dan dapat diakses langsung tanpa login.*

---

## 🏗️ Arsitektur & Standar Teknis

```
src/
├── types.ts      # Definisi interface TypeScript & konstanta bobot prioritas
├── storage.ts    # Manajemen LocalStorage, BroadcastChannel bus, & CRUD event
├── auth.ts       # Integrasi API DummyJSON, guardPage, & manajemen sesi
├── queue.ts      # Algoritma Priority Queue & transisi status tiket
├── audio.ts      # Web Speech API & Web Audio API synthesizer
├── login.ts      # Logika interaktif formulir login
├── admin.ts      # Logika interaktif Dashboard Admin & modal dialog
├── operator.ts   # Logika interaktif Panel Operator & pemanggilan
├── display.ts    # Logika monitor TV display & Fullscreen API
└── kiosk.ts      # Logika kiosk mandiri ambil antrian pasien
```

---

## 🔊 Fitur Nilai Tambahan (Bonus)

1. **Panggilan Suara Otomatis (Web Speech API)**: Pengumuman suara berbasis Bahasa Indonesia alami (*id-ID*), e.g., *"Nomor antrian A-001 silakan menuju loket UMUM-1"*.
2. **Synthesizer Chime Bel Rumah Sakit (Web Audio API)**: Suara bel 2-nada sintetis (*ding-dong*) sebelum pengumuman suara dimulai.
3. **Kontrol Suara Interaktif**: Tombol kontrol untuk mengaktifkan (*Suara Aktif*) atau mematikan (*Bisu*) audio pada layar monitor.
4. **JavaScript Fullscreen API**: Tombol toggle mode Layar Penuh pada `layar.html` untuk tampilan optimal pada Smart TV / monitor dinding.
5. **Aksesibilitas Pasien**: Kartu monitor berkedip visual (*flashing pulse*) saat nomor dipanggil guna memudahkan pasien disabilitas rungu.

---

## 🚀 Panduan Menjalankan di Komputer Lokal

### 1. Prasyarat
- [Node.js](https://nodejs.org/) (versi 18 atau lebih baru).

### 2. Pemasangan & Kompilasi
```bash
# Clone repository
git clone https://github.com/Afahmisan/pweb-ts-a03-2026.git
cd pweb-ts-a03-2026

# Pasang dependensi compiler (TypeScript)
npm install

# Kompilasi TypeScript ke JavaScript (dist/)
npm run build
```

### 3. Menjalankan Server Lokal
```bash
# Jalankan server lokal bawaan
npm start
```
Buka peramban pada alamat: [http://localhost:3000](http://localhost:3000) (atau port yang tertera pada terminal).

*Catatan: Anda juga dapat membukanya langsung menggunakan ekstensi VS Code **Live Server**.*

---

## 📁 Struktur Direktori

```
.
├── css/
│   └── style.css            # Desain CSS native terpadu (Figma-accurate, WCAG compliant)
├── dist/                    # Berkas JavaScript hasil kompilasi TypeScript
├── figma/                   # Berkas referensi desain Figma UI/UX
├── src/                     # Berkas kode sumber TypeScript murni
├── .gitignore
├── .vercelignore
├── ambil-antrian.html       # Kiosk Mandiri Ambil Antrian
├── index.html               # Dashboard Admin
├── layar.html               # Layar Monitor Antrian Publik
├── login.html               # Halaman Login Petugas
├── operator.html            # Panel Operator Loket
├── package.json             # Konfigurasi npm scripts & TypeScript
├── README.md                # Dokumentasi proyek
├── server.mjs               # Server lokal statis berbasis Node.js native
├── tsconfig.json            # Konfigurasi kompilasi TypeScript
└── vercel.json              # Konfigurasi static hosting Vercel
```
