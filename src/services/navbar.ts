import { AuthService } from './auth.js';
import { UserRole } from '../models/types.js';

export interface NavItemConfig {
  label: string;
  href: string;
}

// State tracker for smart scroll navbar
let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
let isSmartScrollInitialized = false;

/**
 * Smart-Scroll Navbar:
 * - Sembunyikan header (.nav-hidden) saat scroll ke bawah (> 60px)
 * - Tampilkan kembali header saat scroll ke atas
 */
export function initSmartScrollNavbar(): void {
  if (isSmartScrollInitialized || typeof window === 'undefined') return;
  isSmartScrollInitialized = true;

  window.addEventListener('scroll', () => {
    const header = document.querySelector('header.navbar-header') || document.querySelector('header.fixed') || document.querySelector('header');
    if (!header) return;

    const currentScrollY = window.scrollY;
    if (currentScrollY > lastScrollY && currentScrollY > 60) {
      header.classList.add('nav-hidden');
      const dropdown = document.getElementById('userProfileDropdown');
      if (dropdown) dropdown.classList.add('hidden');
    } else if (currentScrollY < lastScrollY) {
      header.classList.remove('nav-hidden');
    }
    lastScrollY = currentScrollY;
  }, { passive: true });
}

/**
 * Render modul navbar terpusat secara dinamis berdasarkan status autentikasi dan RBAC role.
 * Mengimplementasikan 3 zona flexbox:
 * - Kiri: .nav-brand (Logo & Identitas RS)
 * - Tengah: .nav-links (Tautan Navigasi menempel setelah brand)
 * - Kanan: .nav-user-section (Status loket & Dropdown Profil di pojok kanan)
 */
