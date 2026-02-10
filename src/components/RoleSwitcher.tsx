'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';

interface RoleSwitcherProps {
  onRoleChange?: (role: string | null) => void;
}

export default function RoleSwitcher({ onRoleChange }: RoleSwitcherProps) {
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [viewAsRole, setViewAsRole] = useState<string | null>(null);

  useEffect(() => {
    // Sync with parent component
    if (onRoleChange) {
      onRoleChange(viewAsRole);
    }
  }, [viewAsRole, onRoleChange]);

  // Only show for admins
  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleRoleChange = (newRole: string) => {
    const role = newRole === user.role ? null : newRole;
    setViewAsRole(role);
  };

  return (
    <div className="text-right">
      <p className="text-sm font-medium text-gray-900">
        {user.fullName || user.email}
      </p>
      <p className="text-xs text-gray-600 capitalize">{user.role}</p>
      {/* Role switcher for admins */}
      <select
        value={viewAsRole || user.role}
        onChange={(e) => handleRoleChange(e.target.value)}
        className="mt-1 text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700"
      >
        <option value={user.role}>View as: {user.role}</option>
        <option value="admin">View as: admin</option>
        <option value="sampler">View as: sampler</option>
        <option value="public">View as: public</option>
      </select>
    </div>
  );
}
