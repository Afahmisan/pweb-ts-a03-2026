import { AuthManager } from './auth.js';
import { storage } from './storage.js';
document.addEventListener('DOMContentLoaded', () => {
    const existingSession = storage.getSession();
    if (existingSession && existingSession.token) {
        if (AuthManager.isAdminOrModerator(existingSession.role)) {
            window.location.replace('index.html');
            return;
        }
        else {
            window.location.replace('operator.html');
            return;
        }
    }
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const alertContainer = document.getElementById('alert-container');
    const togglePwdBtn = document.getElementById('toggle-pwd-btn');
    const eyeIcon = document.getElementById('eye-icon');
    if (togglePwdBtn && passwordInput) {
        togglePwdBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            togglePwdBtn.setAttribute('title', isPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi');
            if (eyeIcon) {
                if (isPassword) {
                    eyeIcon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          `;
                }
                else {
                    eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          `;
                }
            }
        });
    }
    function showAlert(message, type = 'danger') {
        if (!alertContainer)
            return;
        alertContainer.innerHTML = `
      <div class="alert alert-${type}" role="alert">
        <span>${message}</span>
        <button type="button" class="btn btn-sm btn-outline" style="padding: 0.1rem 0.4rem; min-height: auto;" onclick="this.parentElement.remove()">✕</button>
      </div>
    `;
    }
    function clearAlert() {
        if (alertContainer)
            alertContainer.innerHTML = '';
    }
    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.textContent = 'Memproses...';
            btnSpinner.style.display = 'inline-block';
        }
        else {
            submitBtn.disabled = false;
            btnText.textContent = 'Masuk';
            btnSpinner.style.display = 'none';
        }
    }
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        if (!username || !password) {
            showAlert('Silakan masukkan username dan password.');
            return;
        }
        setLoading(true);
        try {
            const result = await AuthManager.login(username, password);
            if (result.success && result.user) {
                if (AuthManager.isAdminOrModerator(result.user.role)) {
                    window.location.replace('index.html');
                }
                else {
                    window.location.replace('operator.html');
                }
            }
            else {
                showAlert(result.message || 'Username atau kata sandi tidak cocok. Periksa kembali dan coba masuk.');
            }
        }
        catch {
            showAlert('Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.');
        }
        finally {
            setLoading(false);
        }
    });
});
