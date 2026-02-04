/**
 * Authentication system with role-based access control
 * Roles: viewer (map only), sampler (map + field collection), admin (full access)
 */

import { supabase } from './supabase';

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
      // Query user from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, email, role, full_name, is_active')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (error || !userData) {
        console.error('Login failed:', error);
        return null;
      }

      // For now, use simple password check (in production, use bcrypt)
      // This is a placeholder - you'll need to implement proper password hashing
      const { data: passwordCheck } = await supabase
        .from('users')
        .select('password_hash')
        .eq('email', email.toLowerCase())
        .single();

      // Simple password comparison (REPLACE WITH BCRYPT IN PRODUCTION)
      if (!passwordCheck || passwordCheck.password_hash !== password) {
        return null;
      }

      const user: User = {
        id: userData.id,
        email: userData.email,
        role: userData.role as UserRole,
        fullName: userData.full_name,
        isActive: userData.is_active,
      };

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

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