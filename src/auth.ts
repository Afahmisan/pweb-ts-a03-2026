import { UserSession, Role } from './types.js';
import { storage } from './storage.js';

const DUMMYJSON_LOGIN_URL = 'https://dummyjson.com/auth/login';

export interface LoginResult {
  success: boolean;
  user?: UserSession;
  message?: string;
}

export class AuthManager {
  /**
   * Authenticate against DummyJSON POST API
   */
  public static async login(username: string, password: string): Promise<LoginResult> {
    try {
      const response = await fetch(DUMMYJSON_LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          expiresInMins: 120,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Kredensial tidak valid. Silakan periksa kembali username dan password.',
        };
      }

      let role: Role = 'user';
      const token = data.accessToken || data.token;

      // In DummyJSON, role is available via /auth/me or /users/{id}
      if (data.role) {
        role = String(data.role).toLowerCase() as Role;
      } else if (token) {
        try {
          const meRes = await fetch('https://dummyjson.com/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.role) {
              role = String(meData.role).toLowerCase() as Role;
            }
          } else if (data.id) {
            const userRes = await fetch(`https://dummyjson.com/users/${data.id}`);
            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData.role) {
                role = String(userData.role).toLowerCase() as Role;
              }
            }
          }
        } catch (roleErr) {
          console.warn('Could not fetch user profile role, defaulting to user', roleErr);
        }
      }

      const session: UserSession = {
        token: token,
        role: role,
        firstName: data.firstName || username,
        username: data.username || username,
        email: data.email,
        image: data.image,
      };

      storage.setSession(session);
      return { success: true, user: session };
    } catch (err: any) {
      console.error('Login network error:', err);
      return {
        success: false,
        message: 'Gagal terhubung ke server autentikasi. Pastikan koneksi internet aktif.',
      };
    }
  }

  /**
   * Get currently active session
   */
  public static getCurrentUser(): UserSession | null {
    return storage.getSession();
  }

  /**
   * Check if user has administrative rights (admin or moderator)
   */
  public static isAdminOrModerator(role?: Role): boolean {
    const current = role || this.getCurrentUser()?.role;
    return current === 'admin' || current === 'moderator';
  }

  /**
   * Enforce page guard: requires logged-in user with specific role(s)
   */
  public static guardPage(allowedRoles?: ('admin' | 'moderator' | 'user')[]): UserSession | null {
    const session = this.getCurrentUser();

    // Redirect unauthenticated visitors to login
    if (!session || !session.token) {
      window.location.replace('login.html');
      return null;
    }

    // Verify role-based authorization
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = session.role;
      // Moderator has identical rights to admin
      const hasAccess =
        allowedRoles.includes(userRole) ||
        (userRole === 'moderator' && allowedRoles.includes('admin'));

      if (!hasAccess) {
        // Redirect unauthorized users
        if (userRole === 'user') {
          window.location.replace('operator.html');
        } else {
          window.location.replace('login.html');
        }
        return null;
      }
    }

    return session;
  }

  /**
   * Logout user, clear session, and redirect to login
   */
  public static logout(): void {
    storage.clearSession();
    window.location.replace('login.html');
  }
}
