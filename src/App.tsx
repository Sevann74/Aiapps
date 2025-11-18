import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Apps } from './pages/Apps';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Dashboard } from './pages/Dashboard';
import { AssessmentTool } from './pages/AssessmentTool';
import FAQBot from './pages/FAQBot';
import CareerSkillsNavigator from './pages/CareerSkillsNavigator';
import OnboardingNavigator from './pages/OnboardingNavigator';
import ROICalculator from './pages/ROICalculator';
import CourseBuilder from './pages/CourseBuilder';
import AICourseBuilderPortal from './pages/AICourseBuilderPortal';
import ComplianceQueryPro from './pages/ComplianceQueryPro';

// ✅ Chat container only for FAQBot
function ChatContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gray-50 px-4">
      <div className="w-full max-w-lg bg-white shadow-xl rounded-2xl border border-gray-200 p-4">
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/apps" element={<Apps />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/apps/learning-tech-assessment"
              element={
                <ProtectedRoute>
                  <AssessmentTool />
                </ProtectedRoute>
              }
            />
            <Route
              path="/apps/faq-bot"
              element={
                <ProtectedRoute>
                  <ChatContainer>
                    <FAQBot />
                  </ChatContainer>
                </ProtectedRoute>
              }
            />
            {/* 🆕 ComplianceQuery Pro Route */}
            <Route
              path="/apps/compliance-query-pro"
              element={
                <ProtectedRoute>
                  <ComplianceQueryPro />
                </ProtectedRoute>
              }
            />
            {/* 🆕 Career Skills Navigator Route */}
            <Route
              path="/apps/career-skills-navigator"
              element={
                <ProtectedRoute>
                  <CareerSkillsNavigator />
                </ProtectedRoute>
              }
            />
            {/* 🆕 Onboarding Navigator Route */}
            <Route
              path="/apps/onboarding-navigator"
              element={
                <ProtectedRoute>
                  <OnboardingNavigator />
                </ProtectedRoute>
              }
            />
            {/* 🆕 ROI Calculator Route */}
            <Route
              path="/apps/roi-calculator"
              element={
                <ProtectedRoute>
                  <ROICalculator />
                </ProtectedRoute>
              }
            />
            {/* 🆕 Course Builder Route */}
            <Route
              path="/apps/course-builder"
              element={
                <ProtectedRoute>
                  <CourseBuilder />
                </ProtectedRoute>
              }
            />
            {/* 🆕 AI Course Builder Portal Route (has its own auth) */}
            <Route
              path="/apps/ai-course-builder-portal"
              element={<AICourseBuilderPortal />}
            />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;