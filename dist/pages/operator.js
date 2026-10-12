import { AuthService, renderNavbar } from '../services/auth.js';
import { StorageService, getCounterForService } from '../services/storage.js';
import { QueueService } from '../services/queue.js';
import { SpeechService } from '../services/speech.js';
import { PRIORITY_CONFIGS } from '../models/types.js';
document.addEventListener('DOMContentLoaded', () => {
    // Auth Guard: hanya admin, moderator, dan operator
    const currentUser = AuthService.requireAuth(['admin', 'moderator', 'operator']);
    if (!currentUser)
        return;
    // Render Navbar dinamis
    renderNavbar('operator.html');
    // DOM Elements - Profile & Header
    const userFullName = document.getElementById('userFullName');
    const userRoleBadge = document.getElementById('userRoleBadge');
    const userAvatar = document.getElementById('userAvatar');
    const btnLogout = document.getElementById('btnLogout');
    // Cockpit Bar Info & Dropdown Elements
    const headerDeskBadge = document.getElementById('headerDeskBadge');
    const operatorDeskName = document.getElementById('operatorDeskName');
    const operatorServiceName = document.getElementById('operatorServiceName');
    const operatorStaffName = document.getElementById('operatorStaffName');
    const operatorStaffId = document.getElementById('operatorStaffId');
    const operatorCounterSelect = document.getElementById('operatorCounterSelect');
    if (userFullName)
        userFullName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    if (userRoleBadge)
        userRoleBadge.textContent = `${currentUser.role.toUpperCase()} (Keluar)`;
    if (userAvatar && currentUser.image)
        userAvatar.src = currentUser.image;
    if (operatorStaffName)
        operatorStaffName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    if (operatorStaffId)
        operatorStaffId.textContent = currentUser.username.toUpperCase();
    btnLogout?.addEventListener('click', () => {
        AuthService.logout();
    });
    // Active Desk & Service State
    let deskName = 'Loket 01';
    let deskService = 'Poli Umum';
    let activeServiceCode = 'A';
    let isAutoCounterMode = false;
    const applySelectedCounter = () => {
        if (!operatorCounterSelect)
            return;
        const opt = operatorCounterSelect.options[operatorCounterSelect.selectedIndex];
        if (!opt)
            return;
        const val = opt.value;
        const code = opt.getAttribute('data-service-code') || '';
        if (code === 'ALL' || val.includes('Semua')) {
            deskName = 'Semua Loket';
            deskService = 'Otomatis Sesuai Poli Pasien';
            activeServiceCode = undefined;
            isAutoCounterMode = true;
        }
        else {
            const parts = val.split(' - ');
            deskName = parts[0]?.trim() || 'Loket 01';
            deskService = parts[1]?.trim() || 'Poli Umum';
            activeServiceCode = code || undefined;
            isAutoCounterMode = false;
        }
        if (operatorDeskName)
            operatorDeskName.textContent = isAutoCounterMode ? 'Semua Loket' : deskName;
        if (operatorServiceName)
            operatorServiceName.textContent = deskService;
        if (headerDeskBadge)
            headerDeskBadge.textContent = isAutoCounterMode ? `Semua Loket • Mode Otomatis` : `${deskName} • Aktif Melayani`;
        if (activeDeskLabel && !currentActiveTicket) {
            activeDeskLabel.textContent = isAutoCounterMode
                ? `Tekan [Panggil Berikutnya] untuk memanggil antrean (loket otomatis sesuai poli)`
                : `Tekan [Panggil Berikutnya] untuk memanggil antrean ke ${deskName}`;
        }
    };
    const initCounterSelect = () => {
        const assigned = currentUser.assignedCounter;
        if (operatorCounterSelect) {
            let matchedIndex = -1;
            if (assigned) {
                const numMatch = assigned.match(/\d+/);
                const assignedNum = numMatch ? parseInt(numMatch[0], 10) : null;
                for (let i = 0; i < operatorCounterSelect.options.length; i++) {
                    const opt = operatorCounterSelect.options[i];
                    if (opt.value.toLowerCase().includes(assigned.toLowerCase()) || assigned.toLowerCase().includes(opt.value.toLowerCase())) {
                        matchedIndex = i;
                        break;
                    }
                    if (assignedNum !== null && (opt.value.includes(`0${assignedNum}`) || opt.value.includes(`Loket ${assignedNum}`))) {
                        matchedIndex = i;
                        break;
                    }
                }
            }
            if (matchedIndex !== -1) {
                operatorCounterSelect.selectedIndex = matchedIndex;
            }
            else {
                operatorCounterSelect.selectedIndex = 0;
            }
            applySelectedCounter();
            operatorCounterSelect.addEventListener('change', () => {
                applySelectedCounter();
                renderQueueTable();
            });
        }
        else {
            const parts = (assigned || 'Loket 01 - Poli Umum').split(' - ');
            deskName = parts[0] || 'Loket 01';
            deskService = parts[1] || 'Poli Umum';
            activeServiceCode = 'A';
            isAutoCounterMode = false;
        }
    };
    // Active Calling Deck DOM Elements
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
    // Control Buttons
    const btnCallNext = document.getElementById('btn-call-next');
    const btnCallRepeat = document.getElementById('btn-call-repeat');
    const btnCallSkip = document.getElementById('btn-call-skip');
    const btnCallComplete = document.getElementById('btn-call-complete');
    const btnSoundTest = document.getElementById('btn-sound-test');
    // Waiting Queue DOM Elements
    const waitingQueueCount = document.getElementById('waiting-queue-count');
    const filterAll = document.getElementById('filter-all');
    const filterPriority = document.getElementById('filter-priority');
    const filterNormal = document.getElementById('filter-normal');
    const queueTableBody = document.getElementById('queue-table-body');
    // Local State
    let currentActiveTicket = StorageService.getActiveTicket();
    let callFrequency = currentActiveTicket ? 1 : 0;
    let timerInterval = null;
    let callSeconds = 0;
    let currentFilter = 'all';
    // Timer helpers
    const startTimer = () => {
        stopTimer();
        callSeconds = 0;
        if (callTimer)
            callTimer.textContent = '00:00';
        timerInterval = window.setInterval(() => {
            callSeconds++;
            const mins = Math.floor(callSeconds / 60);
            const secs = callSeconds % 60;
            if (callTimer) {
                callTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
        }, 1000);
    };
    const stopTimer = () => {
        if (timerInterval !== null) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    };
    // Render Active Calling Deck
    const renderActiveCard = () => {
        currentActiveTicket = StorageService.getActiveTicket();
        if (!currentActiveTicket) {
            stopTimer();
            if (activeTicketNum)
                activeTicketNum.textContent = '---';
            if (activePriorityBadge) {
                activePriorityBadge.className = 'inline-flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container text-on-surface font-label-md text-label-md font-semibold';
            }
            if (activePriorityIcon)
                activePriorityIcon.textContent = 'schedule';
            if (activePriorityText)
                activePriorityText.textContent = 'MENUNGGU PANGGILAN';
            if (activeDeskLabel)
                activeDeskLabel.textContent = `Tekan [Panggil Berikutnya] untuk memanggil antrean ke ${deskName}`;
            if (activePatientName)
                activePatientName.textContent = '-';
            if (activePatientMrn)
                activePatientMrn.textContent = '-';
            if (callTimer)
                callTimer.textContent = '00:00';
            if (activeCallCount)
                activeCallCount.textContent = '0 Kali';
            if (activeCallTime)
                activeCallTime.textContent = '';
            const soundWaveEl = document.getElementById('operator-sound-wave');
            if (soundWaveEl)
                soundWaveEl.classList.remove('active');
            return;
        }
        // Ticket active
        const ticket = currentActiveTicket;
        if (activeTicketNum)
            activeTicketNum.textContent = ticket.ticketNumber;
        const soundWaveEl = document.getElementById('operator-sound-wave');
        if (soundWaveEl)
            soundWaveEl.classList.add('active');
        if (activePriorityBadge && activePriorityIcon && activePriorityText) {
            if (ticket.priority === 'vip') {
                activePriorityBadge.className = 'inline-flex items-center gap-space-xs px-space-sm py-1 rounded bg-purple-100 text-purple-900 font-label-md text-label-md font-semibold';
                activePriorityIcon.textContent = 'star';
                activePriorityText.textContent = 'PRIORITAS: VIP / FAST TRACK';
            }
            else if (ticket.priority === 'disabilitas') {
                activePriorityBadge.className = 'inline-flex items-center gap-space-xs px-space-sm py-1 rounded bg-amber-100 text-amber-900 font-label-md text-label-md font-semibold';
                activePriorityIcon.textContent = 'accessible_forward';
                activePriorityText.textContent = 'PRIORITAS: DISABILITAS & AKSES KHUSUS';
            }
            else if (ticket.priority === 'lansia') {
                activePriorityBadge.className = 'inline-flex items-center gap-space-xs px-space-sm py-1 rounded bg-orange-100 text-orange-900 font-label-md text-label-md font-semibold';
                activePriorityIcon.textContent = 'elderly';
                activePriorityText.textContent = 'PRIORITAS: LANSIA & GERIATRI';
            }
            else {
                activePriorityBadge.className = 'inline-flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold';
                activePriorityIcon.textContent = 'person';
                activePriorityText.textContent = 'PASIEN REGULER';
            }
        }
        const ticketDesk = ticket.counterName || (isAutoCounterMode ? getCounterForService(ticket.serviceCode) : deskName);
        if (activeDeskLabel) {
            activeDeskLabel.textContent = `Dipanggil ke Meja Konsultasi ${ticketDesk}`;
        }
        if (activePatientName) {
            activePatientName.textContent = `Pasien Tiket ${ticket.ticketNumber}`;
        }
        if (activePatientMrn) {
            activePatientMrn.textContent = `RM-${ticket.ticketNumber}`;
        }
        if (activeCallCount) {
            activeCallCount.textContent = `${callFrequency} Kali`;
        }
        if (activeCallTime) {
            const now = new Date();
            activeCallTime.textContent = `(${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB)`;
        }
        if (timerInterval === null) {
            startTimer();
        }
    };
    // Render Waiting Queue Table
    const renderQueueTable = () => {
        // Ambil seluruh antrean tunggu lintas poli agar tiket yang dicetak langsung tampil real-time
        const allWaiting = QueueService.getWaitingTickets();
        const priorityCount = allWaiting.filter(t => t.priority !== 'normal').length;
        const normalCount = allWaiting.filter(t => t.priority === 'normal').length;
        if (waitingQueueCount) {
            waitingQueueCount.textContent = `${allWaiting.length} Antrean`;
        }
        if (filterAll) {
            filterAll.textContent = `Semua (${allWaiting.length})`;
            updateFilterButton(filterAll, currentFilter === 'all');
        }
        if (filterPriority) {
            filterPriority.textContent = `Prioritas (${priorityCount})`;
            updateFilterButton(filterPriority, currentFilter === 'priority');
        }
        if (filterNormal) {
            filterNormal.textContent = `Normal (${normalCount})`;
            updateFilterButton(filterNormal, currentFilter === 'normal');
        }
        let filtered = allWaiting;
        if (currentFilter === 'priority') {
            filtered = allWaiting.filter(t => t.priority !== 'normal');
        }
        else if (currentFilter === 'normal') {
            filtered = allWaiting.filter(t => t.priority === 'normal');
        }
        if (queueTableBody) {
            if (filtered.length === 0) {
                queueTableBody.innerHTML = `
          <tr>
            <td colspan="5" class="py-6 text-center text-on-surface-variant font-medium">
              Tidak ada antrean tunggu pada kategori ini.
            </td>
          </tr>
        `;
                return;
            }
            queueTableBody.innerHTML = filtered.map((t, idx) => {
                const createdDate = new Date(t.createdAt);
                const timeStr = `${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}`;
                const estMinutes = (idx + 1) * 4;
                let badgeHtml = '';
                if (t.priority === 'vip') {
                    badgeHtml = `
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-900 font-label-sm text-label-sm font-semibold">
              <span class="material-symbols-outlined text-[13px] text-purple-700">star</span>
              VIP
            </span>
          `;
                }
                else if (t.priority === 'disabilitas') {
                    badgeHtml = `
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-label-sm text-label-sm font-semibold">
              <span class="material-symbols-outlined text-[13px] text-amber-700">accessible</span>
              Disabilitas
            </span>
          `;
                }
                else if (t.priority === 'lansia') {
                    badgeHtml = `
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-50 text-orange-900 font-label-sm text-label-sm font-semibold">
              <span class="material-symbols-outlined text-[13px] text-orange-700">elderly</span>
              Lansia
            </span>
          `;
                }
                else {
                    badgeHtml = `
            <span class="inline-flex items-center px-2 py-0.5 rounded bg-surface-container font-label-sm text-label-sm text-on-surface-variant">
              Normal
            </span>
          `;
                }
                const isMyService = Boolean(activeServiceCode && t.serviceCode.toUpperCase() === activeServiceCode.toUpperCase());
                const serviceBadge = `
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="inline-flex items-center px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold ${isMyService ? 'bg-primary-container text-on-primary-container font-bold ring-1 ring-primary/40' : 'bg-surface-container text-on-surface-variant'}">
              [${t.serviceCode}] ${t.serviceName}
            </span>
            ${isMyService ? '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary text-on-secondary uppercase tracking-wider">Poli Anda</span>' : ''}
          </div>
        `;
                const isRowEven = idx % 2 === 1;
                const rowClass = isMyService
                    ? (isRowEven ? 'bg-primary/5 hover:bg-primary/10' : 'bg-primary/[0.02] hover:bg-primary/10')
                    : (isRowEven ? 'bg-surface-container-low/40' : 'bg-surface-container-lowest') + ' hover:bg-surface-container-low';
                return `
          <tr class="${rowClass} transition-colors">
            <td class="py-3 px-space-md font-code-tabular text-body-md font-bold text-on-surface">${t.ticketNumber}</td>
            <td class="py-3 px-space-sm">${serviceBadge}</td>
            <td class="py-3 px-space-sm">${badgeHtml}</td>
            <td class="py-3 px-space-sm font-code-tabular text-body-sm text-on-surface-variant">${timeStr} <span class="text-secondary font-semibold text-xs ml-1">(~${estMinutes} mnt)</span></td>
            <td class="py-3 px-space-md text-right">
              <button class="px-2.5 py-1 rounded bg-surface-container hover:bg-primary hover:text-on-primary text-primary font-label-sm text-label-sm font-semibold transition-colors cursor-pointer" data-call-id="${t.id}" type="button">
                Panggil
              </button>
            </td>
          </tr>
        `;
            }).join('');
        }
    };
    const updateFilterButton = (btn, isActive) => {
        if (isActive) {
            btn.className = 'flex-1 py-1 px-space-xs rounded font-label-md text-label-md font-semibold text-center bg-surface-container-lowest text-primary shadow-sm cursor-pointer';
        }
        else {
            btn.className = 'flex-1 py-1 px-space-xs rounded font-label-md text-label-md font-medium text-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer';
        }
    };
    // Filter button handlers
    filterAll?.addEventListener('click', () => {
        currentFilter = 'all';
        renderQueueTable();
    });
    filterPriority?.addEventListener('click', () => {
        currentFilter = 'priority';
        renderQueueTable();
    });
    filterNormal?.addEventListener('click', () => {
        currentFilter = 'normal';
        renderQueueTable();
    });
    // Table direct call button handler
    queueTableBody?.addEventListener('click', (e) => {
        const target = e.target;
        const btn = target.closest('button[data-call-id]');
        if (!btn)
            return;
        const ticketId = btn.getAttribute('data-call-id');
        if (!ticketId)
            return;
        SpeechService.unlockAudio();
        // Dapatkan data tiket untuk menentukan loket yang tepat sesuai poli pasien
        const tickets = StorageService.getTickets();
        const targetTicketObj = tickets.find(t => t.id === ticketId);
        // Jika dropdown Semua Loket ATAU klik langsung pada baris tabel: gunakan loket sesuai poli tiket tersebut
        const targetDesk = targetTicketObj
            ? getCounterForService(targetTicketObj.serviceCode)
            : deskName;
        const targetTicket = QueueService.callTicketById(ticketId, targetDesk);
        if (!targetTicket) {
            alert('Tiket ini sudah tidak dalam status menunggu.');
            renderQueueTable();
            return;
        }
        currentActiveTicket = targetTicket;
        callFrequency = 1;
        startTimer();
        const effectiveCounter = targetTicket.counterName || targetDesk;
        SpeechService.announceTicket(targetTicket.ticketNumber, effectiveCounter);
        renderActiveCard();
        renderQueueTable();
    });
    // Actions with Debounce Protection
    let isCallingNext = false;
    const callNext = () => {
        if (isCallingNext)
            return;
        isCallingNext = true;
        try {
            let targetDesk = deskName;
            if (isAutoCounterMode || !activeServiceCode) {
                const waitingList = QueueService.getWaitingTickets();
                if (waitingList.length > 0) {
                    targetDesk = getCounterForService(waitingList[0].serviceCode);
                }
            }
            // Prioritaskan memanggil antrean untuk activeServiceCode terlebih dahulu
            let nextTicket = QueueService.callNextTicket(targetDesk, activeServiceCode);
            // Fallback cerdas: jika poli loket kosong tapi ada antrean poli lain
            if (!nextTicket && activeServiceCode) {
                const remainingWaiting = QueueService.getWaitingTickets();
                if (remainingWaiting.length > 0) {
                    nextTicket = QueueService.callNextTicket(deskName, undefined);
                }
            }
            if (!nextTicket) {
                alert('Tidak ada pasien dalam antrean tunggu.');
                return;
            }
            currentActiveTicket = nextTicket;
            callFrequency = 1;
            startTimer();
            const effectiveCounter = nextTicket.counterName || targetDesk;
            SpeechService.announceTicket(nextTicket.ticketNumber, effectiveCounter);
            renderActiveCard();
            renderQueueTable();
        }
        finally {
            setTimeout(() => {
                isCallingNext = false;
            }, 1000);
        }
    };
    const callRepeat = () => {
        if (!currentActiveTicket) {
            alert('Belum ada tiket aktif yang sedang dipanggil.');
            return;
        }
        callFrequency++;
        if (activeCallCount)
            activeCallCount.textContent = `${callFrequency} Kali`;
        QueueService.recallCurrentTicket();
        const effectiveCounter = currentActiveTicket.counterName || (isAutoCounterMode ? getCounterForService(currentActiveTicket.serviceCode) : deskName);
        SpeechService.announceTicket(currentActiveTicket.ticketNumber, effectiveCounter);
    };
    const callSkip = () => {
        if (!currentActiveTicket) {
            alert('Belum ada tiket aktif untuk dilewati.');
            return;
        }
        QueueService.skipTicket(currentActiveTicket.id);
        currentActiveTicket = null;
        callFrequency = 0;
        stopTimer();
        renderActiveCard();
        renderQueueTable();
    };
    const callComplete = () => {
        if (!currentActiveTicket) {
            alert('Belum ada tiket aktif untuk diselesaikan.');
            return;
        }
        QueueService.completeTicket(currentActiveTicket.id);
        currentActiveTicket = null;
        callFrequency = 0;
        stopTimer();
        renderActiveCard();
        renderQueueTable();
    };
    const testSound = () => {
        SpeechService.unlockAudio();
        const effectiveCounter = currentActiveTicket ? (currentActiveTicket.counterName || deskName) : (isAutoCounterMode ? 'Loket 01' : deskName);
        if (!btnSoundTest) {
            SpeechService.announceTicket('A-001', effectiveCounter);
            return;
        }
        const origHtml = btnSoundTest.innerHTML;
        btnSoundTest.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">refresh</span><span>Memutar Suara Panggilan...</span>';
        SpeechService.announceTicket('A-001', effectiveCounter);
        setTimeout(() => {
            btnSoundTest.innerHTML = origHtml;
        }, 2000);
    };
    // Expose methods to window for inline onclick compatibility
    window.callNext = () => {
        SpeechService.unlockAudio();
        callNext();
    };
    window.callRepeat = () => {
        SpeechService.unlockAudio();
        callRepeat();
    };
    window.callSkip = () => {
        SpeechService.unlockAudio();
        callSkip();
    };
    window.callComplete = () => {
        SpeechService.unlockAudio();
        callComplete();
    };
    window.testSound = testSound;
    // Button Listeners
    btnCallNext?.addEventListener('click', () => {
        SpeechService.unlockAudio();
        callNext();
    });
    btnCallRepeat?.addEventListener('click', () => {
        SpeechService.unlockAudio();
        callRepeat();
    });
    btnCallSkip?.addEventListener('click', () => {
        SpeechService.unlockAudio();
        callSkip();
    });
    btnCallComplete?.addEventListener('click', () => {
        SpeechService.unlockAudio();
        callComplete();
    });
    // Transfer & EMR Actions
    const btnTransferPatient = document.getElementById('btn-transfer-patient');
    const btnViewEmr = document.getElementById('btn-view-emr');
    // Transfer Patient & Clinical Referral Modal Elements
    const modalTransferPatient = document.getElementById('modal-transfer-patient');
    const btnCloseTransferModal = document.getElementById('btnCloseTransferModal');
    const btnCancelTransfer = document.getElementById('btnCancelTransfer');
    const btnConfirmTransfer = document.getElementById('btnConfirmTransfer');
    const transferPatientTicket = document.getElementById('transfer-patient-ticket');
    const transferPatientOrigin = document.getElementById('transfer-patient-origin');
    const transferPatientPriority = document.getElementById('transfer-patient-priority');
    const transferTargetService = document.getElementById('transfer-target-service');
    const transferNotes = document.getElementById('transfer-notes');
    const openTransferModal = () => {
        if (!currentActiveTicket) {
            alert('Tidak ada pasien aktif yang sedang dipanggil untuk ditransfer.');
            return;
        }
        if (transferPatientTicket)
            transferPatientTicket.textContent = currentActiveTicket.ticketNumber;
        if (transferPatientOrigin)
            transferPatientOrigin.textContent = `${currentActiveTicket.serviceName} (${currentActiveTicket.serviceCode})`;
        if (transferPatientPriority) {
            const pConf = PRIORITY_CONFIGS[currentActiveTicket.priority];
            transferPatientPriority.textContent = pConf ? pConf.label : currentActiveTicket.priority.toUpperCase();
        }
        if (transferNotes) {
            transferNotes.value = '';
        }
        if (transferTargetService) {
            const allServices = StorageService.getServices();
            const currentServiceCode = currentActiveTicket.serviceCode.toUpperCase();
            const availableServices = allServices.filter(s => s.isActive && s.code.toUpperCase() !== currentServiceCode);
            if (availableServices.length === 0) {
                transferTargetService.innerHTML = '<option value="">(Tidak ada poli rujukan lain yang aktif)</option>';
            }
            else {
                transferTargetService.innerHTML = availableServices.map(s => {
                    const counter = StorageService.getCounterForService(s.code);
                    return `<option value="${s.code}">[${s.code}] ${s.name} (${counter})</option>`;
                }).join('');
            }
        }
        if (modalTransferPatient) {
            modalTransferPatient.classList.remove('hidden');
            modalTransferPatient.classList.add('flex');
        }
    };
    const closeTransferModal = () => {
        if (modalTransferPatient) {
            modalTransferPatient.classList.add('hidden');
            modalTransferPatient.classList.remove('flex');
        }
    };
    btnTransferPatient?.addEventListener('click', openTransferModal);
    btnCloseTransferModal?.addEventListener('click', closeTransferModal);
    btnCancelTransfer?.addEventListener('click', closeTransferModal);
    modalTransferPatient?.addEventListener('click', (e) => {
        if (e.target === modalTransferPatient) {
            closeTransferModal();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalTransferPatient && !modalTransferPatient.classList.contains('hidden')) {
            closeTransferModal();
        }
    });
    btnConfirmTransfer?.addEventListener('click', () => {
        if (!currentActiveTicket) {
            alert('Tidak ada pasien aktif yang sedang dipanggil untuk ditransfer.');
            closeTransferModal();
            return;
        }
        const targetServiceCode = transferTargetService?.value?.trim().toUpperCase();
        if (!targetServiceCode) {
            alert('Silakan pilih poliklinik / layanan rujukan tujuan yang valid.');
            return;
        }
        const notes = transferNotes?.value?.trim() || undefined;
        try {
            const { oldTicket, newTicket } = QueueService.transferTicket(currentActiveTicket.id, targetServiceCode, notes);
            closeTransferModal();
            // Bersihkan state tiket aktif lokal
            currentActiveTicket = null;
            callFrequency = 0;
            stopTimer();
            renderActiveCard();
            renderQueueTable();
            const counterDesc = StorageService.getCounterForService(newTicket.serviceCode);
            alert(`Pasien [${oldTicket.ticketNumber}] berhasil ditransfer ke ${newTicket.serviceName}!\nNomor antrean baru: ${newTicket.ticketNumber} (${counterDesc}).`);
        }
        catch (err) {
            alert(`Gagal mentransfer pasien: ${err?.message || 'Terjadi kesalahan sistem.'}`);
        }
    });
    btnViewEmr?.addEventListener('click', () => {
        if (currentActiveTicket) {
            alert(`Rekam Medis Elektronik (EMR):\n- No. RM: RM-${currentActiveTicket.ticketNumber}\n- Pasien: ${currentActiveTicket.ticketNumber}\n- Diagnosa Awal: I10 - Hipertensi Esensial Primer\n- Dokter Perujuk: Dr. R. Pradana (Faskes 1)\n- Status Penjamin: Terverifikasi SATUSEHAT`);
        }
        else {
            alert('Sistem EMR Terpadu Terhubung ke SATUSEHAT.\nPanggil antrean untuk memuat rekam medis pasien terkait.');
        }
    });
    // Sound Test & Audio Settings Buttons
    btnSoundTest?.addEventListener('click', testSound);
    document.getElementById('btn-audio-settings')?.addEventListener('click', () => {
        alert('Pengaturan Audio Lanjutan:\n- Engine: Web Speech API Native v2.4\n- Mode: Bilingual (ID dilanjutkan EN)\n- Volume: 85%\n- Pitch: Normal (1.0)\n- Status Audio: Terbuka & Aktif');
    });
    // Unlock audio on initial user interaction (click, touch, keydown)
    ['click', 'touchstart', 'keydown'].forEach(evt => {
        document.addEventListener(evt, () => {
            SpeechService.unlockAudio();
        }, { passive: true });
    });
    // Keyboard Shortcuts (F2: Repeat, F3/Space: Next, F4: Skip, F5: Complete)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            e.preventDefault();
            callRepeat();
        }
        else if (e.key === 'F3' || (e.code === 'Space' && (e.target === document.body || e.target === document.documentElement))) {
            e.preventDefault();
            callNext();
        }
        else if (e.key === 'F4') {
            e.preventDefault();
            callSkip();
        }
        else if (e.key === 'F5') {
            e.preventDefault();
            callComplete();
        }
    });
    // Consolidated renderAll function for live sync
    const renderAll = () => {
        renderActiveCard();
        renderQueueTable();
    };
    // Initial Execution & Sync
    initCounterSelect();
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
