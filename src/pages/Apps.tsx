import { Link } from 'react-router-dom';
import { GraduationCap, MessageSquare, ClipboardList, Layers, Users, Calculator, Package, Search } from 'lucide-react';

export function Apps() {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
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