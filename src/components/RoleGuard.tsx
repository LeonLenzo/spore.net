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
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
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

      setHasAccess(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [router, requiredRole, fallbackPath]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
