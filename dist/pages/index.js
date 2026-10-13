import { AuthService } from '../services/auth.js';
import { StorageService, getCounterForService } from '../services/storage.js';
import { QueueService } from '../services/queue.js';
import { ExportService } from '../services/export.js';
import { SpeechService } from '../services/speech.js';
document.addEventListener('DOMContentLoaded', () => {
    // Auth Guard: hanya admin dan moderator
    const currentUser = AuthService.requireAuth(['admin', 'moderator']);
    if (!currentUser)
        return;
    // DOM Elements - Profile & Header
    const userFullName = document.getElementById('userFullName');
    const userRoleBadge = document.getElementById('userRoleBadge');
    const userAvatar = document.getElementById('userAvatar');
    const btnLogout = document.getElementById('btnLogout');
    const headerDeskBadge = document.getElementById('headerDeskBadge');
    if (userFullName)
        userFullName.textContent = currentUser.firstName;
    if (userRoleBadge) {
        userRoleBadge.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    }
    if (userAvatar && currentUser.image) {
        userAvatar.src = currentUser.image;
    }
    if (headerDeskBadge) {
        headerDeskBadge.textContent = 'Admin Hub • SIMRS Online';
    }
    btnLogout?.addEventListener('click', () => {
        AuthService.logout();
    });
    // DOM Elements - Top Metric Counters
    const metricTotalTickets = document.getElementById('metric-total-tickets');
    const metricCallingTickets = document.getElementById('metric-calling-tickets');
    const metricWaitingTickets = document.getElementById('metric-waiting-tickets');
    const metricActiveServices = document.getElementById('metric-active-services');
    // DOM Elements - Services Table & Modal
    const serviceTableBody = document.getElementById('service-table-body');
    const searchInput = document.getElementById('searchServiceInput');
    const newServiceModal = document.getElementById('new-service-modal');
    const newServiceCodeInput = document.getElementById('newServiceCode');
    const newServiceNameInput = document.getElementById('newServiceName');
    // DOM Elements - Manual Ticket
    const manualForm = document.getElementById('manual-ticket-form');
    const serviceSelect = document.getElementById('service-select');
    const mrnInput = document.getElementById('patient-rm-nik');
    const previewTicketCode = document.getElementById('preview-ticket-code');
    const previewServiceName = document.getElementById('preview-service-name');
    const previewPriorityBadge = document.getElementById('preview-priority-badge');
    const previewMrnVal = document.getElementById('preview-mrn-val');
    // Toast Functionality
    const showToast = (title, body) => {
        const toast = document.getElementById('toast-notification');
        const toastTitle = document.getElementById('toast-title');
        const toastBody = document.getElementById('toast-body');
        if (!toast || !toastTitle || !toastBody)
            return;
        toastTitle.textContent = title;
        toastBody.textContent = body;
        toast.classList.remove('translate-y-20', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
        setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('translate-y-20', 'opacity-0');
        }, 3500);
    };
    window.showToast = showToast;
    // State
    let selectedPriority = 'normal';
    let selectedPriorityLabel = 'Normal';
    // Update Info Box for Manual Ticket
    const updateManualTicketInfo = () => {
        if (!serviceSelect)
            return;
        const code = serviceSelect.value;
        const waitingTickets = QueueService.getWaitingTickets().filter(t => t.serviceCode === code);
        const selectedOpt = serviceSelect.options[serviceSelect.selectedIndex];
        const serviceName = selectedOpt ? selectedOpt.getAttribute('data-name') || selectedOpt.text : code;
        const infoEl = document.getElementById('manualTicketQueueInfoText');
        if (infoEl) {
            infoEl.textContent = `${waitingTickets.length} tiket menunggu di ${serviceName}. Tiket baru langsung masuk antrian.`;
        }
    };
    // DOM Elements - Admin Calling Grid
    const adminServiceCardsGrid = document.getElementById('adminServiceCardsGrid');
    const adminWaitingTotalText = document.getElementById('adminWaitingTotalText');
    // Render Operational Calling Grid in Admin Dashboard
    const renderAdminCallingGrid = () => {
        const services = StorageService.getServices().filter(s => s.isActive);
        const tickets = StorageService.getTickets();
        const sortedWaiting = tickets.filter(t => t.status === 'waiting').sort(QueueService.sortTickets);
        if (adminWaitingTotalText) {
            adminWaitingTotalText.textContent = `${sortedWaiting.length} tiket menunggu`;
        }
        if (!adminServiceCardsGrid)
            return;
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
            }
            else {
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
            ${isPriorityCalling
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
                `}
          </div>

          <!-- Box Berikutnya -->
          <div class="bg-[#F8FAF9] border border-[#D5E6DB] rounded-xl p-3 text-xs mb-4">
            ${priorityNext
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
                `}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col gap-2 pt-2 border-t border-[#D5E6DB]">
          <button 
            type="button" 
            class="w-full py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${hasPriorityWaiting
            ? 'bg-[#235347] hover:bg-[#1a4036] active:scale-[0.99] text-white cursor-pointer shadow-xs'
            : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'}"
            onclick="window.callNextPriority()"
            ${!hasPriorityWaiting ? 'disabled' : ''}
          >
            <span class="material-symbols-outlined text-[17px]">campaign</span>
            <span>Panggil VIP / Disabilitas</span>
          </button>

          <div class="grid grid-cols-2 gap-2">
            <button 
              type="button" 
              class="py-2 rounded-lg text-xs font-semibold transition-all ${isPriorityCalling
            ? 'border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-[#111827] cursor-pointer'
            : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed border-0'}"
              onclick="window.callSkipPriority()"
              ${!isPriorityCalling ? 'disabled' : ''}
            >
              Lewati
            </button>
            <button 
              type="button" 
              class="py-2 rounded-lg text-xs font-semibold transition-all ${isPriorityCalling
            ? 'border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-[#111827] cursor-pointer'
            : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed border-0'}"
              onclick="window.callCompletePriority()"
              ${!isPriorityCalling ? 'disabled' : ''}
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    `;
        // 2. REGULAR SERVICE CARDS
        const serviceCardsHtml = services.map(s => {
            const svcTickets = tickets.filter(t => t.serviceCode === s.code);
            const svcWaiting = svcTickets.filter(t => t.status === 'waiting').sort(QueueService.sortTickets);
            const callingTicket = svcTickets.find(t => t.status === 'calling');
            const nextTicket = svcWaiting[0] || null;
            let nextSubtext = 'Tidak ada nomor berikutnya.';
            if (nextTicket) {
                if (svcWaiting.length === 1) {
                    nextSubtext = 'Tiket siap untuk dipanggil.';
                }
                else {
                    const subsequent = svcWaiting.slice(1, 4).map((t) => {
                        const prioName = t.priority === 'normal' ? 'Normal' : t.priority.charAt(0).toUpperCase() + t.priority.slice(1);
                        return `${t.ticketNumber} (${prioName})`;
                    }).join(', ');
                    nextSubtext = `Lalu ${subsequent}`;
                }
            }
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
              ${isCalling
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
                  `}
            </div>

            <!-- Box Berikutnya -->
            <div class="bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl p-3 text-xs mb-4">
              ${nextTicket
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
                  `}
            </div>
          </div>

          <!-- Action Buttons Bar -->
          <div class="flex flex-col gap-2 pt-2 border-t border-[#F3F4F6]">
            <button 
              type="button" 
              class="w-full py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${hasWaiting
                ? 'bg-[#235347] hover:bg-[#1a4036] active:scale-[0.99] text-white cursor-pointer shadow-xs'
                : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'}"
              onclick="window.callNext('${s.code}')"
              ${!hasWaiting ? 'disabled' : ''}
            >
              <span class="material-symbols-outlined text-[17px]">campaign</span>
              <span>Panggil Berikutnya</span>
            </button>

            <div class="grid grid-cols-2 gap-2">
              <button 
                type="button" 
                class="py-2 rounded-lg text-xs font-semibold transition-all ${isCalling
                ? 'border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-[#111827] cursor-pointer'
                : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed border-0'}"
                onclick="window.callSkip('${s.code}')"
                ${!isCalling ? 'disabled' : ''}
              >
                Lewati
              </button>
              <button 
                type="button" 
                class="py-2 rounded-lg text-xs font-semibold transition-all ${isCalling
                ? 'border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-[#111827] cursor-pointer'
                : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed border-0'}"
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
        adminServiceCardsGrid.innerHTML = priorityCardHtml + serviceCardsHtml;
    };
    // Window Call Actions for Admin Grid
    window.callNext = (serviceCode) => {
        SpeechService.unlockAudio();
        try {
            const counter = 'Loket Admisi';
            const ticket = QueueService.callNextTicket(counter, serviceCode);
            if (ticket) {
                SpeechService.announceTicket(ticket.ticketNumber, ticket.counterName || counter);
                showToast(`Memanggil ${ticket.ticketNumber}`, `Pasien diarahkan ke ${ticket.counterName || counter}.`);
            }
            renderAdminCallingGrid();
            renderMetrics();
            renderServices();
        }
        catch (err) {
            console.warn('Call next error:', err);
        }
    };
    window.callSkip = (serviceCode) => {
        const tickets = StorageService.getTickets();
        const callingTicket = serviceCode
            ? tickets.find(t => t.serviceCode === serviceCode && t.status === 'calling')
            : StorageService.getActiveTicket();
        if (callingTicket) {
            QueueService.skipTicket(callingTicket.id);
            showToast(`Tiket ${callingTicket.ticketNumber} Dilewati`, 'Status tiket diubah menjadi dilewati.');
            renderAdminCallingGrid();
            renderMetrics();
            renderServices();
        }
    };
    window.callComplete = (serviceCode) => {
        const tickets = StorageService.getTickets();
        const callingTicket = serviceCode
            ? tickets.find(t => t.serviceCode === serviceCode && t.status === 'calling')
            : StorageService.getActiveTicket();
        if (callingTicket) {
            QueueService.completeTicket(callingTicket.id);
            showToast(`Tiket ${callingTicket.ticketNumber} Selesai`, 'Pelayanan pasien telah diselesaikan.');
            renderAdminCallingGrid();
            renderMetrics();
            renderServices();
        }
    };
    // DEDICATED LOKASI KHUSUS VIP & DISABILITAS ACTIONS:
    window.callNextPriority = () => {
        SpeechService.unlockAudio();
        const tickets = StorageService.getTickets();
        const priorityWaiting = tickets
            .filter(t => t.status === 'waiting' && (t.priority === 'vip' || t.priority === 'disabilitas'))
            .sort(QueueService.sortTickets);
        if (priorityWaiting.length === 0) {
            showToast('Tidak Ada Antrean Prioritas', 'Semua antrean VIP dan Disabilitas saat ini sudah terlayani.');
            return;
        }
        const target = priorityWaiting[0];
        const counter = 'Loket Khusus VIP & Disabilitas';
        const called = QueueService.callTicketById(target.id, counter);
        if (called) {
            SpeechService.announceTicket(called.ticketNumber, counter);
            showToast(`Memanggil Prioritas ${called.ticketNumber}`, `Pasien [${called.priority.toUpperCase()}] diarahkan ke ${counter}.`);
        }
        renderAdminCallingGrid();
        renderMetrics();
        renderServices();
    };
    window.callSkipPriority = () => {
        const tickets = StorageService.getTickets();
        const calling = tickets.find(t => t.status === 'calling' &&
            (t.counterName === 'Loket Khusus VIP & Disabilitas' || t.priority === 'vip' || t.priority === 'disabilitas'));
        if (calling) {
            QueueService.skipTicket(calling.id);
            showToast(`Prioritas ${calling.ticketNumber} Dilewati`, 'Tiket prioritas dilewati.');
            renderAdminCallingGrid();
            renderMetrics();
            renderServices();
        }
    };
    window.callCompletePriority = () => {
        const tickets = StorageService.getTickets();
        const calling = tickets.find(t => t.status === 'calling' &&
            (t.counterName === 'Loket Khusus VIP & Disabilitas' || t.priority === 'vip' || t.priority === 'disabilitas'));
        if (calling) {
            QueueService.completeTicket(calling.id);
            showToast(`Prioritas ${calling.ticketNumber} Selesai`, 'Pelayanan di Loket Khusus VIP & Disabilitas selesai.');
            renderAdminCallingGrid();
            renderMetrics();
            renderServices();
        }
    };
    // DOM Elements - Patient Queue Roster (Live Daftar Pasien Mengantri)
    const patientQueueTableBody = document.getElementById('patient-queue-table-body');
    const rosterWaitingCount = document.getElementById('rosterWaitingCount');
    const searchQueueInput = document.getElementById('searchQueueInput');
    const rosterFilterAll = document.getElementById('roster-filter-all');
    const rosterFilterWaiting = document.getElementById('roster-filter-waiting');
    const rosterFilterPriority = document.getElementById('roster-filter-priority');
    const rosterFilterCalling = document.getElementById('roster-filter-calling');
    let queueRosterFilter = 'all';
    const updateRosterFilterButtonsUI = () => {
        const filterBtns = [
            { id: 'all', el: rosterFilterAll },
            { id: 'waiting', el: rosterFilterWaiting },
            { id: 'priority', el: rosterFilterPriority },
            { id: 'calling', el: rosterFilterCalling }
        ];
        filterBtns.forEach(b => {
            if (!b.el)
                return;
            if (b.id === queueRosterFilter) {
                b.el.className = 'px-3 py-1 rounded-lg font-semibold text-[#111827] bg-white shadow-xs cursor-pointer transition-all';
            }
            else {
                b.el.className = 'px-3 py-1 rounded-lg font-medium text-[#6B7280] hover:text-[#111827] cursor-pointer transition-all';
            }
        });
    };
    rosterFilterAll?.addEventListener('click', () => { queueRosterFilter = 'all'; updateRosterFilterButtonsUI(); renderPatientQueueRoster(); });
    rosterFilterWaiting?.addEventListener('click', () => { queueRosterFilter = 'waiting'; updateRosterFilterButtonsUI(); renderPatientQueueRoster(); });
    rosterFilterPriority?.addEventListener('click', () => { queueRosterFilter = 'priority'; updateRosterFilterButtonsUI(); renderPatientQueueRoster(); });
    rosterFilterCalling?.addEventListener('click', () => { queueRosterFilter = 'calling'; updateRosterFilterButtonsUI(); renderPatientQueueRoster(); });
    searchQueueInput?.addEventListener('input', () => { renderPatientQueueRoster(); });
    const renderPatientQueueRoster = () => {
        const tickets = StorageService.getTickets();
        const waitingTickets = tickets.filter(t => t.status === 'waiting');
        const callingTickets = tickets.filter(t => t.status === 'calling');
        if (rosterWaitingCount) {
            rosterWaitingCount.textContent = `${waitingTickets.length} Pasien Menunggu`;
        }
        if (!patientQueueTableBody)
            return;
        // Filter tickets based on active tab
        let displayedTickets = [];
        if (queueRosterFilter === 'waiting') {
            displayedTickets = waitingTickets.slice().sort(QueueService.sortTickets);
        }
        else if (queueRosterFilter === 'priority') {
            displayedTickets = tickets.filter(t => (t.status === 'waiting' || t.status === 'calling') && (t.priority === 'vip' || t.priority === 'disabilitas' || t.priority === 'lansia')).sort(QueueService.sortTickets);
        }
        else if (queueRosterFilter === 'calling') {
            displayedTickets = callingTickets;
        }
        else {
            // 'all': Show calling first, then waiting sorted by priority & FIFO, then recent handled
            const sortedWaiting = waitingTickets.slice().sort(QueueService.sortTickets);
            displayedTickets = [...callingTickets, ...sortedWaiting];
        }
        // Apply search filter if query exists
        const query = (searchQueueInput?.value || '').trim().toLowerCase();
        if (query) {
            displayedTickets = displayedTickets.filter(t => t.ticketNumber.toLowerCase().includes(query) ||
                (t.username && t.username.toLowerCase().includes(query)) ||
                (t.userId && t.userId.toLowerCase().includes(query)) ||
                t.serviceCode.toLowerCase().includes(query) ||
                (t.serviceName && t.serviceName.toLowerCase().includes(query)) ||
                t.priority.toLowerCase().includes(query));
        }
        if (displayedTickets.length === 0) {
            patientQueueTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-[#6B7280] font-medium">
            ${query ? 'Tidak ada antrean yang cocok dengan pencarian.' : 'Tidak ada pasien yang sedang mengantri saat ini.'}
          </td>
        </tr>
      `;
            return;
        }
        const pad = (n) => String(n).padStart(2, '0');
        patientQueueTableBody.innerHTML = displayedTickets.map(t => {
            const isCalling = t.status === 'calling';
            const isWaiting = t.status === 'waiting';
            // Priority Badge
            let priorityBadgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#4B5563] font-medium text-[11px]">Normal</span>`;
            if (t.priority === 'vip') {
                priorityBadgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EBF4EE] text-[#235347] font-bold text-[11px] border border-[#D5E6DB]"><span class="material-symbols-outlined text-[13px]">hotel_class</span>VIP</span>`;
            }
            else if (t.priority === 'disabilitas') {
                priorityBadgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#1E40AF] font-bold text-[11px] border border-[#DBEAFE]"><span class="material-symbols-outlined text-[13px]">accessible</span>Disabilitas</span>`;
            }
            else if (t.priority === 'lansia') {
                priorityBadgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-bold text-[11px] border border-[#FDE68A]"><span class="material-symbols-outlined text-[13px]">elderly</span>Lansia</span>`;
            }
            // Time & Duration
            const d = new Date(t.createdAt);
            const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())} WIB`;
            const minsDiff = Math.max(0, Math.floor((Date.now() - t.createdAt) / 60000));
            const waitSub = minsDiff === 0 ? 'Baru saja' : `${minsDiff} mnt lalu`;
            // Status Badge
            let statusBadgeHtml = '';
            if (isCalling) {
                statusBadgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF4EE] text-[#235347] font-bold text-[11px]"><span class="w-1.5 h-1.5 rounded-full bg-[#235347] animate-pulse"></span>Dipanggil (${escapeHtml(t.counterName || 'Loket')})</span>`;
            }
            else if (isWaiting) {
                statusBadgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309] font-semibold text-[11px]"><span class="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>Menunggu</span>`;
            }
            else {
                statusBadgeHtml = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] text-[11px]">${t.status}</span>`;
            }
            // Patient Name
            const patientName = t.username || (t.userId ? `Pasien ${t.userId}` : 'Walk-in Mandiri');
            const patientSub = t.userId ? `RM/NIK: ${escapeHtml(t.userId)}` : (t.isManualByAdmin ? 'Manual Front Office' : 'Kiosk Layanan Mandiri');
            // Actions
            let actionButtonsHtml = '';
            if (isWaiting) {
                actionButtonsHtml = `
          <button type="button" class="px-3 py-1.5 rounded-lg bg-[#235347] hover:bg-[#1a4036] text-white font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs" onclick="window.callPatientDirect('${t.id}')">
            <span class="material-symbols-outlined text-[14px]">campaign</span>
            <span>Panggil</span>
          </button>
        `;
            }
            else if (isCalling) {
                actionButtonsHtml = `
          <div class="inline-flex items-center gap-1.5 justify-end">
            <button type="button" class="px-2.5 py-1 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#111827] font-semibold text-xs transition-colors cursor-pointer" onclick="window.skipPatientDirect('${t.id}')">
              Lewati
            </button>
            <button type="button" class="px-2.5 py-1 rounded-lg bg-[#235347] hover:bg-[#1a4036] text-white font-semibold text-xs transition-colors cursor-pointer" onclick="window.completePatientDirect('${t.id}')">
              Selesai
            </button>
          </div>
        `;
            }
            else {
                actionButtonsHtml = `<span class="text-[#9CA3AF] text-xs">—</span>`;
            }
            return `
        <tr class="hover:bg-[#F9FAFB] transition-colors ${isCalling ? 'bg-[#EBF4EE]/30' : ''}">
          <td class="py-3 px-3 font-bold text-[#111827] font-code-tabular text-sm">
            ${escapeHtml(t.ticketNumber)}
          </td>
          <td class="py-3 px-4">
            <div class="font-bold text-[#111827] text-xs">${escapeHtml(patientName)}</div>
            <div class="text-[10px] text-[#6B7280] mt-0.5">${patientSub}</div>
          </td>
          <td class="py-3 px-3">
            <div class="font-semibold text-[#111827] text-xs">${escapeHtml(t.serviceName || t.serviceCode)}</div>
            <div class="text-[10px] text-[#6B7280] mt-0.5">Kode Poli: ${t.serviceCode}</div>
          </td>
          <td class="py-3 px-3 text-center">
            ${priorityBadgeHtml}
          </td>
          <td class="py-3 px-3">
            <div class="font-medium text-[#111827] text-xs">${timeStr}</div>
            <div class="text-[10px] text-[#6B7280] mt-0.5">${waitSub}</div>
          </td>
          <td class="py-3 px-3 text-center">
            ${statusBadgeHtml}
          </td>
          <td class="py-3 px-3 text-right">
            ${actionButtonsHtml}
          </td>
        </tr>
      `;
        }).join('');
    };
    // Direct patient call actions
    window.callPatientDirect = (ticketId) => {
        SpeechService.unlockAudio();
        const tickets = StorageService.getTickets();
        const target = tickets.find(t => t.id === ticketId);
        if (!target)
            return;
        let counter = getCounterForService(target.serviceCode);
        if (target.priority === 'vip' || target.priority === 'disabilitas') {
            counter = 'Loket Khusus VIP & Disabilitas';
        }
        const called = QueueService.callTicketById(target.id, counter);
        if (called) {
            SpeechService.announceTicket(called.ticketNumber, counter);
            showToast(`Memanggil ${called.ticketNumber}`, `Pasien diarahkan ke ${counter}.`);
        }
        renderAll();
    };
    window.skipPatientDirect = (ticketId) => {
        const tickets = StorageService.getTickets();
        const target = tickets.find(t => t.id === ticketId);
        if (target) {
            QueueService.skipTicket(target.id);
            showToast(`Tiket ${target.ticketNumber} Dilewati`, 'Status tiket diubah menjadi dilewati.');
            renderAll();
        }
    };
    window.completePatientDirect = (ticketId) => {
        const tickets = StorageService.getTickets();
        const target = tickets.find(t => t.id === ticketId);
        if (target) {
            QueueService.completeTicket(target.id);
            showToast(`Tiket ${target.ticketNumber} Selesai`, 'Pelayanan pasien telah diselesaikan.');
            renderAll();
        }
    };
    // Render Metrics
    const renderMetrics = () => {
        const stats = QueueService.getQueueStats();
        if (metricTotalTickets)
            metricTotalTickets.textContent = String(stats.totalTicketsToday);
        if (metricCallingTickets)
            metricCallingTickets.textContent = String(stats.totalCalling);
        if (metricWaitingTickets)
            metricWaitingTickets.textContent = String(stats.totalWaiting);
        if (metricActiveServices)
            metricActiveServices.textContent = String(stats.totalActiveServices);
        const services = StorageService.getServices();
        const activeCount = services.filter(s => s.isActive).length;
        const inactiveCount = services.length - activeCount;
        const summaryEl = document.getElementById('servicesSummaryText');
        if (summaryEl) {
            summaryEl.textContent = `${activeCount} aktif · ${inactiveCount} nonaktif. Hanya layanan aktif dapat menerima tiket baru.`;
        }
        const activeServicesBadge = document.getElementById('activeServicesBadgeText');
        if (activeServicesBadge) {
            activeServicesBadge.innerHTML = `<span id="metric-active-services">${activeCount}</span> layanan aktif`;
        }
        updateManualTicketInfo();
        renderAdminCallingGrid();
        renderPatientQueueRoster();
    };
    // Render Service Table & Service Select
    const renderServices = () => {
        const services = StorageService.getServices();
        const query = searchInput?.value.trim().toLowerCase() || '';
        // Update Service Select options for manual ticket issuance (Figma Spec: UMUM-2 (B))
        if (serviceSelect) {
            const currentVal = serviceSelect.value;
            const activeServices = services.filter(s => s.isActive);
            serviceSelect.innerHTML = activeServices.map(s => `
        <option value="${s.code}" data-name="${escapeHtml(s.name)}" ${s.code === currentVal ? 'selected' : ''}>
          ${escapeHtml(s.name)} (${s.code})
        </option>
      `).join('');
            if (!activeServices.some(s => s.code === currentVal) && activeServices.length > 0) {
                serviceSelect.value = activeServices[0].code;
            }
        }
        // Filter services for table display
        const filtered = services.filter(s => s.code.toLowerCase().includes(query) || s.name.toLowerCase().includes(query));
        if (serviceTableBody) {
            if (filtered.length === 0) {
                serviceTableBody.innerHTML = `
          <tr>
            <td colspan="5" class="py-8 text-center text-[#6B7280] font-medium">
              Tidak ada poliklinik/layanan yang sesuai pencarian.
            </td>
          </tr>
        `;
                return;
            }
            serviceTableBody.innerHTML = filtered.map(s => {
                const statusBadge = s.isActive
                    ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF4EE] text-[#235347] text-xs font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-[#235347]"></span>Aktif</span>`
                    : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] text-xs font-medium"><span class="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]"></span>Nonaktif</span>`;
                const toggleButton = s.isActive
                    ? `<button class="text-xs text-[#6B7280] hover:text-[#111827] px-2.5 py-1 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors cursor-pointer" data-action="toggle" data-code="${s.code}">Nonaktifkan</button>`
                    : `<button class="text-xs text-[#235347] font-semibold px-2.5 py-1 rounded-lg border border-[#D5E6DB] bg-[#EBF4EE] hover:bg-[#DEF0E4] transition-colors cursor-pointer" data-action="toggle" data-code="${s.code}">Aktifkan</button>`;
                return `
          <tr class="hover:bg-[#F9FAFB] transition-colors ${!s.isActive ? 'opacity-60 bg-[#F9FAFB]/40' : ''}">
            <td class="py-3.5 px-3 font-bold text-[#111827]">
              ${s.code}
            </td>
            <td class="py-3.5 px-4 font-semibold text-[#111827]">
              ${escapeHtml(s.name)}
            </td>
            <td class="py-3.5 px-3 text-center">
              ${statusBadge}
            </td>
            <td class="py-3.5 px-3 text-center">
              ${toggleButton}
            </td>
            <td class="py-3.5 px-3 text-right">
              <div class="inline-flex items-center gap-3 justify-end">
                <button class="inline-flex items-center gap-1 text-xs text-[#4B5563] hover:text-[#111827] cursor-pointer" data-action="reset" data-code="${s.code}" data-name="${escapeHtml(s.name)}" title="Reset Antrian Poli ${s.code}">
                  <span class="material-symbols-outlined text-[16px]">edit</span> Edit
                </button>
                <button class="inline-flex items-center gap-1 text-xs text-[#DC2626] hover:text-[#B91C1C] cursor-pointer" data-action="delete" data-code="${s.code}" title="Hapus Unit">
                  <span class="material-symbols-outlined text-[16px]">delete</span> Hapus
                </button>
              </div>
            </td>
          </tr>
        `;
            }).join('');
        }
        updateTicketPreview();
        updateManualTicketInfo();
    };
    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
    // Update Live Ticket Preview in Manual Form
    const updateTicketPreview = () => {
        if (!serviceSelect || !previewTicketCode || !previewServiceName)
            return;
        const selectedOpt = serviceSelect.options[serviceSelect.selectedIndex];
        if (!selectedOpt) {
            previewTicketCode.textContent = '-';
            previewServiceName.textContent = 'Tidak Ada Layanan Aktif';
            return;
        }
        const code = selectedOpt.value;
        const name = selectedOpt.getAttribute('data-name') || selectedOpt.text;
        const services = StorageService.getServices();
        const service = services.find(s => s.code === code);
        const nextSeq = (service?.currentNumber || 0) + 1;
        previewTicketCode.textContent = `${code}-${String(nextSeq).padStart(3, '0')}`;
        previewServiceName.textContent = name;
        const previewPrintTime = document.getElementById('preview-print-time');
        if (previewPrintTime) {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            previewPrintTime.textContent = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} - ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;
        }
    };
    window.updateTicketPreview = updateTicketPreview;
    // Visual updater for 4 Priority Pills
    const updatePriorityPillsUI = (activeLabel) => {
        const pills = document.querySelectorAll('#priority-selector .priority-pill');
        pills.forEach((p) => {
            const pLabel = p.getAttribute('data-priority-name') || '';
            const circle = p.querySelector('.priority-circle');
            const radio = p.querySelector('input[type="radio"]');
            if (pLabel.toLowerCase() === activeLabel.toLowerCase()) {
                p.className = 'priority-pill flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border-2 border-[#235347] bg-[#EBF4EE] text-[#111827] text-xs font-semibold cursor-pointer transition-all';
                if (circle) {
                    circle.className = 'priority-circle w-3.5 h-3.5 rounded-full border-2 border-[#235347] flex items-center justify-center flex-shrink-0';
                    circle.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-[#235347]"></span>';
                }
                if (radio)
                    radio.checked = true;
            }
            else {
                p.className = 'priority-pill flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-[#E5E7EB] bg-white hover:border-[#D1D5DB] text-[#4B5563] text-xs font-medium cursor-pointer transition-all';
                if (circle) {
                    circle.className = 'priority-circle w-3.5 h-3.5 rounded-full border border-[#D1D5DB] flex items-center justify-center flex-shrink-0';
                    circle.innerHTML = '';
                }
                if (radio)
                    radio.checked = false;
            }
        });
    };
    // Update Priority Selection
    window.updateTicketPriority = (priorityName, _variant) => {
        selectedPriorityLabel = priorityName;
        const name = priorityName.toLowerCase();
        if (name.includes('vip')) {
            selectedPriority = 'vip';
        }
        else if (name.includes('disabilitas')) {
            selectedPriority = 'disabilitas';
        }
        else if (name.includes('lansia')) {
            selectedPriority = 'lansia';
        }
        else {
            selectedPriority = 'normal';
        }
        updatePriorityPillsUI(priorityName);
        if (previewPriorityBadge) {
            previewPriorityBadge.textContent = `Prioritas: ${priorityName}`;
        }
    };
    // Update MRN in Preview
    window.updateTicketPreviewMRN = (val) => {
        if (!previewMrnVal)
            return;
        if (val.trim()) {
            previewMrnVal.textContent = val.trim();
            previewMrnVal.className = 'font-code-tabular text-primary font-semibold';
        }
        else {
            previewMrnVal.textContent = 'Walk-in Umum';
            previewMrnVal.className = 'font-code-tabular text-outline';
        }
    };
    // Print Manual Ticket Receipt (window.print())
    const printManualTicketReceipt = (autoGenerate = true) => {
        if (autoGenerate) {
            if (!serviceSelect || !serviceSelect.value) {
                alert('Pilih jenis poliklinik / layanan terlebih dahulu.');
                return;
            }
            const code = serviceSelect.value;
            const patientName = mrnInput?.value.trim() || undefined;
            try {
                const ticket = QueueService.generateTicket(code, selectedPriority, {
                    isManualByAdmin: true,
                    username: patientName || 'Walk-in Mandiri',
                    userId: patientName
                });
                if (previewTicketCode)
                    previewTicketCode.textContent = ticket.ticketNumber;
                if (previewServiceName)
                    previewServiceName.textContent = ticket.serviceName;
                const previewPrintTime = document.getElementById('preview-print-time');
                if (previewPrintTime) {
                    const now = new Date();
                    const pad = (n) => String(n).padStart(2, '0');
                    previewPrintTime.textContent = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} - ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;
                }
                showToast(`Tiket ${ticket.ticketNumber} Dicetak!`, `Membuka dialog cetak thermal printer untuk poli ${ticket.serviceName}.`);
                if (mrnInput) {
                    mrnInput.value = '';
                    window.updateTicketPreviewMRN?.('');
                }
                renderServices();
                renderMetrics();
                setTimeout(() => {
                    try {
                        window.print();
                    }
                    catch {
                        // Abaikan jika browser membatasi dialog cetak
                    }
                }, 150);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : 'Gagal mencetak tiket.';
                alert(msg);
            }
        }
        else {
            try {
                window.print();
            }
            catch {
                // Abaikan
            }
        }
    };
    window.printManualTicketReceipt = printManualTicketReceipt;
    // Emit Manual Ticket
    const emitManualTicket = () => {
        if (!serviceSelect || !serviceSelect.value) {
            alert('Pilih jenis poliklinik / layanan terlebih dahulu.');
            return;
        }
        const code = serviceSelect.value;
        const patientName = mrnInput?.value.trim() || undefined;
        try {
            const ticket = QueueService.generateTicket(code, selectedPriority, {
                isManualByAdmin: true,
                username: patientName || 'Walk-in Mandiri',
                userId: patientName
            });
            if (previewTicketCode)
                previewTicketCode.textContent = ticket.ticketNumber;
            if (previewServiceName)
                previewServiceName.textContent = ticket.serviceName;
            const previewPrintTime = document.getElementById('preview-print-time');
            if (previewPrintTime) {
                const now = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                previewPrintTime.textContent = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} - ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;
            }
            showToast(`Tiket ${ticket.ticketNumber} Dicetak!`, `Berhasil mengeluarkan tiket manual untuk kategori [${selectedPriorityLabel}] ke poli ${ticket.serviceName}.`);
            if (mrnInput) {
                mrnInput.value = '';
                window.updateTicketPreviewMRN?.('');
            }
            renderServices();
            renderMetrics();
            const autoPrint = document.getElementById('checkAutoPrintOnSubmit');
            if (autoPrint && autoPrint.checked) {
                setTimeout(() => {
                    window.print();
                }, 150);
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Gagal mencetak tiket.';
            alert(msg);
        }
    };
    window.emitManualTicket = emitManualTicket;
    // Real-time Validation for New Service Modal (Figma Spec - media_1791828510455_fa1b67d8.png)
    const validateNewServiceForm = () => {
        const code = (newServiceCodeInput?.value || '').trim().toUpperCase();
        const name = (newServiceNameInput?.value || '').trim();
        const services = StorageService.getServices();
        const codeError = document.getElementById('newServiceCodeError');
        const nameError = document.getElementById('newServiceNameError');
        const btnSave = document.getElementById('btnSaveNewService');
        let isCodeValid = true;
        let isNameValid = true;
        if (code) {
            const existingByCode = services.find(s => s.code.toUpperCase() === code);
            if (existingByCode) {
                isCodeValid = false;
                if (codeError) {
                    codeError.textContent = `Kode ${code} sudah digunakan oleh ${existingByCode.name}.`;
                    codeError.classList.remove('hidden');
                }
                newServiceCodeInput?.classList.add('border-red-500');
            }
            else {
                if (codeError)
                    codeError.classList.add('hidden');
                newServiceCodeInput?.classList.remove('border-red-500');
            }
        }
        else {
            if (codeError)
                codeError.classList.add('hidden');
            newServiceCodeInput?.classList.remove('border-red-500');
        }
        if (name) {
            const existingByName = services.find(s => s.name.trim().toLowerCase() === name.toLowerCase());
            if (existingByName) {
                isNameValid = false;
                if (nameError) {
                    nameError.textContent = `Nama ${name} sudah digunakan. Huruf besar/kecil tidak membedakan nama layanan.`;
                    nameError.classList.remove('hidden');
                }
                newServiceNameInput?.classList.add('border-red-500');
            }
            else {
                if (nameError)
                    nameError.classList.add('hidden');
                newServiceNameInput?.classList.remove('border-red-500');
            }
        }
        else {
            if (nameError)
                nameError.classList.add('hidden');
            newServiceNameInput?.classList.remove('border-red-500');
        }
        const canSave = code.length === 1 && /^[A-Z]$/.test(code) && name.length >= 3 && isCodeValid && isNameValid;
        if (btnSave) {
            btnSave.disabled = !canSave;
            if (canSave) {
                btnSave.className = 'px-5 py-2 rounded-lg bg-[#235347] hover:bg-[#1a4036] text-white text-xs font-semibold transition-all cursor-pointer';
            }
            else {
                btnSave.className = 'px-5 py-2 rounded-lg bg-[#E5E7EB] text-[#9CA3AF] text-xs font-semibold cursor-not-allowed';
            }
        }
    };
    newServiceCodeInput?.addEventListener('input', validateNewServiceForm);
    newServiceNameInput?.addEventListener('input', validateNewServiceForm);
    // Modal Handlers for New Service
    window.openNewServiceModal = () => {
        if (newServiceModal) {
            newServiceModal.classList.remove('hidden');
            newServiceModal.classList.add('flex');
            if (newServiceCodeInput) {
                newServiceCodeInput.value = '';
                newServiceCodeInput.classList.remove('border-red-500');
                newServiceCodeInput.focus();
            }
            if (newServiceNameInput) {
                newServiceNameInput.value = '';
                newServiceNameInput.classList.remove('border-red-500');
            }
            validateNewServiceForm();
        }
    };
    window.closeNewServiceModal = () => {
        if (newServiceModal) {
            newServiceModal.classList.add('hidden');
            newServiceModal.classList.remove('flex');
        }
    };
    window.saveNewService = () => {
        const code = newServiceCodeInput?.value.trim().toUpperCase() || '';
        const name = newServiceNameInput?.value.trim() || '';
        if (!code || code.length !== 1 || !/^[A-Z]$/.test(code)) {
            alert('Kode layanan harus berupa 1 huruf kapital (A-Z).');
            newServiceCodeInput?.focus();
            return;
        }
        if (!name || name.length < 3) {
            alert('Nama poliklinik / layanan minimal 3 karakter.');
            newServiceNameInput?.focus();
            return;
        }
        const success = StorageService.addService(code, name);
        if (!success) {
            alert(`Kode "${code}" atau nama "${name}" sudah terdaftar.`);
            return;
        }
        window.closeNewServiceModal?.();
        if (newServiceCodeInput)
            newServiceCodeInput.value = '';
        if (newServiceNameInput)
            newServiceNameInput.value = '';
        validateNewServiceForm();
        showToast('Layanan Ditambahkan', `Unit poliklinik [${code}] ${name} berhasil didaftarkan ke SIMRS.`);
        renderServices();
        renderMetrics();
    };
    // Reset Queue Prompt for Single Service
    window.resetQueuePrompt = (serviceName, code) => {
        if (confirm(`Konfirmasi reset antrian harian untuk [${code}] - ${serviceName}?\nNomor antrian akan dikembalikan ke urutan 001.`)) {
            StorageService.resetServiceCounter(code);
            showToast(`Antrian ${code} Direset`, `Unit ${serviceName} kini kembali ke antrian awal (001).`);
            renderServices();
            renderMetrics();
        }
    };
    // Table Event Delegation (Toggle, Reset, Delete)
    serviceTableBody?.addEventListener('click', (e) => {
        const target = e.target;
        const btn = target.closest('button[data-action]');
        if (!btn)
            return;
        const action = btn.getAttribute('data-action');
        const code = btn.getAttribute('data-code');
        if (!code)
            return;
        if (action === 'toggle') {
            StorageService.toggleService(code);
            renderServices();
            renderMetrics();
        }
        else if (action === 'reset') {
            const name = btn.getAttribute('data-name') || code;
            window.resetQueuePrompt?.(name, code);
        }
        else if (action === 'delete') {
            if (confirm(`Apakah Anda yakin ingin menghapus poli [${code}]? Seluruh antrian terkait akan disinkronkan.`)) {
                StorageService.deleteService(code);
                showToast('Layanan Dihapus', `Layanan [${code}] telah dihapus dari sistem.`);
                renderServices();
                renderMetrics();
            }
        }
    });
    // Search input filter listener
    searchInput?.addEventListener('input', () => {
        renderServices();
    });
    // Attach explicit listeners for Add Service buttons
    document.getElementById('btnOpenAddService')?.addEventListener('click', () => {
        window.openNewServiceModal?.();
    });
    document.getElementById('btnOpenAddServiceBottom')?.addEventListener('click', () => {
        window.openNewServiceModal?.();
    });
    // Reset All Queues Modal (Figma Spec - media_1791828510455_fa1b67d8.png)
    const resetAllModal = document.getElementById('reset-all-queues-modal');
    const resetSummaryServices = document.getElementById('resetSummaryServices');
    const resetSummaryDetails = document.getElementById('resetSummaryDetails');
    const btnCancelResetAll = document.getElementById('btnCancelResetAll');
    const btnConfirmResetAll = document.getElementById('btnConfirmResetAll');
    const openResetAllModal = () => {
        const services = StorageService.getServices().filter(s => s.isActive);
        const tickets = StorageService.getTickets();
        const callingCount = tickets.filter(t => t.status === 'calling').length;
        const waitingCount = tickets.filter(t => t.status === 'waiting').length;
        const totalCount = tickets.length;
        if (resetSummaryServices) {
            resetSummaryServices.textContent = `${services.length} layanan aktif · ${totalCount} tiket`;
        }
        if (resetSummaryDetails) {
            resetSummaryDetails.textContent = `${callingCount} sedang dipanggil dan ${waitingCount} menunggu.`;
        }
        if (resetAllModal) {
            resetAllModal.classList.remove('hidden');
            resetAllModal.classList.add('flex');
        }
    };
    const closeResetAllModal = () => {
        if (resetAllModal) {
            resetAllModal.classList.add('hidden');
            resetAllModal.classList.remove('flex');
        }
    };
    btnCancelResetAll?.addEventListener('click', closeResetAllModal);
    resetAllModal?.addEventListener('click', (e) => {
        if (e.target === resetAllModal)
            closeResetAllModal();
    });
    btnConfirmResetAll?.addEventListener('click', () => {
        StorageService.clearAllTickets();
        closeResetAllModal();
        showToast('Seluruh Antrian Direset', 'Semua tiket telah dikosongkan dan nomor antrean poliklinik dikembalikan ke 001.');
        renderServices();
        renderMetrics();
    });
    // Reset All Queues Buttons Handler
    const handleResetAllQueues = () => {
        openResetAllModal();
    };
    document.getElementById('btnResetAllQueues')?.addEventListener('click', handleResetAllQueues);
    document.getElementById('btnResetAllQueuesBottom')?.addEventListener('click', handleResetAllQueues);
    // Modal Buttons & Backdrop
    document.getElementById('btnCloseNewServiceModal')?.addEventListener('click', () => {
        window.closeNewServiceModal?.();
    });
    document.getElementById('btnCancelNewService')?.addEventListener('click', () => {
        window.closeNewServiceModal?.();
    });
    document.getElementById('btnSaveNewService')?.addEventListener('click', () => {
        window.saveNewService?.();
    });
    // Close modal when clicking backdrop
    newServiceModal?.addEventListener('click', (e) => {
        if (e.target === newServiceModal) {
            window.closeNewServiceModal?.();
        }
    });
    // Enter key inside modal inputs saves the service
    newServiceCodeInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            window.saveNewService?.();
        }
    });
    newServiceNameInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            window.saveNewService?.();
        }
    });
    // Service select & MRN inputs live preview listeners
    serviceSelect?.addEventListener('change', () => {
        updateTicketPreview();
        updateManualTicketInfo();
    });
    mrnInput?.addEventListener('input', (e) => {
        const val = e.target.value;
        window.updateTicketPreviewMRN?.(val);
    });
    // Priority selector delegation
    const priorityContainer = document.getElementById('priority-selector');
    priorityContainer?.addEventListener('click', (e) => {
        const labelEl = e.target.closest('.priority-pill, label');
        if (!labelEl)
            return;
        const radio = labelEl.querySelector('input[type="radio"]');
        const val = labelEl.getAttribute('data-priority-name') || radio?.value || 'Normal';
        window.updateTicketPriority?.(val, 'pine');
    });
    // Manual Form Submit & Button
    manualForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        emitManualTicket();
    });
    document.getElementById('btnManualSubmit')?.addEventListener('click', (e) => {
        e.preventDefault();
        emitManualTicket();
    });
    document.getElementById('btnManualPrintPhysical')?.addEventListener('click', (e) => {
        e.preventDefault();
        printManualTicketReceipt(true);
    });
    // Global Key Listener for F9 Quick Print and Escape for modal
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F9') {
            e.preventDefault();
            emitManualTicket();
        }
        else if (e.key === 'Escape') {
            window.closeNewServiceModal?.();
        }
    });
    // Export Daily Report (CSV & JSON)
    const btnExportCsv = document.getElementById('btnExportCsv');
    const btnExportJson = document.getElementById('btnExportJson');
    const btnExportDropdown = document.getElementById('btnExportDropdown');
    const exportDropdownMenu = document.getElementById('export-dropdown-menu');
    if (btnExportDropdown && exportDropdownMenu) {
        btnExportDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            exportDropdownMenu.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!exportDropdownMenu.contains(e.target) && e.target !== btnExportDropdown) {
                exportDropdownMenu.classList.add('hidden');
            }
        });
    }
    const handleExportCsv = () => {
        try {
            const result = ExportService.exportCsv();
            showToast('Laporan Berhasil Diunduh', `File ${result.filename} (${result.totalRecords} antrean) berhasil diunduh.`);
            exportDropdownMenu?.classList.add('hidden');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Gagal mengunduh laporan CSV.';
            showToast('Ekspor Gagal', msg);
        }
    };
    const handleExportJson = () => {
        try {
            const result = ExportService.exportJson();
            showToast('Laporan Berhasil Diunduh', `File ${result.filename} (${result.totalRecords} antrean) berhasil diunduh.`);
            exportDropdownMenu?.classList.add('hidden');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Gagal mengunduh backup JSON.';
            showToast('Ekspor Gagal', msg);
        }
    };
    btnExportCsv?.addEventListener('click', (e) => {
        e.preventDefault();
        handleExportCsv();
    });
    btnExportJson?.addEventListener('click', (e) => {
        e.preventDefault();
        handleExportJson();
    });
    window.exportReportCsv = handleExportCsv;
    window.exportReportJson = handleExportJson;
    // --- ASSISTANCE & NURSE CALL DISPATCH LOG ---
    const assistancePendingBadge = document.getElementById('assistance-pending-badge');
    const assistanceTableBody = document.getElementById('assistance-table-body');
    const filterAssistanceAll = document.getElementById('filter-assistance-all');
    const filterAssistancePending = document.getElementById('filter-assistance-pending');
    const filterAssistanceResolved = document.getElementById('filter-assistance-resolved');
    let assistanceFilter = 'all';
    const formatAssistanceTime = (ts) => {
        const d = new Date(ts);
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} WIB`;
    };
    const formatAssistanceDate = (ts) => {
        const d = new Date(ts);
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    };
    const adminDisplayName = currentUser.firstName
        ? `${currentUser.firstName} ${currentUser.lastName || ''} (${currentUser.role === 'admin' ? 'Admin' : 'Staf'})`.trim()
        : `${currentUser.username} (Admin)`;
    const renderAssistanceLog = () => {
        const allRequests = StorageService.getAssistanceRequests();
        const pendingCount = allRequests.filter(r => r.status === 'pending').length;
        if (assistancePendingBadge) {
            assistancePendingBadge.textContent = `${pendingCount} Menunggu Petugas`;
            if (pendingCount > 0) {
                assistancePendingBadge.className = 'px-2.5 py-1 rounded-full bg-error-container text-error font-code-tabular text-label-sm font-bold animate-pulse';
            }
            else {
                assistancePendingBadge.className = 'px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-code-tabular text-label-sm font-medium';
            }
        }
        if (!assistanceTableBody)
            return;
        let filtered = allRequests;
        if (assistanceFilter === 'pending') {
            filtered = allRequests.filter(r => r.status === 'pending');
        }
        else if (assistanceFilter === 'resolved') {
            filtered = allRequests.filter(r => r.status === 'resolved');
        }
        if (filtered.length === 0) {
            assistanceTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="py-8 text-center text-outline text-body-md">
            <div class="flex flex-col items-center justify-center gap-1.5 py-4">
              <span class="material-symbols-outlined text-[32px] text-outline">notifications_off</span>
              <span class="font-medium">Tidak ada riwayat panggilan bantuan ${assistanceFilter !== 'all' ? `(${assistanceFilter})` : ''}.</span>
            </div>
          </td>
        </tr>
      `;
            return;
        }
        assistanceTableBody.innerHTML = filtered.map(req => {
            const isPending = req.status === 'pending';
            const statusBadge = isPending
                ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container/30 text-error font-label-sm text-label-sm font-semibold animate-pulse"><span class="w-1.5 h-1.5 rounded-full bg-error"></span> Menunggu Petugas</span>`
                : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/30 text-secondary font-label-sm text-label-sm font-semibold"><span class="material-symbols-outlined text-[16px]">check_circle</span> Sudah Didatangi</span>`;
            const handlerInfo = isPending
                ? `<span class="text-outline italic text-body-sm">Belum ada petugas</span>`
                : `<div>
            <div class="font-semibold text-on-surface text-label-md">${req.handledBy || 'Petugas Medis'}</div>
            <div class="font-code-tabular text-label-sm text-on-surface-variant mt-0.5">Selesai: ${formatAssistanceDate(req.handledAt || req.timestamp)} • ${formatAssistanceTime(req.handledAt || req.timestamp)}</div>
           </div>`;
            const actionControl = isPending
                ? `<div class="flex items-center justify-end gap-2 flex-wrap">
             <button class="btn-assist-print-ticket px-2.5 py-1 bg-primary hover:bg-primary-container text-on-primary rounded text-label-sm font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95" data-id="${req.id}" title="Bantu terbitkan tiket manual untuk pengunjung">
               <span class="material-symbols-outlined text-[16px]">confirmation_number</span> Bantu Cetak Tiket
             </button>
             <button class="btn-resolve-assistance px-2.5 py-1 bg-secondary text-on-secondary rounded text-label-sm font-semibold hover:opacity-90 transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95" data-id="${req.id}" title="Tandai sudah didatangi">
               <span class="material-symbols-outlined text-[16px]">check</span> Selesai
             </button>
           </div>`
                : `<span class="inline-flex items-center gap-1 text-secondary font-label-sm font-medium"><span class="material-symbols-outlined text-[16px]">task_alt</span> Selesai Ditangani</span>`;
            return `
        <tr class="hover:bg-surface-container-low/60 transition-colors group">
          <td class="py-3.5 px-4 font-code-tabular">
            <div class="font-semibold text-on-surface">${formatAssistanceTime(req.timestamp)}</div>
            <div class="text-outline text-label-sm">${formatAssistanceDate(req.timestamp)}</div>
          </td>
          <td class="py-3.5 px-4 font-title-sm">
            <div class="font-semibold text-on-surface flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[18px]">personal_places</span>
              <span>${req.source}</span>
            </div>
          </td>
          <td class="py-3.5 px-4 text-center">
            ${statusBadge}
          </td>
          <td class="py-3.5 px-4">
            ${handlerInfo}
          </td>
          <td class="py-3.5 px-4 text-right">
            <div class="flex items-center justify-end">
              ${actionControl}
            </div>
          </td>
        </tr>
      `;
        }).join('');
    };
    // Event delegation on table body for resolution and print assistance actions
    assistanceTableBody?.addEventListener('click', (e) => {
        const printBtn = e.target.closest('.btn-assist-print-ticket');
        if (printBtn) {
            const formEl = document.getElementById('manual-ticket-form');
            formEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            serviceSelect?.focus();
            showToast('Bantuan Pengunjung Kiosk', 'Form tiket manual aktif. Silakan pilih layanan dan cetak tiket untuk pengunjung.');
            return;
        }
        const resolveBtn = e.target.closest('.btn-resolve-assistance');
        if (!resolveBtn)
            return;
        const reqId = resolveBtn.getAttribute('data-id');
        if (!reqId)
            return;
        const resolved = StorageService.resolveAssistanceRequest(reqId, adminDisplayName);
        if (resolved) {
            showToast('Panggilan Bantuan Ditangani', 'Petugas berhasil dikonfirmasi telah mendatangi kiosk.');
            renderAssistanceLog();
        }
    });
    // Filter tabs handling
    const updateAssistanceFilterTabs = () => {
        const tabs = [
            { el: filterAssistanceAll, key: 'all' },
            { el: filterAssistancePending, key: 'pending' },
            { el: filterAssistanceResolved, key: 'resolved' }
        ];
        tabs.forEach(({ el, key }) => {
            if (!el)
                return;
            if (assistanceFilter === key) {
                el.className = 'filter-assistance-btn px-3 py-1.5 rounded-full font-label-sm font-semibold transition-colors bg-primary text-on-primary shadow-sm cursor-pointer';
            }
            else {
                el.className = 'filter-assistance-btn px-3 py-1.5 rounded-full font-label-sm font-semibold transition-colors bg-surface-container text-on-surface-variant hover:bg-surface-container-high cursor-pointer';
            }
        });
    };
    const filterStatusSelect = document.getElementById('filterStatusSelect');
    filterStatusSelect?.addEventListener('change', () => {
        const val = filterStatusSelect.value.toUpperCase();
        if (val === 'WAITING' || val === 'PENDING') {
            assistanceFilter = 'pending';
        }
        else if (val === 'HANDLED' || val === 'RESOLVED') {
            assistanceFilter = 'resolved';
        }
        else {
            assistanceFilter = 'all';
        }
        updateAssistanceFilterTabs();
        renderAssistanceLog();
    });
    filterAssistanceAll?.addEventListener('click', () => {
        assistanceFilter = 'all';
        if (filterStatusSelect)
            filterStatusSelect.value = 'ALL';
        updateAssistanceFilterTabs();
        renderAssistanceLog();
    });
    filterAssistancePending?.addEventListener('click', () => {
        assistanceFilter = 'pending';
        if (filterStatusSelect)
            filterStatusSelect.value = 'WAITING';
        updateAssistanceFilterTabs();
        renderAssistanceLog();
    });
    filterAssistanceResolved?.addEventListener('click', () => {
        assistanceFilter = 'resolved';
        if (filterStatusSelect)
            filterStatusSelect.value = 'HANDLED';
        updateAssistanceFilterTabs();
        renderAssistanceLog();
    });
    // --- MANAJEMEN AKUN PENGGUNA (CUSTOM USERS) ---
    const userManagementModal = document.getElementById('user-management-modal');
    const btnOpenUserModal = document.getElementById('btnOpenUserModal');
    const btnCloseUserModal = document.getElementById('btnCloseUserModal');
    const btnCancelUserModal = document.getElementById('btnCancelUserModal');
    const btnSaveUser = document.getElementById('btnSaveUser');
    const newFullNameInput = document.getElementById('newFullName');
    const newUsernameInput = document.getElementById('newUsername');
    const newPasswordInput = document.getElementById('newPassword');
    const newUserRoleSelect = document.getElementById('newUserRole');
    const customUserTableBody = document.getElementById('custom-user-table-body');
    const customUserCount = document.getElementById('custom-user-count');
    const renderCustomUsers = () => {
        if (!customUserTableBody)
            return;
        const users = StorageService.getCustomUsers();
        if (customUserCount) {
            customUserCount.textContent = `${users.length} Pengguna`;
        }
        if (users.length === 0) {
            customUserTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="py-6 text-center text-on-surface-variant font-label-md">
            Belum ada akun kustom tersimpan. Akun demo bawaan (emilys, averyp, oliviaw, michaelw) aktif secara otomatis.
          </td>
        </tr>
      `;
            return;
        }
        customUserTableBody.innerHTML = users.map(u => {
            let roleBadgeColor = 'bg-primary/10 text-primary';
            if (u.role === 'admin')
                roleBadgeColor = 'bg-purple-100 text-purple-800';
            else if (u.role === 'operator')
                roleBadgeColor = 'bg-blue-100 text-blue-800';
            else if (u.role === 'moderator')
                roleBadgeColor = 'bg-amber-100 text-amber-800';
            else if (u.role === 'user')
                roleBadgeColor = 'bg-emerald-100 text-emerald-800';
            const dateStr = new Date(u.createdAt).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            return `
        <tr class="hover:bg-surface-container-low/50 transition-colors">
          <td class="py-3 px-3 font-semibold text-on-surface">${u.fullName}</td>
          <td class="py-3 px-3 font-code-tabular text-on-surface-variant font-medium">@${u.username}</td>
          <td class="py-3 px-3 text-center">
            <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${roleBadgeColor}">
              ${u.role.toUpperCase()}
            </span>
          </td>
          <td class="py-3 px-3 text-center text-outline text-xs">${dateStr}</td>
          <td class="py-3 px-3 text-right">
            <button type="button" class="btn-delete-user text-error hover:text-error-container p-1 rounded hover:bg-error-container/20 transition-colors cursor-pointer" data-username="${u.username}" title="Hapus Akun Pengguna">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </td>
        </tr>
      `;
        }).join('');
    };
    const openUserModal = () => {
        if (userManagementModal) {
            userManagementModal.classList.remove('hidden');
            userManagementModal.classList.add('flex');
            renderCustomUsers();
            newFullNameInput?.focus();
        }
    };
    window.openUserModal = openUserModal;
    const closeUserModal = () => {
        if (userManagementModal) {
            userManagementModal.classList.add('hidden');
            userManagementModal.classList.remove('flex');
        }
    };
    window.closeUserModal = closeUserModal;
    btnOpenUserModal?.addEventListener('click', openUserModal);
    btnCloseUserModal?.addEventListener('click', closeUserModal);
    btnCancelUserModal?.addEventListener('click', closeUserModal);
    btnSaveUser?.addEventListener('click', () => {
        const fullName = newFullNameInput?.value.trim() || '';
        const username = newUsernameInput?.value.trim().toLowerCase() || '';
        const password = newPasswordInput?.value.trim() || '';
        const role = (newUserRoleSelect?.value || 'operator');
        if (!fullName || fullName.length < 2) {
            alert('Mohon isi nama lengkap dengan benar (minimal 2 karakter).');
            newFullNameInput?.focus();
            return;
        }
        if (!username || username.length < 3) {
            alert('Username ID minimal 3 karakter tanpa spasi.');
            newUsernameInput?.focus();
            return;
        }
        if (password && password.length < 4) {
            alert('Kata sandi minimal 4 karakter jika diisi.');
            newPasswordInput?.focus();
            return;
        }
        const success = StorageService.addCustomUser({
            fullName,
            username,
            password: password || undefined,
            role
        });
        if (!success) {
            alert(`Username "${username}" sudah digunakan oleh sistem atau akun lain. Silakan pilih username berbeda.`);
            newUsernameInput?.focus();
            return;
        }
        // Reset Form Input
        if (newFullNameInput)
            newFullNameInput.value = '';
        if (newUsernameInput)
            newUsernameInput.value = '';
        if (newPasswordInput)
            newPasswordInput.value = '';
        showToast('Pengguna Ditambahkan', `Akun @${username} (${role.toUpperCase()}) berhasil didaftarkan dan dapat langsung digunakan.`);
        renderCustomUsers();
    });
    customUserTableBody?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-delete-user');
        if (!btn)
            return;
        const targetUsername = btn.getAttribute('data-username');
        if (!targetUsername)
            return;
        if (confirm(`Apakah Anda yakin ingin menghapus akun @${targetUsername}? Pengguna ini tidak akan bisa login lagi.`)) {
            const deleted = StorageService.deleteCustomUser(targetUsername);
            if (deleted) {
                showToast('Pengguna Dihapus', `Akun @${targetUsername} berhasil dihapus dari sistem.`);
                renderCustomUsers();
            }
        }
    });
    // Consolidated renderAll function for live sync
    const renderAll = () => {
        renderServices();
        renderMetrics();
        renderPatientQueueRoster();
        renderAssistanceLog();
        if (userManagementModal && !userManagementModal.classList.contains('hidden')) {
            renderCustomUsers();
        }
    };
    // Initial Execution
    updateAssistanceFilterTabs();
    renderAll();
    // Multi-tab & Local Event Sync
    window.addEventListener('storage', () => {
        renderAll();
    });
    StorageService.onSync(() => {
        renderAll();
    });
    window.addEventListener('medika_storage_sync', () => {
        renderAll();
    });
    // Active Short-Polling Interval (1500ms) for real-time synchronization
    setInterval(() => {
        renderAll();
    }, 1500);
});
