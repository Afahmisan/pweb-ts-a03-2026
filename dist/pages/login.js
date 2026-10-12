import { AuthService } from '../services/auth.js';
document.addEventListener('DOMContentLoaded', () => {
    // Redirect jika sesi sudah aktif
    AuthService.redirectIfAuthenticated();
    const form = document.getElementById('loginForm');
    const staffInput = document.getElementById('staffId');
    const passwordInput = document.getElementById('password');
    const counterSelect = document.getElementById('counterSelect');
    const submitBtn = document.getElementById('submitButton');
    const btnText = document.getElementById('btnText');
    const btnIcon = document.getElementById('btnIcon');
    const errorContainer = document.getElementById('loginErrorContainer');
    const errorMessage = document.getElementById('loginErrorMessage');
    // Toggle password visibility
    window.togglePasswordVisibility = () => {
        if (!passwordInput)
            return;
        const isPwd = passwordInput.type === 'password';
        passwordInput.type = isPwd ? 'text' : 'password';
        const eyeIcon = document.getElementById('passwordEyeIcon');
        if (eyeIcon) {
            eyeIcon.textContent = isPwd ? 'visibility_off' : 'visibility';
        }
    };
    // Quick select role helper
    window.selectRole = (role) => {
        hideError();
        if (!staffInput || !passwordInput || !counterSelect)
            return;
        if (role === 'admin') {
            staffInput.value = 'emilys';
            passwordInput.value = 'emilyspass';
            counterSelect.value = 'loket-1';
        }
        else if (role === 'operator') {
            staffInput.value = 'averyp';
            passwordInput.value = 'averyppass';
            counterSelect.value = 'loket-2';
        }
        else if (role === 'supervisor') {
            staffInput.value = 'oliviaw';
            passwordInput.value = 'oliviawpass';
            counterSelect.value = 'loket-3';
        }
        else if (role === 'user' || role === 'patient') {
            staffInput.value = 'michaelw';
            passwordInput.value = 'michaelwpass';
            counterSelect.value = 'loket-1';
        }
        staffInput.focus();
    };
    // Attach explicit click listeners to avoid relying solely on inline onclick
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
    const showError = (msg) => {
        if (errorContainer && errorMessage) {
            errorMessage.textContent = msg;
            errorContainer.classList.remove('hidden');
        }
    };
    const hideError = () => {
        if (errorContainer) {
            errorContainer.classList.add('hidden');
        }
    };
    const setLoading = (loading) => {
        if (!submitBtn || !btnText || !btnIcon)
            return;
        submitBtn.disabled = loading;
        if (loading) {
            submitBtn.classList.add('opacity-90');
            btnText.textContent = 'Memverifikasi Kredensial...';
            btnIcon.classList.add('animate-spin');
            btnIcon.textContent = 'progress_activity';
        }
        else {
            submitBtn.classList.remove('opacity-90');
            btnText.textContent = 'Masuk ke Sistem';
            btnIcon.classList.remove('animate-spin');
            btnIcon.textContent = 'login';
        }
    };
    // Form submit handler
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();
        let username = staffInput?.value.trim() || '';
        let password = passwordInput?.value.trim() || '';
        const counter = counterSelect?.options[counterSelect.selectedIndex]?.text || 'Loket 1 - Pendaftaran Umum';
        // Map template default mock NIP to DummyJSON credentials
        if (username === 'MED-00101') {
            username = 'emilys';
            password = 'emilyspass';
        }
        else if (username === 'MED-88402') {
            username = 'averyp';
            password = 'averyppass';
        }
        else if (username === 'MED-44210') {
            username = 'oliviaw';
            password = 'oliviawpass';
        }
        else if (username === 'MED-99301' || username === 'PASIEN-01') {
            username = 'michaelw';
            password = 'michaelwpass';
        }
        if (!username || !password) {
            showError('Mohon isi ID Staf dan Kata Sandi.');
            return;
        }
        setLoading(true);
        try {
            const user = await AuthService.login(username, password, counter);
            if (btnIcon && btnText && submitBtn) {
                btnIcon.classList.remove('animate-spin');
                btnIcon.textContent = 'check_circle';
                btnText.textContent = 'Autentikasi Berhasil';
                submitBtn.classList.remove('bg-primary');
                submitBtn.classList.add('bg-secondary');
            }
            setTimeout(() => {
                if (user.role === 'admin' || user.role === 'moderator') {
                    window.location.replace('index.html');
                }
                else if (user.role === 'operator') {
                    window.location.replace('operator.html');
                }
                else {
                    window.location.replace('ambil-antrian.html');
                }
            }, 700);
        }
        catch (err) {
            setLoading(false);
            const msg = err instanceof Error ? err.message : 'Kredensial salah atau koneksi jaringan gagal.';
            showError(msg);
        }
    });
});
