import { storage } from './storage.js';
import { QueueManager } from './queue.js';
import { AudioManager } from './audio.js';
import { Priority, Ticket } from './types.js';

document.addEventListener('DOMContentLoaded', () => {
  const serviceOptionsContainer = document.getElementById('service-options-container') as HTMLElement;
  const kioskPriorityGroup = document.getElementById('kiosk-priority-group') as HTMLElement;
  const selectionSummaryText = document.getElementById('selection-summary-text') as HTMLElement;
  const submitTicketBtn = document.getElementById('submit-ticket-btn') as HTMLButtonElement;
  const availableServicesCount = document.getElementById('available-services-count') as HTMLElement;
  const modalPortal = document.getElementById('kiosk-modal-portal') as HTMLElement;

  let selectedServiceCode: string | null = null;
  let selectedServiceName: string | null = null;

  if (kioskPriorityGroup) {
    const radioLabels = kioskPriorityGroup.querySelectorAll('.radio-card-label');
    radioLabels.forEach((label) => {
      const radio = label.querySelector('input[type="radio"]') as HTMLInputElement;
      radio?.addEventListener('change', () => {
        radioLabels.forEach((l) => l.classList.remove('selected'));
        if (radio.checked) {
          label.classList.add('selected');
        }
        updateSummary();
      });
    });
  }

  function getSelectedPriority(): Priority {
    const checked = document.querySelector('input[name="kiosk-priority"]:checked') as HTMLInputElement;
    return (checked ? checked.value : 'Normal') as Priority;
  }

  function updateSummary() {
    if (!selectionSummaryText || !submitTicketBtn) return;
    const priority = getSelectedPriority();

    if (selectedServiceCode && selectedServiceName) {
      selectionSummaryText.textContent = `${selectedServiceName} · ${priority}`;
      submitTicketBtn.disabled = false;
    } else {
      selectionSummaryText.textContent = 'Pilih salah satu layanan';
      submitTicketBtn.disabled = true;
    }
  }

  function renderServiceCards(): void {
    if (!serviceOptionsContainer) return;
    const services = storage.getServices().filter((s) => s.isActive);
    const tickets = storage.getTickets();

    if (availableServicesCount) {
      availableServicesCount.textContent = `${services.length} layanan tersedia`;
    }

    if (services.length === 0) {
      serviceOptionsContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p>Belum ada layanan antrian yang tersedia saat ini.</p>
        </div>
      `;
      selectedServiceCode = null;
      selectedServiceName = null;
      updateSummary();
      return;
    }

    if (!selectedServiceCode || !services.some((s) => s.code === selectedServiceCode)) {
      selectedServiceCode = services[0].code;
      selectedServiceName = services[0].name;
    }

    serviceOptionsContainer.innerHTML = services
      .map((srv) => {
        const isSelected = srv.code === selectedServiceCode;
        const waitingCount = tickets.filter(
          (t) => t.serviceCode === srv.code && t.status === 'MENUNGGU'
        ).length;

        return `
          <div 
            class="kiosk-service-card-figma ${isSelected ? 'selected' : ''}" 
            data-code="${srv.code}" 
            data-name="${srv.name}"
            tabindex="0"
            role="radio"
            aria-checked="${isSelected}"
          >
            <div class="kiosk-card-badge-box ${isSelected ? 'selected' : ''}">
              ${srv.code}
            </div>

            <div class="kiosk-card-info">
              <div class="kiosk-card-service-title">${srv.name}</div>
              <div class="kiosk-card-service-wait">${waitingCount} tiket menunggu</div>
            </div>

            <div class="kiosk-card-radio-circle ${isSelected ? 'selected' : ''}">
              ${isSelected ? `<div class="kiosk-card-radio-dot"></div>` : ''}
            </div>
          </div>
        `;
      })
      .join('');

    serviceOptionsContainer.querySelectorAll('.kiosk-service-card-figma').forEach((card) => {
      const selectCard = () => {
        const code = card.getAttribute('data-code');
        const name = card.getAttribute('data-name');
        if (code && name) {
          selectedServiceCode = code;
          selectedServiceName = name;
          renderServiceCards();
          updateSummary();
        }
      };

      card.addEventListener('click', selectCard);
      card.addEventListener('keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault();
          selectCard();
        }
      });
    });

    updateSummary();
  }

  submitTicketBtn?.addEventListener('click', () => {
    if (!selectedServiceCode) return;
    const priority = getSelectedPriority();

    const ticket = storage.createTicket(selectedServiceCode, priority);
    if (ticket) {
      AudioManager.playHospitalChime();
      showTicketModal(ticket);
      renderServiceCards();
    }
  });

  // Render modal popup matching figma/ambil-struk.png
  function showTicketModal(ticket: Ticket): void {
    if (!modalPortal) return;

    const waitingTickets = QueueManager.getWaitingTickets(ticket.serviceCode);
    const totalWaiting = waitingTickets.length;
    const aheadCount = waitingTickets.findIndex((t) => t.id === ticket.id);
    const waitingAhead = aheadCount >= 0 ? aheadCount : 0;

    const calledTicket = QueueManager.getCalledTicket(ticket.serviceCode);
    const currentCallingNumber = calledTicket ? calledTicket.ticketNumber : '-';

    modalPortal.innerHTML = `
      <div class="modal-overlay" id="ticket-modal-overlay">
        <div class="modal-content kiosk-ticket-dialog">
          
          <div class="kiosk-modal-check-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <h2 class="kiosk-modal-title">
            Nomor antrian berhasil diambil
          </h2>
          <p class="kiosk-modal-subtitle">
            Nomor antrian Anda telah terdaftar. Silakan simpan nomor ini dan tunggu hingga dipanggil.
          </p>

          <hr class="kiosk-modal-divider">

          <div style="text-align: center; margin: 1.25rem 0;">
            <div style="font-size: 0.85rem; color: var(--color-text-muted); font-weight: 500;">Nomor Anda</div>
            <div class="kiosk-modal-big-number">${ticket.ticketNumber}</div>
            <div style="font-size: 1.2rem; font-weight: 600; color: var(--color-primary); margin-top: 0.25rem;">
              ${ticket.serviceName}
            </div>
            <div style="margin-top: 0.4rem;">
              <span class="badge" style="background-color: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-body); font-size: 0.8rem; padding: 0.2rem 0.65rem;">
                &bull; ${ticket.priority}
              </span>
            </div>
          </div>

          <hr class="kiosk-modal-divider">

          <div style="margin: 1.25rem 0; font-size: 0.9rem; display: flex; flex-direction: column; gap: 0.6rem;">
            ${
              calledTicket
                ? `
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--color-text-muted);">Sedang dipanggil</span>
                    <span style="font-weight: 600; color: var(--color-primary); font-variant-numeric: tabular-nums;">${calledTicket.ticketNumber}</span>
                  </div>
                `
                : ''
            }
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--color-text-muted);">Menunggu, termasuk Anda</span>
              <span style="font-weight: 600; color: var(--color-primary); font-variant-numeric: tabular-nums;">${totalWaiting} tiket</span>
            </div>
          </div>

          <div style="font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.4; margin-bottom: 1.5rem; text-align: center;">
            ${waitingAhead === 0 ? 'Tidak ada tiket menunggu di depan Anda. Simpan nomor ini dan pantau panggilan pada Layar Antrian.' : `Ada ${waitingAhead} tiket menunggu di depan Anda. Simpan nomor ini dan pantau panggilan pada Layar Antrian.`}
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <button type="button" class="btn btn-outline btn-block" id="print-ticket-btn" style="font-weight: 600;">
              Cetak Struk
            </button>
            <button type="button" class="btn btn-primary btn-block" id="close-modal-btn" style="font-weight: 600;">
              Ambil Antrian Lain
            </button>
            <button type="button" class="btn btn-outline btn-block" id="dismiss-modal-btn" style="font-weight: 600;">
              Kembali
            </button>
          </div>
        </div>
      </div>
    `;

    const closeBtn = document.getElementById('close-modal-btn');
    const dismissBtn = document.getElementById('dismiss-modal-btn');
    const printBtn = document.getElementById('print-ticket-btn');
    const overlay = document.getElementById('ticket-modal-overlay');

    const closeModal = () => {
      modalPortal.innerHTML = '';
    };

    closeBtn?.addEventListener('click', closeModal);
    dismissBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    printBtn?.addEventListener('click', () => {
      window.print();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        window.removeEventListener('keydown', onKey);
      }
    };
    window.addEventListener('keydown', onKey);
  }

  renderServiceCards();

  storage.subscribe(() => {
    renderServiceCards();
  });

  setInterval(() => {
    renderServiceCards();
  }, 2500);
});
