'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import RoleGuard from '@/components/RoleGuard';
import RoleSwitcher from '@/components/RoleSwitcher';
import { AuthService } from '@/lib/auth';
import dynamic from 'next/dynamic';

// Dynamically import the tab components
const CollectTab = dynamic(() => import('@/components/sample/CollectTab'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading...</div>
});

const ManageTab = dynamic(() => import('@/components/sample/ManageTab'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading...</div>
});

type TabType = 'collect' | 'manage';

function SamplePageContent() {
  const searchParams = useSearchParams();
  const sampleId = searchParams.get('id');
  const user = AuthService.getCurrentUser();
  const [activeTab, setActiveTab] = useState<TabType>('manage');
  const [viewAsRole, setViewAsRole] = useState<string | null>(null);

  // Effective user for display purposes (considers view-as override)
  const effectiveUser = viewAsRole
    ? (viewAsRole === 'public' ? null : { ...user, role: viewAsRole })
    : user;

  // If a specific sample ID is provided and effective user is not authenticated, show read-only view
  const isPublicView = sampleId && !effectiveUser;

  // If effective user is authenticated (sampler or admin), show full functionality
  if (user && (user.role === 'sampler' || user.role === 'admin') && effectiveUser && (effectiveUser.role === 'sampler' || effectiveUser.role === 'admin')) {
    return (
      <RoleGuard requiredRole="sampler">
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-bold text-gray-900">spore.net</h1>
              <p className="text-gray-700 text-sm font-medium">Sample Management</p>
            </Link>
            <div className="flex items-center gap-4">
              <RoleSwitcher onRoleChange={setViewAsRole} />
              <Link
                href="/"
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center"
              >
                Home
              </Link>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white border-b">
          <div className="px-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('manage')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'manage'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Manage Samples
              </button>
              <button
                onClick={() => setActiveTab('collect')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'collect'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Collect Sample
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'collect' ? <CollectTab /> : <ManageTab readOnly={false} sampleId={sampleId || undefined} />}
        </div>
      </div>
    </RoleGuard>
    );
  }

  // Public view - read-only access to specific sample
  if (isPublicView) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-bold text-gray-900">spore.net</h1>
              <p className="text-gray-700 text-sm font-medium">Sample Details</p>
            </Link>
            <Link
              href="/"
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center"
            >
              Home
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <ManageTab readOnly={true} sampleId={sampleId} />
        </div>
      </div>
    );
  }

  // Redirect to login if no sample ID provided and not authenticated
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
        <p className="text-gray-600 mb-6">You need to be logged in to access this page.</p>
        <Link
          href="/login"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors inline-block"
        >
          Login
        </Link>
      </div>
    </div>
  );
}

export default function SamplePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <SamplePageContent />
    </Suspense>
  );
}
