import { AuthManager } from './auth.js';
import { storage } from './storage.js';
import { QueueManager } from './queue.js';
import { AudioManager } from './audio.js';

document.addEventListener('DOMContentLoaded', () => {
  const session = AuthManager.guardPage(['admin', 'moderator', 'user']);
  if (!session) return;

  const userDisplayName = document.getElementById('user-display-name') as HTMLElement;
  if (userDisplayName) {
    userDisplayName.textContent = `${session.firstName} (${session.role})`;
  }

  const navAdminItem = document.getElementById('nav-admin-item') as HTMLElement;
  if (navAdminItem && AuthManager.isAdminOrModerator(session.role)) {
    navAdminItem.style.display = '';
  }

  const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;
  logoutBtn?.addEventListener('click', () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      AuthManager.logout();
    }
  });

  const cardsContainer = document.getElementById('operator-cards-container') as HTMLElement;
  const totalWaitingBadge = document.getElementById('total-waiting-badge') as HTMLElement;

  function renderOperatorCards(): void {
    if (!cardsContainer) return;
    const services = storage.getServices().filter((s) => s.isActive);
    const allTickets = storage.getTickets();

    const totalWaiting = allTickets.filter((t) => t.status === 'MENUNGGU').length;
    if (totalWaitingBadge) {
      totalWaitingBadge.textContent = `${totalWaiting} tiket menunggu`;
    }

    if (services.length === 0) {
      cardsContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p>Tidak ada jenis antrian yang aktif saat ini.</p>
        </div>
      `;
      return;
    }

    cardsContainer.innerHTML = services
      .map((srv) => {
        const waitingTickets = QueueManager.getWaitingTickets(srv.code);
        const calledTicket = QueueManager.getCalledTicket(srv.code);
        const nextTicket = waitingTickets.length > 0 ? waitingTickets[0] : null;
        const upcomingTickets = waitingTickets.slice(1, 4);
        const waitingCount = waitingTickets.length;

        const hasWaiting = waitingCount > 0;
        const hasCalled = calledTicket !== null;

        return `
          <div class="card ${hasCalled ? 'card-calling-pulse' : ''}" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.25rem;">
                <h2 style="font-size: 1.25rem; font-weight: 600; color: var(--color-primary);">
                  ${srv.name} <span style="font-weight: 500; color: var(--color-text-muted);">(${srv.code})</span>
                </h2>
                <span style="font-size: 0.85rem; color: var(--color-text-muted); font-weight: 500;">
                  ${waitingCount} menunggu
                </span>
              </div>

              <div style="margin-bottom: 1.25rem;">
                ${
                  hasCalled
                    ? `
                      <div style="font-size: 0.75rem; font-weight: 500; color: var(--color-text-muted); letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 0.25rem;">
                        Sedang Dipanggil
                      </div>
                      <div style="font-size: 3rem; font-weight: 700; color: var(--color-brand); line-height: 1.1; font-variant-numeric: tabular-nums;">
                        ${calledTicket.ticketNumber}
                      </div>
                      <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.4rem;">
                        <span class="badge badge-${calledTicket.priority.toLowerCase()}">${calledTicket.priority}</span>
                        <span class="badge badge-status dipanggil">Dipanggil</span>
                        ${
                          (calledTicket.recalledCount || 1) > 1
                            ? `<span class="badge badge-recalled">Panggilan ke-${calledTicket.recalledCount}</span>`
                            : ''
                        }
                      </div>
                    `
                    : `
                      <div style="font-size: 0.75rem; font-weight: 500; color: var(--color-text-muted); letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 0.25rem;">
                        Status Loket
                      </div>
                      <div style="font-size: 1.25rem; font-weight: 600; color: var(--color-text-light); line-height: 1.2; padding: 0.75rem 0;">
                        Belum ada nomor dipanggil
                      </div>
                    `
                }
              </div>

              <div style="background-color: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.5rem;">
                <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-primary); display: flex; align-items: center; justify-content: space-between;">
                  <span>Berikutnya:</span>
                  ${
                    nextTicket
                      ? `<div style="display: inline-flex; align-items: center; gap: 0.4rem;">
                           <span style="font-weight: 700; font-size: 0.95rem;">${nextTicket.ticketNumber}</span>
                           <span class="badge badge-${nextTicket.priority.toLowerCase()}" style="font-size: 0.7rem;">${nextTicket.priority}</span>
                         </div>`
                      : `<span style="font-weight: 400; color: var(--color-text-muted);">Belum ada antrian</span>`
                  }
                </div>

                ${
                  upcomingTickets.length > 0
                    ? `<div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.4rem; border-top: 1px solid var(--color-border); padding-top: 0.35rem;">
                         Lalu: ${upcomingTickets.map((t) => t.ticketNumber).join(', ')}
                       </div>`
                    : ''
                }
              </div>
            </div>

            <div>
              <div class="operator-action-primary-grid">
                <button 
                  type="button" 
                  class="btn btn-primary btn-call-next" 
                  data-code="${srv.code}"
                  data-name="${srv.name}"
                  ${!hasWaiting ? 'disabled' : ''}
                  style="font-weight: 600;"
                  title="Panggil nomor antrian berikutnya"
                >
                  Panggil Berikutnya
                </button>

                <button 
                  type="button" 
                  class="btn btn-recall btn-recall-current" 
                  data-code="${srv.code}"
                  data-name="${srv.name}"
                  ${!hasCalled ? 'disabled' : ''}
                  title="Panggil ulang nomor aktif jika pasien belum merespons"
                >
                  Panggil Ulang
                </button>
              </div>

              <div class="operator-action-secondary-grid">
                <button 
                  type="button" 
                  class="btn btn-outline btn-skip-current" 
                  data-code="${srv.code}"
                  ${!hasCalled ? 'disabled' : ''}
                  style="color: var(--color-danger); border-color: var(--color-danger-border);"
                  title="Tandai tiket saat ini dilewati"
                >
                  Lewati
                </button>

                <button 
                  type="button" 
                  class="btn btn-outline btn-finish-current" 
                  data-code="${srv.code}"
                  ${!hasCalled ? 'disabled' : ''}
                  title="Tutup tiket saat ini sebagai selesai"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    cardsContainer.querySelectorAll('.btn-call-next').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const code = target.getAttribute('data-code');
        const name = target.getAttribute('data-name') || code;
        if (code) {
          const called = QueueManager.callNext(code);
          if (called) {
            AudioManager.speakAnnouncement(called.ticketNumber, name || code, false);
          }
          renderOperatorCards();
        }
      });
    });

    cardsContainer.querySelectorAll('.btn-recall-current').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const code = target.getAttribute('data-code');
        const name = target.getAttribute('data-name') || code;
        if (code) {
          const recalled = QueueManager.recallCurrent(code);
          if (recalled) {
            AudioManager.speakAnnouncement(recalled.ticketNumber, name || code, true);
          }
          renderOperatorCards();
        }
      });
    });

    cardsContainer.querySelectorAll('.btn-skip-current').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const code = target.getAttribute('data-code');
        if (code) {
          QueueManager.skipCurrent(code);
          renderOperatorCards();
        }
      });
    });

    cardsContainer.querySelectorAll('.btn-finish-current').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const code = target.getAttribute('data-code');
        if (code) {
          QueueManager.completeCurrent(code);
          renderOperatorCards();
        }
      });
    });
  }

  renderOperatorCards();

  storage.subscribe(() => {
    renderOperatorCards();
  });

  setInterval(() => {
    renderOperatorCards();
  }, 2500);
});
