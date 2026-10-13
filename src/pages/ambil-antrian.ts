import { StorageService } from '../services/storage.js';
import { QueueService } from '../services/queue.js';
import { SpeechService } from '../services/speech.js';
import { QueuePriority, ServiceType, AssistanceRequest, Ticket } from '../models/types.js';
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
  const btnAmbilNomor = document.getElementById('btnAmbilNomor');
  const kioskSelectedSummary = document.getElementById('kioskSelectedSummary');
  const kioskAvailableCount = document.getElementById('kioskAvailableCount');
  const modalCurrentCallingText = document.getElementById('modalCurrentCallingText');
  const modalWaitingCountText = document.getElementById('modalWaitingCountText');
  const modalQueueNote = document.getElementById('modalQueueNote');

  // Language state (persisted)
  let currentLang: 'id' | 'en' = (localStorage.getItem('kiosk_lang') as 'id' | 'en') || 'id';

  // Priority state
  let currentPriority: QueuePriority = 'normal';
  let currentPriorityLabel = 'Normal';

  // Selected Service state (Default: A / UMUM-1)
  let selectedServiceCode = 'A';
  let selectedServiceName = 'UMUM-1';

  const getPriorityDisplayLabel = (priority: QueuePriority, lang: 'id' | 'en'): string => {
    switch (priority) {
      case 'vip': return 'VIP';
      case 'disabilitas': return 'Disabilitas';
      case 'lansia': return 'Lansia';
      case 'normal':
      default: return 'Normal';
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
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      dateEl.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    }
  };

  // Language Switcher Handler
  window.setLanguage = (lang: string) => {
    currentLang = lang === 'en' ? 'en' : 'id';
    localStorage.setItem('kiosk_lang', currentLang);
    updateClockAndDate();
    renderKioskServices();
  };

  // Update Summary Pill (Bottom of Card)
  const updateSelectedSummary = () => {
    if (kioskSelectedSummary) {
      kioskSelectedSummary.textContent = `${selectedServiceName} · ${currentPriorityLabel}`;
    }
  };

  // Select Priority Handler (Figma Pills)
  window.selectPriority = (element: HTMLElement, priorityName: string, priorityCode: string) => {
    const code = priorityCode.toUpperCase();
    if (code.includes('VIP') || code.includes('EXECUTIVE')) {
      currentPriority = 'vip';
      currentPriorityLabel = 'VIP';
    } else if (code.includes('DISAB')) {
      currentPriority = 'disabilitas';
      currentPriorityLabel = 'Disabilitas';
    } else if (code.includes('ELDER') || code.includes('LANSIA')) {
      currentPriority = 'lansia';
      currentPriorityLabel = 'Lansia';
    } else {
      currentPriority = 'normal';
      currentPriorityLabel = 'Normal';
    }

    const allPills = document.querySelectorAll('.priority-pill');
    allPills.forEach(pill => {
      const isCurrent = pill === element || pill.getAttribute('data-priority-name') === currentPriorityLabel;
      if (isCurrent) {
        pill.className = 'priority-pill group bg-[#EBF4EE] border-2 border-[#235347] rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 cursor-pointer transition-all';
        const radio = pill.querySelector('.priority-radio');
        if (radio) {
          radio.className = 'priority-radio w-4 h-4 rounded-full border-2 border-[#235347] flex items-center justify-center flex-shrink-0';
          radio.innerHTML = '<span class="w-2 h-2 rounded-full bg-[#235347]"></span>';
        }
        const text = pill.querySelector('span:last-child');
        if (text) {
          text.className = 'text-sm font-semibold text-[#111827]';
        }
      } else {
        pill.className = 'priority-pill group bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 cursor-pointer transition-all';
        const radio = pill.querySelector('.priority-radio');
        if (radio) {
          radio.className = 'priority-radio w-4 h-4 rounded-full border border-[#D1D5DB] flex items-center justify-center flex-shrink-0';
          radio.innerHTML = '';
        }
        const text = pill.querySelector('span:last-child');
        if (text) {
          text.className = 'text-sm font-medium text-[#4B5563]';
        }
      }
    });

    updateSelectedSummary();
  };

  const escapeHtml = (str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  // Render Kiosk Service Cards (Exact 100% Figma Match)
  const renderKioskServices = () => {
    if (!kioskServicesGrid) return;

    const services = StorageService.getServices().filter(s => s.isActive);
    const waitingTickets = QueueService.getWaitingTickets();

    if (kioskAvailableCount) {
      kioskAvailableCount.textContent = `${services.length} layanan tersedia`;
    }

    if (services.length === 0) {
      kioskServicesGrid.innerHTML = `
        <div class="col-span-full py-12 text-center bg-white rounded-xl border border-[#E5E7EB] text-[#6B7280] font-medium">
          Saat ini tidak ada loket layanan yang aktif. Silakan hubungi meja informasi atau petugas admisi.
        </div>
      `;
      return;
    }

    // Default select first service if selectedServiceCode not in list
    if (!services.some(s => s.code.toUpperCase() === selectedServiceCode.toUpperCase())) {
      selectedServiceCode = services[0].code;
      selectedServiceName = services[0].name;
    }

    kioskServicesGrid.innerHTML = services.map(s => {
      const queueCount = waitingTickets.filter(t => t.serviceCode === s.code).length;
      const isSelected = s.code.toUpperCase() === selectedServiceCode.toUpperCase();

      if (isSelected) {
        selectedServiceName = s.name;
      }

      return `
        <button 
          type="button" 
          data-service-code="${s.code}" 
          data-service-name="${escapeHtml(s.name)}" 
          class="kiosk-service-card group rounded-xl p-4 flex items-center justify-between text-left cursor-pointer transition-all ${
            isSelected 
              ? 'bg-[#EBF4EE] border-2 border-[#235347] shadow-xs' 
              : 'bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#FAFCFB]'
          }"
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg ${
              isSelected ? 'bg-[#235347] text-white' : 'bg-[#F3F4F6] text-[#374151]'
            } font-bold flex items-center justify-center text-sm flex-shrink-0 transition-colors">
              ${s.code}
            </div>
            <div>
              <h4 class="text-sm font-bold text-[#111827] leading-tight">${escapeHtml(s.name)}</h4>
              <span class="text-xs text-[#6B7280] mt-0.5 block">${queueCount} tiket menunggu</span>
            </div>
          </div>
          <div class="w-5 h-5 rounded-full ${
            isSelected ? 'border-2 border-[#235347] flex items-center justify-center' : 'border border-[#D1D5DB]'
          } flex-shrink-0 transition-all">
            ${isSelected ? '<span class="w-2.5 h-2.5 rounded-full bg-[#235347]"></span>' : ''}
          </div>
        </button>
      `;
    }).join('');

    updateSelectedSummary();
  };

  // Generate Ticket and Pop Up Success Modal (Figma Spec)
  const generateAndShowTicket = () => {
    SpeechService.unlockAudio();
    if (!selectedServiceCode) return;

    try {
      const currentUser = AuthService.getCurrentUser();
      const meta = {
        userId: currentUser ? String(currentUser.id) : undefined,
        username: currentUser ? (currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : currentUser.username) : undefined,
        isManualByAdmin: true // Kiosk publik: izinkan pengambilan banyak tiket untuk umum
      };

      const ticket = QueueService.generateTicket(selectedServiceCode, currentPriority, meta);
      const tickets = StorageService.getTickets();
      const waitingForThisService = tickets.filter(t => t.serviceCode === ticket.serviceCode && t.status === 'waiting');
      const callingTicket = tickets.find(t => t.serviceCode === ticket.serviceCode && t.status === 'calling');
      const aheadCount = QueueService.getAheadCount(ticket.id);

      // Populate Modal Fields (Figma Spec)
      if (ticketCodeEl) ticketCodeEl.textContent = ticket.ticketNumber;
      if (serviceNameEl) serviceNameEl.textContent = ticket.serviceName;
      if (priorityTextEl) {
        priorityTextEl.textContent = `• ${currentPriorityLabel}`;
      }
      if (modalCurrentCallingText) {
        modalCurrentCallingText.textContent = callingTicket ? callingTicket.ticketNumber : '—';
      }
      if (modalWaitingCountText) {
        modalWaitingCountText.textContent = `${waitingForThisService.length} tiket`;
      }
      if (modalQueueNote) {
        if (aheadCount === 0) {
          modalQueueNote.textContent = 'Tidak ada tiket menunggu di depan Anda. Simpan nomor ini dan pantau panggilan pada Layar Antrian.';
        } else {
          modalQueueNote.textContent = `Ada ${aheadCount} tiket menunggu di depan Anda. Simpan nomor ini dan pantau panggilan pada Layar Antrian.`;
        }
      }

      // Populate contract hidden fields
      if (waitEstimateEl) waitEstimateEl.textContent = `~${waitingForThisService.length * 3 + 2} Menit`;
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      if (timestampEl) timestampEl.textContent = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} - ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

      // Show modal
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }

      showToast('check_circle', `Nomor antrian ${ticket.ticketNumber} berhasil diambil.`);
      renderKioskServices();
      renderUserActiveTicketState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengambil nomor antrian.';
      showToast('error', msg);
      alert(msg);
      renderUserActiveTicketState();
    }
  };

  // Ambil Nomor Button Click
  btnAmbilNomor?.addEventListener('click', () => {
    generateAndShowTicket();
  });

  // Modal Close Function
  window.closeTicketModal = () => {
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  };

  // Backward-compatible openTicketModal
  window.openTicketModal = (code: string, serviceName: string) => {
    selectedServiceCode = code;
    selectedServiceName = serviceName;
    renderKioskServices();
    generateAndShowTicket();
  };

  // "Ambil Antrian Lain" button inside modal
  btnPrintAction?.addEventListener('click', () => {
    window.closeTicketModal?.();
    showToast('info', 'Silakan pilih layanan dan klik Ambil Nomor untuk antrian berikutnya.');
  });

  window.printReceipt = () => {
    window.closeTicketModal?.();
  };

  window.printPhysicalReceipt = () => {
    window.closeTicketModal?.();
  };

  // Assistive Audio Guides & Attendant Call
  window.playVoiceGuide = () => {
    SpeechService.unlockAudio();
    showToast('volume_up', 'Memutar panduan suara: Silakan pilih layanan dan prioritas, lalu sentuh Ambil Nomor.');
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
    showToast('notifications_active', 'Panggilan bantuan terkirim. Petugas pendamping segera menuju kiosk ini.');
  };

  // Render status tiket aktif milik user pasien (DOM contract verification)
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
        if (activeTicketCard) activeTicketCard.classList.remove('hidden');
        if (quotaBanner) quotaBanner.classList.remove('hidden');
        if (ticketNumberEl) ticketNumberEl.textContent = activeTicket.ticketNumber;
        if (serviceNameEl) serviceNameEl.textContent = activeTicket.serviceName;
        if (priorityBadgeEl) priorityBadgeEl.textContent = activeTicket.priority.toUpperCase();
        if (aheadCountEl) {
          const ahead = QueueService.getAheadCount(activeTicket.id);
          aheadCountEl.textContent = `${ahead} Pasien di depan Anda`;
        }
        if (statusBadgeEl) {
          statusBadgeEl.textContent = activeTicket.status === 'calling' ? 'SEDANG DIPANGGIL' : 'Menunggu Antrean';
        }
        return;
      }
    }

    if (activeTicketCard) activeTicketCard.classList.add('hidden');
    if (quotaBanner) quotaBanner.classList.add('hidden');
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

  // Event Listeners
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

  document.getElementById('lang-id')?.addEventListener('click', () => {
    window.setLanguage?.('id');
  });

  document.getElementById('lang-en')?.addEventListener('click', () => {
    window.setLanguage?.('en');
  });

  // Priority Selector Delegation
  const priorityGroup = document.getElementById('priority-selector-group');
  priorityGroup?.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest('.priority-pill') as HTMLElement | null;
    if (!btn) return;
    const name = btn.getAttribute('data-priority-name') || btn.querySelector('span:last-child')?.textContent || 'Normal';
    const code = btn.getAttribute('data-priority-code') || 'REGULAR';
    window.selectPriority?.(btn, name, code);
  });

  // Service Cards Grid Delegation
  kioskServicesGrid?.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest('button[data-service-code]') as HTMLElement | null;
    if (!btn) return;
    const code = btn.getAttribute('data-service-code');
    const name = btn.getAttribute('data-service-name') || code || '';
    if (code) {
      selectedServiceCode = code;
      selectedServiceName = name;
      renderKioskServices();
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

  // Polling interval for kiosk service list & waiting numbers
  setInterval(() => {
    renderKioskServices();
    handlePatientNotificationAndSync();
  }, 1500);
});