export function renderNavbar(activePage: string): void {
  // Normalisasi active page (ambil hanya nama file)
  const cleanActivePage = activePage.split('?')[0].split('/').pop() || activePage;

  // Halaman publik murni (Kiosk & Layar Signage) bebas dari navbar staf
  if (cleanActivePage === 'ambil-antrian.html' || cleanActivePage === 'layar.html') {
    return;
  }

  const user = AuthService.getCurrentUser();
  const isAuthenticated = AuthService.isAuthenticated();
  const role: UserRole | 'guest' = (isAuthenticated && user) ? user.role : 'guest';

  // Jika belum login di halaman staf, jangan render navbar
  if (!isAuthenticated || !user) return;

  // 1. Cari elemen header utama dan terapkan kelas .navbar-header
  const header = document.querySelector('header.fixed') || document.querySelector('header.navbar-header') || document.querySelector('header');
  if (!header) return;
  header.classList.add('navbar-header');

  // Inisialisasi smart scroll otomatis
  initSmartScrollNavbar();

  // 2. Temukan atau siapkan container flexbox di dalam header
  const headerContainer = header.querySelector('div.flex.items-center.justify-between') || header.firstElementChild;
  if (headerContainer) {
    headerContainer.classList.add('nav-container');
    const brandEl = headerContainer.firstElementChild as HTMLElement | null;
    if (brandEl) {
      brandEl.classList.add('nav-brand');
    }
  }

  // 3. Temukan atau siapkan elemen <nav> di dalam header
  let navEl = header.querySelector('nav');
  if (!navEl) {
    navEl = document.createElement('nav');
    navEl.className = 'nav-links hidden md:flex items-center gap-space-xs';
    navEl.setAttribute('data-active-classes', 'bg-primary text-on-primary font-title-sm shadow-sm');
    if (headerContainer && headerContainer.children.length >= 2) {
      headerContainer.insertBefore(navEl, headerContainer.children[1]);
    } else if (headerContainer) {
      headerContainer.appendChild(navEl);
    }
  } else {
    navEl.classList.add('nav-links');
  }

  // 4. Tentukan konfigurasi tautan dengan LABEL SIMPEL untuk Staf:
  // [Dashboard | Operator | Monitor | Ambil Tiket]
  let links: NavItemConfig[] = [];
  if (role === 'admin' || role === 'moderator' || role === 'operator') {
    links = [
      { label: 'Dashboard', href: 'index.html' },
      { label: 'Operator', href: 'operator.html' },
      { label: 'Monitor', href: 'layar.html' },
      { label: 'Ambil Tiket', href: 'ambil-antrian.html' }
    ];
  }

  // Render list link ke dalam <nav>
  navEl.innerHTML = links.map(link => {
    const isActive = link.href === cleanActivePage;
    if (isActive) {
      return `<a aria-current="page" class="px-space-md py-space-xs rounded transition-colors bg-primary text-on-primary font-title-sm shadow-sm" href="${link.href}">${link.label}</a>`;
    } else {
      return `<a class="font-label-lg text-label-lg px-space-md py-space-xs rounded text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors" href="${link.href}">${link.label}</a>`;
    }
  }).join('');

  // 5. Render zona kanan (.nav-user-section): Status loket & Dropdown Profil Akun
  let rightContainer = header.querySelector('div.flex.items-center.gap-space-md.flex-shrink-0') as HTMLElement | null;

  if (!rightContainer && headerContainer) {
    rightContainer = document.createElement('div');
    rightContainer.className = 'nav-user-section flex items-center gap-space-md flex-shrink-0';
    headerContainer.appendChild(rightContainer);
  } else if (rightContainer) {
    rightContainer.classList.add('nav-user-section');
  }

  if (rightContainer) {
    // Tentukan teks status badge
    let badgeText = 'Admin Hub • SIMRS Online';
    if (user.role === 'admin') {
      badgeText = 'Admin Hub • SIMRS Online';
    } else if (user.role === 'moderator') {
      badgeText = 'Supervisor • SIMRS Online';
    } else if (user.role === 'operator') {
      badgeText = 'Operator • Loket Aktif';
    } else if (user.role === 'user') {
      badgeText = 'Pasien Terverifikasi';
    }

    const fullName = `${user.firstName} ${user.lastName}`.trim();
    const defaultAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCg56jSRTWplOPC2zlZA1JkOrEqfzgl_3wXudAUNCk4H7U6ouIlTfbDGnlDBHeE3KQuPSS9pujDrmEMC2VMJcDCLSMTP2yN4fTYkApQIWzki1l9lTZ8OntTbCKQ45iE7pk2GiY7r3AI2Bpu6bH_KkrSHD5FjrmB50c7hRuUcVEi8gZfx7_Aq2AG6Dok9VZq5ZjMJnxtstltbT5xO6T7DtBHrtwlJq2XMWRS6QU90GTIFrQqSl8302M';
    const avatarSrc = user.image || defaultAvatar;

    rightContainer.innerHTML = `
      <div class="inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-secondary-container/20">
        <span class="h-2 w-2 rounded-full bg-secondary"></span>
        <span class="font-label-sm text-label-sm font-semibold text-secondary uppercase tracking-wider" id="headerDeskBadge">${badgeText}</span>
      </div>
      <div class="relative" id="profileDropdownContainer">
        <button id="btnProfileDropdownTrigger" type="button" class="flex items-center gap-space-xs pl-space-xs px-2.5 py-1.5 rounded-xl hover:bg-surface-container-high transition-all cursor-pointer border border-transparent hover:border-outline-variant/40" aria-haspopup="true" aria-expanded="false" title="Menu Profil &amp; Ganti Akun">
          <img alt="Profile" class="w-8 h-8 rounded-full object-cover border border-outline-variant/60 shadow-sm" id="userAvatar" src="${avatarSrc}"/>
          <div class="hidden sm:flex flex-col text-left">
            <span class="font-title-sm text-title-sm text-on-surface leading-none font-semibold" id="userFullName">${fullName}</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant leading-tight flex items-center gap-1 mt-0.5" id="userRoleBadge">
              ${user.role.toUpperCase()}
            </span>
          </div>
          <span class="material-symbols-outlined text-[18px] text-outline ml-1 transition-transform" id="profileDropdownCaret">expand_more</span>
        </button>

        <!-- Dropdown Menu Profil Akun -->
        <div id="userProfileDropdown" class="hidden absolute right-0 mt-2 w-64 bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 py-2.5 z-50 transform origin-top-right transition-all">
          <div class="px-4 py-2 border-b border-surface-container flex items-center gap-3">
            <img alt="Profile" class="w-10 h-10 rounded-full object-cover border border-outline-variant" src="${avatarSrc}"/>
            <div class="flex flex-col overflow-hidden">
              <span class="font-title-sm text-title-sm font-bold text-on-surface truncate">${fullName}</span>
              <span class="font-label-sm text-label-sm text-on-surface-variant">@${user.username}</span>
              <span class="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary w-fit">
                ${user.role.toUpperCase()}
              </span>
            </div>
          </div>
          <div class="pt-2 px-2.5">
            <button id="btnLogout" type="button" class="w-full text-left px-3 py-2 rounded-xl text-error hover:bg-error-container/30 flex items-center gap-2.5 font-label-md text-label-md font-semibold transition-colors cursor-pointer" title="Keluar dan ganti akun">
              <span class="material-symbols-outlined text-[20px]">logout</span>
              <span>Keluar / Ganti Akun</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Event listener: Toggle profile dropdown
    const triggerBtn = document.getElementById('btnProfileDropdownTrigger');
    const dropdownMenu = document.getElementById('userProfileDropdown');
    const caretIcon = document.getElementById('profileDropdownCaret');

    if (triggerBtn && dropdownMenu) {
      triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = dropdownMenu.classList.toggle('hidden');
        triggerBtn.setAttribute('aria-expanded', String(!isHidden));
        if (caretIcon) {
          caretIcon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
        }
      });

      // Click outside listener untuk menutup dropdown otomatis
      document.addEventListener('click', (e) => {
        if (!dropdownMenu.classList.contains('hidden')) {
          const target = e.target as Node;
          if (!triggerBtn.contains(target) && !dropdownMenu.contains(target)) {
            dropdownMenu.classList.add('hidden');
            triggerBtn.setAttribute('aria-expanded', 'false');
            if (caretIcon) caretIcon.style.transform = 'rotate(0deg)';
          }
        }
      });
    }

    // Event listener: Logout
    const btnLogout = document.getElementById('btnLogout');
    btnLogout?.addEventListener('click', (e) => {
      e.preventDefault();
      AuthService.logout();
    });
  }

  // 6. Sinkronisasi sidebar navigation (<aside nav>) jika ada
  const asideNav = document.querySelector('aside nav');
  if (asideNav) {
    const adminLink = asideNav.querySelector('a[data-path="admin-crud"], a[href="index.html"]');
    if (adminLink) {
      if (role !== 'admin' && role !== 'moderator') {
        (adminLink as HTMLElement).style.display = 'none';
      } else {
        (adminLink as HTMLElement).style.display = '';
      }
    }
  }
}

