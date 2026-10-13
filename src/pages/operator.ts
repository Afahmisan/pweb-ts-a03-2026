import { AuthService, renderNavbar } from '../services/auth.js';
import { StorageService, getCounterForService } from '../services/storage.js';
import { QueueService } from '../services/queue.js';
import { SpeechService } from '../services/speech.js';
import { Ticket, QueuePriority, PRIORITY_CONFIGS, ServiceType } from '../models/types.js';

declare global {
  interface Window {
    callNext?: (serviceCode?: string) => void;
    callRepeat?: () => void;
    callSkip?: (serviceCode?: string) => void;
    callComplete?: (serviceCode?: string) => void;
    testSound?: () => void;
    callNextPriority?: () => void;
    callSkipPriority?: () => void;
    callCompletePriority?: () => void;
    callPatientDirect?: (ticketId: string) => void;
    skipPatientDirect?: (ticketId: string) => void;
    completePatientDirect?: (ticketId: string) => void;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Auth Guard: hanya admin, moderator, dan operator
  const currentUser = AuthService.requireAuth(['admin', 'moderator', 'operator']);
  if (!currentUser) return;

  // DOM Elements - Profile & Header
  const userFullName = document.getElementById('userFullName');
  const userRoleBadge = document.getElementById('userRoleBadge');
  const userAvatar = document.getElementById('userAvatar') as HTMLImageElement | null;
  const btnLogout = document.getElementById('btnLogout');
  const operatorWaitingTotalBadge = document.getElementById('operatorWaitingTotalBadge');
  const operatorWaitingTotalText = document.getElementById('operatorWaitingTotalText');
  const operatorServiceCardsGrid = document.getElementById('operatorServiceCardsGrid');

  // Contract Elements
  const headerDeskBadge = document.getElementById('headerDeskBadge');
  const operatorDeskName = document.getElementById('operatorDeskName');
  const operatorServiceName = document.getElementById('operatorServiceName');
  const operatorStaffName = document.getElementById('operatorStaffName');
  const operatorStaffId = document.getElementById('operatorStaffId');
  const operatorCounterSelect = document.getElementById('operatorCounterSelect') as HTMLSelectElement | null;
  const activeTicketNum = document.getElementById('active-ticket-num');
  const activePriorityBadge = document.getElementById('active-priority-badge');
  const activePriorityIcon = document.getElementById('active-priority-icon');
  const activePriorityText = document.getElementById('active-priority-text');
  const activeDeskLabel = document.getElementById('active-desk-label');
  const activePatientName = document.getElementById('active-patient-name');
  const activePatientMrn = document.getElementById('active-patient-mrn');
  const callTimer = document.getElementById('call-timer');
  const activeCallCount = document.getElementById('active-call-count');
  const activeCallTime = document.getElementById('active-call-time');
  const btnCallNext = document.getElementById('btn-call-next');
  const btnCallRepeat = document.getElementById('btn-call-repeat');
  const btnCallSkip = document.getElementById('btn-call-skip');
  const btnCallComplete = document.getElementById('btn-call-complete');
  const btnSoundTest = document.getElementById('btn-sound-test');
  const waitingQueueCount = document.getElementById('waiting-queue-count');
  const queueTableBody = document.getElementById('queue-table-body');

  if (userFullName) userFullName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
  if (userRoleBadge) userRoleBadge.textContent = currentUser.role.toUpperCase();
  if (userAvatar && currentUser.image) userAvatar.src = currentUser.image;
  if (operatorStaffName) operatorStaffName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
  if (operatorStaffId) operatorStaffId.textContent = currentUser.username.toUpperCase();

  btnLogout?.addEventListener('click', () => {
    AuthService.logout();
  });

  const escapeHtml = (str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  // Forward declaration for queue table renderer
  let renderQueueTable: () => void = () => {};

  // Render 6-Card Operator Grid (Exact 100% Figma Match)
  const renderOperatorGrid = () => {
    const services = StorageService.getServices().filter(s => s.isActive);
    const tickets = StorageService.getTickets();
    const waitingTickets = tickets.filter(t => t.status === 'waiting');
    const sortedWaiting = waitingTickets.slice().sort(QueueService.sortTickets);

    // Update global badge
    if (operatorWaitingTotalText) {
      operatorWaitingTotalText.textContent = `${sortedWaiting.length} tiket menunggu`;
    }
    if (waitingQueueCount) {
      waitingQueueCount.textContent = String(sortedWaiting.length);
    }

    if (!operatorServiceCardsGrid) return;

    if (services.length === 0) {
      operatorServiceCardsGrid.innerHTML = `
        <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-[#E5E7EB] text-[#6B7280]">
          Tidak ada layanan aktif saat ini.
        </div>
      `;
      return;
    }

    // 1. DEDICATED CARD: Lokasi Khusus VIP & Disabilitas
    const priorityTickets = tickets.filter(t => t.priority === 'vip' || t.priority === 'disabilitas');
    const priorityWaiting = priorityTickets.filter(t => t.status === 'waiting').sort(QueueService.sortTickets);
    const priorityCalling = priorityTickets.find(t => t.status === 'calling');
    const priorityNext = priorityWaiting[0] || null;
    const hasPriorityWaiting = priorityWaiting.length > 0;
    const isPriorityCalling = !!priorityCalling;

    let prioritySubtext = 'Tidak ada nomor prioritas berikutnya.';
    if (priorityNext) {
      if (priorityWaiting.length === 1) {
        prioritySubtext = 'Tiket prioritas siap dipanggil ke Lokasi Khusus.';
      } else {
        const sub = priorityWaiting.slice(1, 4).map(t => `${t.ticketNumber} (${t.priority.toUpperCase()})`).join(', ');
        prioritySubtext = `Lalu ${sub}`;
      }
    }

    const priorityCardHtml = `
      <div class="bg-white border-2 border-[#235347] rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden bg-gradient-to-b from-[#EBF4EE]/40 to-white">
        <!-- Top Header & Badge -->
        <div>
          <div class="flex items-center justify-between border-b border-[#D5E6DB] pb-3 mb-3">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[#235347] animate-pulse"></span>
              <span class="font-bold text-sm text-[#111827]">Loket Khusus VIP &amp; Disabilitas</span>
            </div>
            <span class="text-xs text-[#235347] font-bold bg-[#EBF4EE] px-2.5 py-0.5 rounded-full border border-[#D5E6DB]">
              ${priorityWaiting.length} menunggu
            </span>
          </div>

          <div class="mb-2 text-[11px] text-[#235347] font-semibold flex items-center gap-1.5 bg-[#EBF4EE] px-2.5 py-1 rounded-lg border border-[#D5E6DB]/60">
            <span class="material-symbols-outlined text-sm text-[#235347]">accessible_forward</span>
            <span>Lokasi Khusus: Lantai 1 Front Office Prioritas</span>
          </div>

          <!-- Sedang Dipanggil Section -->
          <div class="mb-3">
            <span class="text-[11px] text-[#6B7280] uppercase tracking-wider font-semibold block">Sedang Dipanggil</span>
            ${
              isPriorityCalling
                ? `
                  <div class="flex items-center justify-between my-2">
                    <span class="text-3xl font-black text-[#235347] tracking-tight">${priorityCalling.ticketNumber}</span>
                    <span class="text-[11px] font-bold text-white bg-[#235347] px-2.5 py-0.5 rounded-full shadow-xs">
                      ${priorityCalling.priority.toUpperCase()} · Dipanggil
                    </span>
                  </div>
                `
                : `
                  <div class="flex items-center justify-between my-2">
                    <span class="text-3xl font-bold text-[#9CA3AF]">——</span>
                    <span class="text-xs text-[#9CA3AF]">Belum ada panggilan</span>
                  </div>
                `
            }
          </div>

          <!-- Box Berikutnya -->
          <div class="bg-[#F8FAF9] border border-[#D5E6DB] rounded-xl p-3 text-xs mb-4">
            ${
              priorityNext
                ? `
                  <div class="flex items-center justify-between font-semibold text-[#111827]">
                    <span>Berikutnya: ${priorityNext.ticketNumber}</span>
                    <span class="px-2 py-0.5 rounded-full bg-[#235347] text-white text-[10px] font-bold">
                      • ${priorityNext.priority.toUpperCase()}
                    </span>
                  </div>
                  <div class="text-[#6B7280] text-[11px] mt-1 truncate" title="${escapeHtml(prioritySubtext)}">
                    ${escapeHtml(prioritySubtext)}
                  </div>
                `
                : `
                  <div class="text-[#6B7280] font-medium">Berikutnya: ——</div>
                  <div class="text-[#9CA3AF] text-[11px] mt-1">${escapeHtml(prioritySubtext)}</div>
                `
            }
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col gap-2 pt-2 border-t border-[#D5E6DB]">
          <button 
            type="button" 
            class="w-full py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
              hasPriorityWaiting
                ? 'bg-[#235347] hover:bg-[#1a4036] active:scale-[0.99] text-white cursor-pointer shadow-xs'
                : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
            }"
            onclick="window.callNextPriority()"
            ${!hasPriorityWaiting ? 'disabled' : ''}
          >
            <span class="material-symbols-outlined text-[17px]">campaign</span>
            <span>Panggil VIP / Disabilitas</span>
          </button>

          <div class="grid grid-cols-2 gap-2">
            <button 
              type="button" 
              class="py-2 rounded-lg text-xs font-semibold transition-all ${
                isPriorityCalling
                  ? 'border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-[#111827] cursor-pointer'
                  : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed border-0'
              }"
              onclick="window.callSkipPriority()"
              ${!isPriorityCalling ? 'disabled' : ''}
            >
              Lewati
            </button>
            <button 
              type="button" 
              class="py-2 rounded-lg text-xs font-semibold transition-all ${
                isPriorityCalling
                  ? 'border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-[#111827] cursor-pointer'
                  : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed border-0'
              }"
              onclick="window.callCompletePriority()"
              ${!isPriorityCalling ? 'disabled' : ''}
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    `;

    const serviceCardsHtml = services.map(s => {
      const svcTickets = tickets.filter(t => t.serviceCode === s.code);
      const svcWaiting = svcTickets.filter(t => t.status === 'waiting').sort(QueueService.sortTickets);
      const callingTicket = svcTickets.find(t => t.status === 'calling');
      const nextTicket = svcWaiting[0] || null;

      // Construct "Lalu ..." summary text for subsequent tickets
      let nextSubtext = 'Tidak ada nomor berikutnya.';
      if (nextTicket) {
        if (svcWaiting.length === 1) {
          nextSubtext = 'Tiket siap untuk dipanggil.';
        } else {
          const subsequent = svcWaiting.slice(1, 4).map((t: Ticket) => {
            const prioName = t.priority === 'normal' ? 'Normal' : t.priority.charAt(0).toUpperCase() + t.priority.slice(1);
            return `${t.ticketNumber} (${prioName})`;
          }).join(', ');
          nextSubtext = `Lalu ${subsequent}`;
        }
      }

      const counterName = getCounterForService(s.code);
      const isCalling = !!callingTicket;
      const hasWaiting = svcWaiting.length > 0;

      return `
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <!-- Card Header -->
          <div>
            <div class="flex items-center justify-between border-b border-[#F3F4F6] pb-3 mb-3">
              <span class="font-bold text-sm text-[#111827]">${escapeHtml(s.name)} · ${s.code}</span>
              <span class="text-xs text-[#6B7280] font-medium">${svcWaiting.length} menunggu</span>
            </div>

            <!-- Sedang Dipanggil Section -->
            <div class="mb-3">
              <span class="text-[11px] text-[#6B7280] uppercase tracking-wider font-semibold block">Sedang Dipanggil</span>
              ${
                isCalling
                  ? `
                    <div class="flex items-center justify-between my-2">
                      <span class="text-3xl font-black text-[#235347] tracking-tight">${callingTicket.ticketNumber}</span>
                      <span class="text-[11px] font-semibold text-[#235347] bg-[#EBF4EE] px-2.5 py-0.5 rounded-full">Dipanggil</span>
                    </div>
                  `
                  : `
                    <div class="flex items-center justify-between my-2">
                      <span class="text-3xl font-bold text-[#9CA3AF]">——</span>
                      <span class="text-xs text-[#9CA3AF]">Belum ada panggilan</span>
                    </div>
                  `
              }
            </div>

            <!-- Box Berikutnya -->
            <div class="bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl p-3 text-xs mb-4">
              ${
                nextTicket
                  ? `
                    <div class="flex items-center justify-between font-semibold text-[#111827]">
                      <span>Berikutnya: ${nextTicket.ticketNumber}</span>
                      <span class="px-2 py-0.5 rounded-full bg-[#EBF4EE] text-[#235347] text-[10px] font-bold">
                        • ${nextTicket.priority === 'normal' ? 'Normal' : nextTicket.priority.toUpperCase()}
                      </span>
                    </div>
                    <div class="text-[#6B7280] text-[11px] mt-1 truncate" title="${escapeHtml(nextSubtext)}">
                      ${escapeHtml(nextSubtext)}
                    </div>
                  `
                  : `
                    <div class="text-[#6B7280] font-medium">Berikutnya: ——</div>
                    <div class="text-[#9CA3AF] text-[11px] mt-1">${escapeHtml(nextSubtext)}</div>
                  `
              }
            </div>
          </div>

          <!-- Action Buttons Bar -->
          <div class="flex flex-col gap-2 pt-2 border-t border-[#F3F4F6]">
            <!-- Top Call Next Button -->
            <button 
              type="button" 
              class="w-full py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                hasWaiting
                  ? 'bg-[#235347] hover:bg-[#1a4036] active:scale-[0.99] text-white cursor-pointer shadow-xs'
                  : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
              }"
              onclick="window.callNext('${s.code}')"
              ${!hasWaiting ? 'disabled' : ''}
            >
              <span class="material-symbols-outlined text-[17px]">campaign</span>
              <span>Panggil Berikutnya</span>
            </button>

            <!-- Bottom Lewati & Selesai Buttons -->
            <div class="grid grid-cols-2 gap-2">
              <button 
                type="button" 
                class="py-2 rounded-lg text-xs font-semibold transition-all ${
                  isCalling
                    ? 'border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-[#111827] cursor-pointer'
                    : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed border-0'
                }"
                onclick="window.callSkip('${s.code}')"
                ${!isCalling ? 'disabled' : ''}
              >
                Lewati
              </button>
              <button 
                type="button" 
                class="py-2 rounded-lg text-xs font-semibold transition-all ${
                  isCalling
                    ? 'border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-[#111827] cursor-pointer'
                    : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed border-0'
                }"
                onclick="window.callComplete('${s.code}')"
                ${!isCalling ? 'disabled' : ''}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    operatorServiceCardsGrid.innerHTML = priorityCardHtml + serviceCardsHtml;

    // Sync contract elements
    const anyActive = StorageService.getActiveTicket();
    if (activeTicketNum) activeTicketNum.textContent = anyActive ? anyActive.ticketNumber : '---';
    if (activePriorityText) activePriorityText.textContent = anyActive ? anyActive.priority.toUpperCase() : 'MENUNGGU PANGGILAN';
    if (activePatientName) activePatientName.textContent = anyActive ? (anyActive.username || anyActive.userId || '-') : '-';
    if (activePatientMrn) activePatientMrn.textContent = anyActive?.userId ? `RM-${anyActive.userId}` : '-';

    // Sync queue table
    renderQueueTable();
  };

  // Call Next Priority Action
  window.callNextPriority = () => {
    SpeechService.unlockAudio();
    const tickets = StorageService.getTickets();
    const priorityWaiting = tickets
      .filter(t => t.status === 'waiting' && (t.priority === 'vip' || t.priority === 'disabilitas'))
      .sort(QueueService.sortTickets);

    if (priorityWaiting.length === 0) {
      return;
    }

    const target = priorityWaiting[0];
    const counter = 'Loket Khusus VIP & Disabilitas';
    const called = QueueService.callTicketById(target.id, counter);
    if (called) {
      SpeechService.announceTicket(called.ticketNumber, counter);
    }
    renderOperatorGrid();
  };

  // Skip Priority Action
  window.callSkipPriority = () => {
    const tickets = StorageService.getTickets();
    const calling = tickets.find(t =>
      t.status === 'calling' &&
      (t.counterName === 'Loket Khusus VIP & Disabilitas' || t.priority === 'vip' || t.priority === 'disabilitas')
    );
    if (calling) {
      QueueService.skipTicket(calling.id);
      renderOperatorGrid();
    }
  };

  // Complete Priority Action
  window.callCompletePriority = () => {
    const tickets = StorageService.getTickets();
    const calling = tickets.find(t =>
      t.status === 'calling' &&
      (t.counterName === 'Loket Khusus VIP & Disabilitas' || t.priority === 'vip' || t.priority === 'disabilitas')
    );
    if (calling) {
      QueueService.completeTicket(calling.id);
      renderOperatorGrid();
    }
  };

  // Call Next Ticket Action
  window.callNext = (serviceCode?: string) => {
    SpeechService.unlockAudio();
    const selectedAttr = operatorCounterSelect?.options[operatorCounterSelect.selectedIndex]?.getAttribute('data-service-code');
    const targetService = serviceCode || (selectedAttr ? selectedAttr : undefined);
    const counter = targetService && targetService !== 'ALL' ? getCounterForService(targetService) : 'Loket 01';

    try {
      const ticket = QueueService.callNextTicket(counter, targetService === 'ALL' ? undefined : targetService);
      if (ticket) {
        SpeechService.announceTicket(ticket.ticketNumber, ticket.counterName || counter);
      }
      renderOperatorGrid();
    } catch (err: unknown) {
      console.warn('Call next error:', err);
      renderOperatorGrid();
    }
  };

  // Skip Ticket Action
  window.callSkip = (serviceCode?: string) => {
    const tickets = StorageService.getTickets();
    const callingTicket = serviceCode
      ? tickets.find(t => t.serviceCode === serviceCode && t.status === 'calling')
      : StorageService.getActiveTicket();

    if (callingTicket) {
      QueueService.skipTicket(callingTicket.id);
      renderOperatorGrid();
    }
  };

  // Complete Ticket Action
  window.callComplete = (serviceCode?: string) => {
    const tickets = StorageService.getTickets();
    const callingTicket = serviceCode
      ? tickets.find(t => t.serviceCode === serviceCode && t.status === 'calling')
      : StorageService.getActiveTicket();

    if (callingTicket) {
      QueueService.completeTicket(callingTicket.id);
      renderOperatorGrid();
    }
  };

  // Repeat Call Action
  window.callRepeat = () => {
    SpeechService.unlockAudio();
    const active = StorageService.getActiveTicket();
    if (active) {
      SpeechService.announceTicket(active.ticketNumber, active.counterName || 'Loket 01');
    }
  };

  // Sound Test Action
  window.testSound = () => {
    SpeechService.unlockAudio();
    SpeechService.announceTicket('A 001', 'Loket 01');
  };

  // Filter state for queue table
  let operatorQueueFilter: 'all' | 'priority' | 'normal' = 'all';

  const filterAllBtn = document.getElementById('filter-all');
  const filterPriorityBtn = document.getElementById('filter-priority');
  const filterNormalBtn = document.getElementById('filter-normal');

  const updateOperatorFilterUI = () => {
    const filters = [
      { id: 'all', el: filterAllBtn },
      { id: 'priority', el: filterPriorityBtn },
      { id: 'normal', el: filterNormalBtn }
    ];
    filters.forEach(f => {
      if (!f.el) return;
      if (f.id === operatorQueueFilter) {
        f.el.className = 'px-3 py-1 rounded-lg font-semibold text-[#111827] bg-white shadow-xs cursor-pointer transition-all';
      } else {
        f.el.className = 'px-3 py-1 rounded-lg font-medium text-[#6B7280] hover:text-[#111827] cursor-pointer transition-all';
      }
    });
  };

  filterAllBtn?.addEventListener('click', () => { operatorQueueFilter = 'all'; updateOperatorFilterUI(); renderQueueTable(); });
  filterPriorityBtn?.addEventListener('click', () => { operatorQueueFilter = 'priority'; updateOperatorFilterUI(); renderQueueTable(); });
  filterNormalBtn?.addEventListener('click', () => { operatorQueueFilter = 'normal'; updateOperatorFilterUI(); renderQueueTable(); });

  // Direct Call Actions per Row in Operator Table
  window.callPatientDirect = (ticketId: string) => {
    SpeechService.unlockAudio();
    const tickets = StorageService.getTickets();
    const target = tickets.find(t => t.id === ticketId);
    if (!target) return;

    let counter = getCounterForService(target.serviceCode);
    if (target.priority === 'vip' || target.priority === 'disabilitas') {
      counter = 'Loket Khusus VIP & Disabilitas';
    }

    const called = QueueService.callTicketById(target.id, counter);
    if (called) {
      SpeechService.announceTicket(called.ticketNumber, counter);
    }
    renderOperatorGrid();
  };

  window.skipPatientDirect = (ticketId: string) => {
    const tickets = StorageService.getTickets();
    const target = tickets.find(t => t.id === ticketId);
    if (target) {
      QueueService.skipTicket(target.id);
      renderOperatorGrid();
    }
  };

  window.completePatientDirect = (ticketId: string) => {
    const tickets = StorageService.getTickets();
    const target = tickets.find(t => t.id === ticketId);
    if (target) {
      QueueService.completeTicket(target.id);
      renderOperatorGrid();
    }
  };

  renderQueueTable = () => {
    const tickets = StorageService.getTickets();
    const waitingTickets = tickets.filter(t => t.status === 'waiting');
    const callingTickets = tickets.filter(t => t.status === 'calling');

    if (waitingQueueCount) {
      waitingQueueCount.textContent = String(waitingTickets.length);
    }

    if (!queueTableBody) return;

    let displayed = [...callingTickets, ...waitingTickets.sort(QueueService.sortTickets)];
    if (operatorQueueFilter === 'priority') {
      displayed = displayed.filter(t => t.priority === 'vip' || t.priority === 'disabilitas' || t.priority === 'lansia');
    } else if (operatorQueueFilter === 'normal') {
      displayed = displayed.filter(t => t.priority === 'normal');
    }

    if (displayed.length === 0) {
      queueTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-[#6B7280] font-medium">
            Tidak ada antrean dalam kategori ini.
          </td>
        </tr>
      `;
      return;
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    queueTableBody.innerHTML = displayed.map(t => {
      const isCalling = t.status === 'calling';
      const isWaiting = t.status === 'waiting';

      let priorityBadgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#4B5563] font-medium text-[11px]">Normal</span>`;
      if (t.priority === 'vip') {
        priorityBadgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EBF4EE] text-[#235347] font-bold text-[11px] border border-[#D5E6DB]">VIP</span>`;
      } else if (t.priority === 'disabilitas') {
        priorityBadgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#1E40AF] font-bold text-[11px] border border-[#DBEAFE]">Disabilitas</span>`;
      } else if (t.priority === 'lansia') {
        priorityBadgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-bold text-[11px] border border-[#FDE68A]">Lansia</span>`;
      }

      const d = new Date(t.createdAt);
      const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())} WIB`;

      let statusBadgeHtml = isCalling
        ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF4EE] text-[#235347] font-bold text-[11px]"><span class="w-1.5 h-1.5 rounded-full bg-[#235347] animate-pulse"></span>Dipanggil (${escapeHtml(t.counterName || 'Loket')})</span>`
        : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309] font-semibold text-[11px]"><span class="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>Menunggu</span>`;

      const patientName = t.username || (t.userId ? `Pasien ${t.userId}` : 'Walk-in Mandiri');

      let actionHtml = '';
      if (isWaiting) {
        actionHtml = `<button type="button" class="px-3 py-1 rounded-lg bg-[#235347] hover:bg-[#1a4036] text-white font-semibold text-xs cursor-pointer inline-flex items-center gap-1 shadow-xs" onclick="window.callPatientDirect('${t.id}')"><span class="material-symbols-outlined text-[13px]">campaign</span>Panggil</button>`;
      } else if (isCalling) {
        actionHtml = `
          <div class="inline-flex items-center gap-1.5 justify-end">
            <button type="button" class="px-2.5 py-1 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] text-xs font-semibold cursor-pointer" onclick="window.skipPatientDirect('${t.id}')">Lewati</button>
            <button type="button" class="px-2.5 py-1 rounded-lg bg-[#235347] hover:bg-[#1a4036] text-white text-xs font-semibold cursor-pointer" onclick="window.completePatientDirect('${t.id}')">Selesai</button>
          </div>
        `;
      } else {
        actionHtml = '—';
      }

      return `
        <tr class="hover:bg-[#F9FAFB] transition-colors ${isCalling ? 'bg-[#EBF4EE]/30' : ''}">
          <td class="py-3 px-3 font-bold text-[#111827] font-code-tabular text-sm">${escapeHtml(t.ticketNumber)}</td>
          <td class="py-3 px-4 font-semibold text-[#111827] text-xs">${escapeHtml(patientName)}</td>
          <td class="py-3 px-3 text-xs text-[#111827]">${escapeHtml(t.serviceName || t.serviceCode)} (${t.serviceCode})</td>
          <td class="py-3 px-3 text-center">${priorityBadgeHtml}</td>
          <td class="py-3 px-3 text-xs text-[#6B7280]">${timeStr}</td>
          <td class="py-3 px-3 text-center">${statusBadgeHtml}</td>
          <td class="py-3 px-3 text-right">${actionHtml}</td>
        </tr>
      `;
    }).join('');
  };

  // Explicit listeners for contract buttons
  btnCallNext?.addEventListener('click', () => window.callNext?.());
  btnCallRepeat?.addEventListener('click', () => window.callRepeat?.());
  btnCallSkip?.addEventListener('click', () => window.callSkip?.());
  btnCallComplete?.addEventListener('click', () => window.callComplete?.());
  btnSoundTest?.addEventListener('click', () => window.testSound?.());

  // Unlock audio on initial user touch/click/key
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => {
      SpeechService.unlockAudio();
    }, { passive: true });
  });

  // Initial render & sync
  renderOperatorGrid();

  window.addEventListener('storage', () => {
    renderOperatorGrid();
  });

  StorageService.onSync(() => {
    renderOperatorGrid();
  });

  // Polling fallback
  setInterval(() => {
    renderOperatorGrid();
  }, 1500);
});
