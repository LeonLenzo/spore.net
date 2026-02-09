'use client';

import { useState } from 'react';
import Link from 'next/link';
import RoleGuard from '@/components/RoleGuard';
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

export default function SamplePage() {
  const [activeTab, setActiveTab] = useState<TabType>('collect');

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
            <Link
              href="/"
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center"
            >
              Home
            </Link>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white border-b">
          <div className="px-6">
            <nav className="flex space-x-8" aria-label="Tabs">
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
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'collect' ? <CollectTab /> : <ManageTab />}
        </div>
      </div>
    </RoleGuard>
  );
}
