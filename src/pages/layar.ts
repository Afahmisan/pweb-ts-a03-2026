import { StorageService, getCounterForService } from '../services/storage.js';
import { SpeechService } from '../services/speech.js';
import { QueueService } from '../services/queue.js';
import { Ticket, ServiceType } from '../models/types.js';

declare global {
  interface Window {
    toggleFullscreen?: () => void;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Layar Signage Publik Murni (Zero Staff Controls)
  // DOM Elements - Hero
  const heroTicketNum = document.getElementById('hero-ticket-num');
  const heroPriorityContainer = document.getElementById('hero-priority-container');
  const heroPriorityIcon = document.getElementById('hero-priority-icon');
  const heroPriorityBadge = document.getElementById('hero-priority-badge');
  const heroCounterNum = document.getElementById('hero-counter-num');
  const heroServiceTitle = document.getElementById('hero-service-title');
  const heroAudioText = document.getElementById('hero-audio-text');
  const heroCallStatus = document.getElementById('hero-call-status');
  const counterCardsGrid = document.getElementById('counter-cards-grid');
  const btnFullscreen = document.getElementById('btn-fullscreen');

  // DOM Elements - Digital Clock & Date (Indonesian format)
  const liveClock = document.getElementById('live-clock');
  const liveDate = document.getElementById('live-date');

  const updateLiveDateTime = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    if (liveClock) {
      liveClock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} WIB`;
    }
    if (liveDate) {
      const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
      const months = [
        'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
        'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
      ];
      const dayName = days[now.getDay()];
      const dateNum = now.getDate();
      const monthName = months[now.getMonth()];
      const year = now.getFullYear();
      liveDate.textContent = `${dayName}, ${dateNum} ${monthName} ${year}`;
    }
  };

  updateLiveDateTime();
  setInterval(updateLiveDateTime, 1000);

  // Fullscreen support with comprehensive browser vendor fallbacks
  const toggleFullscreen = () => {
    SpeechService.unlockAudio();
    const doc = document as any;
    const docEl = document.documentElement as any;

    const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;

    if (!isFullscreen) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  };
  window.toggleFullscreen = toggleFullscreen;
  btnFullscreen?.addEventListener('click', toggleFullscreen);

  // Auto-unlock audio on any user interaction (click, touch, keydown)
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => {
      SpeechService.unlockAudio();
    }, { passive: true });
  });

  // Audio Tracking
  let lastHandledCallTimestamp = 0;

  // Render Hero Active Calling Ticket
  const renderHero = () => {
    const activeTicket = StorageService.getActiveTicket();
    const soundWaveEl = document.getElementById('hero-sound-wave');

    if (!activeTicket) {
      if (soundWaveEl) soundWaveEl.classList.remove('active');
      if (heroTicketNum) heroTicketNum.textContent = '---';
      if (heroCounterNum) heroCounterNum.textContent = '---';
      if (heroServiceTitle) heroServiceTitle.textContent = 'RUANG PELAYANAN MEDIS';
      if (heroPriorityBadge) heroPriorityBadge.textContent = 'STANDBY';
      if (heroPriorityIcon) heroPriorityIcon.textContent = 'schedule';
      if (heroAudioText) heroAudioText.textContent = '“Menunggu nomor antrian berikutnya dipanggil...”';
      if (heroCallStatus) heroCallStatus.textContent = 'Standby';
      if (heroPriorityContainer) {
        heroPriorityContainer.className = 'flex items-center gap-space-sm bg-surface-container-high px-space-lg py-2 rounded-lg shadow-sm';
      }
      return;
    }

    if (soundWaveEl) soundWaveEl.classList.add('active');

    const effectiveCounter = activeTicket.counterName || getCounterForService(activeTicket.serviceCode);
    const counterLabel = (effectiveCounter ? effectiveCounter.split(' - ')[0] : 'LOKET 01').toUpperCase();
    if (heroTicketNum) heroTicketNum.textContent = activeTicket.ticketNumber;
    if (heroCounterNum) heroCounterNum.textContent = counterLabel;
    if (heroServiceTitle) heroServiceTitle.textContent = activeTicket.serviceName.toUpperCase();
    if (heroAudioText) {
      heroAudioText.textContent = `“Nomor Antrian ${activeTicket.ticketNumber}, Silakan menuju ${counterLabel}”`;
    }
    if (heroCallStatus) heroCallStatus.textContent = 'Aktif Dipanggil';

    if (heroPriorityBadge && heroPriorityIcon && heroPriorityContainer) {
      if (activeTicket.priority === 'vip') {
        heroPriorityContainer.className = 'flex items-center gap-space-sm bg-purple-100 text-purple-900 px-space-lg py-2 rounded-lg shadow-sm';
        heroPriorityIcon.textContent = 'star';
        heroPriorityBadge.textContent = 'PRIORITAS: VIP / FAST TRACK';
        heroPriorityBadge.className = 'font-title-sm text-title-sm font-bold text-purple-900 tracking-wide uppercase';
      } else if (activeTicket.priority === 'disabilitas') {
        heroPriorityContainer.className = 'flex items-center gap-space-sm bg-amber-100 text-amber-900 px-space-lg py-2 rounded-lg shadow-sm';
        heroPriorityIcon.textContent = 'accessible_forward';
        heroPriorityBadge.textContent = 'PRIORITAS: DISABILITAS & AKSES KHUSUS';
        heroPriorityBadge.className = 'font-title-sm text-title-sm font-bold text-amber-900 tracking-wide uppercase';
      } else if (activeTicket.priority === 'lansia') {
        heroPriorityContainer.className = 'flex items-center gap-space-sm bg-orange-100 text-orange-900 px-space-lg py-2 rounded-lg shadow-sm';
        heroPriorityIcon.textContent = 'elderly';
        heroPriorityBadge.textContent = 'PRIORITAS: LANSIA & GERIATRI';
        heroPriorityBadge.className = 'font-title-sm text-title-sm font-bold text-orange-900 tracking-wide uppercase';
      } else {
        heroPriorityContainer.className = 'flex items-center gap-space-sm bg-surface-container-high px-space-lg py-2 rounded-lg shadow-sm';
        heroPriorityIcon.textContent = 'person';
        heroPriorityBadge.textContent = 'PASIEN REGULER';
        heroPriorityBadge.className = 'font-title-sm text-title-sm font-bold text-primary tracking-wide uppercase';
      }
    }
  };

  // Render Counter Station Cards Grid
  const renderCounterCards = () => {
    if (!counterCardsGrid) return;

    const services = StorageService.getServices();
    const tickets = StorageService.getTickets();
    const activeTicket = StorageService.getActiveTicket();

    if (services.length === 0) {
      counterCardsGrid.innerHTML = `
        <div class="col-span-full py-8 text-center bg-surface-container-lowest rounded-xl shadow-sm text-on-surface-variant font-medium">
          Tidak ada loket layanan aktif saat ini.
        </div>
      `;
      return;
    }

    counterCardsGrid.innerHTML = services.map((svc: ServiceType, idx: number) => {
      // Find latest called or active ticket for this service code
      const svcTickets = tickets.filter(t => t.serviceCode === svc.code);
      const currentCalling = svcTickets.find(t => t.status === 'calling');
      const latestDone = [...svcTickets].reverse().find(t => t.status === 'done');
      const waitingCount = svcTickets.filter(t => t.status === 'waiting').length;

      const isCurrentActive = activeTicket && activeTicket.serviceCode === svc.code && activeTicket.status === 'calling';
      const displayTicketNum = currentCalling
        ? currentCalling.ticketNumber
        : latestDone
        ? latestDone.ticketNumber
        : svc.currentNumber > 0
        ? `${svc.code}-${String(svc.currentNumber).padStart(3, '0')}`
        : '---';

      const loketName = getCounterForService(svc.code).toUpperCase();

      if (isCurrentActive) {
        return `
          <article class="bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex flex-col justify-between relative overflow-hidden ring-2 ring-secondary">
            <div class="absolute top-0 left-0 right-0 h-1.5 bg-secondary"></div>
            <div>
              <div class="flex items-center justify-between pb-space-sm">
                <span class="font-title-md text-title-md font-bold text-secondary tracking-tight">${loketName}</span>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm font-bold uppercase shadow-sm">
                  <span class="h-2 w-2 rounded-full bg-surface-bright animate-ping"></span> Dipanggil
                </span>
              </div>
              <p class="font-body-sm text-body-sm text-on-surface font-semibold line-clamp-1 mt-1">${escapeHtml(svc.name)}</p>
              <div class="my-space-md bg-secondary-container/20 rounded-lg p-space-md text-center shadow-inner">
                <span class="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-bold block">Nomor Antrian Terkini</span>
                <span class="font-display-ticket-mobile text-display-ticket-mobile font-extrabold text-secondary tracking-tight">
                  ${displayTicketNum}
                </span>
              </div>
            </div>
            <div class="pt-space-sm flex items-center justify-between">
              <div class="flex items-center gap-1 text-secondary">
                <span class="material-symbols-outlined text-[18px]">group</span>
                <span class="font-label-md text-label-md font-semibold">Sisa Antrean:</span>
              </div>
              <span class="font-label-md text-label-md font-bold bg-secondary-container/30 text-secondary px-2.5 py-0.5 rounded">${waitingCount} Pasien</span>
            </div>
          </article>
        `;
      }

      return `
        <article class="bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-shadow p-space-lg flex flex-col justify-between ${!svc.isActive ? 'opacity-50' : ''}">
          <div>
            <div class="flex items-center justify-between pb-space-sm">
              <span class="font-title-md text-title-md font-bold text-on-surface tracking-tight">${loketName}</span>
              ${svc.isActive
                ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-label-sm text-label-sm font-bold uppercase"><span class="h-2 w-2 rounded-full bg-secondary"></span> Melayani</span>`
                : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface-container text-outline font-label-sm text-label-sm uppercase">Tutup</span>`
              }
            </div>
            <p class="font-body-sm text-body-sm text-on-surface-variant font-medium line-clamp-1 mt-1">${escapeHtml(svc.name)}</p>
            <div class="my-space-md bg-surface-container-low rounded-lg p-space-md text-center shadow-inner">
              <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">Nomor Terakhir</span>
              <span class="font-display-ticket-mobile text-display-ticket-mobile font-bold text-on-surface tracking-tight">
                ${displayTicketNum}
              </span>
            </div>
          </div>
          <div class="pt-space-sm flex items-center justify-between">
            <div class="flex items-center gap-1 text-on-surface-variant">
              <span class="material-symbols-outlined text-[18px]">group</span>
              <span class="font-label-md text-label-md">Sisa Antrean:</span>
            </div>
            <span class="font-title-sm text-title-sm font-bold text-primary">${waitingCount} Pasien</span>
          </div>
        </article>
      `;
    }).join('');
  };

  const escapeHtml = (str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  // Audio Sync Checker: plays voice when a new call event occurs in storage
  const checkAudioAnnouncement = () => {
    const callEvent = StorageService.getLastCallEvent();
    if (callEvent && callEvent.timestamp > lastHandledCallTimestamp) {
      lastHandledCallTimestamp = callEvent.timestamp;
      // Announce the ticket if page is active
      const effectiveCounter = callEvent.ticket.counterName || getCounterForService(callEvent.ticket.serviceCode);
      SpeechService.announceTicket(
        callEvent.ticket.ticketNumber,
        effectiveCounter
      );
    }
  };

  // Render All
  const refreshAll = () => {
    renderHero();
    renderCounterCards();
    checkAudioAnnouncement();
  };

  // Initial Render & Multi-tab storage sync
  refreshAll();
  window.addEventListener('storage', refreshAll);
  StorageService.onSync(refreshAll);
  window.addEventListener('medika_storage_sync', refreshAll);

  // Active Short-Polling Interval (1500ms) for public screen reliability
  setInterval(refreshAll, 1500);
});
