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

  // Section 1: Learning Conversion modules
  const learningConversionModules = [
    {
      key: 'conversion',
      title: 'Learning Conversion (Managed Service)',
      description: 'Managed conversion service for approved procedural documents into SCORM-compliant training, with structured content and assessments included, delivered within 24 hours.',
      icon: '📚',
      enabled: hasAccess('conversion'),
      locked: false,
      stats: activeJobsCount > 0 ? `${activeJobsCount} Active Job${activeJobsCount > 1 ? 's' : ''}` : undefined
    },
    {
      key: 'course-builder',
      title: 'Learning Conversion Workspace',
      description: 'Direct L&D access to the Learning Conversion capability. Upload approved documents and generate SCORM training within minutes, with full review and control before export.',
      icon: '🛠️',
      enabled: hasAccess('course-builder'),
      locked: !hasAccess('course-builder'),
      lockedMessage: !hasAccess('course-builder') ? 'Contact Admin' : undefined
    }
  ];

  // Section 2: Compliance & Document Intelligence modules
  const complianceModules = [
    {
      key: 'sop-compare',
      title: 'Document Change Impact Review',
      description: 'Side-by-side comparison of controlled documents with full traceability and verification.',
      icon: '🔄',
      enabled: hasAccess('sop-compare'),
      locked: !hasAccess('sop-compare'),
      lockedMessage: !hasAccess('sop-compare') ? 'Contact Admin' : undefined,
      stats: undefined
    },
    {
      key: 'doc-qa',
      title: 'Document Q&A / Insight Search',
      description: 'AI-powered document search and analysis. Query your regulatory documents with natural language.',
      icon: '🔍',
      enabled: hasAccess('doc-qa'),
      locked: !hasAccess('doc-qa'),
      lockedMessage: !hasAccess('doc-qa') ? 'Contact Admin' : undefined,
      stats: undefined
    }
  ];

  // Admin module (separate)
  const adminModule = user.role === 'admin' ? {
    key: 'hub-admin',
    title: 'Hub Admin',
    description: 'Manage organizations, module entitlements, and users across the CapNorth Hub platform.',
    icon: '⚙️',
    enabled: true,
    locked: false,
    stats: undefined,
    lockedMessage: undefined
  } : null;

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
            Select an option below to get started
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
          <div className="space-y-10">
            {/* Section 1: Learning Conversion */}
            <div className="bg-white/50 rounded-2xl p-6 border border-blue-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="text-2xl">📖</span>
                Learning Conversion
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {learningConversionModules.map(module => (
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
              </div>
            </div>

            {/* Section 2: Compliance & Document Intelligence */}
            <div className="bg-white/50 rounded-2xl p-6 border border-indigo-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Compliance & Document Intelligence
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {complianceModules.map(module => (
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
              </div>
            </div>

            {/* Admin Module (separate section) */}
            {adminModule && (
              <div className="bg-white/50 rounded-2xl p-6 border border-purple-100">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="text-2xl">⚙️</span>
                  Administration
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ModuleTile
                    key={adminModule.key}
                    title={adminModule.title}
                    description={adminModule.description}
                    icon={adminModule.icon}
                    enabled={adminModule.enabled}
                    locked={adminModule.locked}
                    lockedMessage={adminModule.lockedMessage}
                    stats={adminModule.stats}
                    onClick={() => onSelectModule(adminModule.key)}
                  />
                </div>
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
