import { StorageService } from '../services/storage.js';
import { QueueService } from '../services/queue.js';
import { SpeechService } from '../services/speech.js';
import { QueuePriority, ServiceType, AssistanceRequest } from '../models/types.js';
import { AuthService } from '../services/auth.js';

declare global {
  interface Window {
    setLanguage?: (lang: string) => void;
    selectPriority?: (el: HTMLElement, name: string, code: string) => void;
    openTicketModal?: (code: string, serviceName: string) => void;
    closeTicketModal?: () => void;
    printReceipt?: () => void;
    printPhysicalReceipt?: () => void;
    playVoiceGuide?: () => void;
    callAttendant?: () => void;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Public Kiosk Mode Mandiri (Bebas Login & Bebas Navigasi Staf)
  // DOM Elements
  const kioskServicesGrid = document.getElementById('kiosk-services-grid');
  const clockEl = document.getElementById('kiosk-live-clock');
  const modal = document.getElementById('ticket-modal-backdrop');
  const ticketCodeEl = document.getElementById('modal-ticket-code');
  const serviceNameEl = document.getElementById('modal-service-name');
  const priorityTextEl = document.getElementById('modal-priority-text');
  const waitEstimateEl = document.getElementById('modal-wait-estimate');
  const timestampEl = document.getElementById('modal-timestamp');
  const btnPrintAction = document.getElementById('btnPrintAction') || document.getElementById('btn-print-action');

  // Language state (persisted)
  let currentLang: 'id' | 'en' = (localStorage.getItem('kiosk_lang') as 'id' | 'en') || 'id';

  // Priority state
  let currentPriority: QueuePriority = 'normal';
  let currentPriorityLabel = 'Umum & Reguler';

  // Modal active selection
  let selectedServiceCode = '';
  let selectedServiceName = '';

  const getPriorityDisplayLabel = (priority: QueuePriority, lang: 'id' | 'en'): string => {
    if (lang === 'en') {
      switch (priority) {
        case 'vip': return 'Executive VIP Track';
        case 'disabilitas': return 'Disability Priority';
        case 'lansia': return 'Elderly Priority (≥ 60 Yrs)';
        case 'normal':
        default: return 'General / Regular Patient';
      }
    } else {
      switch (priority) {
        case 'vip': return 'Jalur VIP / Eksekutif';
        case 'disabilitas': return 'Prioritas Disabilitas';
        case 'lansia': return 'Prioritas Lansia (≥ 60 Thn)';
        case 'normal':
        default: return 'Pasien Reguler / Umum';
      }
    }
  };

  // Toast Functionality
  const showToast = (icon: string, message: string) => {
    const toast = document.getElementById('kiosk-toast');
    const iconEl = document.getElementById('toast-icon');
    const msgEl = document.getElementById('toast-message');

    if (!toast || !iconEl || !msgEl) return;

    iconEl.textContent = icon;
    msgEl.textContent = message;

    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');

    setTimeout(() => {
      toast.classList.remove('opacity-100');
      toast.classList.add('opacity-0', 'pointer-events-none');
    }, 3500);
  };

  // Clock & Date Update
  const updateClockAndDate = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    if (clockEl) {
      clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} WIB`;
    }
    const dateEl = document.getElementById('kiosk-live-date');
    if (dateEl) {
      if (currentLang === 'en') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dateEl.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
      } else {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        dateEl.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
      }
    }
  };

  // Apply Language to Static Interface
  const updateStaticUiLanguage = () => {
    const isEn = currentLang === 'en';

    // Header Welcome & Subtitle
    const statusBadge = document.getElementById('kiosk-status-badge');
    const mainTitle = document.getElementById('kiosk-main-title');
    const subTitle = document.getElementById('kiosk-sub-title');
    if (statusBadge) statusBadge.textContent = isEn ? 'Kiosk Terminal 02 • Ready to Serve' : 'Kiosk Terminal 02 • Siap Melayani';
    if (mainTitle) mainTitle.textContent = isEn ? 'Klinik Medika Utama - Self-Service Queue Kiosk' : 'Klinik Medika Utama - Kiosk Antrian Mandiri';
    if (subTitle) subTitle.textContent = isEn
      ? 'Please touch one of the service categories below to print your official queue ticket.'
      : 'Silakan sentuh salah satu kategori layanan di bawah ini untuk mencetak nomor antrian resmi Anda.';

    // Footer Discrete Staff Link
    const footerStaffPortal = document.getElementById('footer-staff-portal');
    if (footerStaffPortal) footerStaffPortal.textContent = isEn ? 'Medical Staff Portal' : 'Portal Staf Medis';

    // Priority Section
    const pSectionTitle = document.getElementById('priority-section-title');
    const pSectionSub = document.getElementById('priority-section-subtitle');
    if (pSectionTitle) pSectionTitle.textContent = isEn ? 'Special Priority Lane & Vulnerable Needs' : 'Jalur Prioritas Khusus & Kebutuhan Rentan';
    if (pSectionSub) pSectionSub.textContent = isEn ? 'Touch for medical triage priority' : 'Sentuh untuk prioritas triage medis';

    // Priority Badges Text
    const pVipTitle = document.getElementById('priority-vip-title');
    const pVipDesc = document.getElementById('priority-vip-desc');
    const pDisabTitle = document.getElementById('priority-disab-title');
    const pDisabDesc = document.getElementById('priority-disab-desc');
    const pElderTitle = document.getElementById('priority-elder-title');
    const pElderDesc = document.getElementById('priority-elder-desc');
    const pNormalTitle = document.getElementById('priority-normal-title');
    const pNormalDesc = document.getElementById('priority-normal-desc');

    if (pVipTitle) pVipTitle.textContent = 'VIP';
    if (pVipDesc) pVipDesc.textContent = isEn ? 'Executive VIP Track' : 'Jalur VIP / Eksekutif';

    if (pDisabTitle) pDisabTitle.textContent = isEn ? 'Disability' : 'Disabilitas';
    if (pDisabDesc) pDisabDesc.textContent = isEn ? 'Disability Priority' : 'Prioritas Disabilitas';

    if (pElderTitle) pElderTitle.textContent = isEn ? 'Elderly' : 'Lansia';
    if (pElderDesc) pElderDesc.textContent = isEn ? 'Elderly Priority (≥ 60 Yrs)' : 'Prioritas Lansia (≥ 60 Thn)';

    if (pNormalTitle) pNormalTitle.textContent = isEn ? 'General' : 'Normal';
    if (pNormalDesc) pNormalDesc.textContent = isEn ? 'General / Regular Patient' : 'Pasien Reguler / Umum';

    // Services Section
    const sSectionTitle = document.getElementById('services-section-title');
    const sSectionSub = document.getElementById('services-section-subtitle');
    if (sSectionTitle) sSectionTitle.textContent = isEn ? 'Select Polyclinic & Administration Service' : 'Pilih Layanan Poliklinik & Administrasi';
    if (sSectionSub) sSectionSub.textContent = isEn ? 'Touch any card to instantly print ticket' : 'Sentuh salah satu kartu untuk langsung mencetak nomor';

    // Toolbar
    const textAudioGuide = document.getElementById('text-audio-guide');
    const textVolumeLabel = document.getElementById('text-volume-label');
    const textNurseCall = document.getElementById('text-nurse-call');
    if (textAudioGuide) textAudioGuide.textContent = isEn ? 'Voice Guide' : 'Panduan Suara';
    if (textVolumeLabel) textVolumeLabel.textContent = isEn ? 'Kiosk Volume: 80%' : 'Volume Kiosk: 80%';
    if (textNurseCall) textNurseCall.textContent = isEn ? 'Staff Assistance / Priority Escort' : 'Bantuan Petugas / Pendampingan Prioritas';

    // Modal
    const modalTitle = document.getElementById('modal-title-text');
    const modalReceiptBadge = document.getElementById('modal-receipt-badge');
    const modalLabelTicket = document.getElementById('modal-label-ticket');
    const modalLabelService = document.getElementById('modal-label-service');
    const modalLabelTime = document.getElementById('modal-label-time');
    const modalLabelEstimate = document.getElementById('modal-label-estimate');
    const modalLabelLocation = document.getElementById('modal-label-location');
    const modalValLocation = document.getElementById('modal-val-location');
    const modalReceiptFooter = document.getElementById('modal-receipt-footer');
    const btnPrintPhysText = document.getElementById('btn-print-phys-text');
    const btnPrintSoftText = document.getElementById('btn-print-soft-text');
    const btnCloseModalText = document.getElementById('btn-close-modal-text');

    if (modalTitle) modalTitle.textContent = isEn ? 'Queue Ticket Preview' : 'Pratinjau Tiket Antrian';
    if (modalReceiptBadge) modalReceiptBadge.textContent = isEn ? 'Official Kiosk Receipt' : 'Struk Resmi Kiosk';
    if (modalLabelTicket) modalLabelTicket.textContent = isEn ? 'TICKET NUMBER' : 'NOMOR TIKET';
    if (modalLabelService) modalLabelService.textContent = isEn ? 'DESTINATION CLINIC' : 'POLIKLINIK TUJUAN';
    if (modalLabelTime) modalLabelTime.textContent = isEn ? 'TIMESTAMP:' : 'WAKTU CETAK:';
    if (modalLabelEstimate) modalLabelEstimate.textContent = isEn ? 'ESTIMATED WAIT TIME:' : 'ESTIMASI WAKTU TUNGGU:';
    if (modalLabelLocation) modalLabelLocation.textContent = isEn ? 'Counter Location:' : 'Lokasi Loket:';
    if (modalValLocation) modalValLocation.textContent = isEn ? '1st Floor - East Wing' : 'Lantai 1 - Sayap Timur';
    if (modalReceiptFooter) modalReceiptFooter.textContent = isEn ? '*Please keep this ticket until called.' : '*Harap simpan tiket ini hingga dipanggil.';
    if (btnPrintPhysText) btnPrintPhysText.textContent = isEn ? 'Print Physical Receipt' : 'Cetak Fisik Receipt';
    if (btnPrintSoftText) btnPrintSoftText.textContent = isEn ? 'Get Ticket' : 'Ambil Tiket';
    if (btnCloseModalText) btnCloseModalText.textContent = isEn ? 'Cancel' : 'Batal';

    // Buttons Pills
    const btnId = document.getElementById('lang-id');
    const btnEn = document.getElementById('lang-en');
    if (btnId && btnEn) {
      if (isEn) {
        btnEn.className = 'px-3.5 py-1.5 rounded-full font-label-md text-label-md bg-surface-container-lowest text-primary shadow-sm flex items-center gap-1.5 transition-all';
        btnId.className = 'px-3.5 py-1.5 rounded-full font-label-md text-label-md text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 transition-all';
      } else {
        btnId.className = 'px-3.5 py-1.5 rounded-full font-label-md text-label-md bg-surface-container-lowest text-primary shadow-sm flex items-center gap-1.5 transition-all';
        btnEn.className = 'px-3.5 py-1.5 rounded-full font-label-md text-label-md text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 transition-all';
      }
    }
  };

  // Language Switcher Handler
  window.setLanguage = (lang: string) => {
    currentLang = lang === 'en' ? 'en' : 'id';
    localStorage.setItem('kiosk_lang', currentLang);
    updateStaticUiLanguage();
    updateClockAndDate();
    renderKioskServices();

    if (currentLang === 'en') {
      showToast('language', 'Language switched to English');
    } else {
      showToast('language', 'Bahasa diubah ke Bahasa Indonesia');
    }
  };

  // Select Priority Handler
  window.selectPriority = (element: HTMLElement, priorityName: string, priorityCode: string) => {
    const code = priorityCode.toUpperCase();
    if (code.includes('VIP') || code.includes('EXECUTIVE')) {
      currentPriority = 'vip';
    } else if (code.includes('DISAB')) {
      currentPriority = 'disabilitas';
    } else if (code.includes('ELDER') || code.includes('LANSIA')) {
      currentPriority = 'lansia';
    } else {
      currentPriority = 'normal';
    }

    currentPriorityLabel = getPriorityDisplayLabel(currentPriority, currentLang);

    const allButtons = document.querySelectorAll('.priority-btn');
    allButtons.forEach(btn => btn.classList.remove('ring-2', 'ring-primary'));
    element.classList.add('ring-2', 'ring-primary');

    showToast('verified', currentLang === 'en'
      ? `Priority track active: ${currentPriorityLabel}`
      : `Jalur prioritas aktif: ${currentPriorityLabel}`);
  };

  // Render Kiosk Service Cards with Dynamic Language
  const renderKioskServices = () => {
    if (!kioskServicesGrid) return;

    const services = StorageService.getServices().filter(s => s.isActive);
    const waitingTickets = QueueService.getWaitingTickets();

    if (services.length === 0) {
      kioskServicesGrid.innerHTML = `
        <div class="col-span-full py-12 text-center bg-surface-container-lowest rounded-xl shadow-sm text-on-surface-variant font-medium">
          ${currentLang === 'en' ? 'Currently no polyclinic counters are available. Please contact admission desk.' : 'Saat ini tidak ada loket poli yang melayani. Silakan hubungi meja informasi staf admisi.'}
        </div>
      `;
      return;
    }

    const serviceCardsHtml = services.map(s => {
      const queueCount = waitingTickets.filter(t => t.serviceCode === s.code).length;
      const waitEst = queueCount * 3 + 4;

      let icon = 'medical_services';
      let title = s.name;
      let desc = currentLang === 'en'
        ? 'General practitioner consultation, primary medical triage & referrals.'
        : 'Konsultasi dokter umum, tindakan awal & rujukan medis terpadu.';

      if (currentLang === 'en') {
        if (s.code === 'A' || s.name.toLowerCase().includes('umum')) {
          title = 'General Polyclinic';
        } else if (s.code === 'B' || s.name.toLowerCase().includes('anak')) {
          title = 'Pediatrics & Immunization';
          icon = 'child_care';
          desc = 'Pediatric specialist, child vaccination & infant nutrition.';
        } else if (s.code === 'C' || s.name.toLowerCase().includes('dalam') || s.name.toLowerCase().includes('geriatri')) {
          title = 'Internal Medicine Polyclinic';
          icon = 'elderly';
          desc = 'Internal medicine specialist, geriatrics & metabolic consultation.';
        } else if (s.code === 'D' || s.name.toLowerCase().includes('farmasi') || s.name.toLowerCase().includes('obat')) {
          title = 'Pharmacy & Prescription';
          icon = 'medication';
          desc = 'Prescription dispensing, drug verification & medication counseling.';
        } else if (s.code === 'E' || s.name.toLowerCase().includes('kasir') || s.name.toLowerCase().includes('bpjs')) {
          title = 'Cashier & Administration';
          icon = 'payments';
          desc = 'Hospital billing counter, invoice printout & insurance verification.';
        }
      } else {
        if (s.code === 'B' || s.name.toLowerCase().includes('anak')) {
          icon = 'child_care';
          desc = 'Spesialis anak, vaksinasi imunisasi balita & konsultasi gizi.';
        } else if (s.code === 'C' || s.name.toLowerCase().includes('dalam') || s.name.toLowerCase().includes('geriatri')) {
          icon = 'elderly';
          desc = 'Pemeriksaan spesialis penyakit dalam, lansia & konsultasi metabolik.';
        } else if (s.code === 'D' || s.name.toLowerCase().includes('farmasi') || s.name.toLowerCase().includes('obat')) {
          icon = 'medication';
          desc = 'Pengambilan obat resep dokter, verifikasi asuransi & edukasi obat.';
        } else if (s.code === 'E' || s.name.toLowerCase().includes('kasir') || s.name.toLowerCase().includes('bpjs')) {
          icon = 'payments';
          desc = 'Front office kasir, cetak rincian billing & verifikasi BPJS Kesehatan.';
        }
      }

      return `
        <button class="group text-left bg-surface-container-lowest rounded-xl p-6 min-h-[190px] shadow-sm hover:shadow-md hover:bg-surface-bright active:scale-[0.99] transition-all flex flex-col justify-between relative overflow-hidden cursor-pointer" data-service-code="${s.code}" data-service-name="${escapeHtml(title)}" onclick="openTicketModal('${s.code}', '${escapeHtml(title)}')" type="button">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-4">
              <div class="w-14 h-14 rounded-lg bg-surface-container-low text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                <span class="material-symbols-outlined text-[32px]">${icon}</span>
              </div>
              <div>
                <span class="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">${currentLang === 'en' ? 'CODE' : 'KODE'} ${s.code}</span>
                <h3 class="font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors">${escapeHtml(title)}</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                  ${desc}
                </p>
              </div>
            </div>
            <span class="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center font-title-sm text-title-sm text-on-surface shrink-0 font-bold group-hover:bg-primary group-hover:text-on-primary transition-colors">
              ${s.code}
            </span>
          </div>
          <div class="mt-6 pt-3 flex items-center justify-between bg-surface-container-low/50 -mx-6 -mb-6 px-6 py-3 rounded-b-xl">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary text-[18px]">group</span>
              <span class="font-label-md text-label-md text-on-surface">${queueCount} ${currentLang === 'en' ? 'Patients Waiting' : 'Pasien Menunggu'}</span>
            </div>
            <span class="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded shadow-sm">~${waitEst} ${currentLang === 'en' ? 'mins' : 'mnt'}</span>
          </div>
        </button>
      `;
    }).join('');

    // Append online check-in card
    const onlineCardHtml = `
      <div class="bg-surface-container-low/70 border border-outline-variant/60 rounded-xl p-6 min-h-[190px] flex flex-col justify-between">
        <div class="flex items-start gap-4">
          <div class="w-14 h-14 rounded-lg bg-surface-container text-primary flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[32px]">qr_code_scanner</span>
          </div>
          <div>
            <span class="font-label-sm text-label-sm text-primary uppercase font-bold">${currentLang === 'en' ? 'Self Check-In Online' : 'Check-In Mandiri Online'}</span>
            <h4 class="font-title-sm text-title-sm text-on-surface mt-0.5">${currentLang === 'en' ? 'Already reserved via JKN Mobile?' : 'Sudah reservasi via JKN Mobile?'}</h4>
            <p class="font-body-sm text-body-sm text-on-surface-variant mt-1">
              ${currentLang === 'en' ? 'Scan your confirmation barcode or QR code on the scanner below.' : 'Dekatkan barcode atau QR code konfirmasi tiket pada scanner di bawah layar.'}
            </p>
          </div>
        </div>
        <div class="flex items-center justify-between pt-3">
          <span class="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface">
            <span class="material-symbols-outlined text-secondary text-[16px]">sensors</span> ${currentLang === 'en' ? 'Scanner Active' : 'Scanner Aktif'}
          </span>
          <span class="font-label-sm text-label-sm text-on-surface-variant">${currentLang === 'en' ? 'Auto Connected' : 'Otomatis Terhubung'}</span>
        </div>
      </div>
    `;

    kioskServicesGrid.innerHTML = serviceCardsHtml + onlineCardHtml;
  };

  const escapeHtml = (str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  // Modal Open
  window.openTicketModal = (code: string, serviceName: string) => {
    SpeechService.unlockAudio();
    const currentUser = AuthService.getCurrentUser();
    if (currentUser && currentUser.role === 'user') {
      const activeTicket = QueueService.getUserActiveTicket(currentUser.username) ||
        (currentUser.id ? QueueService.getUserActiveTicket(String(currentUser.id)) : null);
      if (activeTicket) {
        showToast('warning', currentLang === 'en'
          ? 'You already have an active ticket. Please finish or cancel it first.'
          : 'Anda sudah memiliki tiket aktif. Selesaikan atau batalkan tiket terlebih dahulu.');
        return;
      }
    }

    const cleanCode = (code || '').trim().toUpperCase();
    const services = StorageService.getServices();
    const service = services.find(s => s.code.toUpperCase() === cleanCode);

    if (!service || !service.isActive) {
      showToast('block', currentLang === 'en'
        ? `Service [${cleanCode}] is currently disabled by administrator.`
        : `Layanan [${cleanCode}] saat ini sedang dinonaktifkan oleh administrator.`);
      renderKioskServices();
      return;
    }

    selectedServiceCode = service.code;
    selectedServiceName = service.name || serviceName;

    const nextSeq = (service.currentNumber || 0) + 1;
    const formattedCode = `${service.code}-${String(nextSeq).padStart(3, '0')}`;

    const waitingTickets = QueueService.getWaitingTickets();
    const queueCount = waitingTickets.filter(t => t.serviceCode === service.code).length;

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateFormatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} - ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

    let displayServiceName = service.name;
    if (currentLang === 'en') {
      if (service.code === 'A' || service.name.toLowerCase().includes('umum')) {
        displayServiceName = 'General Polyclinic';
      } else if (service.code === 'B' || service.name.toLowerCase().includes('anak')) {
        displayServiceName = 'Pediatrics & Immunization';
      } else if (service.code === 'C' || service.name.toLowerCase().includes('dalam')) {
        displayServiceName = 'Internal Medicine Polyclinic';
      } else if (service.code === 'D' || service.name.toLowerCase().includes('farmasi')) {
        displayServiceName = 'Pharmacy & Prescription';
      } else if (service.code === 'E' || service.name.toLowerCase().includes('kasir')) {
        displayServiceName = 'Cashier & Administration';
      }
    }

    if (ticketCodeEl) ticketCodeEl.textContent = formattedCode;
    if (serviceNameEl) serviceNameEl.textContent = displayServiceName;
    if (priorityTextEl) {
      const priorityLabel = getPriorityDisplayLabel(currentPriority, currentLang);
      priorityTextEl.textContent = currentLang === 'en'
        ? `PRIORITY CATEGORY: ${priorityLabel}`
        : `KATEGORI PRIORITAS: ${priorityLabel}`;
    }
    if (waitEstimateEl) {
      const minsWord = currentLang === 'en' ? 'Mins' : 'Menit';
      const aheadWord = currentLang === 'en' ? 'Patients ahead' : 'Pasien di depan';
      waitEstimateEl.textContent = `~${queueCount * 3 + 2} ${minsWord} (${queueCount} ${aheadWord})`;
    }
    if (timestampEl) timestampEl.textContent = dateFormatted;

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  };

  // Modal Close
  window.closeTicketModal = () => {
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  };

  // Ticket printing debounce guard
  let isProcessingTicket = false;

  // Print Physical Receipt (window.print())
  window.printPhysicalReceipt = () => {
    SpeechService.unlockAudio();
    if (!selectedServiceCode) return;
    if (isProcessingTicket) return;
    isProcessingTicket = true;

    try {
      const currentUser = AuthService.getCurrentUser();
      const meta = currentUser ? { userId: String(currentUser.id), username: currentUser.username } : undefined;
      const ticket = QueueService.generateTicket(selectedServiceCode, currentPriority, meta);
      if (ticketCodeEl) ticketCodeEl.textContent = ticket.ticketNumber;
      if (serviceNameEl) serviceNameEl.textContent = ticket.serviceName;

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateFormatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} - ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;
      if (timestampEl) timestampEl.textContent = dateFormatted;

      showToast('print', currentLang === 'en'
        ? `Ticket ${ticket.ticketNumber} printed. Opening thermal print dialog...`
        : `Tiket ${ticket.ticketNumber} dicetak. Membuka dialog print thermal...`);
      renderKioskServices();
      renderUserActiveTicketState();

      // Tutup modal tiket pratinjau terlebih dahulu agar tidak terblokir dialog printer browser
      window.closeTicketModal?.();

      // Trigger browser window.print() secara aman tanpa memblokir sistem
      setTimeout(() => {
        try {
          window.print();
        } catch {
          // Abaikan jika browser membatasi dialog cetak
        }
      }, 150);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (currentLang === 'en' ? 'Failed to print ticket.' : 'Gagal mencetak tiket.');
      showToast('error', msg);
      alert(msg);
      renderUserActiveTicketState();
    } finally {
      setTimeout(() => {
        isProcessingTicket = false;
      }, 1000);
    }
  };

  // Print Receipt Action (Digital / Soft issue)
  window.printReceipt = () => {
    SpeechService.unlockAudio();
    if (!selectedServiceCode) return;
    if (isProcessingTicket) return;
    isProcessingTicket = true;

    try {
      const currentUser = AuthService.getCurrentUser();
      const meta = currentUser ? { userId: String(currentUser.id), username: currentUser.username } : undefined;
      const ticket = QueueService.generateTicket(selectedServiceCode, currentPriority, meta);
      window.closeTicketModal?.();
      showToast('print', currentLang === 'en'
        ? `Ticket ${ticket.ticketNumber} successfully generated! Please take your printed ticket.`
        : `Tiket ${ticket.ticketNumber} berhasil dicetak! Silakan ambil kertas tiket Anda.`);
      renderKioskServices();
      renderUserActiveTicketState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (currentLang === 'en' ? 'Failed to print ticket.' : 'Gagal mencetak tiket.');
      showToast('error', msg);
      alert(msg);
      renderUserActiveTicketState();
    } finally {
      setTimeout(() => {
        isProcessingTicket = false;
      }, 1000);
    }
  };

  // Assistive Audio Guides
  window.playVoiceGuide = () => {
    SpeechService.unlockAudio();
    showToast('volume_up', currentLang === 'en'
      ? 'Playing voice guide: Please touch your destination clinic service button.'
      : 'Memutar panduan suara: Silakan sentuh tombol layanan yang Anda tuju.');
    SpeechService.announceTicket('Panduan', 'Kiosk Mandiri');
  };

  window.callAttendant = () => {
    SpeechService.unlockAudio();
    const req: AssistanceRequest = {
      id: 'ast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      source: 'Kiosk Mandiri 02 (Lobby Admisi)',
      timestamp: Date.now(),
      status: 'pending'
    };
    StorageService.addAssistanceRequest(req);
    showToast('notifications_active', currentLang === 'en'
      ? 'Assistance request dispatched. An attendant will arrive shortly.'
      : 'Panggilan bantuan terkirim. Petugas pendamping segera menuju kiosk ini.');
  };

  // Render status tiket aktif milik user pasien
  const renderUserActiveTicketState = () => {
    const currentUser = AuthService.getCurrentUser();
    const activeTicketCard = document.getElementById('user-active-ticket-card');
    const quotaBanner = document.getElementById('user-quota-warning-banner');
    const ticketNumberEl = document.getElementById('user-active-ticket-number');
    const serviceNameEl = document.getElementById('user-active-service-name');
    const priorityBadgeEl = document.getElementById('user-active-priority-badge');
    const aheadCountEl = document.getElementById('user-active-ahead-count');
    const statusBadgeEl = document.getElementById('user-active-status-badge');

    if (currentUser && currentUser.role === 'user') {
      const activeTicket = QueueService.getUserActiveTicket(currentUser.username) ||
        (currentUser.id ? QueueService.getUserActiveTicket(String(currentUser.id)) : null);

      if (activeTicket) {
        if (activeTicketCard) {
          activeTicketCard.classList.remove('hidden');
        }
        if (quotaBanner) {
          quotaBanner.classList.remove('hidden');
        }
        if (ticketNumberEl) {
          ticketNumberEl.textContent = activeTicket.ticketNumber;
        }
        if (serviceNameEl) {
          serviceNameEl.textContent = activeTicket.serviceName;
        }
        if (priorityBadgeEl) {
          priorityBadgeEl.textContent = activeTicket.priority.toUpperCase();
        }
        if (aheadCountEl) {
          const ahead = QueueService.getAheadCount(activeTicket.id);
          aheadCountEl.textContent = `${ahead} Pasien di depan Anda`;
        }
        if (statusBadgeEl) {
          if (activeTicket.status === 'calling') {
            statusBadgeEl.className = 'px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border-2 border-emerald-500 font-bold animate-pulse inline-flex items-center gap-1';
            statusBadgeEl.textContent = 'SEDANG DIPANGGIL • SEGERA MENUJU LOKET';
            if (activeTicketCard) {
              activeTicketCard.classList.add('border-2', 'border-emerald-500');
            }
          } else {
            statusBadgeEl.className = 'px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm font-semibold';
            statusBadgeEl.textContent = 'Menunggu Antrean';
            if (activeTicketCard) {
              activeTicketCard.classList.remove('border-2', 'border-emerald-500');
            }
          }
        }
        return;
      }
    }

    if (activeTicketCard) {
      activeTicketCard.classList.add('hidden');
      activeTicketCard.classList.remove('border-2', 'border-emerald-500');
    }
    if (quotaBanner) {
      quotaBanner.classList.add('hidden');
    }
  };

  // State memori untuk pelacakan status tiket aktif pasien
  let prevActiveTicketStatus: string | null = null;

  const handlePatientNotificationAndSync = () => {
    const currentUser = AuthService.getCurrentUser();
    if (currentUser && currentUser.role === 'user') {
      const userTicket = QueueService.getUserActiveTicket(currentUser.username) ||
        (currentUser.id ? QueueService.getUserActiveTicket(String(currentUser.id)) : null);

      if (prevActiveTicketStatus === 'waiting' && userTicket?.status === 'calling') {
        const modalPatient = document.getElementById('modal-patient-called');
        const counterText = document.getElementById('patient-called-counter-text');
        const ticketText = document.getElementById('patient-called-ticket-text');

        if (counterText) {
          counterText.textContent = `Silakan segera menuju ${userTicket.counterName || userTicket.serviceName}`;
        }
        if (ticketText) {
          ticketText.textContent = `Pasien ${currentUser.firstName} ${currentUser.lastName} • Nomor Antrean ${userTicket.ticketNumber}`;
        }
        if (modalPatient) {
          modalPatient.classList.remove('hidden');
          modalPatient.classList.add('flex');
        }

        try {
          SpeechService.unlockAudio();
          const textId = `Panggilan untuk saudara ${currentUser.firstName}, nomor antrian ${userTicket.ticketNumber.replace('-', ' ')}, silakan menuju ${userTicket.counterName || userTicket.serviceName}.`;
          const utter = new SpeechSynthesisUtterance(textId);
          utter.lang = 'id-ID';
          utter.rate = 0.95;
          window.speechSynthesis.speak(utter);
        } catch (speechErr) {
          console.warn('Patient speech announcement error:', speechErr);
        }
      }

      prevActiveTicketStatus = userTicket ? userTicket.status : null;
    } else {
      prevActiveTicketStatus = null;
    }

    renderUserActiveTicketState();
  };

  // Explicit Button Listeners
  document.getElementById('btnPrintPhysical')?.addEventListener('click', () => {
    window.printPhysicalReceipt?.();
  });

  btnPrintAction?.addEventListener('click', () => {
    window.printReceipt?.();
  });

  document.getElementById('btnCloseModalHeader')?.addEventListener('click', () => {
    window.closeTicketModal?.();
  });

  document.getElementById('btnCloseModalFooter')?.addEventListener('click', () => {
    window.closeTicketModal?.();
  });

  modal?.addEventListener('click', (e: MouseEvent) => {
    if (e.target === modal) {
      window.closeTicketModal?.();
    }
  });

  document.getElementById('btn-audio-guide')?.addEventListener('click', () => {
    window.playVoiceGuide?.();
  });

  document.getElementById('btn-nurse-call')?.addEventListener('click', () => {
    window.callAttendant?.();
  });

  document.getElementById('btnDropUserTicket')?.addEventListener('click', () => {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) return;
    const activeTicket = QueueService.getUserActiveTicket(currentUser.username) ||
      (currentUser.id ? QueueService.getUserActiveTicket(String(currentUser.id)) : null);
    if (!activeTicket) return;

    if (confirm('Apakah Anda yakin ingin membatalkan tiket antrean ini?')) {
      try {
        QueueService.dropTicket(activeTicket.id);
        showToast('check_circle', 'Tiket antrian berhasil dibatalkan.');
        renderUserActiveTicketState();
        renderKioskServices();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal membatalkan tiket.';
        alert(msg);
      }
    }
  });

  document.getElementById('btnClosePatientCalledModal')?.addEventListener('click', () => {
    const modalPatient = document.getElementById('modal-patient-called');
    if (modalPatient) {
      modalPatient.classList.add('hidden');
      modalPatient.classList.remove('flex');
    }
  });

  const modalPatientEl = document.getElementById('modal-patient-called');
  modalPatientEl?.addEventListener('click', (e: MouseEvent) => {
    if (e.target === modalPatientEl) {
      modalPatientEl.classList.add('hidden');
      modalPatientEl.classList.remove('flex');
    }
  });

  document.getElementById('lang-id')?.addEventListener('click', () => {
    window.setLanguage?.('id');
  });

  document.getElementById('lang-en')?.addEventListener('click', () => {
    window.setLanguage?.('en');
  });

  // Priority Selector Delegation
  const priorityGroup = document.getElementById('priority-selector-group');
  priorityGroup?.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest('.priority-btn') as HTMLElement | null;
    if (!btn) return;
    const name = btn.getAttribute('data-priority-name') || btn.querySelector('.font-title-sm')?.textContent || 'Umum';
    const code = btn.getAttribute('data-priority-code') || 'REGULAR';
    window.selectPriority?.(btn, name, code);
  });

  // Service Cards Grid Delegation
  kioskServicesGrid?.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest('button[data-service-code]') as HTMLElement | null;
    if (!btn) return;
    const currentUser = AuthService.getCurrentUser();
    if (currentUser && currentUser.role === 'user') {
      const activeTicket = QueueService.getUserActiveTicket(currentUser.username) ||
        (currentUser.id ? QueueService.getUserActiveTicket(String(currentUser.id)) : null);
      if (activeTicket) {
        showToast('warning', currentLang === 'en'
          ? 'You already have an active ticket. Please finish or cancel it first.'
          : 'Anda sudah memiliki tiket aktif. Selesaikan atau batalkan tiket terlebih dahulu.');
        return;
      }
    }
    const code = btn.getAttribute('data-service-code');
    const name = btn.getAttribute('data-service-name') || code || '';
    if (code) {
      window.openTicketModal?.(code, name);
    }
  });

  // Keyboard Navigation: Escape closes modal
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      window.closeTicketModal?.();
      const modalPatient = document.getElementById('modal-patient-called');
      if (modalPatient) {
        modalPatient.classList.add('hidden');
        modalPatient.classList.remove('flex');
      }
    }
  });

  // Unlock audio on initial user touch/click/key
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => {
      SpeechService.unlockAudio();
    }, { passive: true });
  });

  // Initial Execution & Sync
  updateStaticUiLanguage();
  updateClockAndDate();
  setInterval(updateClockAndDate, 1000);

  renderKioskServices();
  handlePatientNotificationAndSync();

  window.addEventListener('storage', () => {
    renderKioskServices();
    handlePatientNotificationAndSync();
  });

  StorageService.onSync(() => {
    renderKioskServices();
    handlePatientNotificationAndSync();
  });

  // Polling interval fallback for reliable kiosk screen updates (1.5 detik)
  setInterval(() => {
    renderKioskServices();
    handlePatientNotificationAndSync();
  }, 1500);
});
