import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { createUser } from '../../lib/authService';

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  entitlements?: { module_key: string; enabled: boolean }[];
  user_count?: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  organization: string;
  organization_id: string;
  role: string;
  created_at: string;
}

interface HubAdminProps {
  onBack: () => void;
}

const HubAdmin: React.FC<HubAdminProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'organizations' | 'users'>('organizations');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', organization_id: '', role: 'client' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const AVAILABLE_MODULES = [
    { key: 'conversion', label: 'Learning Conversion', icon: '📚' },
    { key: 'compliance', label: 'Compliance Query Pro', icon: '🔍' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch organizations with entitlements
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (orgsError) throw orgsError;

      // Fetch entitlements for all orgs
      const { data: entitlementsData } = await supabase
        .from('org_entitlements')
        .select('organization_id, module_key, enabled');

      // Fetch user counts per org
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email, name, organization, organization_id, role, created_at');

      if (usersError) throw usersError;

      // Combine data
      const orgsWithDetails = (orgsData || []).map(org => ({
        ...org,
        entitlements: (entitlementsData || []).filter(e => e.organization_id === org.id),
        user_count: (usersData || []).filter(u => u.organization_id === org.id).length
      }));

      setOrganizations(orgsWithDetails);
      setUsers(usersData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async () => {
    if (!newOrgName.trim()) return;

    try {
      const slug = newOrgName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const { data, error } = await supabase
        .from('organizations')
        .insert({ name: newOrgName, slug })
        .select()
        .single();

      if (error) throw error;

      // Add default conversion entitlement
      await supabase
        .from('org_entitlements')
        .insert({ organization_id: data.id, module_key: 'conversion', enabled: true });

      setNewOrgName('');
      setShowCreateOrg(false);
      fetchData();
    } catch (err) {
      console.error('Error creating organization:', err);
      alert('Failed to create organization');
    }
  };

  const toggleEntitlement = async (orgId: string, moduleKey: string, currentlyEnabled: boolean) => {
    try {
      if (currentlyEnabled) {
        // Disable - delete the entitlement
        await supabase
          .from('org_entitlements')
          .delete()
          .eq('organization_id', orgId)
          .eq('module_key', moduleKey);
      } else {
        // Enable - upsert the entitlement
        await supabase
          .from('org_entitlements')
          .upsert({ organization_id: orgId, module_key: moduleKey, enabled: true });
      }
      fetchData();
    } catch (err) {
      console.error('Error toggling entitlement:', err);
    }
  };

  const deleteOrganization = async (orgId: string, orgName: string) => {
    if (!confirm(`Are you sure you want to delete "${orgName}"? This will remove all entitlements but NOT the users.`)) {
      return;
    }

    try {
      await supabase.from('organizations').delete().eq('id', orgId);
      fetchData();
    } catch (err) {
      console.error('Error deleting organization:', err);
      alert('Failed to delete organization');
    }
  };

  const hasEntitlement = (org: Organization, moduleKey: string): boolean => {
    return org.entitlements?.some(e => e.module_key === moduleKey && e.enabled) ?? false;
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.organization_id) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreatingUser(true);
    try {
      const selectedOrg = organizations.find(o => o.id === newUser.organization_id);
      const result = await createUser(
        newUser.email,
        newUser.password,
        newUser.name,
        selectedOrg?.name || '',
        newUser.role as 'admin' | 'client'
      );

      if (result.success) {
        // Update the user's organization_id in user_profiles
        await supabase
          .from('user_profiles')
          .update({ organization_id: newUser.organization_id })
          .eq('email', newUser.email);

        setShowCreateUser(false);
        setNewUser({ name: '', email: '', password: '', organization_id: '', role: 'client' });
        fetchData();
        alert('User created successfully!');
      } else {
        alert(result.error || 'Failed to create user');
      }
    } catch (err) {
      console.error('Error creating user:', err);
      alert('Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚙️</span>
            <div>
              <h1 className="text-xl font-bold">Hub Admin</h1>
              <p className="text-gray-300 text-sm">Manage Organizations & Access</p>
            </div>
          </div>
          
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
          >
            🧭 Back to Hub
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('organizations')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'organizations'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            🏢 Organizations ({organizations.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            👥 All Users ({users.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-4xl mb-4 animate-spin">⚙️</div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        ) : activeTab === 'organizations' ? (
          <div className="space-y-4">
            {/* Create Organization Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowCreateOrg(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                ➕ New Organization
              </button>
            </div>

            {/* Create Organization Modal */}
            {showCreateOrg && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Create Organization</h3>
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Organization Name"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none mb-4"
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => { setShowCreateOrg(false); setNewOrgName(''); }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createOrganization}
                      className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Organizations List */}
            {organizations.map(org => (
              <div key={org.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{org.name}</h3>
                    <p className="text-gray-500 text-sm">Slug: {org.slug} • {org.user_count} user(s)</p>
                  </div>
                  <button
                    onClick={() => deleteOrganization(org.id, org.name)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-all text-sm font-semibold"
                  >
                    🗑️ Delete
                  </button>
                </div>

                {/* Module Entitlements */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Module Access:</p>
                  <div className="flex flex-wrap gap-3">
                    {AVAILABLE_MODULES.map(module => {
                      const enabled = hasEntitlement(org, module.key);
                      return (
                        <button
                          key={module.key}
                          onClick={() => toggleEntitlement(org.id, module.key, enabled)}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                            enabled
                              ? 'bg-green-100 text-green-700 border-2 border-green-300'
                              : 'bg-gray-100 text-gray-500 border-2 border-gray-200'
                          }`}
                        >
                          {module.icon} {module.label}
                          {enabled ? ' ✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {organizations.length === 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="text-4xl mb-4">🏢</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Organizations Yet</h3>
                <p className="text-gray-600">Create your first organization to get started.</p>
              </div>
            )}
          </div>
        ) : (
          /* Users Tab */
          <div className="space-y-4">
            {/* Create User Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowCreateUser(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                ➕ New User
              </button>
            </div>

            {/* Create User Modal */}
            {showCreateUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Create User</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={newUser.name}
                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        placeholder="john@company.com"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Password *</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Organization *</label>
                      <select
                        value={newUser.organization_id}
                        onChange={(e) => setNewUser({...newUser, organization_id: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select Organization</option>
                        {organizations.map(org => (
                          <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Role *</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="client">Client</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => { setShowCreateUser(false); setNewUser({ name: '', email: '', password: '', organization_id: '', role: 'client' }); }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateUser}
                      disabled={isCreatingUser}
                      className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isCreatingUser ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700">Organization</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-gray-600">{user.organization || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Users Yet</h3>
                <p className="text-gray-600">Users will appear here when they're created.</p>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HubAdmin;
