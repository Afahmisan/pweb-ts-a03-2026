/**
 * ==============================================================================
 * SISTEM ANTREAN RUMAH SAKIT TERPADU (SIMRS MEDIKA UTAMA)
 * Automated Smoke Test & End-to-End Verification Suite
 * ==============================================================================
 * 
 * Verifikasi menyeluruh terhadap:
 * 1. TypeScript Compilation (npm run build -> exit code 0)
 * 2. Framework & Purity Audit (Zero External Framework CDN)
 * 3. DOM ID Contract Integrity (Semua elemen terikat script pada 5 file HTML)
 * 4. Google Stitch Design Tokens & Responsive Layout Rules
 * 5. Priority Queue Engine & FIFO Ordering Invariants
 * 6. Queue State Lifecycle & Reset Mechanics (clearAllTickets -> reset to 001)
 * 7. Authentication Guards & Role Mapping Matrix (Moderator === Admin parity)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

let totalSuites = 0;
let passedSuites = 0;
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function suite(name, fn) {
  totalSuites++;
  console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}► SUITE ${totalSuites}: ${name}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  try {
    fn();
    passedSuites++;
  } catch (err) {
    console.error(`${colors.red}SUITE FAILED:${colors.reset}`, err.message);
  }
}

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ${colors.green}✔ PASS:${colors.reset} ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ${colors.red}✖ FAIL:${colors.reset} ${name}`);
    console.error(`    ${colors.red}Reason: ${err.message}${colors.reset}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected [${expected}], got [${actual}]`);
  }
}

// Global browser environment mock for Node.js testing of dist/ modules
const storageStore = new Map();
globalThis.localStorage = {
  getItem: (key) => (storageStore.has(key) ? storageStore.get(key) : null),
  setItem: (key, val) => storageStore.set(key, String(val)),
  removeItem: (key) => storageStore.delete(key),
  clear: () => storageStore.clear(),
  get length() { return storageStore.size; }
};

let lastRedirectUrl = '';
globalThis.window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
  location: {
    href: '',
    replace: (url) => { lastRedirectUrl = url; }
  },
  speechSynthesis: {
    speaking: false,
    pending: false,
    paused: false,
    getVoices: () => [
      { lang: 'id-ID', name: 'Indonesian' },
      { lang: 'en-US', name: 'English' }
    ],
    cancel: () => {},
    speak: () => {},
    resume: () => {}
  }
};
globalThis.SpeechSynthesisUtterance = class SpeechSynthesisUtterance {
  constructor(text) {
    this.text = text;
    this.lang = '';
    this.rate = 1;
    this.pitch = 1;
    this.voice = null;
  }
};
globalThis.CustomEvent = class CustomEvent { constructor(name, opt) { this.detail = opt?.detail; } };
globalThis.Event = class Event { constructor(name) {} };
globalThis.StorageEvent = class StorageEvent { constructor(name, opt) {} };

// Import compiled production modules
const { QueueService } = await import('./dist/services/queue.js');
const { StorageService, getCounterForService } = await import('./dist/services/storage.js');
const { AuthService } = await import('./dist/services/auth.js');
const { ExportService } = await import('./dist/services/export.js');
const { SpeechService } = await import('./dist/services/speech.js');
const { getPriorityOrder, normalizePriority } = await import('./dist/models/types.js');

console.log(`${colors.bright}${colors.magenta}=========================================================================${colors.reset}`);
console.log(`${colors.bright}${colors.magenta}  SIMRS MEDIKA UTAMA - AUTOMATED E2E & SMOKE TEST VERIFICATION SUITE      ${colors.reset}`);
console.log(`${colors.bright}${colors.magenta}=========================================================================${colors.reset}`);

// ============================================================================
// SUITE 1: TypeScript Build & Compilation
// ============================================================================
suite('TypeScript Compilation & Build Integrity', () => {
  test('Eksekusi "npm run build" (tsc) wajib exit code 0 tanpa compiler error', () => {
    try {
      const output = execSync('npm run build', { cwd: __dirname, encoding: 'utf8' });
      assert(!output.toLowerCase().includes('error ts'), 'TypeScript compiler melaporkan error');
    } catch (err) {
      throw new Error(`Kompilasi TypeScript gagal: ${err.message}`);
    }
  });

  test('Distributable JS files wajib lengkap di folder dist/', () => {
    const requiredFiles = [
      'dist/models/types.js',
      'dist/services/auth.js',
      'dist/services/queue.js',
      'dist/services/speech.js',
      'dist/services/storage.js',
      'dist/services/export.js',
      'dist/pages/login.js',
      'dist/pages/index.js',
      'dist/pages/operator.js',
      'dist/pages/layar.js',
      'dist/pages/ambil-antrian.js'
    ];
    for (const f of requiredFiles) {
      const fullPath = path.join(__dirname, f);
      assert(fs.existsSync(fullPath), `File kompilasi [${f}] tidak ditemukan`);
      assert(fs.statSync(fullPath).size > 100, `File kompilasi [${f}] kosong atau corrupt`);
    }
  });
});

// ============================================================================
// SUITE 2: Framework & Purity Audit (Zero External Framework)
// ============================================================================
suite('Framework & Dependency Purity Audit (Zero External Framework)', () => {
  const htmlFiles = [
    'login.html',
    'index.html',
    'operator.html',
    'layar.html',
    'ambil-antrian.html'
  ];

  test('Semua 5 file HTML tidak memuat link/script framework eksternal luar (Bootstrap, Tailwind CDN, jQuery, unpkg, cdnjs)', () => {
    const forbiddenPatterns = [
      /bootstrap/i,
      /cdn\.tailwindcss\.com/i,
      /jquery/i,
      /cdn\.jsdelivr\.net/i,
      /cdnjs\.cloudflare\.com/i,
      /unpkg\.com/i
    ];

    for (const file of htmlFiles) {
      const filePath = path.join(__dirname, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Extract script tags & link rel="stylesheet"
      const linkMatches = content.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) || [];
      const scriptMatches = content.match(/<script[^>]*src=["'][^"']+["'][^>]*>/gi) || [];

      for (const link of linkMatches) {
        for (const pattern of forbiddenPatterns) {
          assert(!pattern.test(link), `File [${file}] melanggar aturan Zero External Framework: Ditemukan tag link [${link}]`);
        }
      }

      for (const script of scriptMatches) {
        for (const pattern of forbiddenPatterns) {
          assert(!pattern.test(script), `File [${file}] melanggar aturan Zero External Framework: Ditemukan tag script [${script}]`);
        }
      }
    }
  });

  test('Package.json tidak memiliki dependency framework frontend pihak ketiga (Zero Dependency runtime)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const deps = Object.keys(pkg.dependencies || {});
    assert(deps.length === 0, `package.json memuat runtime dependencies luar: ${deps.join(', ')}`);
  });
});

// ============================================================================
// SUITE 3: DOM ID Contract Verification
// ============================================================================
suite('DOM ID Contract Verification across all 5 HTML pages', () => {
  const domContracts = {
    'login.html': [
      'loginForm',
      'staffId',
      'password',
      'counterSelect',
      'submitButton',
      'btnText',
      'btnIcon',
      'loginErrorContainer',
      'loginErrorMessage',
      'togglePasswordBtn',
      'passwordEyeIcon',
      'btnDemoAdmin',
      'btnDemoOperator',
      'btnDemoSupervisor'
    ],
    'index.html': [
      'userFullName',
      'userRoleBadge',
      'userAvatar',
      'btnLogout',
      'headerDeskBadge',
      'metric-total-tickets',
      'metric-calling-tickets',
      'metric-waiting-tickets',
      'metric-active-services',
      'service-table-body',
      'searchServiceInput',
      'new-service-modal',
      'newServiceCode',
      'newServiceName',
      'manual-ticket-form',
      'service-select',
      'patient-rm-nik',
      'preview-ticket-code',
      'preview-service-name',
      'preview-priority-badge',
      'preview-mrn-val',
      'toast-notification',
      'toast-title',
      'toast-body',
      'btnOpenAddService',
      'btnOpenAddServiceBottom',
      'btnResetAllQueues',
      'btnResetAllQueuesBottom',
      'btnCloseNewServiceModal',
      'btnCancelNewService',
      'btnSaveNewService',
      'priority-selector',
      'btnManualSubmit',
      'btnExportCsv',
      'btnExportJson',
      'assistance-dispatch-section',
      'assistance-pending-badge',
      'assistance-table-body',
      'filter-assistance-all',
      'filter-assistance-pending',
      'filter-assistance-resolved'
    ],
    'operator.html': [
      'userFullName',
      'userRoleBadge',
      'userAvatar',
      'btnLogout',
      'headerDeskBadge',
      'operatorDeskName',
      'operatorServiceName',
      'operatorStaffName',
      'operatorStaffId',
      'operatorCounterSelect',
      'active-ticket-num',
      'active-priority-badge',
      'active-priority-icon',
      'active-priority-text',
      'active-desk-label',
      'active-patient-name',
      'active-patient-mrn',
      'call-timer',
      'active-call-count',
      'active-call-time',
      'btn-call-next',
      'btn-call-repeat',
      'btn-call-skip',
      'btn-call-complete',
      'btn-sound-test',
      'waiting-queue-count',
      'filter-all',
      'filter-priority',
      'filter-normal',
      'queue-table-body',
      'modal-transfer-patient',
      'btnCloseTransferModal',
      'transfer-patient-ticket',
      'transfer-patient-origin',
      'transfer-patient-priority',
      'transfer-target-service',
      'transfer-notes',
      'btnCancelTransfer',
      'btnConfirmTransfer'
    ],
    'layar.html': [
      'hero-ticket-num',
      'hero-priority-container',
      'hero-priority-icon',
      'hero-priority-badge',
      'hero-counter-num',
      'hero-service-title',
      'hero-audio-text',
      'hero-call-status',
      'counter-cards-grid',
      'btn-fullscreen',
      'live-clock',
      'live-date'
    ],
    'ambil-antrian.html': [
      'kiosk-services-grid',
      'kiosk-live-clock',
      'ticket-modal-backdrop',
      'modal-ticket-code',
      'modal-service-name',
      'modal-priority-text',
      'modal-wait-estimate',
      'modal-timestamp',
      'btnPrintAction',
      'kiosk-toast',
      'toast-icon',
      'toast-message',
      'lang-id',
      'lang-en',
      'btnCloseModalHeader',
      'btnCloseModalFooter',
      'btn-audio-guide',
      'btn-nurse-call',
      'priority-selector-group',
      'user-active-ticket-card',
      'user-active-status-badge',
      'user-active-ticket-number',
      'user-active-service-name',
      'user-active-priority-badge',
      'user-active-ahead-count',
      'btnDropUserTicket',
      'user-quota-warning-banner',
      'modal-patient-called',
      'patient-called-counter-text',
      'patient-called-ticket-text',
      'btnClosePatientCalledModal'
    ]
  };

  for (const [file, requiredIds] of Object.entries(domContracts)) {
    test(`Validasi kontrak ID pada [${file}] (${requiredIds.length} ID penting)`, () => {
      const filePath = path.join(__dirname, file);
      const content = fs.readFileSync(filePath, 'utf8');

      const missing = [];
      for (const id of requiredIds) {
        // Regex cek id="exactId" atau id='exactId'
        const regex = new RegExp(`id=["']${id}["']`, 'i');
        if (!regex.test(content)) {
          missing.push(id);
        }
      }

      assert(missing.length === 0, `File [${file}] kehilangan elemen ID: ${missing.join(', ')}`);
    });
  }
});

// ============================================================================
// SUITE 4: Google Stitch Design Tokens & Responsive Layout Rules
// ============================================================================
suite('Design Tokens & Responsive Layout Rules Verification', () => {
  const styleCss = fs.readFileSync(path.join(__dirname, 'css/style.css'), 'utf8');

  test('Token Design Stitch: Slate canvas, Crisp 1px border, Deep Trust Blue', () => {
    assert(styleCss.includes('--bg-canvas: #f8fafc'), 'Token --bg-canvas (slate-50) wajib terpasang');
    assert(styleCss.includes('--bg-canvas-subtle: #f1f5f9'), 'Token --bg-canvas-subtle (slate-100) wajib terpasang');
    assert(styleCss.includes('--border-light: #e2e8f0'), 'Token --border-light (1px crisp structural border) wajib terpasang');
    assert(styleCss.includes('--primary: #0284c7') || styleCss.includes('0284c7'), 'Token primary (deep trust blue) wajib terpasang');
  });

  test('Triage Badge Colors: VIP (Indigo), Disabilitas (Amber), Lansia (Orange), Normal (Slate)', () => {
    assert(styleCss.includes('--vip-bg: #eef2ff') && styleCss.includes('--vip-text: #4338ca'), 'Warna triage VIP (Indigo) wajib terpasang');
    assert(styleCss.includes('--disability-bg: #fef3c7') && styleCss.includes('--disability-text: #b45309'), 'Warna triage Disabilitas (Amber) wajib terpasang');
    assert(styleCss.includes('--elderly-bg: #ffedd5') && styleCss.includes('--elderly-text: #c2410c'), 'Warna triage Lansia (Orange) wajib terpasang');
    assert(styleCss.includes('--normal-bg: #f1f5f9') && styleCss.includes('--normal-text: #475569'), 'Warna triage Normal (Slate) wajib terpasang');
  });

  test('Tabular Numbers: font-variant-numeric: tabular-nums pada nomor tiket & kode', () => {
    assert(styleCss.includes('tabular-nums'), 'Tabular numbers rule (tabular-nums) wajib terpasang');
    assert(styleCss.includes('.font-code-tabular') || styleCss.includes('.ticket-number'), 'Selector tabular number wajib terdefinisi');
  });

  test('Responsive Breakpoints: Mobile (<640px), Tablet (640px - 1024px), Desktop/TV (>1024px, >=1920px)', () => {
    assert(styleCss.includes('@media (max-width: 639.98px)'), 'Media query mobile (<640px) wajib terpasang');
    assert(styleCss.includes('@media (max-width: 1023.98px)') || styleCss.includes('@media (max-width: 1024px)'), 'Media query tablet wajib terpasang');
    assert(styleCss.includes('@media (min-width: 1024px)'), 'Media query desktop (>1024px) wajib terpasang');
    assert(styleCss.includes('@media (min-width: 1920px)'), 'Media query TV Signage 4K (>=1920px) wajib terpasang');
  });

  test('Horizontal Overflow Prevention: overflow-x hidden dan width 100% pada html & body', () => {
    assert(styleCss.includes('overflow-x: hidden'), 'overflow-x: hidden wajib aktif');
    assert(styleCss.includes('max-width: 100%') || styleCss.includes('max-width: 100vw'), 'Lebar maksimal layout wajib dibatasi ke viewport');
  });
});

// ============================================================================
// SUITE 5: Priority Engine Logic & FIFO Invariants
// ============================================================================
suite('Priority Queue Engine Logic & FIFO Invariants', () => {
  test('Weight Tier Ranking: VIP (1) > Disabilitas (2) > Lansia (3) > Normal (4)', () => {
    assertEquals(getPriorityOrder('vip'), 1, 'VIP order');
    assertEquals(getPriorityOrder('disabilitas'), 2, 'Disabilitas order');
    assertEquals(getPriorityOrder('lansia'), 3, 'Lansia order');
    assertEquals(getPriorityOrder('normal'), 4, 'Normal order');

    // Case-insensitive & aliases
    assertEquals(getPriorityOrder('VIP / FAST TRACK'), 1, 'VIP alias order');
    assertEquals(getPriorityOrder('Difabel'), 2, 'Difabel alias order');
    assertEquals(getPriorityOrder('Geriatri'), 3, 'Geriatri alias order');
  });

  test('QueueService.sortTickets: Prioritas lebih tinggi harus selalu dipanggil mendahului prioritas rendah', () => {
    const tNormal = { id: 't1', ticketNumber: 'A-001', sequence: 1, serviceCode: 'A', serviceName: 'Poli Umum', priority: 'normal', status: 'waiting', createdAt: 1000 };
    const tLansia = { id: 't2', ticketNumber: 'A-002', sequence: 2, serviceCode: 'A', serviceName: 'Poli Umum', priority: 'lansia', status: 'waiting', createdAt: 2000 };
    const tDisab = { id: 't3', ticketNumber: 'A-003', sequence: 3, serviceCode: 'A', serviceName: 'Poli Umum', priority: 'disabilitas', status: 'waiting', createdAt: 3000 };
    const tVip = { id: 't4', ticketNumber: 'A-004', sequence: 4, serviceCode: 'A', serviceName: 'Poli Umum', priority: 'vip', status: 'waiting', createdAt: 4000 };

    // Skenario: tVip dibuat paling akhir (timestamp 4000), tapi harus tetap paling pertama
    const tickets = [tNormal, tLansia, tDisab, tVip];
    tickets.sort((a, b) => QueueService.sortTickets(a, b));

    assertEquals(tickets[0].id, 't4', 'Tiket ke-1 wajib VIP');
    assertEquals(tickets[1].id, 't3', 'Tiket ke-2 wajib Disabilitas');
    assertEquals(tickets[2].id, 't2', 'Tiket ke-3 wajib Lansia');
    assertEquals(tickets[3].id, 't1', 'Tiket ke-4 wajib Normal');
  });

  test('FIFO Rule: Jika kategori prioritas setara, tiket yang datang lebih awal (createdAt lebih kecil) dipanggil lebih dulu', () => {
    const vip1 = { id: 'v1', ticketNumber: 'A-001', sequence: 1, serviceCode: 'A', serviceName: 'Poli Umum', priority: 'vip', status: 'waiting', createdAt: 1000 };
    const vip2 = { id: 'v2', ticketNumber: 'A-002', sequence: 2, serviceCode: 'A', serviceName: 'Poli Umum', priority: 'vip', status: 'waiting', createdAt: 1500 };
    const vip3 = { id: 'v3', ticketNumber: 'A-003', sequence: 3, serviceCode: 'A', serviceName: 'Poli Umum', priority: 'vip', status: 'waiting', createdAt: 2000 };

    const shuffled = [vip3, vip1, vip2];
    shuffled.sort((a, b) => QueueService.sortTickets(a, b));

    assertEquals(shuffled[0].id, 'v1', 'FIFO: v1 (1000) paling awal');
    assertEquals(shuffled[1].id, 'v2', 'FIFO: v2 (1500) kedua');
    assertEquals(shuffled[2].id, 'v3', 'FIFO: v3 (2000) ketiga');
  });

  test('Tiket non-waiting (calling/done/skipped) tidak terpanggil lagi oleh QueueService.callNextTicket', () => {
    storageStore.clear();

    // Inisialisasi layanan A
    StorageService.saveServices([
      { code: 'A', name: 'Poli Umum', isActive: true, currentNumber: 3 }
    ]);

    const tickets = [
      { id: 't_done', ticketNumber: 'A-001', sequence: 1, serviceCode: 'A', serviceName: 'Poli Umum', priority: 'vip', status: 'done', createdAt: 100 },
      { id: 't_skip', ticketNumber: 'A-002', sequence: 2, serviceCode: 'A', serviceName: 'Poli Umum', priority: 'vip', status: 'skipped', createdAt: 200 },
      { id: 't_wait', ticketNumber: 'A-003', sequence: 3, serviceCode: 'A', serviceName: 'Poli Umum', priority: 'normal', status: 'waiting', createdAt: 300 }
    ];
    StorageService.saveTickets(tickets);

    const called = QueueService.callNextTicket('Loket 1', 'A');
    assert(called !== null, 'Tiket waiting harus terpanggil');
    assertEquals(called.id, 't_wait', 'Tiket yang terpanggil harus t_wait, bukan yang done atau skipped');
    assertEquals(called.status, 'calling', 'Status tiket sekarang harus calling');

    // Panggil lagi ketika tidak ada tiket waiting
    const noMore = QueueService.callNextTicket('Loket 1', 'A');
    assertEquals(noMore, null, 'Tidak boleh ada tiket yang terpanggil ketika antrean habis');
  });

  test('QueueService.callTicketById hanya bisa memanggil tiket jika berstatus "waiting"', () => {
    storageStore.clear();
    StorageService.saveServices([{ code: 'A', name: 'Poli Umum', isActive: true, currentNumber: 2 }]);

    const tickets = [
      { id: 't_calling', ticketNumber: 'A-001', sequence: 1, serviceCode: 'A', serviceName: 'Poli Umum', priority: 'normal', status: 'calling', createdAt: 100 },
      { id: 't_waiting', ticketNumber: 'A-002', sequence: 2, serviceCode: 'A', serviceName: 'Poli Umum', priority: 'normal', status: 'waiting', createdAt: 200 }
    ];
    StorageService.saveTickets(tickets);

    // Coba panggil tiket yang calling -> wajib ditolak (null)
    const resultCalling = QueueService.callTicketById('t_calling', 'Loket 1');
    assertEquals(resultCalling, null, 'Tiket calling tidak boleh dipanggil ulang via callTicketById');

    // Panggil tiket waiting -> sukses
    const resultWaiting = QueueService.callTicketById('t_waiting', 'Loket 1');
    assert(resultWaiting !== null, 'Tiket waiting berhasil dipanggil');
    assertEquals(resultWaiting.id, 't_waiting', 'ID tiket cocok');
    assertEquals(resultWaiting.status, 'calling', 'Status berubah menjadi calling');
  });
});

// ============================================================================
// SUITE 6: Queue State Lifecycle & Reset Invariants
// ============================================================================
suite('Queue State Lifecycle & Reset Invariants', () => {
  test('Penerbitan tiket berurutan menghasilkan format 001, 002, 003...', () => {
    storageStore.clear();
    StorageService.saveServices([
      { code: 'A', name: 'Poli Umum', isActive: true, currentNumber: 0 },
      { code: 'B', name: 'Poli Penyakit Dalam', isActive: true, currentNumber: 0 }
    ]);

    const t1 = QueueService.generateTicket('A', 'normal');
    assertEquals(t1.ticketNumber, 'A-001', 'Nomor tiket pertama poli A');
    assertEquals(t1.sequence, 1, 'Sequence pertama poli A');

    const t2 = QueueService.generateTicket('A', 'vip');
    assertEquals(t2.ticketNumber, 'A-002', 'Nomor tiket kedua poli A');
    assertEquals(t2.sequence, 2, 'Sequence kedua poli A');

    const tB1 = QueueService.generateTicket('B', 'lansia');
    assertEquals(tB1.ticketNumber, 'B-001', 'Nomor tiket pertama poli B terpisah');
  });

  test('StorageService.clearAllTickets mengosongkan antrian dan mereset sequence ke 001', () => {
    // Generate beberapa tiket
    QueueService.generateTicket('A', 'normal');
    QueueService.generateTicket('A', 'vip');
    QueueService.callNextTicket('Loket 1', 'A');

    assert(StorageService.getTickets().length > 0, 'Harus ada tiket tersimpan');
    assert(StorageService.getActiveTicket() !== null, 'Harus ada tiket aktif');

    // Lakukan clearAllTickets
    StorageService.clearAllTickets();

    assertEquals(StorageService.getTickets().length, 0, 'Daftar tiket wajib kosong setelah reset');
    assertEquals(StorageService.getActiveTicket(), null, 'Tiket aktif wajib null setelah reset');

    // Terbitkan tiket baru: Wajib kembali ke 001!
    const freshTicketA = QueueService.generateTicket('A', 'normal');
    assertEquals(freshTicketA.ticketNumber, 'A-001', 'Tiket baru setelah clearAllTickets wajib kembali ke A-001');
    assertEquals(freshTicketA.sequence, 1, 'Sequence baru wajib kembali ke 1');
  });

  test('StorageService.resetServiceCounter mereset counter poli tertentu secara terisolasi', () => {
    storageStore.clear();
    StorageService.saveServices([
      { code: 'A', name: 'Poli Umum', isActive: true, currentNumber: 5 },
      { code: 'B', name: 'Poli Anak', isActive: true, currentNumber: 3 }
    ]);

    // Reset hanya poli A
    const ok = StorageService.resetServiceCounter('A');
    assert(ok, 'resetServiceCounter return true');

    const services = StorageService.getServices();
    const svcA = services.find(s => s.code === 'A');
    const svcB = services.find(s => s.code === 'B');

    assertEquals(svcA.currentNumber, 0, 'Poli A currentNumber direset ke 0');
    assertEquals(svcB.currentNumber, 3, 'Poli B currentNumber tidak terpengaruh');

    const nextA = QueueService.generateTicket('A', 'normal');
    assertEquals(nextA.ticketNumber, 'A-001', 'Poli A berikutnya mulai dari 001');

    const nextB = QueueService.generateTicket('B', 'normal');
    assertEquals(nextB.ticketNumber, 'B-004', 'Poli B berikutnya melanjutkan ke 004');
  });

  test('Validasi Layanan Non-Aktif: generateTicket wajib melempar error jika poli dinonaktifkan', () => {
    storageStore.clear();
    StorageService.saveServices([
      { code: 'C', name: 'Poli Gigi', isActive: false, currentNumber: 0 }
    ]);

    let thrown = false;
    try {
      QueueService.generateTicket('C', 'normal');
    } catch (e) {
      thrown = true;
      assert(e.message.includes('dinonaktifkan'), 'Pesan error harus informatif');
    }
    assert(thrown, 'generateTicket wajib throw error jika service non-aktif');
  });

  test('Transfer Pasien Antar Poli: QueueService.transferTicket mentransfer pasien, mempertahankan prioritas, dan menyelesaikan tiket lama', () => {
    storageStore.clear();
    StorageService.saveServices([
      { code: 'A', name: 'Poli Umum', isActive: true, currentNumber: 0 },
      { code: 'D', name: 'Farmasi & Apotek Terpadu', isActive: true, currentNumber: 0 }
    ]);

    // 1. Menerbitkan tiket aktif di Poli A (misal VIP)
    const ticketA = QueueService.generateTicket('A', 'vip');
    assertEquals(ticketA.ticketNumber, 'A-001', 'Nomor tiket Poli A');
    assertEquals(ticketA.priority, 'vip', 'Prioritas tiket A adalah VIP');

    // Panggil tiket A agar menjadi tiket aktif
    const activeA = QueueService.callTicketById(ticketA.id, 'Loket 01');
    assert(activeA !== null, 'Tiket A berhasil dipanggil');
    assertEquals(StorageService.getActiveTicket()?.id, ticketA.id, 'Tiket A adalah activeTicket');

    // 2. Memanggil QueueService.transferTicket(ticketA.id, 'D')
    const { oldTicket, newTicket } = QueueService.transferTicket(ticketA.id, 'D', 'Rujukan obat resep dokter');

    // 3. Verifikasi: tiket A berstatus 'done' dan activeTicket dikosongkan
    assertEquals(oldTicket.status, 'done', 'Status oldTicket harus done');
    assert(typeof oldTicket.completedAt === 'number', 'oldTicket harus memiliki completedAt');
    assertEquals(StorageService.getActiveTicket(), null, 'activeTicket di storage wajib dikosongkan setelah transfer');

    const storedTickets = StorageService.getTickets();
    const foundOldInStorage = storedTickets.find(t => t.id === ticketA.id);
    assertEquals(foundOldInStorage?.status, 'done', 'Tiket A di storage berstatus done');

    // 4. Verifikasi: tiket baru di Poli D berstatus 'waiting' dan mempertahankan prioritas VIP
    assertEquals(newTicket.serviceCode, 'D', 'Tiket baru berada di Poli D');
    assertEquals(newTicket.ticketNumber, 'D-001', 'Nomor tiket baru di Poli D adalah D-001');
    assertEquals(newTicket.status, 'waiting', 'Tiket baru berstatus waiting');
    assertEquals(newTicket.priority, 'vip', 'Tiket baru mempertahankan prioritas VIP dari tiket lama');
    assertEquals(newTicket.notes, 'Rujukan obat resep dokter', 'Catatan transfer tersimpan pada tiket baru');

    // 5. Verifikasi: tiket baru muncul di QueueService.getWaitingTickets()
    const waitingTickets = QueueService.getWaitingTickets();
    const foundInWaiting = waitingTickets.find(t => t.id === newTicket.id);
    assert(foundInWaiting !== undefined, 'Tiket baru wajib muncul di QueueService.getWaitingTickets()');
    assertEquals(foundInWaiting?.priority, 'vip', 'Tiket dalam daftar tunggu berprioritas VIP');

    // Pastikan tiket A (yang sudah 'done') TIDAK muncul di daftar tunggu
    const oldInWaiting = waitingTickets.find(t => t.id === ticketA.id);
    assert(oldInWaiting === undefined, 'Tiket lama (done) tidak boleh ada di waitingTickets');
  });
});

// ============================================================================
// SUITE 7: Auth Guards & Role Mapping Matrix
// ============================================================================
suite('Auth Guards & Role Mapping Matrix (DummyJSON & Admin/Moderator Parity)', () => {
  test('Role Mapping: admin, moderator, dan user terpetakan secara tepat', () => {
    storageStore.clear();

    // User biasa
    StorageService.setAuthUser({
      id: 1,
      username: 'averyp',
      email: 'avery@hospital.id',
      firstName: 'Avery',
      lastName: 'P',
      gender: 'female',
      image: '',
      token: 'token-avery',
      role: 'user'
    });

    assert(AuthService.isAuthenticated(), 'User biasa authenticated');
    assertEquals(AuthService.isAdminOrModerator(), false, 'User biasa bukan admin/moderator');

    // Admin
    StorageService.setAuthUser({
      id: 2,
      username: 'emilys',
      email: 'emilys@hospital.id',
      firstName: 'Emily',
      lastName: 'S',
      gender: 'female',
      image: '',
      token: 'token-emilys',
      role: 'admin'
    });
    assertEquals(AuthService.isAdminOrModerator(), true, 'Admin adalah adminOrModerator');

    // Moderator
    StorageService.setAuthUser({
      id: 3,
      username: 'oliviaw',
      email: 'oliviaw@hospital.id',
      firstName: 'Olivia',
      lastName: 'W',
      gender: 'female',
      image: '',
      token: 'token-olivia',
      role: 'moderator'
    });
    assertEquals(AuthService.isAdminOrModerator(), true, 'Moderator adalah adminOrModerator');
  });

  test('Paritas Moderator === Admin: requireAuth(["admin"]) wajib mengizinkan user dengan role "moderator"', () => {
    storageStore.clear();
    lastRedirectUrl = '';

    // Login sebagai moderator
    StorageService.setAuthUser({
      id: 3,
      username: 'oliviaw',
      email: 'oliviaw@hospital.id',
      firstName: 'Olivia',
      lastName: 'W',
      gender: 'female',
      image: '',
      token: 'token-olivia',
      role: 'moderator'
    });

    // Cek requireAuth(['admin'])
    const user = AuthService.requireAuth(['admin']);
    assert(user !== null, 'Moderator wajib diizinkan masuk ke halaman admin');
    assertEquals(user.role, 'moderator', 'Role tetap moderator');
    assertEquals(lastRedirectUrl, '', 'Tidak boleh ada redirection saat diizinkan');
  });

  test('Proteksi Akses: User biasa ditolak saat mengakses halaman admin dan diarahkan ke login.html', () => {
    storageStore.clear();
    lastRedirectUrl = '';

    StorageService.setAuthUser({
      id: 1,
      username: 'averyp',
      email: 'avery@hospital.id',
      firstName: 'Avery',
      lastName: 'P',
      gender: 'female',
      image: '',
      token: 'token-avery',
      role: 'user'
    });

    const result = AuthService.requireAuth(['admin']);
    assertEquals(result, null, 'User biasa ditolak');
    assertEquals(lastRedirectUrl, 'login.html', 'User biasa diredirect ke login.html');
  });

  test('Proteksi Sesi Kosong: Pengunjung tanpa token diredirect ke login.html', () => {
    storageStore.clear();
    lastRedirectUrl = '';

    const result = AuthService.requireAuth(['user', 'admin']);
    assertEquals(result, null, 'Unauthenticated user ditolak');
    assertEquals(lastRedirectUrl, 'login.html', 'Unauthenticated user diredirect ke login.html');
  });
});

// ============================================================================
// SUITE 8: Daily Report Export Engine (CSV & JSON Audit Trail)
// ============================================================================
suite('Daily Report Export Engine (CSV & JSON Audit Trail)', () => {
  test('Format Kolom CSV wajib tepat 8 kolom: Nomor Tiket, Layanan, Prioritas, Status, Loket Pemanggil, Waktu Buat, Waktu Panggil, Waktu Selesai', () => {
    const dummyTickets = [
      {
        id: 't-1',
        ticketNumber: 'A-001',
        sequence: 1,
        serviceCode: 'A',
        serviceName: 'Poli Umum',
        priority: 'normal',
        status: 'done',
        counterName: 'Loket 01',
        createdAt: 1770000000000,
        calledAt: 1770000300000,
        completedAt: 1770000900000
      }
    ];

    const csv = ExportService.generateCsv(dummyTickets);
    const lines = csv.split('\r\n').filter(l => l.trim().length > 0);
    assert(lines.length === 2, 'CSV harus terdiri dari 1 baris header dan 1 baris data');

    const expectedHeaders = '"Nomor Tiket","Layanan","Prioritas","Status","Loket Pemanggil","Waktu Buat","Waktu Panggil","Waktu Selesai"';
    assertEquals(lines[0], expectedHeaders, 'Header CSV harus persis sesuai spesifikasi');

    const row = lines[1];
    assert(row.includes('"A-001"'), 'Nomor tiket harus ada di baris data');
    assert(row.includes('"Poli Umum"'), 'Layanan harus ada di baris data');
    assert(row.includes('"Normal"'), 'Prioritas harus berlabel Normal');
    assert(row.includes('"Selesai"'), 'Status harus berlabel Selesai');
    assert(row.includes('"Loket 01"'), 'Loket Pemanggil harus ada di baris data');
  });

  test('CSV Escaping: Koma dan tanda kutip ganda dalam nama layanan/data tidak merusak integritas kolom', () => {
    const dummyTickets = [
      {
        id: 't-2',
        ticketNumber: 'B-001',
        sequence: 1,
        serviceCode: 'B',
        serviceName: 'Poli Anak, Tumbuh Kembang & "Imunisasi"',
        priority: 'vip',
        status: 'calling',
        counterName: 'Loket 02',
        createdAt: 1770000000000,
        calledAt: 1770000300000
      }
    ];

    const csv = ExportService.generateCsv(dummyTickets);
    assert(csv.includes('"Poli Anak, Tumbuh Kembang & ""Imunisasi"""'), 'Escaping RFC 4180 harus benar');
    assert(csv.includes('"VIP"'), 'Label prioritas VIP harus tepat');
    assert(csv.includes('"Sedang Dipanggil"'), 'Label status calling harus tepat');
  });

  test('Ekspor JSON: Format audit trail terstruktur valid mencakup metadata, services, dan tickets', () => {
    const dummyTickets = [
      {
        id: 't-3',
        ticketNumber: 'C-001',
        sequence: 1,
        serviceCode: 'C',
        serviceName: 'Farmasi',
        priority: 'lansia',
        status: 'waiting',
        createdAt: 1770000000000
      }
    ];
    const dummyServices = [{ code: 'C', name: 'Farmasi', isActive: true, currentNumber: 1 }];
    const dummyStats = {
      totalTicketsToday: 1,
      totalWaiting: 1,
      totalCalling: 0,
      totalDone: 0,
      totalSkipped: 0,
      totalActiveServices: 1
    };

    const jsonStr = ExportService.generateAuditTrailJson(dummyTickets, dummyServices, dummyStats);
    const parsed = JSON.parse(jsonStr);

    assert(parsed.metadata, 'Audit trail harus memiliki metadata');
    assert(parsed.metadata.reportType, 'Metadata harus memuat reportType');
    assertEquals(parsed.metadata.totalTickets, 1, 'Total tickets harus sesuai');
    assert(Array.isArray(parsed.services), 'Services harus berupa array');
    assert(Array.isArray(parsed.tickets), 'Tickets harus berupa array');
    assertEquals(parsed.tickets[0].priorityLabel, 'Lansia', 'Label prioritas terpetakan');
    assertEquals(parsed.tickets[0].statusLabel, 'Menunggu', 'Label status terpetakan');
  });
});

// ============================================================================
// SUITE 9: Bilingual Audio Speech & Operator Counter Synchronization
// ============================================================================
suite('Bilingual Audio Speech & Operator Counter Synchronization', () => {
  test('Panggilan Loket 02: QueueService.callNextTicket("Loket 02", "B") mengaitkan tiket ke Loket 02 dan layanan B', () => {
    storageStore.clear();
    StorageService.saveServices([
      { code: 'A', name: 'Poli Umum', isActive: true, currentNumber: 1 },
      { code: 'B', name: 'Poli Penyakit Dalam', isActive: true, currentNumber: 1 }
    ]);

    // Tiket A dan tiket B dalam antrean waiting
    const tA = { id: 't_a', ticketNumber: 'A-001', sequence: 1, serviceCode: 'A', serviceName: 'Poli Umum', priority: 'normal', status: 'waiting', createdAt: 1000 };
    const tB = { id: 't_b', ticketNumber: 'B-001', sequence: 1, serviceCode: 'B', serviceName: 'Poli Penyakit Dalam', priority: 'normal', status: 'waiting', createdAt: 2000 };
    StorageService.saveTickets([tA, tB]);

    // Operator Loket 02 memanggil antrean
    const calledTicket = QueueService.callNextTicket('Loket 02', 'B');
    assert(calledTicket !== null, 'Tiket poli B harus berhasil dipanggil');
    assertEquals(calledTicket.ticketNumber, 'B-001', 'Nomor tiket yang dipanggil wajib B-001');
    assertEquals(calledTicket.counterName, 'Loket 02', 'Loket pemanggil wajib Loket 02');

    // Pastikan tiket aktif tersimpan dengan counterName Loket 02
    const active = StorageService.getActiveTicket();
    assert(active !== null, 'Tiket aktif tersimpan di storage');
    assertEquals(active.counterName, 'Loket 02', 'counterName pada tiket aktif adalah Loket 02');

    // Tiket A harus tetap berstatus waiting (terisolasi)
    const waitingA = QueueService.getWaitingTickets('A');
    assertEquals(waitingA.length, 1, 'Tiket A tetap waiting dan tidak terganggu panggilan loket 2');
  });

  test('Pemetaan Loket Dinamis Sesuai Layanan (Service-to-Counter Mapping)', () => {
    storageStore.clear();
    StorageService.saveServices([
      { code: 'A', name: 'Poli Umum', isActive: true, currentNumber: 0 },
      { code: 'B', name: 'Poli Penyakit Dalam', isActive: true, currentNumber: 0 },
      { code: 'C', name: 'Poli Anak & Tumbuh Kembang', isActive: true, currentNumber: 0 },
      { code: 'D', name: 'Farmasi & Apotek Terpadu', isActive: true, currentNumber: 0 }
    ]);

    assertEquals(getCounterForService('A'), 'Loket 01', 'Poli A harus Loket 01');
    assertEquals(getCounterForService('B'), 'Loket 02', 'Poli B harus Loket 02');
    assertEquals(getCounterForService('C'), 'Loket 03', 'Poli C harus Loket 03');
    assertEquals(getCounterForService('D'), 'Loket 04', 'Poli D harus Loket 04');
    assertEquals(StorageService.getCounterForService('B'), 'Loket 02', 'StorageService method mapping Poli B');
  });

  test('Pemanggilan Tiket Lintas Layanan Otomatis: Tiket A -> Loket 01, Tiket B -> Loket 02, Tiket C -> Loket 03, Tiket D -> Loket 04', () => {
    storageStore.clear();
    StorageService.saveServices([
      { code: 'A', name: 'Poli Umum', isActive: true, currentNumber: 0 },
      { code: 'B', name: 'Poli Penyakit Dalam', isActive: true, currentNumber: 0 },
      { code: 'C', name: 'Poli Anak & Tumbuh Kembang', isActive: true, currentNumber: 0 },
      { code: 'D', name: 'Farmasi & Apotek Terpadu', isActive: true, currentNumber: 0 }
    ]);

    const tA = QueueService.generateTicket('A', 'normal');
    const tB = QueueService.generateTicket('B', 'normal');
    const tC = QueueService.generateTicket('C', 'normal');
    const tD = QueueService.generateTicket('D', 'normal');

    // 1. Panggil tiket A dalam mode Semua Loket (Otomatis)
    const callA = QueueService.callNextTicket('Semua Loket', 'A');
    assert(callA !== null, 'Tiket A berhasil dipanggil');
    assertEquals(callA.ticketNumber, 'A-001', 'Nomor tiket A-001');
    assertEquals(callA.counterName, 'Loket 01', 'Tiket A harus terasosiasi ke Loket 01');
    assertEquals(StorageService.getActiveTicket().counterName, 'Loket 01', 'Active ticket A di storage Loket 01');

    // 2. Panggil tiket B
    const callB = QueueService.callNextTicket('Semua Loket', 'B');
    assert(callB !== null, 'Tiket B berhasil dipanggil');
    assertEquals(callB.ticketNumber, 'B-001', 'Nomor tiket B-001');
    assertEquals(callB.counterName, 'Loket 02', 'Tiket B harus terasosiasi ke Loket 02');
    assertEquals(StorageService.getActiveTicket().counterName, 'Loket 02', 'Active ticket B di storage Loket 02');

    // 3. Panggil tiket C via callTicketById
    const callC = QueueService.callTicketById(tC.id, 'Semua Loket');
    assert(callC !== null, 'Tiket C berhasil dipanggil');
    assertEquals(callC.ticketNumber, 'C-001', 'Nomor tiket C-001');
    assertEquals(callC.counterName, 'Loket 03', 'Tiket C harus terasosiasi ke Loket 03');
    assertEquals(StorageService.getActiveTicket().counterName, 'Loket 03', 'Active ticket C di storage Loket 03');

    // 4. Panggil tiket D
    const callD = QueueService.callTicketById(tD.id, 'Semua Loket');
    assert(callD !== null, 'Tiket D berhasil dipanggil');
    assertEquals(callD.ticketNumber, 'D-001', 'Nomor tiket D-001');
    assertEquals(callD.counterName, 'Loket 04', 'Tiket D harus terasosiasi ke Loket 04');
    assertEquals(StorageService.getActiveTicket().counterName, 'Loket 04', 'Active ticket D di storage Loket 04');
  });

  test('SpeechService mengekstrak teks ucapan Loket 1, Loket 2, Loket 3, Loket 4 dan variasi pitch natural antar loket', async () => {
    // Verifikasi Loket 1 (Poli A)
    const ann1 = SpeechService.formatAnnouncement('A-001', 'Loket 01');
    assertEquals(ann1.idCounter, 'Loket 1', 'idCounter Loket 1');
    assertEquals(ann1.enCounter, 'Counter 1', 'enCounter Counter 1');
    assertEquals(ann1.pitch, 1.0, 'Pitch Loket 1 normal (1.0)');
    assert(ann1.spokenId.includes('silakan menuju Loket 1'), 'Ucapan ID memuat "silakan menuju Loket 1"');
    assert(ann1.spokenEn.includes('please proceed to Counter 1'), 'Ucapan EN memuat "please proceed to Counter 1"');

    // Verifikasi Loket 2 (Poli B)
    const ann2 = SpeechService.formatAnnouncement('B-001', 'Loket 02');
    assertEquals(ann2.idCounter, 'Loket 2', 'idCounter Loket 2');
    assertEquals(ann2.enCounter, 'Counter 2', 'enCounter Counter 2');
    assertEquals(ann2.pitch, 1.05, 'Pitch Loket 2 variasi nada (1.05)');
    assert(ann2.spokenId.includes('silakan menuju Loket 2'), 'Ucapan ID memuat "silakan menuju Loket 2"');
    assert(ann2.spokenEn.includes('please proceed to Counter 2'), 'Ucapan EN memuat "please proceed to Counter 2"');

    // Verifikasi Loket 3 (Poli C)
    const ann3 = SpeechService.formatAnnouncement('C-001', 'Loket 03');
    assertEquals(ann3.idCounter, 'Loket 3', 'idCounter Loket 3');
    assertEquals(ann3.enCounter, 'Counter 3', 'enCounter Counter 3');
    assertEquals(ann3.pitch, 1.1, 'Pitch Loket 3 variasi nada (1.1)');
    assert(ann3.spokenId.includes('silakan menuju Loket 3'), 'Ucapan ID memuat "silakan menuju Loket 3"');
    assert(ann3.spokenEn.includes('please proceed to Counter 3'), 'Ucapan EN memuat "please proceed to Counter 3"');

    // Verifikasi Loket 4 (Poli D)
    const ann4 = SpeechService.formatAnnouncement('D-001', 'Loket 04');
    assertEquals(ann4.idCounter, 'Loket 4', 'idCounter Loket 4');
    assertEquals(ann4.enCounter, 'Counter 4', 'enCounter Counter 4');
    assertEquals(ann4.pitch, 0.95, 'Pitch Loket 4 variasi nada (0.95)');
    assert(ann4.spokenId.includes('silakan menuju Loket 4'), 'Ucapan ID memuat "silakan menuju Loket 4"');
    assert(ann4.spokenEn.includes('please proceed to Counter 4'), 'Ucapan EN memuat "please proceed to Counter 4"');

    // Pastikan eksekusi langsung announceTicket berjalan mulus
    await SpeechService.announceTicket('A-001', 'Loket 01');
    await SpeechService.announceTicket('B-001', 'Loket 02');
    await SpeechService.announceTicket('C-001', 'Loket 03');
    await SpeechService.announceTicket('D-001', 'Loket 04');
  });

  test('Dropdown Loket Aktif terpasang pada operator.html (#operatorCounterSelect) dengan opsi otomatis dan poli', () => {
    const operatorHtml = fs.readFileSync(path.join(__dirname, 'operator.html'), 'utf8');
    assert(operatorHtml.includes('id="operatorCounterSelect"'), 'Dropdown #operatorCounterSelect wajib ada di operator.html');
    assert(operatorHtml.includes('Semua Loket (Otomatis Sesuai Poli Pasien)'), 'Opsi Semua Loket Otomatis wajib ada di dropdown');
    assert(operatorHtml.includes('Loket 01 - Poli Umum'), 'Opsi Loket 01 wajib ada di dropdown');
    assert(operatorHtml.includes('Loket 02 - Poli Penyakit Dalam'), 'Opsi Loket 02 wajib ada di dropdown');
    assert(operatorHtml.includes('Loket 03 - Poli Anak &amp; Imunisasi') || operatorHtml.includes('Loket 03 - Poli Anak & Imunisasi'), 'Opsi Loket 03 wajib ada di dropdown');
    assert(operatorHtml.includes('Loket 04 - Farmasi &amp; Resep') || operatorHtml.includes('Loket 04 - Farmasi & Resep'), 'Opsi Loket 04 wajib ada di dropdown');
  });

  test('Visibilitas Antrean Lintas Poli: Tiket poli manapun (misal Poli A) langsung muncul di antrean tunggu operator', () => {
    StorageService.clearAllTickets();
    // Pasien mencetak tiket Poli Umum (A) dari kiosk
    const ticketA = QueueService.generateTicket('A', 'normal');
    assert(ticketA !== null, 'Tiket A berhasil diterbitkan');

    // Operator loket manapun (mengambil seluruh antrean tunggu QueueService.getWaitingTickets())
    const allWaiting = QueueService.getWaitingTickets();
    assertEquals(allWaiting.length, 1, 'Total antrean tunggu operator harus mencakup tiket A');
    assertEquals(allWaiting[0].ticketNumber, 'A-001', 'Nomor tiket harus sesuai');
    assertEquals(allWaiting[0].serviceCode, 'A', 'Kode poli harus A');

    // Tambah tiket Poli B
    const ticketB = QueueService.generateTicket('B', 'vip');
    const updatedWaiting = QueueService.getWaitingTickets();
    assertEquals(updatedWaiting.length, 2, 'Kedua tiket wajib muncul di antrean tunggu operator');
    // Prioritas VIP (B) harus berada di urutan teratas
    assertEquals(updatedWaiting[0].ticketNumber, 'B-001', 'Tiket VIP Poli B harus urutan pertama');
    assertEquals(updatedWaiting[1].ticketNumber, 'A-001', 'Tiket Normal Poli A harus urutan kedua');
  });

  test('Fallback Cerdas Pemanggilan Operator: Memanggil tiket antrean poli lain saat antrean poli loket kosong', () => {
    StorageService.clearAllTickets();
    // Hanya ada tiket Poli A yang menunggu
    QueueService.generateTicket('A', 'normal');

    // Operator bertugas di Loket 02 (Poli B)
    let nextTicket = QueueService.callNextTicket('Loket 02', 'B');
    if (!nextTicket) {
      // Fallback cerdas: panggil tiket yang tersedia
      const remainingWaiting = QueueService.getWaitingTickets();
      if (remainingWaiting.length > 0) {
        nextTicket = QueueService.callNextTicket('Loket 02', undefined);
      }
    }
    assert(nextTicket !== null, 'Fallback cerdas harus berhasil memanggil tiket Poli A');
    assertEquals(nextTicket.ticketNumber, 'A-001', 'Tiket yang dipanggil adalah A-001');
    assertEquals(nextTicket.counterName, 'Loket 02', 'Dipanggil ke Loket 02');
  });

  test('Paritas Navbar Admin CRUD (index.html) dengan standar sistem', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

    // 1. Badge status navbar
    assert(indexHtml.includes('id="headerDeskBadge"'), 'index.html wajib memuat id="headerDeskBadge"');
    assert(indexHtml.includes('Admin Hub • SIMRS Online'), 'Badge navbar wajib bertuliskan "Admin Hub • SIMRS Online"');

    // 2. Nav links responsive hidden md:flex
    assert(indexHtml.includes('hidden md:flex'), 'Nav links index.html wajib menggunakan hidden md:flex');

    // 3. Tautan aktif Admin CRUD
    assert(indexHtml.includes('data-path="admin-crud"') && indexHtml.includes('aria-current="page"'), 'Tautan Admin CRUD wajib memiliki aria-current="page"');

    // 4. Komponen profil pengguna
    assert(indexHtml.includes('id="btnLogout"'), 'Tombol logout wajib ada di index.html');
    assert(indexHtml.includes('id="userAvatar"'), 'Avatar user wajib ada di index.html');
    assert(indexHtml.includes('id="userFullName"'), 'Nama user wajib ada di index.html');
    assert(indexHtml.includes('id="userRoleBadge"'), 'Role badge user wajib ada di index.html');

    // 5. Tidak ada inline onclick pada #btnManualPrintPhysical
    const btnPrintLine = indexHtml.split('\n').find(l => l.includes('id="btnManualPrintPhysical"')) || '';
    assert(!btnPrintLine.includes('onclick='), '#btnManualPrintPhysical dilarang memiliki inline onclick');
  });
});

// ============================================================================
// SUITE 10: Assistance Dispatch & Nurse Call Lifecycle
// ============================================================================
suite('Assistance Dispatch & Nurse Call Lifecycle', () => {
  test('StorageService.getAssistanceRequests mengembalikan initial request jika storage kosong', () => {
    localStorage.removeItem('medika_assistance_requests');
    const list = StorageService.getAssistanceRequests();
    assert(Array.isArray(list) && list.length > 0, 'Harus mengembalikan array daftar assistance request');
    assert(list.some(r => r.status === 'pending'), 'Minimal 1 demo request berstatus pending');
  });

  test('StorageService.addAssistanceRequest menambahkan panggilan baru ke antrian teratas', () => {
    const newReq = {
      id: 'test-ast-' + Date.now(),
      source: 'Kiosk Mandiri 02 (Lobby Admisi)',
      timestamp: Date.now(),
      status: 'pending'
    };
    StorageService.addAssistanceRequest(newReq);
    const updated = StorageService.getAssistanceRequests();
    assertEquals(updated[0].id, newReq.id, 'Panggilan bantuan baru harus berada di posisi pertama');
    assertEquals(updated[0].status, 'pending', 'Status panggilan baru harus pending');
    assertEquals(updated[0].source, 'Kiosk Mandiri 02 (Lobby Admisi)', 'Sumber kiosk harus tepat');
  });

  test('StorageService.resolveAssistanceRequest mengubah status menjadi resolved dan mencatat petugas & timestamp', () => {
    const list = StorageService.getAssistanceRequests();
    const pendingReq = list.find(r => r.status === 'pending');
    assert(pendingReq !== undefined, 'Harus ada request pending untuk diselesaikan');

    const staffName = 'dr. Hendra S. (Admin)';
    const ok = StorageService.resolveAssistanceRequest(pendingReq.id, staffName);
    assert(ok === true, 'resolveAssistanceRequest harus return true untuk ID yang valid');

    const refreshedList = StorageService.getAssistanceRequests();
    const resolvedReq = refreshedList.find(r => r.id === pendingReq.id);
    assert(resolvedReq !== undefined, 'Request harus ditemukan');
    assertEquals(resolvedReq.status, 'resolved', 'Status harus terupdate menjadi resolved');
    assertEquals(resolvedReq.handledBy, staffName, 'Nama petugas penangan harus tercatat');
    assert(typeof resolvedReq.handledAt === 'number' && resolvedReq.handledAt > 0, 'Timestamp handledAt harus terisi');
  });

  test('StorageService.resolveAssistanceRequest return false jika ID tidak ditemukan', () => {
    const ok = StorageService.resolveAssistanceRequest('non-existent-id-999', 'Admin');
    assertEquals(ok, false, 'Harus return false untuk ID yang tidak ada');
  });

  test('Verifikasi Integrasi Kiosk: window.callAttendant memanggil StorageService.addAssistanceRequest', () => {
    const kioskTs = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'ambil-antrian.ts'), 'utf8');
    assert(kioskTs.includes('StorageService.addAssistanceRequest'), 'ambil-antrian.ts wajib memanggil StorageService.addAssistanceRequest');
    assert(kioskTs.includes('Kiosk Mandiri 02 (Lobby Admisi)'), 'ambil-antrian.ts wajib mencantumkan sumber Kiosk Mandiri 02');
  });

  test('Verifikasi DOM Index: Section assistance dispatch, tabs filter, dan badge pending terpasang', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    assert(indexHtml.includes('id="assistance-dispatch-section"'), 'index.html wajib memuat id="assistance-dispatch-section"');
    assert(indexHtml.includes('id="assistance-pending-badge"'), 'index.html wajib memuat id="assistance-pending-badge"');
    assert(indexHtml.includes('id="assistance-table-body"'), 'index.html wajib memuat id="assistance-table-body"');
    assert(indexHtml.includes('id="filter-assistance-all"'), 'index.html wajib memuat id="filter-assistance-all"');
    assert(indexHtml.includes('id="filter-assistance-pending"'), 'index.html wajib memuat id="filter-assistance-pending"');
    assert(indexHtml.includes('id="filter-assistance-resolved"'), 'index.html wajib memuat id="filter-assistance-resolved"');
    assert(indexHtml.includes('Monitoring Panggilan Bantuan &amp; Nurse Call') || indexHtml.includes('Monitoring Panggilan Bantuan & Nurse Call'), 'Header judul nurse call harus tepat');
  });
});

// ============================================================================
// SUITE 11: User Ticket Lifecycle & Patient Notification Real-Time System
// ============================================================================
suite('User Ticket Lifecycle & Patient Notification Real-Time System', () => {
  test('Validasi quota 1 user = 1 tiket aktif (hasActiveTicket, getUserActiveTicket, dan penolakan tiket ganda)', () => {
    storageStore.clear();
    StorageService.saveServices([
      { code: 'A', name: 'Poli Umum', isActive: true, currentNumber: 0 },
      { code: 'B', name: 'Poli Penyakit Dalam', isActive: true, currentNumber: 0 }
    ]);

    // Awalnya belum ada tiket aktif
    assertEquals(QueueService.hasActiveTicket('michaelw'), false, 'User belum punya tiket aktif');
    assertEquals(QueueService.getUserActiveTicket('michaelw'), null, 'getUserActiveTicket mengembalikan null');

    // Menerbitkan tiket pertama untuk user michaelw
    const ticket1 = QueueService.generateTicket('A', 'normal', { userId: '101', username: 'michaelw' });
    assert(ticket1 !== null, 'Tiket pertama berhasil dibuat');
    assertEquals(ticket1.ticketNumber, 'A-001', 'Nomor tiket harus A-001');
    assertEquals(ticket1.userId, '101', 'userId tersimpan');
    assertEquals(ticket1.username, 'michaelw', 'username tersimpan');

    // Verifikasi hasActiveTicket & getUserActiveTicket
    assertEquals(QueueService.hasActiveTicket('michaelw'), true, 'User terdeteksi memiliki tiket aktif berdasarkan username');
    assertEquals(QueueService.hasActiveTicket('101'), true, 'User terdeteksi memiliki tiket aktif berdasarkan userId');

    const active = QueueService.getUserActiveTicket('michaelw');
    assert(active !== null, 'Tiket aktif ditemukan');
    assertEquals(active.id, ticket1.id, 'ID tiket aktif cocok');
    assertEquals(active.ticketNumber, 'A-001', 'Nomor tiket aktif cocok');

    // Percobaan menerbitkan tiket kedua tanpa izin admin harus throw Error
    let threw = false;
    try {
      QueueService.generateTicket('B', 'vip', { userId: '101', username: 'michaelw' });
    } catch (err) {
      threw = true;
      assert(err.message.includes('Anda sudah memiliki tiket aktif'), 'Pesan error harus menginformasikan kuota tiket aktif');
    }
    assert(threw === true, 'Penerbitan tiket kedua untuk user yang sama harus ditolak');
  });

  test('Validasi pengecualian admin (isManualByAdmin = true) menerbitkan tiket tanpa limit kuota', () => {
    storageStore.clear();
    StorageService.saveServices([
      { code: 'A', name: 'Poli Umum', isActive: true, currentNumber: 0 },
      { code: 'B', name: 'Poli Penyakit Dalam', isActive: true, currentNumber: 0 }
    ]);

    // Terbitkan tiket awal
    QueueService.generateTicket('A', 'normal', { userId: '101', username: 'michaelw' });
    assertEquals(QueueService.hasActiveTicket('michaelw'), true, 'User memegang tiket aktif');

    // Admin menerbitkan tiket manual dengan isManualByAdmin = true
    const adminTicket = QueueService.generateTicket('B', 'vip', {
      userId: '101',
      username: 'michaelw',
      isManualByAdmin: true
    });
    assert(adminTicket !== null, 'Admin berhasil menerbitkan tiket manual');
    assertEquals(adminTicket.isManualByAdmin, true, 'Flag isManualByAdmin tersimpan pada objek tiket');
    assertEquals(adminTicket.ticketNumber, 'B-001', 'Nomor tiket poli B diterbitkan');

    // Verifikasi integrasi kode di src/pages/index.ts (printManualTicketReceipt dan emitManualTicket)
    const indexTs = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'index.ts'), 'utf8');
    assert(indexTs.includes('isManualByAdmin: true'), 'src/pages/index.ts wajib mengoperkan { isManualByAdmin: true } pada QueueService.generateTicket');
  });

  test('Validasi pembatalan tiket (dropTicket) mengubah status menjadi "skipped", completedAt terisi, dan reset activeTicket', () => {
    storageStore.clear();
    StorageService.saveServices([
      { code: 'A', name: 'Poli Umum', isActive: true, currentNumber: 0 }
    ]);

    const ticket = QueueService.generateTicket('A', 'normal', { userId: '202', username: 'janed' });
    assertEquals(QueueService.hasActiveTicket('janed'), true, 'User memiliki tiket aktif sebelum drop');

    // Pasien membatalkan tiket
    const dropped = QueueService.dropTicket(ticket.id);
    assertEquals(dropped.status, 'skipped', 'Status tiket harus berubah menjadi skipped');
    assert(typeof dropped.completedAt === 'number' && dropped.completedAt > 0, 'completedAt harus diisi dengan timestamp');
    assertEquals(QueueService.hasActiveTicket('janed'), false, 'User tidak lagi memiliki tiket aktif setelah tiket dibatalkan');

    // dropTicket untuk tiket yang tidak ada harus melempar error
    let threwNotFound = false;
    try {
      QueueService.dropTicket('ticket_fake_9999');
    } catch (err) {
      threwNotFound = true;
      assert(err.message.includes('Tiket dengan ID tidak ditemukan'), 'Pesan error harus memberitahu ID tidak ditemukan');
    }
    assert(threwNotFound === true, 'dropTicket dengan ID tidak valid wajib throw error');
  });

  test('Validasi helper getAheadCount menghitung antrean berstatus waiting di depan tiket secara akurat', () => {
    storageStore.clear();
    StorageService.saveServices([
      { code: 'A', name: 'Poli Umum', isActive: true, currentNumber: 0 }
    ]);

    const t1 = QueueService.generateTicket('A', 'normal');
    const t2 = QueueService.generateTicket('A', 'normal');
    const t3 = QueueService.generateTicket('A', 'normal');

    assertEquals(QueueService.getAheadCount(t1.id), 0, 'Tiket t1 di antrean paling depan (0 pasien di depan)');
    assertEquals(QueueService.getAheadCount(t2.id), 1, 'Tiket t2 memiliki 1 pasien di depan');
    assertEquals(QueueService.getAheadCount(t3.id), 2, 'Tiket t3 memiliki 2 pasien di depan');

    // Panggil t1 ke loket
    QueueService.callNextTicket('Loket 01', 'A');
    assertEquals(QueueService.getAheadCount(t1.id), 0, 'Tiket yang sedang calling mengembalikan 0');
    assertEquals(QueueService.getAheadCount(t2.id), 0, 'Tiket t2 kini berada di urutan terdepan (0 pasien di depan)');
    assertEquals(QueueService.getAheadCount(t3.id), 1, 'Tiket t3 kini memiliki 1 pasien di depan');
  });

  test('Validasi DOM Kiosk (ambil-antrian.html): Elemen kartu tiket aktif & modal panggilan pasien', () => {
    const kioskHtml = fs.readFileSync(path.join(__dirname, 'ambil-antrian.html'), 'utf8');

    // Kartu tiket aktif pasien & komponennya
    assert(kioskHtml.includes('id="user-active-ticket-card"'), 'ambil-antrian.html wajib memuat id="user-active-ticket-card"');
    assert(kioskHtml.includes('id="user-active-status-badge"'), 'ambil-antrian.html wajib memuat id="user-active-status-badge"');
    assert(kioskHtml.includes('id="user-active-ticket-number"'), 'ambil-antrian.html wajib memuat id="user-active-ticket-number"');
    assert(kioskHtml.includes('id="user-active-service-name"'), 'ambil-antrian.html wajib memuat id="user-active-service-name"');
    assert(kioskHtml.includes('id="user-active-priority-badge"'), 'ambil-antrian.html wajib memuat id="user-active-priority-badge"');
    assert(kioskHtml.includes('id="user-active-ahead-count"'), 'ambil-antrian.html wajib memuat id="user-active-ahead-count"');
    assert(kioskHtml.includes('id="btnDropUserTicket"'), 'ambil-antrian.html wajib memuat id="btnDropUserTicket"');
    assert(kioskHtml.includes('id="user-quota-warning-banner"'), 'ambil-antrian.html wajib memuat id="user-quota-warning-banner"');

    // Modal notifikasi panggilan pasien
    assert(kioskHtml.includes('id="modal-patient-called"'), 'ambil-antrian.html wajib memuat id="modal-patient-called"');
    assert(kioskHtml.includes('id="patient-called-counter-text"'), 'ambil-antrian.html wajib memuat id="patient-called-counter-text"');
    assert(kioskHtml.includes('id="patient-called-ticket-text"'), 'ambil-antrian.html wajib memuat id="patient-called-ticket-text"');
    assert(kioskHtml.includes('id="btnClosePatientCalledModal"'), 'ambil-antrian.html wajib memuat id="btnClosePatientCalledModal"');
  });

  test('Validasi Script Kiosk (ambil-antrian.ts): Lifecycle tiket aktif, audio announcement & event handling', () => {
    const kioskTs = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'ambil-antrian.ts'), 'utf8');

    assert(kioskTs.includes('QueueService.getUserActiveTicket'), 'ambil-antrian.ts wajib memanggil getUserActiveTicket');
    assert(kioskTs.includes('QueueService.dropTicket'), 'ambil-antrian.ts wajib memanggil dropTicket');
    assert(kioskTs.includes('btnDropUserTicket'), 'ambil-antrian.ts wajib mengaitkan listener tombol btnDropUserTicket');
    assert(kioskTs.includes('modal-patient-called'), 'ambil-antrian.ts wajib mengontrol modal modal-patient-called');
    assert(kioskTs.includes('btnClosePatientCalledModal'), 'ambil-antrian.ts wajib mengaitkan listener btnClosePatientCalledModal');
    assert(kioskTs.includes('SpeechSynthesisUtterance'), 'ambil-antrian.ts wajib memainkan panggilan suara personal pasien');
  });
});

// ============================================================================
// FINAL SUMMARY REPORT
// ============================================================================
console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}                      RINGKASAN HASIL PENGUJIAN                           ${colors.reset}`);
console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`  Total Test Suites  : ${colors.bright}${totalSuites}${colors.reset} (${passedSuites} passed, ${totalSuites - passedSuites} failed)`);
console.log(`  Total Test Cases   : ${colors.bright}${totalTests}${colors.reset}`);
console.log(`  Passed Tests       : ${colors.green}${passedTests}${colors.reset}`);
console.log(`  Failed Tests       : ${failedTests > 0 ? colors.red : colors.green}${failedTests}${colors.reset}`);
console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

if (failedTests > 0) {
  console.error(`${colors.red}${colors.bright}❌ SMOKE TEST GAGAL: Ditemukan ${failedTests} kegagalan pada pengujian.${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`${colors.green}${colors.bright}✨ SELURUH VERIFIKASI BERHASIL (100% PASS)! Sistem siap untuk tahap akhir.${colors.reset}\n`);
  process.exit(0);
}
