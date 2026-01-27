import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FileText, Calendar, TrendingUp, User as UserIcon } from 'lucide-react';

interface Assessment {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  full_name: string;
  company_name: string;
  role: string;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    const [assessmentsResult, profileResult] = await Promise.all([
      supabase
        .from('assessments')
        .select('id, name, created_at, updated_at')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(5),
      supabase
        .from('user_profiles')
        .select('full_name, company_name, role')
        .eq('id', user!.id)
        .maybeSingle(),
    ]);

    if (assessmentsResult.data) setAssessments(assessmentsResult.data);
    if (profileResult.data) setProfile(profileResult.data);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-navigant-blue to-navigant-dark-blue text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
          </h1>
          <p className="text-blue-100">
            Manage your assessments and explore AI-powered learning tools
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-navigant-blue" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{assessments.length}</p>
            <p className="text-sm text-gray-600">Total Assessments</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-navigant-blue" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {assessments.filter((a) => {
                const updated = new Date(a.updated_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return updated > weekAgo;
              }).length}
            </p>
            <p className="text-sm text-gray-600">Active This Week</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <UserIcon className="w-8 h-8 text-navigant-blue" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">{profile?.role || 'Client'}</p>
            <p className="text-sm text-gray-600">Account Type</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Assessments</h2>
              <Link
                to="/apps/learning-tech-assessment"
                className="text-sm text-navigant-blue hover:text-navigant-dark-blue font-medium"
              >
                Create New
              </Link>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : assessments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No assessments yet</p>
                <Link
                  to="/apps/learning-tech-assessment"
                  className="inline-flex items-center text-navigant-blue hover:text-navigant-dark-blue font-medium"
                >
                  Create your first assessment
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {assessments.map((assessment) => (
                  <Link
                    key={assessment.id}
                    to={`/apps/learning-tech-assessment?id=${assessment.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    <h3 className="font-medium text-gray-900 mb-2">{assessment.name}</h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>Last updated {formatDate(assessment.updated_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/apps/learning-tech-assessment"
                className="block p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <h3 className="font-medium text-navigant-navy mb-1">New Assessment</h3>
                <p className="text-sm text-navigant-dark-blue">
                  Start evaluating your learning technology stack
                </p>
              </Link>

              <Link
                to="/apps"
                className="block p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <h3 className="font-medium text-gray-900 mb-1">Explore Apps</h3>
                <p className="text-sm text-gray-600">
                  Discover more AI-powered learning tools
                </p>
              </Link>

              {profile && (
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Your Profile</h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Name:</strong> {profile.full_name}</p>
                    {profile.company_name && (
                      <p><strong>Company:</strong> {profile.company_name}</p>
                    )}
                    <p><strong>Email:</strong> {user?.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
