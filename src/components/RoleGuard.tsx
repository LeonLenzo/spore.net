'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService, UserRole } from '@/lib/auth';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: UserRole;
  fallbackPath?: string;
}

/**
 * Role-based authentication guard
 * Redirects to login if not authenticated or to fallback if insufficient permissions
 */
export default function RoleGuard({
  children,
  requiredRole,
  fallbackPath = '/'
}: RoleGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const user = AuthService.getCurrentUser();

      if (!user) {
        // Not authenticated - redirect to login
        router.push('/login');
        return;
      }

      if (!AuthService.hasRole(requiredRole)) {
        // Authenticated but insufficient permissions
        router.push(fallbackPath);
        return;
      }

      // Has access - stop checking
      setIsChecking(false);
    };

    checkAuth();
  }, [router, requiredRole, fallbackPath]);

  // Don't render anything during initial check to avoid hydration mismatch
  if (isChecking) {
    return null;
  }

  return <>{children}</>;
}
