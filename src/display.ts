import { storage } from './storage.js';
import { QueueManager } from './queue.js';
import { AudioManager } from './audio.js';
import { QueueEvent, Ticket, ServiceType } from './types.js';

document.addEventListener('DOMContentLoaded', () => {
  const cardsContainer = document.getElementById('display-cards-container') as HTMLElement;
  const lastUpdatedEl = document.getElementById('last-updated') as HTMLElement;
  const digitalClockEl = document.getElementById('digital-clock') as HTMLElement;
  const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement;
  const soundToggleBtn = document.getElementById('sound-toggle-btn') as HTMLButtonElement;

  const serviceCallTimestamps = new Map<string, number>();
  let urgentHighlightCode: string | null = null;

  document.body.addEventListener('click', () => {
    AudioManager.unlockAudio();
  }, { once: true });

  function updateClock(): void {
    if (!digitalClockEl) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    digitalClockEl.textContent = `${hh}:${mm} WIB`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      const isEnabled = AudioManager.toggleSound();
      updateSoundBtn(isEnabled);
    });
  }

  function updateSoundBtn(enabled: boolean) {
    if (!soundToggleBtn) return;
    if (enabled) {
      soundToggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
        Suara Aktif
      `;
      soundToggleBtn.classList.remove('btn-danger-outline');
      soundToggleBtn.classList.add('btn-outline');
    } else {
      soundToggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <line x1="23" y1="9" x2="17" y2="15"/>
          <line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
        Bisu
      `;
      soundToggleBtn.classList.remove('btn-outline');
      soundToggleBtn.classList.add('btn-danger-outline');
    }
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn('Fullscreen error:', err);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        fullscreenBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.25rem;">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
          </svg>
          Keluar Layar Penuh
        `;
      } else {
        fullscreenBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.25rem;">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          Layar Penuh
        `;
      }
    });
  }

  function updateTimestamp(): void {
    if (!lastUpdatedEl) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    lastUpdatedEl.textContent = `Terakhir diperbarui ${hh}:${mm}:${ss}`;
  }

  // Order services so currently calling counters appear at the front of the grid
  function sortServicesByCallState(services: ServiceType[]): ServiceType[] {
    return [...services].sort((a, b) => {
      const calledA = QueueManager.getCalledTicket(a.code);
      const calledB = QueueManager.getCalledTicket(b.code);

      if (calledA && !calledB) return -1;
      if (!calledA && calledB) return 1;
      if (calledA && calledB) {
        const timeA = serviceCallTimestamps.get(a.code) || 0;
        const timeB = serviceCallTimestamps.get(b.code) || 0;
        return timeB - timeA;
      }

      const waitA = QueueManager.getWaitingTickets(a.code).length;
      const waitB = QueueManager.getWaitingTickets(b.code).length;
      if (waitA > 0 && waitB === 0) return -1;
      if (waitA === 0 && waitB > 0) return 1;
      if (waitA !== waitB) return waitB - waitA;

      return a.code.localeCompare(b.code);
    });
  }

  function renderDisplayCards(): void {
    if (!cardsContainer) return;
    const services = storage.getServices().filter((s) => s.isActive);
    updateTimestamp();

    if (services.length === 0) {
      cardsContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p>Belum ada layanan antrian yang aktif saat ini.</p>
        </div>
      `;
      return;
    }

    const sortedServices = sortServicesByCallState(services);

    cardsContainer.innerHTML = sortedServices
      .map((srv) => {
        const waitingTickets = QueueManager.getWaitingTickets(srv.code);
        const calledTicket = QueueManager.getCalledTicket(srv.code);
        const waitingCount = waitingTickets.length;
        const isCalling = calledTicket !== null;
        const isUrgent = urgentHighlightCode === srv.code;

        return `
          <div class="card display-figma-card ${isUrgent ? 'card-flash-urgent' : isCalling ? 'display-card-calling' : ''}">
            <div class="display-card-header">
              <span class="display-card-title">${srv.name}</span>
              <span class="display-card-code-badge">${srv.code}</span>
            </div>

            <div class="display-card-body">
              ${
                isCalling
                  ? `
                    <span class="display-card-calling-label">Sedang Dipanggil</span>
                    <div class="display-card-number">
                      ${calledTicket.ticketNumber}
                    </div>
                  `
                  : `
                    <div class="display-card-empty-title">
                      Belum ada nomor dipanggil
                    </div>
                    <div class="display-card-empty-sub">
                      Silakan tunggu panggilan petugas.
                    </div>
                  `
              }
            </div>

            <div class="display-card-footer">
              <span class="display-card-footer-label">Menunggu</span>
              <span class="display-card-footer-count">${waitingCount}</span>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function handleCallEvent(ticket: Ticket, isRecall: boolean): void {
    serviceCallTimestamps.set(ticket.serviceCode, Date.now());
    urgentHighlightCode = ticket.serviceCode;

    AudioManager.speakAnnouncement(ticket.ticketNumber, ticket.serviceName, isRecall);
    renderDisplayCards();

    setTimeout(() => {
      if (urgentHighlightCode === ticket.serviceCode) {
        urgentHighlightCode = null;
        renderDisplayCards();
      }
    }, 6000);
  }

  renderDisplayCards();

  // Cross-tab real-time sync listener
  storage.subscribe((event: QueueEvent) => {
    if (event.type === 'TICKET_CALLED' && event.payload) {
      handleCallEvent(event.payload, false);
    } else if (event.type === 'TICKET_RECALLED' && event.payload) {
      handleCallEvent(event.payload, true);
    } else {
      renderDisplayCards();
    }
  });

  // Regular periodic sync every 3 seconds
  setInterval(() => {
    renderDisplayCards();
  }, 3000);
});
