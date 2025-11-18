import React, { useState } from 'react';
import { Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react';

export const Layout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null); // Mock user state - replace with your auth
  
  const handleSignOut = () => {
    setUser(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24 sm:h-28 md:h-32">
            <a href="/" className="flex items-center space-x-3">
              <img
                src="/Logo-Vert-Color-RGB.svg"
                alt="Navigant Learning"
                className="h-20 sm:h-24 md:h-28 lg:h-32 w-auto"
              />
            </a>

            <nav className="hidden md:flex items-center space-x-6">
              <a href="/apps" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Apps
              </a>
              {user ? (
                <>
                  <a href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                    Dashboard
                  </a>
                  <div className="relative group">
                    <button className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 font-medium transition-colors">
                      <User className="w-4 h-4" />
                      <span>Account</span>
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block">
                      <a
                        href="/dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </a>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <a
                    href="/signin"
                    className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                  >
                    Sign In
                  </a>
                  <a
                    href="/signup"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
                  >
                    Get Started
                  </a>
                </>
              )}
            </nav>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-700 hover:text-blue-600"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a
                href="/apps"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Apps
              </a>
              {user ? (
                <>
                  <a
                    href="/dashboard"
                    className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </a>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/signin"
                    className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </a>
                  <a
                    href="/signup"
                    className="block px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-navigant-navy text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <img
                src="/Logo-Vert-Color-RGB.svg"
                alt="Navigant Learning"
                className="h-20 sm:h-24 md:h-28 w-auto mb-4 brightness-0 invert"
              />
              <p className="text-gray-300 text-sm">
                Innovative AI-powered tools for modern learning and development teams.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/apps" className="text-gray-300 hover:text-white transition-colors text-sm">
                    Explore Apps
                  </a>
                </li>
                <li>
                  <a href="https://navigantlearning.com" className="text-gray-300 hover:text-white transition-colors text-sm">
                    Main Website
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <p className="text-gray-300 text-sm">
                Ready to transform your learning technology?
              </p>
              <a
                href="https://navigantlearning.com"
                className="inline-block mt-4 bg-cyan-500 text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors text-sm font-medium"
              >
                Get in Touch
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
            <p>&copy; {new Date().getFullYear()} Navigant Learning. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};