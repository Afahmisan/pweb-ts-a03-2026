Bertindaklah sebagai Senior Front-End UI/UX Engineer & Native Web Specialist.

Tugasmu adalah merombak total tampilan visual proyek "Antrian Rumah Sakit" agar terlihat seperti sistem antarmuka medis enterprise (clinical-grade, minimalis Nordik, bebas dari estetika generic 'AI slop'), dengan tetap mempertahankan 100% fungsionalitas TypeScript yang sudah berjalan.

KETENTUAN UTAMA & ATURAN KETAT:
1. STRICT ZERO-DEPENDENCY & ZERO-FRAMEWORK:
   - Dilarang menambahkan Tailwind, Bootstrap, CDN font berat, atau pustaka eksternal apa pun.
   - Gunakan murni CSS3 (CSS Variables, Flexbox, CSS Grid, media query responsif, konvensi BEM).
2. PRESERVE DOM IDS & SCRIPT CONTRACT:
   - JANGAN mengubah atau menghapus satu pun atribut `id` pada form, tombol, input, container tabel, badge, atau elemen interaktif di seluruh file HTML (misal: `#btnLogin`, `#formLogin`, `#activeTicketCard`, `#btnCallNext`, `#deskSelect`, `#queueTable`, dll.).
   - Pastikan atribut `defer` atau `type="module"` pada skrip `<script src="dist/..." defer></script>` tetap utuh agar build TypeScript di `dist/` tetap berfungsi normal.
3. MEDICAL DESIGN SYSTEM SPECIFICATION:
   - Terapkan design token di `:root` pada `css/style.css`:
     * Background neutral: #F8FAFC (slate-50) & #F1F5F9 (slate-100)
     * Surface & Cards: #FFFFFF dengan border crisp 1px #E2E8F0 (slate-200) dan subtle shadow (0 1px 3px rgba(0,0,0,0.05))
     * Brand Medical Primary: Deep Trust Blue (#0F52BA atau #0284C7)
     * Accent & Triage Tags: 
       - VIP: Royal Indigo (#4F46E5 / soft background #EEF2FF)
       - Disabilitas: Amber / Gold (#D97706 / soft background #FEF3C7)
       - Lansia: Orange (#EA580C / soft background #FFEDD5)
       - Normal: Slate (#475569 / soft background #F1F5F9)
     * Status Badges: Emerald Green (#059669) untuk Dipanggil/Aktif, Rose (#E11D48) untuk Batal/Lewat
   - Tipografi: font-family system-ui modern (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif), hirarki optical tajam, tracking rapi, tabular numbers untuk nomor tiket.
   - Tombol: state hover/active taktil yang jelas, transisi 0.15s ease, focus-visible outline accessible.

INSTRUKSI EKSEKUSI:
1. Perbarui `css/style.css` secara menyeluruh dengan struktur modular (Reset, Variables, Base, Components: Navbar, Cards, Buttons, Badges, Table, Kiosk UI, Big Display Screen, Utilities).
2. Sesuaikan markup container/class pembungkus pada kelima file HTML:
   - `login.html`: Card medis minimalis terpusat, input field rapi, quick-role selector chips yang proporsional.
   - `index.html`: Layout 2 kolom grid (CRUD Jenis Layanan di kiri, Form Tiket Manual di kanan), status toggle pill, table list bersih.
   - `operator.html`: Cockpit view 2 panel (Card besar tiket aktif + kontrol tombol aksi di kiri, daftar antrean prioritas di kanan).
   - `layar.html`: Layout monitor TV kontras tinggi, banner hero nomor yang sedang dipanggil (font ekstra besar, monospaced tracking), kartu counter loket, tombol fullscreen minimalis, jam digital.
   - `ambil-antrian.html`: Kiosk touch-friendly berukuran nyaman, kartu pilihan poli, selector prioritas kontras tinggi, preview tiket sebelum cetak.
3. Jalankan `tsc` untuk memverifikasi tidak ada kompilasi yang rusak dan periksa bahwa Live Server dapat langsung menjalankannya.