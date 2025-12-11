import { useState, useEffect } from 'react';
import CourseBuilder from './CourseBuilder';
import { signIn, signOut, getSession } from '../lib/authService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      // Check localStorage first for persisted session
      const savedSession = localStorage.getItem('coursebuilder_admin_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        setIsAuthenticated(true);
        setCurrentUser(parsed.user);
      }
      setIsLoading(false);
    };
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const result = await signIn(loginEmail, loginPassword);
      if (result.success && result.user) {
        setIsAuthenticated(true);
        setCurrentUser({ name: result.user.name, email: result.user.email });
        localStorage.setItem('coursebuilder_admin_session', JSON.stringify({ 
          isAuthenticated: true, 
          user: { name: result.user.name, email: result.user.email }
        }));
      } else {
        setLoginError(result.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('An error occurred during login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('coursebuilder_admin_session');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎓</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">AI Course Builder</h1>
            <p className="text-gray-600 mt-2">Admin Access Only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                placeholder="admin@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            This tool is restricted to authorized administrators only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Admin Header Bar */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 text-white py-2 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎓</span>
          <span className="font-semibold">AI Course Builder</span>
          <span className="text-indigo-300 text-sm">• Admin Tool</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-indigo-200">{currentUser?.name}</span>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition-all"
          >
            Logout
          </button>
        </div>
      </div>
      <CourseBuilder />
    </div>
  );
}

export default App;

