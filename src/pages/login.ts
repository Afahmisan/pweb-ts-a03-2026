import { AuthService } from '../services/auth.js';

// Expose role selector and modal triggers to window
declare global {
  interface Window {
    selectRole?: (role: string) => void;
    togglePasswordVisibility?: () => void;
    triggerHelpModal?: () => void;
    closeHelpModal?: () => void;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Izinkan pengguna selalu dapat membuka dan memulai dari login.html tanpa redirect paksa
  const form = document.getElementById('loginForm') as HTMLFormElement | null;
  const staffInput = document.getElementById('staffId') as HTMLInputElement | null;
  const passwordInput = document.getElementById('password') as HTMLInputElement | null;
  const counterSelect = document.getElementById('counterSelect') as HTMLSelectElement | null;
  const submitBtn = document.getElementById('submitButton') as HTMLButtonElement | null;
  const btnText = document.getElementById('btnText') as HTMLElement | null;
  const btnIcon = document.getElementById('btnIcon') as HTMLElement | null;
  const errorContainer = document.getElementById('loginErrorContainer') as HTMLElement | null;
  const errorMessage = document.getElementById('loginErrorMessage') as HTMLElement | null;
  const processingHint = document.getElementById('processingHint') as HTMLElement | null;
  const helpModal = document.getElementById('helpModal') as HTMLElement | null;

  // Toggle password visibility
  window.togglePasswordVisibility = () => {
    if (!passwordInput) return;
    const isPwd = passwordInput.type === 'password';
    passwordInput.type = isPwd ? 'text' : 'password';
    const eyeIcon = document.getElementById('passwordEyeIcon');
    if (eyeIcon) {
      eyeIcon.textContent = isPwd ? 'visibility' : 'visibility_off';
    }
  };

  // Quick select role helper
  window.selectRole = (role: string) => {
    hideError();
    if (!staffInput || !passwordInput) return;

    if (role === 'admin') {
      staffInput.value = 'emilys';
      passwordInput.value = 'emilyspass';
      if (counterSelect) counterSelect.value = 'loket-1';
    } else if (role === 'operator') {
      staffInput.value = 'averyp';
      passwordInput.value = 'averyppass';
      if (counterSelect) counterSelect.value = 'loket-2';
    } else if (role === 'supervisor') {
      staffInput.value = 'oliviaw';
      passwordInput.value = 'oliviawpass';
      if (counterSelect) counterSelect.value = 'loket-3';
    } else if (role === 'user' || role === 'patient') {
      staffInput.value = 'michaelw';
      passwordInput.value = 'michaelwpass';
      if (counterSelect) counterSelect.value = 'loket-1';
    }

    staffInput.focus();
  };

  // Help modal helpers
  window.triggerHelpModal = () => {
    if (helpModal) helpModal.classList.remove('hidden');
  };
  window.closeHelpModal = () => {
    if (helpModal) helpModal.classList.add('hidden');
  };

  // Attach explicit click listeners
  document.getElementById('togglePasswordBtn')?.addEventListener('click', () => {
    window.togglePasswordVisibility?.();
  });
  document.getElementById('btnDemoAdmin')?.addEventListener('click', () => {
    window.selectRole?.('admin');
  });
  document.getElementById('btnDemoOperator')?.addEventListener('click', () => {
    window.selectRole?.('operator');
  });
  document.getElementById('btnDemoSupervisor')?.addEventListener('click', () => {
    window.selectRole?.('supervisor');
  });
  document.getElementById('btnDemoPatient')?.addEventListener('click', () => {
    window.selectRole?.('user');
  });
  document.getElementById('btnDemoUser')?.addEventListener('click', () => {
    window.selectRole?.('user');
  });
  document.getElementById('btnFooterHelp')?.addEventListener('click', () => {
    window.triggerHelpModal?.();
  });

  const showError = (msg: string) => {
    if (errorContainer && errorMessage) {
      errorMessage.textContent = msg;
      errorContainer.classList.remove('hidden');
    }
    staffInput?.classList.add('border-red-400');
    passwordInput?.classList.add('border-red-400');
  };

  const hideError = () => {
    if (errorContainer) {
      errorContainer.classList.add('hidden');
    }
    staffInput?.classList.remove('border-red-400');
    passwordInput?.classList.remove('border-red-400');
  };

  staffInput?.addEventListener('input', hideError);
  passwordInput?.addEventListener('input', hideError);

  const setLoading = (loading: boolean) => {
    if (!submitBtn || !btnText || !btnIcon) return;
    submitBtn.disabled = loading;
    if (loading) {
      submitBtn.classList.add('opacity-90');
      btnText.textContent = 'Memproses...';
      btnIcon.classList.remove('hidden');
      btnIcon.classList.add('animate-spin');
      btnIcon.textContent = 'progress_activity';
      processingHint?.classList.remove('hidden');
    } else {
      submitBtn.classList.remove('opacity-90');
      btnText.textContent = 'Masuk';
      btnIcon.classList.add('hidden');
      btnIcon.classList.remove('animate-spin');
      processingHint?.classList.add('hidden');
    }
  };

  // Submit button explicit click listener
  submitBtn?.addEventListener('click', () => {
    if (form) {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }
  });

  // Form submit handler
  form?.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    hideError();

    let username = staffInput?.value.trim() || '';
    let password = passwordInput?.value.trim() || '';
    const counter = (counterSelect && counterSelect.options.length > 0)
      ? (counterSelect.options[counterSelect.selectedIndex]?.text || 'Loket 01 - Poli Umum')
      : 'Loket 01 - Poli Umum';

    // Map template default mock NIP to DummyJSON credentials
    if (username === 'MED-00101') {
      username = 'emilys';
      password = 'emilyspass';
    } else if (username === 'MED-88402') {
      username = 'averyp';
      password = 'averyppass';
    } else if (username === 'MED-44210') {
      username = 'oliviaw';
      password = 'oliviawpass';
    } else if (username === 'MED-99301' || username === 'PASIEN-01') {
      username = 'michaelw';
      password = 'michaelwpass';
    }

    if (!username || !password) {
      showError('Username atau kata sandi tidak boleh kosong.');
      return;
    }

    setLoading(true);

    try {
      const user = await AuthService.login(username, password, counter);

      if (btnIcon && btnText && submitBtn) {
        btnIcon.classList.remove('animate-spin');
        btnIcon.classList.remove('hidden');
        btnIcon.textContent = 'check_circle';
        btnText.textContent = 'Berhasil Masuk';
        submitBtn.classList.remove('bg-[#235347]');
        submitBtn.classList.add('bg-emerald-700');
      }

      setTimeout(() => {
        if (user.role === 'admin' || user.role === 'moderator') {
          window.location.replace('index.html');
        } else if (user.role === 'operator') {
          window.location.replace('operator.html');
        } else {
          window.location.replace('ambil-antrian.html');
        }
      }, 600);
    } catch (err: unknown) {
      setLoading(false);
      const errStr = err instanceof Error ? err.message.toLowerCase() : '';
      let msg = 'Username atau kata sandi salah. Periksa kembali, lalu coba masuk.';
      if (errStr.includes('network') || errStr.includes('koneksi') || errStr.includes('fetch')) {
        msg = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.';
        if (btnText) btnText.textContent = 'Coba Lagi';
      }
      showError(msg);
    }
  });
});
