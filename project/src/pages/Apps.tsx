import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, MessageSquare, ClipboardList, Layers, Users, Calculator, Package, Search, Lock, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ADMIN_EMAIL = 'david.dergazarian@navigantlearning.com';

export function Apps() {
  const { user, signIn, signOut, loading } = useAuth();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) {
        setLoginError(error.message);
      } else if (loginEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        setLoginError('Access denied. Admin credentials required.');
        await signOut();
      }
    } catch (err) {
      setLoginError('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const apps = [
    {
      id: 'compliance-query-pro',
      name: 'ComplianceQuery Pro',
      description: 'AI-powered document intelligence for instant compliance answers with source citations and GxP audit trails.',
      icon: Search,
      path: '/apps/compliance-query-pro',
      color: 'from-indigo-500 to-blue-600'
    },
    {
      id: 'course-builder',
      name: 'L&D AI Course Builder',
      description: 'Transform SOPs and documents into SCORM-compliant eLearning courses with AI-powered extraction and 100% compliance traceability.',
      icon: GraduationCap,
      path: '/apps/course-builder',
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 'Learning Tech Navigator',
      name: 'Learning Tech Navigator',
      description: 'Evaluate and assess learning technology solutions',
      icon: ClipboardList,
      path: '/apps/learning-tech-assessment',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'Learning & Compliance Navigator',
      name: 'Learning & Compliance Navigator',
      description: 'AI-powered FAQ assistant for instant answers',
      icon: MessageSquare,
      path: '/apps/faq-bot',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'career-skills-navigator',
      name: 'Career Skills Navigator',
      description: 'Skills assessment, gap analysis, and personalized development plans',
      icon: Layers,
      path: '/apps/career-skills-navigator',
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 'onboarding-navigator',
      name: 'Onboarding Navigator',
      description: 'Digitize and guide the entire employee onboarding journey – from first day to full integration',
      icon: Users,
      path: '/apps/onboarding-navigator',
      color: 'from-green-500 to-teal-500'
    },
    {
      id: 'roi-calculator',
      name: 'ROI Calculator',
      description: 'Calculate return on investment for all Navigant Learning solutions',
      icon: Calculator,
      path: '/apps/roi-calculator',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      id: 'ai-course-builder-portal',
      name: 'AI Course Builder Portal',
      description: 'Client portal for submitting course requests and admin dashboard for managing course generation workflows',
      icon: Package,
      path: '/apps/ai-course-builder-portal',
      color: 'from-cyan-500 to-blue-500'
    }
  ];

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated or not admin
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Access Required</h1>
              <p className="text-gray-600 mt-2">This page is restricted to administrators only.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              {loginError && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                {isLoggingIn ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show apps list for authenticated admin
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Admin header with logout */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Logged in as</p>
              <p className="font-semibold text-gray-900">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Available Apps</h1>
          <p className="text-xl text-gray-600">Choose an application to get started</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {apps.map((app) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.id}
                to={app.path}
                className="group bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-blue-500 transform hover:-translate-y-2"
              >
                <div className={`h-2 bg-gradient-to-r ${app.color}`} />
                <div className="p-8">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${app.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{app.name}</h3>
                  <p className="text-gray-600 leading-relaxed">{app.description}</p>
                  <div className="mt-6 flex items-center text-blue-600 font-semibold group-hover:gap-2 transition-all">
                    Launch App
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}