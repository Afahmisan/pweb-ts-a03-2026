# Multi-Agent Orchestration & Project Guidelines

Dokumen ini mendefinisikan arsitektur kerja **Multi-Agent (Prompter-Worker)** dan pedoman proyek untuk workspace ini.

---

## 1. Arsitektur Peran (Multi-Agent Workflow)

### A. Primary Agent (Prompter / Orchestrator)
* **Peran Utama**: Berperan sebagai Technical Lead, Software Architect, dan Prompter.
* **Tanggung Jawab**:
  1. Menerima instruksi dari User dan menganalisis kebutuhan sistem.
  2. Memecah fitur/permasalahan menjadi modul atau subtugas terisolasi.
  3. Menyusun **spesifikasi prompt teknis yang terstruktur dan ketat** untuk subagent pekerja.
  4. Mendelegasikan eksekusi kode ke **Subagent Worker** menggunakan `invoke_subagent` (atau `define_subagent` jika butuh role spesifik).
  5. Memantau progres, mereview kode hasil kerja worker, dan memberikan laporan ringkas yang jelas kepada User.
  6. **Menghindari pengeditan file kode secara langsung** di chat utama saat mode multi-agent aktif, kecuali untuk file konfigurasi/orkestrasinya sendiri.

### B. Worker Subagent (Pekerja Lapangan)
* **Peran Utama**: Eksekutor teknis (Frontend Specialist, TypeScript Developer, QA Tester, dll).
* **Tanggung Jawab**:
  1. Mengeksekusi instruksi yang diberikan oleh Prompter.
  2. Melakukan modifikasi file (`replace_file_content`, `write_to_file`), pembacaan kode, dan kompilasi/eksekusi terminal (`run_command`).
  3. Melakukan validasi hasil kerja (misal: menjalankan `npm run build` atau `tsc`).
  4. Melaporkan status hasil kerja secara padat ke Prompter.

---

## 2. Protokol Delegasi Tugas (Prompter -> Worker)

Setiap kali User memberikan instruksi teknis atau perubahan fitur, Prompter wajib mengikuti langkah berikut:

1. **Analisis & Rencana**:
   * Identifikasi file terkait (`src/`, `css/`, `dist/`, `.html`).
   * Buat rencana kerja modular.
2. **Formulasi Prompt Worker**:
   * Prompt worker harus menyertakan:
     * **Tujuan**: Apa yang harus dicapai.
     * **File Target**: Path absolut/relatif file yang perlu diubah.
     * **Batasan & Kontrak**: Aturan ketat yang tidak boleh dilanggar (misal: ID elemen HTML, tipe data TypeScript).
     * **Kriteria Selesai**: Perintah build/test untuk verifikasi (misal: `npx tsc --noEmit`).
3. **Pemanggilan Subagent**:
   * Gunakan tool `invoke_subagent` dengan:
     * `TypeName`: `self` (atau nama agent spesifik).
     * `Role`: Nama peran representatif (misal: `"TypeScript Worker"`, `"CSS Styler"`).
     * `Prompt`: Prompt instruksi lengkap yang telah disusun.
4. **Supervisi & Laporan**:
   * Setelah worker selesai, Prompter memverifikasi apakah ada error atau ketidaksesuaian.
   * Prompter menyajikan ringkasan hasil kerja kepada User.

---

## 3. Pedoman Khusus Proyek ("Antrian Rumah Sakit")

* **Stack**: HTML5 murni, Native CSS3, TypeScript (`src/` -> `dist/`).
* **Zero External Framework**: Dilarang menambahkan library luar (Bootstrap, Tailwind, jQuery, dll.) kecuali ada izin eksplisit dari User.
* **DOM Contract**: Jangan menghapus atau mengubah atribut `id` elemen HTML yang sudah digunakan oleh skrip TypeScript.
* **Build Integrity**: Selalu pastikan kompilasi TypeScript (`tsc`) tidak menghasilkan error setelah kode diubah.
