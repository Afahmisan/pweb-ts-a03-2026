import { AuthService, renderNavbar } from '../services/auth.js';
import { StorageService } from '../services/storage.js';
import { QueueService } from '../services/queue.js';
import { ExportService } from '../services/export.js';
document.addEventListener('DOMContentLoaded', () => {
    // Auth Guard: hanya admin dan moderator
    const currentUser = AuthService.requireAuth(['admin', 'moderator']);
    if (!currentUser)
        return;
    // Render Navbar dinamis
    renderNavbar('index.html');
    // DOM Elements - Profile & Header
    const userFullName = document.getElementById('userFullName');
    const userRoleBadge = document.getElementById('userRoleBadge');
    const userAvatar = document.getElementById('userAvatar');
    const btnLogout = document.getElementById('btnLogout');
    const headerDeskBadge = document.getElementById('headerDeskBadge');
    if (userFullName)
        userFullName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    if (userRoleBadge) {
        userRoleBadge.textContent = `${currentUser.role.toUpperCase()} (Keluar)`;
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
    };
    // Render Service Table & Service Select
    const renderServices = () => {
        const services = StorageService.getServices();
        const query = searchInput?.value.trim().toLowerCase() || '';
        // Update Service Select options for manual ticket issuance
        if (serviceSelect) {
            const currentVal = serviceSelect.value;
            const activeServices = services.filter(s => s.isActive);
            serviceSelect.innerHTML = activeServices.map(s => `
        <option value="${s.code}" data-name="${escapeHtml(s.name)}" ${s.code === currentVal ? 'selected' : ''}>
          ${s.code} - ${escapeHtml(s.name)}
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
            <td colspan="5" class="py-8 text-center text-on-surface-variant font-medium">
              Tidak ada poliklinik/layanan yang sesuai pencarian.
            </td>
          </tr>
        `;
                return;
            }
            serviceTableBody.innerHTML = filtered.map(s => {
                const lastNumFormatted = s.currentNumber > 0
                    ? `${s.code}-${String(s.currentNumber).padStart(3, '0')}`
                    : '000';
                const statusButton = s.isActive
                    ? `
            <button class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/30 text-secondary font-label-sm text-label-sm font-semibold hover:bg-secondary-container/50 transition-colors" data-action="toggle" data-code="${s.code}">
              <span class="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              Aktif
            </button>
          `
                    : `
            <button class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-semibold hover:bg-surface-container transition-colors" data-action="toggle" data-code="${s.code}">
              <span class="w-1.5 h-1.5 rounded-full bg-outline"></span>
              Non-aktif
            </button>
          `;
                return `
          <tr class="hover:bg-surface-container-low/60 transition-colors group ${!s.isActive ? 'opacity-60 bg-surface-container-low/20' : ''}">
            <td class="py-3.5 px-4 text-center">
              <span class="inline-flex items-center justify-center w-8 h-8 rounded ${s.isActive ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-highest text-outline'} font-code-tabular font-bold">
                ${s.code}
              </span>
            </td>
            <td class="py-3.5 px-4 font-title-sm">
              <div class="font-semibold text-on-surface">${escapeHtml(s.name)}</div>
              <div class="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                <span class="material-symbols-outlined text-[14px] text-outline">domain</span> Layanan Medis Terpadu
              </div>
            </td>
            <td class="py-3.5 px-3 text-center">
              <span class="font-code-tabular font-semibold text-on-surface px-2 py-0.5 rounded bg-surface-container">
                ${lastNumFormatted}
              </span>
            </td>
            <td class="py-3.5 px-3 text-center">
              ${statusButton}
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="inline-flex items-center gap-1 opacity-90 group-hover:opacity-100">
                <button class="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors" data-action="reset" data-code="${s.code}" data-name="${escapeHtml(s.name)}" title="Reset Antrian Poli ${s.code}">
                  <span class="material-symbols-outlined text-[18px]">restart_alt</span>
                </button>
                <button class="p-1 rounded text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors" data-action="delete" data-code="${s.code}" title="Hapus Unit">
                  <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </td>
          </tr>
        `;
            }).join('');
        }
        updateTicketPreview();
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
    // Update Priority Selection
    window.updateTicketPriority = (priorityName, variant) => {
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
        if (previewPriorityBadge) {
            previewPriorityBadge.textContent = `Prioritas: ${priorityName}`;
            if (variant === 'amber') {
                previewPriorityBadge.className = 'px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold';
            }
            else if (variant === 'orange') {
                previewPriorityBadge.className = 'px-2 py-0.5 rounded bg-orange-100 text-orange-900 font-semibold';
            }
            else if (variant === 'purple') {
                previewPriorityBadge.className = 'px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-semibold';
            }
            else {
                previewPriorityBadge.className = 'px-2 py-0.5 rounded bg-surface-container text-on-surface font-semibold';
            }
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
            try {
                const ticket = QueueService.generateTicket(code, selectedPriority, { isManualByAdmin: true });
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
        try {
            const ticket = QueueService.generateTicket(code, selectedPriority, { isManualByAdmin: true });
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
    // Modal Handlers for New Service
    window.openNewServiceModal = () => {
        if (newServiceModal) {
            newServiceModal.classList.remove('hidden');
            newServiceModal.classList.add('flex');
            if (newServiceCodeInput) {
                newServiceCodeInput.value = '';
                newServiceCodeInput.focus();
            }
            if (newServiceNameInput)
                newServiceNameInput.value = '';
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
    // Reset All Queues Handlers
    const handleResetAllQueues = () => {
        if (confirm('Konfirmasi: Kosongkan SELURUH antrean aktif dan kembalikan urutan nomor tiket ke awal (001)?')) {
            StorageService.clearAllTickets();
            showToast('Seluruh Antrian Direset', 'Semua tiket telah dikosongkan dan nomor antrean poliklinik dikembalikan ke awal.');
            renderServices();
            renderMetrics();
        }
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
    });
    mrnInput?.addEventListener('input', (e) => {
        const val = e.target.value;
        window.updateTicketPreviewMRN?.(val);
    });
    // Priority selector delegation
    const priorityContainer = document.getElementById('priority-selector');
    priorityContainer?.addEventListener('click', (e) => {
        const labelEl = e.target.closest('label');
        if (!labelEl)
            return;
        const radio = labelEl.querySelector('input[type="radio"]');
        if (radio) {
            radio.checked = true;
            const val = radio.value;
            if (val.includes('VIP')) {
                window.updateTicketPriority?.('VIP', 'purple');
            }
            else if (val.includes('Disabilitas')) {
                window.updateTicketPriority?.('Disabilitas', 'amber');
            }
            else if (val.includes('Lansia')) {
                window.updateTicketPriority?.('Lansia', 'orange');
            }
            else {
                window.updateTicketPriority?.('Normal', 'slate');
            }
        }
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
