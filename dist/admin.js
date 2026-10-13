import { AuthManager } from './auth.js';
import { storage } from './storage.js';
import { QueueManager } from './queue.js';
document.addEventListener('DOMContentLoaded', () => {
    const session = AuthManager.guardPage(['admin', 'moderator']);
    if (!session)
        return;
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');
    const logoutBtn = document.getElementById('logout-btn');
    const openResetModalBtn = document.getElementById('open-reset-modal-btn');
    const activeServicesBadge = document.getElementById('active-services-badge');
    const modalPortal = document.getElementById('modal-portal');
    const statCallingCount = document.getElementById('stat-calling-count');
    const statWaitingCount = document.getElementById('stat-waiting-count');
    const serviceTableBody = document.getElementById('service-table-body');
    const addServiceForm = document.getElementById('add-service-form');
    const serviceCodeInput = document.getElementById('service-code');
    const serviceNameInput = document.getElementById('service-name');
    const issueTicketForm = document.getElementById('issue-ticket-form');
    const issueServiceSelect = document.getElementById('issue-service-select');
    const priorityRadioGroup = document.getElementById('priority-radio-group');
    const queueGroupContainer = document.getElementById('queue-group-container');
    const adminAlertContainer = document.getElementById('admin-alert-container');
    if (userNameEl)
        userNameEl.textContent = session.firstName;
    if (userRoleEl)
        userRoleEl.textContent = session.role.toUpperCase();
    logoutBtn?.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
            AuthManager.logout();
        }
    });
    if (priorityRadioGroup) {
        const radioLabels = priorityRadioGroup.querySelectorAll('.radio-card-label');
        radioLabels.forEach((label) => {
            const radio = label.querySelector('input[type="radio"]');
            radio?.addEventListener('change', () => {
                radioLabels.forEach((l) => l.classList.remove('selected'));
                if (radio.checked) {
                    label.classList.add('selected');
                }
            });
        });
    }
    function getSelectedPriority() {
        const checked = document.querySelector('input[name="manual-priority"]:checked');
        return (checked ? checked.value : 'Normal');
    }
    function showAdminAlert(message, type = 'danger') {
        if (!adminAlertContainer)
            return;
        adminAlertContainer.innerHTML = `
      <div class="alert alert-${type}">
        <span>${message}</span>
        <button type="button" class="btn btn-sm btn-outline" style="padding: 0.1rem 0.4rem; min-height: auto;" onclick="this.parentElement.remove()">✕</button>
      </div>
    `;
        setTimeout(() => {
            if (adminAlertContainer.innerHTML) {
                adminAlertContainer.innerHTML = '';
            }
        }, 6000);
    }
    openResetModalBtn?.addEventListener('click', () => {
        showResetModal();
    });
    function showResetModal() {
        if (!modalPortal)
            return;
        const tickets = storage.getTickets();
        const calledCount = tickets.filter((t) => t.status === 'DIPANGGIL').length;
        const waitingCount = tickets.filter((t) => t.status === 'MENUNGGU').length;
        const totalActive = calledCount + waitingCount;
        modalPortal.innerHTML = `
      <div class="modal-overlay" id="reset-overlay">
        <div class="modal-content" style="max-width: 480px; text-align: left;">
          <h2 style="font-size: 1.35rem; font-weight: 600; color: var(--color-danger); margin-bottom: 0.5rem;">
            Reset seluruh antrian?
          </h2>
          <p style="font-size: 0.95rem; color: var(--color-text-body); margin-bottom: 1rem; line-height: 1.5;">
            Semua tiket yang sedang dipanggil dan menunggu pada layanan aktif akan dikosongkan. Nomor tiket setiap layanan dimulai kembali dari <code style="font-weight: 600; background: var(--color-danger-bg); color: var(--color-danger); padding: 0.1rem 0.35rem; border-radius: 4px;">001</code>.
          </p>

          <div style="background-color: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.25rem;">
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-primary); margin-bottom: 0.25rem;">
              Dampak reset: ${totalActive} tiket
            </div>
            <div style="font-size: 0.85rem; color: var(--color-text-muted);">
              ${calledCount} sedang dipanggil dan ${waitingCount} menunggu.
            </div>
            <div style="font-size: 0.8rem; color: var(--color-brand); font-weight: 600; margin-top: 0.35rem;">
              Data jenis layanan tetap tersimpan.
            </div>
          </div>

          <div class="modal-btn-row" style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" class="btn btn-outline" id="cancel-reset-btn">Batal</button>
            <button type="button" class="btn btn-danger" id="confirm-reset-btn">Ya, Reset Antrian</button>
          </div>
        </div>
      </div>
    `;
        const overlay = document.getElementById('reset-overlay');
        const cancelBtn = document.getElementById('cancel-reset-btn');
        const confirmBtn = document.getElementById('confirm-reset-btn');
        const closeModal = () => {
            modalPortal.innerHTML = '';
        };
        cancelBtn?.addEventListener('click', closeModal);
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay)
                closeModal();
        });
        confirmBtn?.addEventListener('click', () => {
            storage.resetQueue();
            closeModal();
            showAdminAlert('Seluruh antrian berhasil dikosongkan dan nomor urut dimulai kembali dari 001.', 'success');
            renderAll();
        });
    }
    function showEditServiceModal(service) {
        if (!modalPortal)
            return;
        modalPortal.innerHTML = `
      <div class="modal-overlay" id="edit-overlay">
        <div class="modal-content" style="max-width: 440px; text-align: left;">
          <h2 style="font-size: 1.25rem; font-weight: 600; color: var(--color-primary); margin-bottom: 0.35rem;">
            Edit Layanan (${service.code})
          </h2>
          <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1.25rem;">
            Ubah nama layanan. Kode layanan ${service.code} tidak dapat diubah.
          </p>

          <form id="edit-service-form">
            <div class="form-group">
              <label for="edit-service-name" class="form-label">Nama layanan</label>
              <input 
                type="text" 
                id="edit-service-name" 
                class="form-input" 
                value="${service.name}" 
                required
                autofocus
              >
            </div>

            <div class="modal-btn-row" style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
              <button type="button" class="btn btn-outline" id="cancel-edit-btn">Batal</button>
              <button type="submit" class="btn btn-primary" id="save-edit-btn">Simpan Perubahan</button>
            </div>
          </form>
        </div>
      </div>
    `;
        const overlay = document.getElementById('edit-overlay');
        const cancelBtn = document.getElementById('cancel-edit-btn');
        const editForm = document.getElementById('edit-service-form');
        const nameInput = document.getElementById('edit-service-name');
        const closeModal = () => {
            modalPortal.innerHTML = '';
        };
        cancelBtn?.addEventListener('click', closeModal);
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay)
                closeModal();
        });
        editForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const newName = nameInput.value.trim();
            const res = storage.updateServiceName(service.id, newName);
            if (res.success) {
                closeModal();
                showAdminAlert(`Layanan ${service.code} berhasil diperbarui menjadi '${newName}'.`, 'success');
                renderAll();
            }
            else {
                alert(res.message || 'Gagal mengubah nama layanan.');
            }
        });
    }
    addServiceForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = serviceCodeInput.value.trim().toUpperCase();
        const name = serviceNameInput.value.trim();
        if (!/^[A-Z]$/.test(code)) {
            showAdminAlert('Kode layanan harus berupa 1 huruf kapital (A-Z).', 'danger');
            return;
        }
        const currentServices = storage.getServices();
        const existingByCode = currentServices.find((s) => s.code.toUpperCase() === code);
        if (existingByCode) {
            showAdminAlert(`Kode ${code} sudah digunakan oleh ${existingByCode.name}. Gunakan huruf kapital lain, misalnya D.`, 'danger');
            return;
        }
        const existingByName = currentServices.find((s) => s.name.trim().toLowerCase() === name.toLowerCase());
        if (existingByName) {
            showAdminAlert(`Nama ${name} sudah digunakan. Huruf besar/kecil tidak membedakan nama layanan.`, 'danger');
            return;
        }
        const res = storage.addService(code, name);
        if (!res.success) {
            showAdminAlert(res.message || 'Gagal menambahkan layanan.', 'danger');
        }
        else {
            showAdminAlert(`Layanan ${name} (${code}) berhasil ditambahkan.`, 'success');
            serviceCodeInput.value = '';
            serviceNameInput.value = '';
            renderAll();
        }
    });
    issueTicketForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const serviceCode = issueServiceSelect.value;
        const priority = getSelectedPriority();
        if (!serviceCode) {
            showAdminAlert('Silakan pilih layanan aktif terlebih dahulu.', 'danger');
            return;
        }
        const ticket = storage.createTicket(serviceCode, priority);
        if (ticket) {
            showAdminAlert(`Tiket manual ${ticket.ticketNumber} (${priority}) berhasil diterbitkan dan langsung masuk antrian.`, 'success');
            renderAll();
        }
        else {
            showAdminAlert('Layanan tidak aktif atau tidak ditemukan.', 'danger');
        }
    });
    function renderServices() {
        if (!serviceTableBody)
            return;
        const services = storage.getServices();
        const activeCount = services.filter((s) => s.isActive).length;
        if (activeServicesBadge) {
            activeServicesBadge.textContent = `${activeCount} layanan aktif`;
        }
        if (services.length === 0) {
            serviceTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
            Belum ada jenis antrian. Silakan tambahkan layanan baru di bawah.
          </td>
        </tr>
      `;
            return;
        }
        serviceTableBody.innerHTML = services
            .map((srv) => {
            const statusBadge = srv.isActive
                ? `<span class="badge badge-status aktif">Aktif</span>`
                : `<span class="badge badge-status nonaktif">Nonaktif</span>`;
            const toggleBtnText = srv.isActive ? 'Nonaktifkan' : 'Aktifkan';
            return `
          <tr>
            <td style="text-align: center;">
              <span style="display: inline-flex; width: 32px; height: 32px; border-radius: var(--radius-sm); background-color: var(--color-bg); border: 1px solid var(--color-border); align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem; color: var(--color-primary);">
                ${srv.code}
              </span>
            </td>
            <td>
              <div style="font-weight: 600; color: var(--color-text-main); font-size: 0.95rem;">
                ${srv.name}
              </div>
            </td>
            <td>${statusBadge}</td>
            <td>
              <button 
                type="button" 
                class="btn btn-sm btn-outline btn-toggle-service" 
                data-id="${srv.id}"
                style="font-size: 0.8rem; padding: 0.25rem 0.6rem; min-height: 32px;"
              >
                ${toggleBtnText}
              </button>
            </td>
            <td style="text-align: center;">
              <div style="display: inline-flex; gap: 0.4rem; align-items: center;">
                <button 
                  type="button" 
                  class="btn btn-sm btn-outline btn-edit-service" 
                  data-id="${srv.id}"
                  style="font-size: 0.8rem; padding: 0.25rem 0.55rem; min-height: 32px;"
                >
                  Edit
                </button>
                <button 
                  type="button" 
                  class="btn btn-sm btn-danger-outline btn-delete-service" 
                  data-id="${srv.id}" 
                  data-name="${srv.name}"
                  style="font-size: 0.8rem; padding: 0.25rem 0.55rem; min-height: 32px;"
                  title="Hapus layanan"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        `;
        })
            .join('');
        serviceTableBody.querySelectorAll('.btn-toggle-service').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const id = target.getAttribute('data-id');
                if (id) {
                    storage.toggleServiceActive(id);
                    renderAll();
                }
            });
        });
        serviceTableBody.querySelectorAll('.btn-edit-service').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const id = target.getAttribute('data-id');
                const srv = services.find((s) => s.id === id);
                if (srv) {
                    showEditServiceModal(srv);
                }
            });
        });
        serviceTableBody.querySelectorAll('.btn-delete-service').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const id = target.getAttribute('data-id');
                const name = target.getAttribute('data-name');
                if (id && confirm(`Apakah Anda yakin ingin menghapus layanan '${name}'?`)) {
                    storage.deleteService(id);
                    renderAll();
                }
            });
        });
        if (issueServiceSelect) {
            const activeServices = services.filter((s) => s.isActive);
            const currentSelected = issueServiceSelect.value;
            issueServiceSelect.innerHTML = `
        <option value="">Pilih layanan aktif</option>
        ${activeServices
                .map((s) => `<option value="${s.code}" ${s.code === currentSelected ? 'selected' : ''}>${s.name} (${s.code})</option>`)
                .join('')}
      `;
        }
    }
    function renderQueueStats() {
        const services = storage.getServices();
        const allTickets = storage.getTickets();
        const callingTickets = allTickets.filter((t) => t.status === 'DIPANGGIL');
        const waitingTickets = allTickets.filter((t) => t.status === 'MENUNGGU');
        if (statCallingCount)
            statCallingCount.textContent = String(callingTickets.length);
        if (statWaitingCount)
            statWaitingCount.textContent = String(waitingTickets.length);
        if (!queueGroupContainer)
            return;
        if (services.length === 0) {
            queueGroupContainer.innerHTML = `<div class="empty-state">Belum ada data layanan antrian.</div>`;
            return;
        }
        queueGroupContainer.innerHTML = services
            .map((srv) => {
            const serviceTickets = allTickets.filter((t) => t.serviceCode === srv.code && (t.status === 'DIPANGGIL' || t.status === 'MENUNGGU'));
            const calledTicket = serviceTickets.find((t) => t.status === 'DIPANGGIL');
            const serviceWaitingTickets = QueueManager.sortWaitingTickets(serviceTickets.filter((t) => t.status === 'MENUNGGU'));
            const sortedDisplayTickets = [];
            if (calledTicket)
                sortedDisplayTickets.push(calledTicket);
            sortedDisplayTickets.push(...serviceWaitingTickets);
            return `
          <div style="margin-bottom: 1rem; border-top: 1px solid var(--color-border); padding-top: 0.75rem;">
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-primary); margin-bottom: 0.35rem; display: flex; justify-content: space-between;">
              <span>${srv.name} (${srv.code})</span>
              <span style="font-size: 0.75rem; font-weight: 500; color: var(--color-text-muted);">${serviceWaitingTickets.length} menunggu</span>
            </div>
            ${sortedDisplayTickets.length === 0
                ? `<div style="font-size: 0.8rem; color: var(--color-text-light); padding: 0.25rem 0;">Tidak ada antrian aktif</div>`
                : sortedDisplayTickets
                    .map((t) => {
                    const isCalled = t.status === 'DIPANGGIL';
                    return `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0; font-size: 0.85rem; border-bottom: 1px dashed var(--color-border);">
                          <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-weight: 700; font-variant-numeric: tabular-nums;">${t.ticketNumber}</span>
                            <span class="badge badge-${t.priority.toLowerCase()}" style="font-size: 0.7rem; padding: 0.15rem 0.4rem;">${t.priority}</span>
                            <span class="badge-status ${isCalled ? 'dipanggil' : 'menunggu'}" style="font-size: 0.75rem;">
                              ${isCalled ? 'Dipanggil' : 'Menunggu'}
                            </span>
                            ${isCalled && (t.recalledCount || 1) > 1
                        ? `<span class="badge badge-recalled" style="font-size: 0.7rem;">Ke-${t.recalledCount}</span>`
                        : ''}
                          </div>
                          <div style="display: flex; align-items: center; gap: 0.35rem;">
                            ${isCalled
                        ? `
                                  <button 
                                    type="button" 
                                    class="btn btn-sm btn-recall btn-recall-admin" 
                                    data-code="${srv.code}"
                                    data-name="${srv.name}"
                                    style="font-size: 0.75rem; padding: 0.2rem 0.55rem; min-height: 28px;"
                                    title="Panggil ulang nomor ini"
                                  >
                                    Panggil Ulang
                                  </button>
                                  <button 
                                    type="button" 
                                    class="btn btn-sm btn-outline btn-finish-admin" 
                                    data-code="${srv.code}"
                                    style="font-size: 0.75rem; padding: 0.2rem 0.55rem; min-height: 28px;"
                                  >
                                    Selesai
                                  </button>
                                `
                        : ''}
                          </div>
                        </div>
                      `;
                })
                    .join('')}
          </div>
        `;
        })
            .join('');
        queueGroupContainer.querySelectorAll('.btn-recall-admin').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const code = target.getAttribute('data-code');
                const name = target.getAttribute('data-name') || code;
                if (code) {
                    const recalled = QueueManager.recallCurrent(code);
                    if (recalled) {
                        showAdminAlert(`Nomor ${recalled.ticketNumber} dipanggil ulang.`, 'info');
                    }
                    renderAll();
                }
            });
        });
        queueGroupContainer.querySelectorAll('.btn-finish-admin').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const code = target.getAttribute('data-code');
                if (code) {
                    QueueManager.completeCurrent(code);
                    renderAll();
                }
            });
        });
    }
    function renderAll() {
        renderServices();
        renderQueueStats();
    }
    renderAll();
    storage.subscribe(() => {
        renderAll();
    });
    setInterval(() => {
        renderAll();
    }, 2500);
});
