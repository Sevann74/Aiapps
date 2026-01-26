import React from 'react';
import ModuleTile from './ModuleTile';
import { useEntitlements } from '../../hooks/useEntitlements';

interface HubHomeProps {
  user: {
    name: string;
    email: string;
    organization: string;
    organization_id?: string;
    role: 'admin' | 'client';
  };
  onSelectModule: (moduleKey: string) => void;
  onLogout: () => void;
  activeJobsCount?: number;
}

const HubHome: React.FC<HubHomeProps> = ({ 
  user, 
  onSelectModule, 
  onLogout,
  activeJobsCount = 0 
}) => {
  const { hasAccess, loading, entitlements } = useEntitlements(user.organization_id || null);
  
  // Debug logging
  console.log('HubHome Debug:', {
    organization_id: user.organization_id,
    entitlements,
    hasSOPCompare: hasAccess('sop-compare'),
    loading
  });

  const modules = [
    {
      key: 'conversion',
      title: 'Learning Conversion',
      description: 'Convert approved documents into interactive SCORM-compliant e-learning, with structured content extraction and assessment generation.',
      icon: '📚',
      enabled: hasAccess('conversion'),
      locked: false,
      stats: activeJobsCount > 0 ? `${activeJobsCount} Active Job${activeJobsCount > 1 ? 's' : ''}` : undefined
    },
    {
      key: 'document-review',
      title: 'Document Revision Impact Review',
      description: 'Identify and document the training impact of document revisions through deterministic, audit-safe comparison. Generate Training Impact Assessment reports to support Quality, L&D, and Process Owner decisions.',
      icon: '📋',
      enabled: hasAccess('sop-compare'),
      locked: !hasAccess('sop-compare'),
      lockedMessage: !hasAccess('sop-compare') ? 'Contact Admin' : undefined
    },
    {
      key: 'sop-compare',
      title: 'SOP Comparison Tool',
      description: 'Compare two SOPs side-by-side to identify differences, track changes, and ensure compliance. Full audit trail with tiered matching.',
      icon: '🔄',
      enabled: hasAccess('sop-compare'),
      locked: !hasAccess('sop-compare'),
      lockedMessage: !hasAccess('sop-compare') ? 'Contact Admin' : undefined
    },
    {
      key: 'compliance',
      title: 'Compliance Query Pro',
      description: 'AI-powered compliance search and analysis. Query your regulatory documents with natural language.',
      icon: '🔍',
      enabled: hasAccess('compliance'),
      locked: !hasAccess('compliance'),
      lockedMessage: 'Coming Soon'
    }
  ];

  // Add Hub Admin tile for admins
  if (user.role === 'admin') {
    modules.push({
      key: 'hub-admin',
      title: 'Hub Admin',
      description: 'Manage organizations, module entitlements, and users across the CapNorth Hub platform.',
      icon: '⚙️',
      enabled: true,
      locked: false,
      stats: undefined,
      lockedMessage: undefined
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧭</span>
            <div>
              <h1 className="text-xl font-bold">CapNorth Hub</h1>
              <p className="text-blue-200 text-sm">Enterprise Learning & Compliance Platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {user.role === 'admin' && (
              <span className="px-3 py-1 bg-blue-700 rounded-full text-xs font-semibold">
                Admin
              </span>
            )}
            <div className="text-right">
              <p className="font-semibold">{user.name}</p>
              <p className="text-blue-200 text-sm">{user.organization}</p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg font-semibold transition-all flex items-center gap-2"
            >
              <span>🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name.split(' ')[0]}
          </h2>
          <p className="text-gray-600">
            Select a module below to get started
          </p>
        </div>

        {/* Module Tiles */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-4xl mb-4 animate-pulse">🧭</div>
              <p className="text-gray-600">Loading your modules...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map(module => (
              <ModuleTile
                key={module.key}
                title={module.title}
                description={module.description}
                icon={module.icon}
                enabled={module.enabled}
                locked={module.locked}
                lockedMessage={module.lockedMessage}
                stats={module.stats}
                onClick={() => onSelectModule(module.key)}
              />
            ))}
            
            {/* Placeholder for future modules - only show if not admin or less than 3 modules */}
            {modules.length < 4 && (
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center opacity-50">
                <span className="text-4xl mb-4">➕</span>
                <h3 className="text-lg font-semibold text-gray-500 mb-2">More Coming Soon</h3>
                <p className="text-sm text-gray-400">
                  Additional modules will appear here as they become available
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats for Admin */}
        {user.role === 'admin' && (
          <div className="mt-12 p-6 bg-white rounded-2xl shadow-lg border border-blue-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📊</span> Quick Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-blue-600">{activeJobsCount}</p>
                <p className="text-sm text-gray-600">Active Jobs</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-green-600">-</p>
                <p className="text-sm text-gray-600">Completed This Month</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-purple-600">-</p>
                <p className="text-sm text-gray-600">Total Clients</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-indigo-600">2</p>
                <p className="text-sm text-gray-600">Available Modules</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto py-6 text-center text-gray-500 text-sm">
        <p>CapNorth Hub • Enterprise Learning & Compliance Platform</p>
      </div>
    </div>
  );
};

export default HubHome;
