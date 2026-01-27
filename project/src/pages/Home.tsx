import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Sparkles, ArrowRight, CheckCircle, TrendingUp, Target, Zap } from 'lucide-react';

interface App {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail_url: string;
}

export const Home: React.FC = () => {
  const [featuredApps, setFeaturedApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedApps();
  }, []);

  const loadFeaturedApps = async () => {
    const { data } = await supabase
      .from('apps')
      .select('id, name, slug, description, thumbnail_url')
      .eq('is_featured', true)
      .eq('is_active', true)
      .limit(3);

    if (data) {
      setFeaturedApps(data);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-navigant-blue via-navigant-dark-blue to-[#1a1f5c] text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">AI-Powered Learning Solutions</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Transform Your Learners’
              <br />
              <span className="text-navigant-cyan">Experience with AI</span>
            </h1>

            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Explore our suite of AI-powered apps designed to help HR and L&D teams streamline onboarding, simplify compliance, analyze skills, and optimize learning technology investments.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/apps"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-navigant-blue rounded-md hover:bg-gray-50 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
              >
                Explore Apps
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-8 py-3 bg-navigant-cyan text-white rounded-md hover:bg-opacity-90 transition-colors font-semibold text-lg border-2 border-white/20"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        Why Navigant Learning AI Apps?
      </h2>
      <p className="text-xl text-gray-600 max-w-3xl mx-auto">
        Leverage AI to accelerate HR & L&D outcomes — from compliance to skills.
      </p>
    </div>

    {/* 4 tiles in one row on md+ screens */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 items-stretch">
      {/* Learning & Compliance Navigator */}
      <div className="bg-white rounded-lg p-8 shadow-md hover:shadow-xl transition-shadow h-full flex flex-col">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
          <Target className="w-6 h-6 text-navigant-blue" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          Learning & Compliance
        </h3>
        <p className="text-gray-600 leading-relaxed">
          Instant answers to HR, training, and compliance questions powered by AI
        </p>
      </div>

      {/* Onboarding Tracker */}
      <div className="bg-white rounded-lg p-8 shadow-md hover:shadow-xl transition-shadow h-full flex flex-col">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
          <TrendingUp className="w-6 h-6 text-navigant-blue" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Onboarding</h3>
        <p className="text-gray-600 leading-relaxed">
          Digitize and automate employee onboarding tasks, reminders, and checklists
        </p>
      </div>

      {/* Skill Insights (replaces duplicate tile) */}
      <div className="bg-white rounded-lg p-8 shadow-md hover:shadow-xl transition-shadow h-full flex flex-col">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
          <TrendingUp className="w-6 h-6 text-navigant-blue" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Skill Insights</h3>
        <p className="text-gray-600 leading-relaxed">
          Identify capability gaps and align workforce skills with business needs
        </p>
      </div>

      {/* Learning Tech Analysis */}
      <div className="bg-white rounded-lg p-8 shadow-md hover:shadow-xl transition-shadow h-full flex flex-col">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
          <Zap className="w-6 h-6 text-navigant-blue" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Learning Tech Analysis</h3>
        <p className="text-gray-600 leading-relaxed">
          Assess and benchmark your learning technology stack to optimize ROI
        </p>
      </div>
    </div>
  </div>
</section>

      {!loading && featuredApps.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Featured Applications
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                AI-powered apps for HR & L&D — from onboarding and compliance to skills and learning technology
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-navigant-blue hover:shadow-lg transition-all group"
                >
                  <div className="h-48 bg-gradient-to-br from-navigant-cyan to-navigant-blue flex items-center justify-center">
                    <div className="text-white text-center p-6">
                      <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-80" />
                      <p className="text-sm font-medium opacity-90">AI-Powered Tool</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{app.name}</h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">{app.description}</p>
                    <Link
                      to={`/apps/${app.slug}`}
                      className="inline-flex items-center text-navigant-blue hover:text-navigant-dark-blue font-medium group-hover:translate-x-1 transition-transform"
                    >
                      Try it now
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                to="/apps"
                className="inline-flex items-center text-navigant-blue hover:text-navigant-dark-blue font-semibold text-lg"
              >
                View all apps
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="py-20 bg-gradient-to-br from-navigant-blue to-navigant-dark-blue text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Transform Learners' Experiences with AI?
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Discover AI-powered apps that make onboarding smoother, compliance easier, skills clearer, and learning tech smarter
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-navigant-blue rounded-md hover:bg-gray-50 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                to="/apps"
                className="inline-flex items-center justify-center px-8 py-3 bg-transparent text-white rounded-md hover:bg-white/10 transition-colors font-semibold text-lg border-2 border-white"
              >
                Explore Apps
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
