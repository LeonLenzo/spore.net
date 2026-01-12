/**
 * Simple authentication system for admin area
 * Uses environment variables for admin credentials
 */

export interface AdminUser {
  username: string;
  role: 'admin';
}

export class AuthService {
  private static readonly SESSION_KEY = 'spore_admin_session';
  private static readonly ADMIN_USERNAME = process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin';
  private static readonly ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'spore123';

  /**
   * Authenticate user with username/password
   */
  static login(username: string, password: string): boolean {
    if (username === this.ADMIN_USERNAME && password === this.ADMIN_PASSWORD) {
      const session = {
        username,
        role: 'admin',
        loginTime: Date.now()
      };

      // Store session in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      }

      return true;
    }
    return false;
  }

  /**
   * Get current authenticated user
   */
  static getCurrentUser(): AdminUser | null {
    if (typeof window === 'undefined') return null;

    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData);

      // Check if session is less than 24 hours old
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (Date.now() - session.loginTime > TWENTY_FOUR_HOURS) {
        this.logout();
        return null;
      }

      return {
        username: session.username,
        role: session.role
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  /**
   * Logout current user
   */
  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.SESSION_KEY);
    }
  }

  /**
   * Check if current user has admin role
   */
  static isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }
}