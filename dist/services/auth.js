import { StorageService } from './storage.js';
const DUMMY_JSON_LOGIN_URL = 'https://dummyjson.com/auth/login';
export class AuthService {
    /**
     * Mengirim request autentikasi ke DummyJSON API.
     * Mendukung role: admin, moderator, dan user.
     */
    static async login(username, password, counterName) {
        const cleanUser = username.trim().toLowerCase();
        const cleanPassword = password.trim();
        // 1. Cek akun kustom buatan admin terlebih dahulu (Local Custom Users)
        const customUsers = StorageService.getCustomUsers();
        const customMatch = customUsers.find(u => u.username.toLowerCase() === cleanUser);
        if (customMatch) {
            if (customMatch.password && customMatch.password !== cleanPassword) {
                throw new Error('Kata sandi yang Anda masukkan salah.');
            }
            const nameParts = customMatch.fullName.split(' ');
            const profile = {
                id: customMatch.id,
                username: customMatch.username,
                email: `${customMatch.username}@hospital.id`,
                firstName: nameParts[0] || customMatch.fullName,
                lastName: nameParts.slice(1).join(' ') || '',
                gender: 'other',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCg56jSRTWplOPC2zlZA1JkOrEqfzgl_3wXudAUNCk4H7U6ouIlTfbDGnlDBHeE3KQuPSS9pujDrmEMC2VMJcDCLSMTP2yN4fTYkApQIWzki1l9lTZ8OntTbCKQ45iE7pk2GiY7r3AI2Bpu6bH_KkrSHD5FjrmB50c7hRuUcVEi8gZfx7_Aq2AG6Dok9VZq5ZjMJnxtstltbT5xO6T7DtBHrtwlJq2XMWRS6QU90GTIFrQqSl8302M',
                token: `custom-jwt-token-${customMatch.id}-${Date.now()}`,
                role: customMatch.role,
                assignedCounter: counterName || (customMatch.role === 'operator' ? 'Loket 2 - Poli Penyakit Dalam' : 'Loket 1 - Pendaftaran Umum')
            };
            StorageService.setAuthUser(profile);
            return profile;
        }
        try {
            const response = await fetch(DUMMY_JSON_LOGIN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: cleanUser,
                    password: cleanPassword,
                    expiresInMins: 120
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Kredensial tidak valid. Periksa username dan kata sandi Anda.');
            }
            const data = await response.json();
            const token = data.accessToken || data.token || 'demo-jwt-token';
            // Role mapping sesuai spesifikasi DummyJSON & Modul 3
            let role = 'user';
            if (cleanUser === 'emilys') {
                role = 'admin';
            }
            else if (cleanUser === 'oliviaw') {
                role = 'moderator';
            }
            else if (cleanUser === 'averyp') {
                role = 'operator';
            }
            else if (data.role) {
                const serverRole = data.role.toLowerCase();
                if (serverRole === 'admin')
                    role = 'admin';
                else if (serverRole === 'moderator')
                    role = 'moderator';
                else if (serverRole === 'operator')
                    role = 'operator';
                else
                    role = 'user';
            }
            else {
                role = 'user';
            }
            const profile = {
                id: data.id,
                username: data.username,
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                gender: data.gender,
                image: data.image,
                token: token,
                role: role,
                assignedCounter: counterName || (role === 'operator' ? 'Loket 2 - Poli Penyakit Dalam' : 'Loket 1 - Pendaftaran Umum')
            };
            StorageService.setAuthUser(profile);
            return profile;
        }
        catch (err) {
            if (err instanceof Error) {
                throw err;
            }
            throw new Error('Terjadi kesalahan jaringan saat menghubungi server autentikasi.');
        }
    }
    static logout() {
        StorageService.clearAuthUser();
        window.location.href = 'login.html';
    }
    static getCurrentUser() {
        return StorageService.getAuthUser();
    }
    static isAuthenticated() {
        const user = this.getCurrentUser();
        return !!(user && user.token);
    }
    static isAdminOrModerator() {
        const user = this.getCurrentUser();
        return !!(user && (user.role === 'admin' || user.role === 'moderator'));
    }
    /**
     * Auth Guard untuk halaman terproteksi.
     * Melakukan auto-redirect sesuai matriks RBAC:
     * - Tanpa sesi: redirect ke login.html
     * - Role operator tanpa izin: redirect ke operator.html
     * - Role user tanpa izin: redirect ke ambil-antrian.html
     * - Role admin & moderator: hak akses penuh
     */
    static requireAuth(allowedRoles) {
        const user = this.getCurrentUser();
        if (!user || !user.token) {
            window.location.replace('login.html');
            return null;
        }
        if (allowedRoles && allowedRoles.length > 0) {
            // Role admin dan moderator memiliki hak akses penuh ke semua halaman
            const isSuperUser = user.role === 'admin' || user.role === 'moderator';
            const hasPermission = isSuperUser || allowedRoles.includes(user.role);
            if (!hasPermission) {
                window.location.replace('login.html');
                return null;
            }
        }
        return user;
    }
    /**
     * Redirect jika pengguna sudah login saat mengakses login.html
     * - Admin / Moderator: redirect ke index.html
     * - Operator: redirect ke operator.html
     * - User (Pasien): redirect ke ambil-antrian.html
     */
    static redirectIfAuthenticated() {
        const user = this.getCurrentUser();
        if (user && user.token) {
            if (user.role === 'admin' || user.role === 'moderator') {
                window.location.replace('index.html');
            }
            else if (user.role === 'operator') {
                window.location.replace('operator.html');
            }
            else {
                window.location.replace('ambil-antrian.html');
            }
        }
    }
}
export { renderNavbar, initSmartScrollNavbar } from './navbar.js';
