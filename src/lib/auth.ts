/**
 * Authentication system with role-based access control
 * Roles: viewer (map only), sampler (map + field collection), admin (full access)
 */


export type UserRole = 'viewer' | 'sampler' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  isActive: boolean;
}

interface Session {
  user: User;
  loginTime: number;
}

export class AuthService {
  private static readonly SESSION_KEY = 'spore_session';
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Authenticate user with email/password
   */
  static async login(email: string, password: string): Promise<User | null> {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) return null;

      const { user } = await response.json();
      if (!user) return null;

      // Store session in localStorage
      if (typeof window !== 'undefined') {
        const session: Session = {
          user,
          loginTime: Date.now(),
        };
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      }

      return user;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }

  /**
   * Get current authenticated user
   */
  static getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;

    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return null;

      const session: Session = JSON.parse(sessionData);

      // Check if session is expired
      if (Date.now() - session.loginTime > this.SESSION_DURATION) {
        this.logout();
        return null;
      }

      return session.user;
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
   * Logout current user — clears localStorage and invalidates server session cookie
   */
  static async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.SESSION_KEY);
    }
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // Best-effort — local session is already cleared
    }
  }

  /**
   * Check if current user has admin role
   */
  static isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  /**
   * Check if current user has sampler role or higher
   */
  static isSampler(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'sampler' || user?.role === 'admin';
  }

  /**
   * Check if current user has at least viewer role
   */
  static isViewer(): boolean {
    const user = this.getCurrentUser();
    return user !== null;
  }

  /**
   * Check if current user has required role or higher
   */
  static hasRole(requiredRole: UserRole): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    const roleHierarchy: Record<UserRole, number> = {
      viewer: 1,
      sampler: 2,
      admin: 3,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }
}