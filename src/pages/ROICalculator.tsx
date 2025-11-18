import React, { useState } from 'react';
import { Calculator, TrendingUp, DollarSign, Users, Clock, CheckCircle, PieChart, BarChart3, ArrowRight, Download, RefreshCw, ChevronDown, ChevronUp, Layers, FileText, Zap, Info } from 'lucide-react';

// ============================================
// APP DEFINITIONS
// ============================================

const APPS = {
  coursebuilder: {
    id: 'coursebuilder',
    name: 'AI Course Builder',
    description: 'Build compliance courses 20x faster',
    color: 'from-blue-500 to-purple-600',
    icon: FileText,
    enabled: true
  },
  onboarding: {
    id: 'onboarding',
    name: 'Onboarding Navigator',
    description: 'Digitize and automate employee onboarding',
    color: 'from-green-500 to-emerald-600',
    icon: Users,
    enabled: true
  },
  career: {
    id: 'career',
    name: 'Career Skills Navigator',
    description: 'Skills assessment and development planning',
    color: 'from-orange-500 to-red-600',
    icon: BarChart3,
    enabled: false
  },
  learning: {
    id: 'learning',
    name: 'Learning Tech Navigator',
    description: 'Evaluate learning technology solutions',
    color: 'from-blue-500 to-purple-600',
    icon: Layers,
    enabled: false
  },
   compliance: {
    id: 'compliance',
    name: 'ComplianceQuery Pro',
    description: 'AI-powered document search and compliance queries',
    color: 'from-purple-500 to-pink-600',
    icon: CheckCircle,
    enabled: true
  }
};

// ============================================
// COURSE BUILDER ROI MODEL - UPDATED
// ============================================

const COURSEBUILDER_METRICS = {
  seatTimeMinutes: {
    label: 'Seat Time (minutes)',
    default: 30,
    description: 'Length of the finished course',
    tooltip: 'For a 30-minute course, that\'s roughly 15-20 hours total of instructional design and build effort using traditional tools.'
  },
  coursesPerYear: {
    label: 'Courses Per Year',
    default: 10,
    description: 'Number of courses developed annually',
    tooltip: 'How many courses your team produces per year'
  },
  developmentRatio: {
    label: 'Development Ratio (hrs / seat hr)',
    default: 35,
    description: 'Industry avg for Level 1 = 30-40 hrs / seat hr',
    tooltip: 'Source: Chapman Alliance, ATD research on eLearning Development Ratios (Level 1 = 25-60 hrs per seat hour)'
  },
  blendedRate: {
    label: 'Blended Rate ($/hour)',
    default: 85,
    description: 'Combined instructional design and SME hourly rate',
    tooltip: 'Typical range: $65-$125/hour'
  },
  traditionalToolCosts: {
    label: 'Traditional Tools ($/year)',
    default: 2500,
    description: 'Storyline/Captivate ($1,500-2,000) + Stock assets ($500-1,000)',
    tooltip: 'Authoring tools, stock images, narration tools, LMS integration'
  },
  aiToolCosts: {
    label: 'AI Platform ($/year)',
    default: 1500,
    description: 'AI-powered course builder subscription',
    tooltip: 'Includes authoring, asset generation, and SCORM packaging'
  },
  implementationCost: {
    label: 'Implementation Cost (one-time)',
    default: 0,
    description: 'Migration, setup, or training costs',
    tooltip: 'One-time cost to implement AI solution (default: $0)'
  }
};

// ============================================
// ONBOARDING NAVIGATOR ROI MODEL
// ============================================

const ONBOARDING_METRICS = {
  hrTimePerHire: {
    label: 'HR Admin Time per New Hire (hours)',
    default: 8,
    description: 'Manual paperwork, coordination, follow-ups'
  },
  managerTimePerHire: {
    label: 'Manager Time per New Hire (hours)',
    default: 6,
    description: 'Orientation, task assignment, check-ins'
  },
  itTimePerHire: {
    label: 'IT Setup Time per New Hire (hours)',
    default: 3,
    description: 'Equipment setup, account creation'
  },
  hrHourlyRate: {
    label: 'HR Hourly Rate ($)',
    default: 35,
    description: 'Loaded cost including benefits'
  },
  managerHourlyRate: {
    label: 'Manager Hourly Rate ($)',
    default: 55,
    description: 'Average manager compensation'
  },
  itHourlyRate: {
    label: 'IT Hourly Rate ($)',
    default: 45,
    description: 'IT support cost per hour'
  },
  automationSavings: {
    label: 'Time Saved Through Automation (%)',
    default: 60,
    description: 'Automated reminders, workflows, tracking'
  },
  timeToProductivity: {
    label: 'Current Time to Productivity (days)',
    default: 45,
    description: 'Days until employee is fully productive'
  },
  productivityImprovement: {
    label: 'Productivity Improvement with App (%)',
    default: 25,
    description: 'Faster onboarding = faster productivity'
  },
  averageSalary: {
    label: 'Average New Hire Salary ($)',
    default: 75000,
    description: 'Annual salary of typical new hire'
  },
  firstYearTurnover: {
    label: 'First-Year Turnover Rate (%)',
    default: 20,
    description: 'Percentage of new hires leaving in year 1'
  },
  turnoverReduction: {
    label: 'Turnover Reduction with Better Onboarding (%)',
    default: 30,
    description: 'Improvement in retention'
  },
  replacementCost: {
    label: 'Cost to Replace Employee (% of salary)',
    default: 150,
    description: 'Recruiting, hiring, training costs'
  }
};

export default function UnifiedROICalculator() {
  const [selectedApp, setSelectedApp] = useState('coursebuilder');
  const [companySize, setCompanySize] = useState(500);
  const [annualHires, setAnnualHires] = useState(100);
  
  const [courseBuilderInputs, setCourseBuilderInputs] = useState(
    Object.fromEntries(
      Object.entries(COURSEBUILDER_METRICS).map(([key, config]) => [key, config.default])
    )
  );
  
  const [onboardingInputs, setOnboardingInputs] = useState(
    Object.fromEntries(
      Object.entries(ONBOARDING_METRICS).map(([key, config]) => [key, config.default])
    )
  );
  
  const [showDetails, setShowDetails] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // AI reduction percentages (default locked, can be customized in advanced mode)
  const [aiReductions, setAiReductions] = useState({
    contentPrep: 90,
    storyboard: 75,
    build: 75,
    qaReview: 50
  });

  // ============================================
  // COURSE BUILDER CALCULATIONS - UPDATED
  // ============================================

  const calculateCourseBuilderROI = () => {
    // Calculate traditional development hours using seat time formula
    const seatTimeHours = courseBuilderInputs.seatTimeMinutes / 60;
    const traditionalDevHours = seatTimeHours * courseBuilderInputs.developmentRatio;
    
    // 1) Phase distribution as percentages of total traditional hours
    // choose sensible defaults for Level 1 SOP courses
    const phaseShares = {
      contentPrep: 0.30,   // 30% of effort
      storyboard: 0.45,    // 45%
      build: 0.15,         // 15%
      qaReview: 0.10       // 10%
    };

    // Compute traditional phases scaled to traditionalDevHours
    const traditionalPhasesScaled = {
      contentPrep: traditionalDevHours * phaseShares.contentPrep,
      storyboard: traditionalDevHours * phaseShares.storyboard,
      build: traditionalDevHours * phaseShares.build,
      qaReview: traditionalDevHours * phaseShares.qaReview
    };

    // 2) AI reductions (percent reduction per phase) - use state values, convert from % to decimal
    const aiReductionsDecimal = {
      contentPrep: aiReductions.contentPrep / 100,
      storyboard: aiReductions.storyboard / 100,
      build: aiReductions.build / 100,
      qaReview: aiReductions.qaReview / 100
    };

    // Compute AI phase hours by applying reductions to the scaled traditional phases
    const aiPhasesScaled = {
      contentPrep: traditionalPhasesScaled.contentPrep * (1 - aiReductionsDecimal.contentPrep),
      storyboard: traditionalPhasesScaled.storyboard * (1 - aiReductionsDecimal.storyboard),
      build: traditionalPhasesScaled.build * (1 - aiReductionsDecimal.build),
      qaReview: traditionalPhasesScaled.qaReview * (1 - aiReductionsDecimal.qaReview)
    };

    // Totals
    const aiDevHours = Object.values(aiPhasesScaled).reduce((a,b)=>a+b, 0);

    // Costs
    const traditionalCostPerCourse = traditionalDevHours * courseBuilderInputs.blendedRate;
    const aiCostPerCourse = aiDevHours * courseBuilderInputs.blendedRate;

    const annualDevelopmentCostTraditional = traditionalCostPerCourse * courseBuilderInputs.coursesPerYear;
    const annualDevelopmentCostAI = aiCostPerCourse * courseBuilderInputs.coursesPerYear;

    const totalAnnualCostTraditional = annualDevelopmentCostTraditional + courseBuilderInputs.traditionalToolCosts;
    const totalAnnualCostAI = annualDevelopmentCostAI + courseBuilderInputs.aiToolCosts;

    // Savings
    const hoursPerCourseSaved = Math.max(0, traditionalDevHours - aiDevHours);
    const costPerCourseSaved = Math.max(0, traditionalCostPerCourse - aiCostPerCourse);
    const annualHoursSaved = hoursPerCourseSaved * courseBuilderInputs.coursesPerYear;
    const annualCostSaved = Math.max(0, totalAnnualCostTraditional - totalAnnualCostAI);
    const toolSavings = courseBuilderInputs.traditionalToolCosts - courseBuilderInputs.aiToolCosts;

    const percentTimeSaved = traditionalDevHours ? (hoursPerCourseSaved / traditionalDevHours) * 100 : 0;
    const percentCostSaved = totalAnnualCostTraditional ? (annualCostSaved / totalAnnualCostTraditional) * 100 : 0;

    // Payback - use oneTimeImplementationCost if provided; default 0
    const oneTimeImplementationCost = courseBuilderInputs.implementationCost || 0;
    const monthlySavings = annualCostSaved / 12;
    let paybackMonths;
    if (oneTimeImplementationCost <= 0 && annualCostSaved > 0) {
      paybackMonths = 0; // immediate
    } else if (monthlySavings > 0) {
      paybackMonths = oneTimeImplementationCost / monthlySavings;
    } else {
      paybackMonths = Infinity;
    }
    const paybackRatio = totalAnnualCostAI > 0 ? (annualCostSaved / totalAnnualCostAI) : Infinity;

    // 3-year net benefit (net of three years of AI costs + implementation)
    const threeYearNetBenefit = (totalAnnualCostTraditional * 3) - (totalAnnualCostAI * 3 + oneTimeImplementationCost);
    
    return {
      traditional: {
        devHours: traditionalDevHours,
        phases: traditionalPhasesScaled,
        costPerCourse: traditionalCostPerCourse,
        annualDevelopmentCost: annualDevelopmentCostTraditional,
        annualToolCosts: courseBuilderInputs.traditionalToolCosts,
        totalAnnualCost: totalAnnualCostTraditional
      },
      ai: {
        devHours: aiDevHours,
        phases: aiPhasesScaled,
        costPerCourse: aiCostPerCourse,
        annualDevelopmentCost: annualDevelopmentCostAI,
        annualToolCosts: courseBuilderInputs.aiToolCosts,
        totalAnnualCost: totalAnnualCostAI
      },
      savings: {
        hoursPerCourse: hoursPerCourseSaved,
        costPerCourse: costPerCourseSaved,
        annualHours: annualHoursSaved,
        annualCost: annualCostSaved,
        toolSavings: toolSavings,
        percentTimeSaved,
        percentCostSaved
      },
      roi: {
        paybackMonths,
        paybackRatio,
        threeYearBenefit: threeYearNetBenefit,
        implementationCost: oneTimeImplementationCost
      }
    };
  };

  // ============================================
  // ONBOARDING CALCULATIONS
  // ============================================

  const calculateOnboardingROI = () => {
    const hrCostPerHire = onboardingInputs.hrTimePerHire * onboardingInputs.hrHourlyRate;
    const managerCostPerHire = onboardingInputs.managerTimePerHire * onboardingInputs.managerHourlyRate;
    const itCostPerHire = onboardingInputs.itTimePerHire * onboardingInputs.itHourlyRate;
    const totalCostPerHire = hrCostPerHire + managerCostPerHire + itCostPerHire;
    const annualAdminCost = totalCostPerHire * annualHires;

    const timeSavingsPerHire = totalCostPerHire * (onboardingInputs.automationSavings / 100);
    const annualTimeSavings = timeSavingsPerHire * annualHires;

    const dailySalary = onboardingInputs.averageSalary / 260;
    const daysSaved = onboardingInputs.timeToProductivity * (onboardingInputs.productivityImprovement / 100);
    const productivityGainPerHire = dailySalary * daysSaved;
    const annualProductivityGains = productivityGainPerHire * annualHires;

    const currentTurnoverCount = annualHires * (onboardingInputs.firstYearTurnover / 100);
    const turnoverReduction = currentTurnoverCount * (onboardingInputs.turnoverReduction / 100);
    const costPerReplacement = onboardingInputs.averageSalary * (onboardingInputs.replacementCost / 100);
    const annualRetentionSavings = turnoverReduction * costPerReplacement;

    const totalAnnualBenefit = annualTimeSavings + annualProductivityGains + annualRetentionSavings;

    const consultingCost = 32500;
    const setupFee = 5000;
    const annualLicense = 4500;
    const totalFirstYearCost = consultingCost + setupFee + annualLicense;
    const ongoingAnnualCost = annualLicense;

    const firstYearROI = ((totalAnnualBenefit - totalFirstYearCost) / totalFirstYearCost) * 100;
    const paybackMonths = (totalFirstYearCost / (totalAnnualBenefit / 12));
    const threeYearBenefit = (totalAnnualBenefit * 3) - totalFirstYearCost - (ongoingAnnualCost * 2);
    const threeYearROI = ((threeYearBenefit) / (totalFirstYearCost + ongoingAnnualCost * 2)) * 100;

    return {
      costs: {
        totalCostPerHire,
        annualAdminCost,
        consultingCost,
        setupFee,
        annualLicense,
        totalFirstYearCost,
        ongoingAnnualCost
      },
      benefits: {
        timeSavingsPerHire,
        annualTimeSavings,
        productivityGainPerHire,
        annualProductivityGains,
        turnoverReduction,
        annualRetentionSavings,
        totalAnnualBenefit
      },
      roi: {
        firstYearROI,
        paybackMonths,
        threeYearBenefit,
        threeYearROI
      }
    };
  };

  const courseBuilderResults = selectedApp === 'coursebuilder' ? calculateCourseBuilderROI() : null;
  const onboardingResults = selectedApp === 'onboarding' ? calculateOnboardingROI() : null;

  const handleCourseBuilderInputChange = (key, value) => {
    setCourseBuilderInputs(prev => ({
      ...prev,
      [key]: value === '' ? '' : parseFloat(value) || 0
    }));
  };

  const handleOnboardingInputChange = (key, value) => {
    setOnboardingInputs(prev => ({
      ...prev,
      [key]: value === '' ? '' : parseFloat(value) || 0
    }));
  };

  const resetCourseBuilderDefaults = () => {
    setCourseBuilderInputs(
      Object.fromEntries(
        Object.entries(COURSEBUILDER_METRICS).map(([key, config]) => [key, config.default])
      )
    );
  };

  const resetOnboardingDefaults = () => {
    setOnboardingInputs(
      Object.fromEntries(
        Object.entries(ONBOARDING_METRICS).map(([key, config]) => [key, config.default])
      )
    );
  };

  const formatCurrency = (amount) => {
    if (!isFinite(amount)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatHours = (hours) => {
    if (!isFinite(hours)) return 'N/A';
    // Use 0 decimals for large numbers (>100), 1 decimal for smaller
    const decimals = hours > 100 ? 0 : 1;
    return `${hours.toFixed(decimals)} hrs`;
  };

  const formatPercent = (value) => {
    if (!isFinite(value)) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  const displayPayback = (months) => {
    if (!isFinite(months)) return 'N/A';
    if (months === 0) return 'Immediate';
    if (months < 1) return '< 1';
    if (months > 36) return '> 36';
    return `${Math.round(months)} mo`;
  };

  const formatPaybackRatio = (ratio) => {
    if (!isFinite(ratio) || ratio <= 0) return 'N/A';
    return ratio.toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto py-12">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Calculator className="w-12 h-12 text-blue-600" />
            <h1 className="text-5xl font-bold text-gray-900">ROI Calculator</h1>
          </div>
          <p className="text-xl text-gray-600 mb-2">Navigant Learning Solutions</p>
          <p className="text-sm text-gray-500">Calculate your return on investment • Data-driven insights • Business case builder</p>
        </div>

        {/* App Selection */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Solution</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {Object.values(APPS).map((app) => {
              const IconComponent = app.icon;
              return (
                <button
                  key={app.id}
                  onClick={() => app.enabled && setSelectedApp(app.id)}
                  disabled={!app.enabled}
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    selectedApp === app.id
                      ? `border-blue-500 bg-gradient-to-br ${app.color} bg-opacity-10 shadow-lg`
                      : app.enabled
                      ? 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                      : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                  }`}
                >
                  <IconComponent className="w-10 h-10 mb-4 text-blue-600 mx-auto" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{app.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{app.description}</p>
                  {!app.enabled && (
                    <span className="text-xs px-3 py-1 rounded-full bg-gray-200 text-gray-600 font-medium">
                      Coming Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* COURSE BUILDER CALCULATOR */}
        {selectedApp === 'coursebuilder' && courseBuilderResults && (
          <>
            {/* ROI Summary Cards */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <Clock className="w-8 h-8" />
                  <span className="text-sm font-medium opacity-90">Time Saved</span>
                </div>
                <p className="text-4xl font-bold mb-1">{formatPercent(courseBuilderResults.savings.percentTimeSaved)}</p>
                <p className="text-sm opacity-90">{formatHours(courseBuilderResults.savings.hoursPerCourse)} per course</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <DollarSign className="w-8 h-8" />
                  <span className="text-sm font-medium opacity-90">Annual Savings</span>
                </div>
                <p className="text-4xl font-bold mb-1">{formatCurrency(courseBuilderResults.savings.annualCost)}</p>
                <p className="text-sm opacity-90">{formatPercent(courseBuilderResults.savings.percentCostSaved)} cost reduction</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-8 h-8" />
                  <span className="text-sm font-medium opacity-90">Payback Ratio</span>
                </div>
                <p className="text-4xl font-bold mb-1">{formatPaybackRatio(courseBuilderResults.roi.paybackRatio)}x</p>
                <p className="text-sm opacity-90">Return on Investment</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <Zap className="w-8 h-8" />
                  <span className="text-sm font-medium opacity-90">Break-Even</span>
                </div>
                <p className="text-4xl font-bold mb-1">{displayPayback(courseBuilderResults.roi.paybackMonths)}</p>
                <p className="text-sm opacity-90">Months</p>
              </div>
            </div>

            {/* Warning for negative or zero savings */}
            {courseBuilderResults.savings.annualCost <= 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-900 mb-1">No Annual Savings Detected</h3>
                    <p className="text-sm text-red-700">
                      Based on your inputs, the AI solution costs more than traditional methods. 
                      Please check your inputs or consider that AI may not be cost-effective for your specific use case.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Warning for unrealistic time savings */}
            {courseBuilderResults.savings.percentTimeSaved > 90 && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">💡</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-yellow-900 mb-1">Optimistic Assumptions</h3>
                    <p className="text-sm text-yellow-700">
                      Your settings show {formatPercent(courseBuilderResults.savings.percentTimeSaved)} time savings, 
                      which is higher than typical (70-85%). We recommend running a pilot to validate these assumptions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Course Builder Parameters */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Course Development Parameters</h2>
                <button
                  onClick={resetCourseBuilderDefaults}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset to Defaults
                </button>
              </div>

              <div className="space-y-8">
                {/* Course Volume */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Course Volume</h3>
                  <div className="grid md:grid-cols-1 gap-6">
                    <div className="border-2 border-gray-100 rounded-xl p-4">
                      <label className="block text-gray-700 font-medium mb-2">
                        {COURSEBUILDER_METRICS.coursesPerYear.label}
                      </label>
                      <input
                        type="number"
                        value={courseBuilderInputs.coursesPerYear}
                        onChange={(e) => handleCourseBuilderInputChange('coursesPerYear', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                      {courseBuilderInputs.coursesPerYear <= 0 && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          ⚠️ Enter at least 1 course per year
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {COURSEBUILDER_METRICS.coursesPerYear.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Traditional Development Effort (Level 1 SOP Course) */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-800">
                      Traditional Development Effort (Level 1 SOP Course)
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Estimated work effort based on industry averages for simple compliance/SOP eLearning (Level 1).
                    </p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div className="border-2 border-gray-100 rounded-xl p-4">
                      <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2">
                        {COURSEBUILDER_METRICS.seatTimeMinutes.label}
                        <div className="group relative">
                          <Info className="w-4 h-4 text-gray-400 cursor-help" />
                          <div className="hidden group-hover:block absolute z-10 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg -top-2 left-6">
                            {COURSEBUILDER_METRICS.seatTimeMinutes.tooltip}
                          </div>
                        </div>
                      </label>
                      <input
                        type="number"
                        value={courseBuilderInputs.seatTimeMinutes}
                        onChange={(e) => handleCourseBuilderInputChange('seatTimeMinutes', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                      {courseBuilderInputs.seatTimeMinutes <= 0 && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          ⚠️ Seat time must be greater than 0
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {COURSEBUILDER_METRICS.seatTimeMinutes.description}
                      </p>
                    </div>

                    <div className="border-2 border-gray-100 rounded-xl p-4">
                      <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2">
                        {COURSEBUILDER_METRICS.developmentRatio.label}
                        <div className="group relative">
                          <Info className="w-4 h-4 text-gray-400 cursor-help" />
                          <div className="hidden group-hover:block absolute z-10 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg -top-2 left-6">
                            {COURSEBUILDER_METRICS.developmentRatio.tooltip}
                          </div>
                        </div>
                      </label>
                      <input
                        type="number"
                        value={courseBuilderInputs.developmentRatio}
                        onChange={(e) => handleCourseBuilderInputChange('developmentRatio', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {COURSEBUILDER_METRICS.developmentRatio.description}
                      </p>
                    </div>
                  </div>

                  {/* Auto-calculated Traditional Dev Hours Display */}
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">Traditional Dev Hours</p>
                        <p className="text-xs text-gray-600">
                          Formula: {courseBuilderInputs.seatTimeMinutes} min ÷ 60 × {courseBuilderInputs.developmentRatio} = {formatHours(courseBuilderResults.traditional.devHours)}
                        </p>
                      </div>
                      <p className="text-3xl font-bold text-red-600">
                        {formatHours(courseBuilderResults.traditional.devHours)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Blended Rate */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Labor Cost</h3>
                  <div className="grid md:grid-cols-1 gap-6">
                    <div className="border-2 border-blue-100 rounded-xl p-4 bg-blue-50">
                      <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2">
                        {COURSEBUILDER_METRICS.blendedRate.label}
                        <div className="group relative">
                          <Info className="w-4 h-4 text-blue-500 cursor-help" />
                          <div className="hidden group-hover:block absolute z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg -top-2 left-6">
                            {COURSEBUILDER_METRICS.blendedRate.tooltip}
                          </div>
                        </div>
                      </label>
                      <input
                        type="number"
                        value={courseBuilderInputs.blendedRate}
                        onChange={(e) => handleCourseBuilderInputChange('blendedRate', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                      {courseBuilderInputs.blendedRate <= 0 && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          ⚠️ Enter a blended rate greater than 0
                        </p>
                      )}
                      <p className="text-xs text-blue-700 mt-2">
                        {COURSEBUILDER_METRICS.blendedRate.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Annual Tooling & Licensing Costs */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Annual Tooling & Licensing Costs</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="border-2 border-gray-100 rounded-xl p-4">
                      <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2">
                        {COURSEBUILDER_METRICS.traditionalToolCosts.label}
                        <div className="group relative">
                          <Info className="w-4 h-4 text-gray-400 cursor-help" />
                          <div className="hidden group-hover:block absolute z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg -top-2 left-6">
                            {COURSEBUILDER_METRICS.traditionalToolCosts.tooltip}
                          </div>
                        </div>
                      </label>
                      <input
                        type="number"
                        value={courseBuilderInputs.traditionalToolCosts}
                        onChange={(e) => handleCourseBuilderInputChange('traditionalToolCosts', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {COURSEBUILDER_METRICS.traditionalToolCosts.description}
                      </p>
                    </div>

                    <div className="border-2 border-green-100 rounded-xl p-4 bg-green-50">
                      <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2">
                        {COURSEBUILDER_METRICS.aiToolCosts.label}
                        <div className="group relative">
                          <Info className="w-4 h-4 text-green-500 cursor-help" />
                          <div className="hidden group-hover:block absolute z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg -top-2 left-6">
                            {COURSEBUILDER_METRICS.aiToolCosts.tooltip}
                          </div>
                        </div>
                      </label>
                      <input
                        type="number"
                        value={courseBuilderInputs.aiToolCosts}
                        onChange={(e) => handleCourseBuilderInputChange('aiToolCosts', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:border-green-500 focus:outline-none"
                      />
                      <p className="text-xs text-green-700 mt-2">
                        {COURSEBUILDER_METRICS.aiToolCosts.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className={`mt-4 border-2 rounded-xl p-4 ${
                    courseBuilderResults.savings.toolSavings < 0 
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-700">Annual Tool Savings</p>
                      <p className={`text-2xl font-bold ${
                        courseBuilderResults.savings.toolSavings < 0 
                          ? 'text-orange-600' 
                          : 'text-green-600'
                      }`}>
                        {formatCurrency(courseBuilderResults.savings.toolSavings)}
                      </p>
                    </div>
                    {courseBuilderResults.savings.toolSavings < 0 && (
                      <p className="text-xs text-orange-700 mt-2">
                        ⚠️ AI tooling costs more than traditional tools. Consider if advanced features justify the cost.
                      </p>
                    )}
                  </div>
                </div>

                {/* Implementation Cost (Optional) */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Implementation Cost (Optional)</h3>
                  <div className="grid md:grid-cols-1 gap-6">
                    <div className="border-2 border-gray-100 rounded-xl p-4">
                      <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2">
                        {COURSEBUILDER_METRICS.implementationCost.label}
                        <div className="group relative">
                          <Info className="w-4 h-4 text-gray-400 cursor-help" />
                          <div className="hidden group-hover:block absolute z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg -top-2 left-6">
                            {COURSEBUILDER_METRICS.implementationCost.tooltip}
                          </div>
                        </div>
                      </label>
                      <input
                        type="number"
                        value={courseBuilderInputs.implementationCost}
                        onChange={(e) => handleCourseBuilderInputChange('implementationCost', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {COURSEBUILDER_METRICS.implementationCost.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Advanced Settings - AI Reduction Customization */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between p-4 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all mb-4"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-bold text-gray-800">Advanced Settings</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Optional</span>
                    </div>
                    {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  
                  {showAdvanced && (
                    <div className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">
                      <div className="mb-4">
                        <h4 className="text-md font-bold text-gray-800 mb-2">AI Reduction Percentages by Phase</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Customize how much time AI saves in each development phase. Defaults are based on industry benchmarks.
                        </p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <label className="block text-gray-700 font-medium mb-2">
                            Content Prep Reduction (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={aiReductions.contentPrep}
                            onChange={(e) => setAiReductions({...aiReductions, contentPrep: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">Default: 90%</p>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <label className="block text-gray-700 font-medium mb-2">
                            Storyboard Reduction (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={aiReductions.storyboard}
                            onChange={(e) => setAiReductions({...aiReductions, storyboard: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">Default: 75%</p>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <label className="block text-gray-700 font-medium mb-2">
                            Build Reduction (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={aiReductions.build}
                            onChange={(e) => setAiReductions({...aiReductions, build: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">Default: 75%</p>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <label className="block text-gray-700 font-medium mb-2">
                            QA Review Reduction (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={aiReductions.qaReview}
                            onChange={(e) => setAiReductions({...aiReductions, qaReview: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">Default: 50%</p>
                        </div>
                      </div>

                      <button
                        onClick={() => setAiReductions({contentPrep: 90, storyboard: 75, build: 75, qaReview: 50})}
                        className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-medium transition-all"
                      >
                        Reset to Defaults
                      </button>
                    </div>
                  )}
                </div>

                {/* AI-Powered Development Section */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-green-900 mb-4">AI-Powered Development</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    A basic SOP or compliance course (Level 1 eLearning) typically takes 25-40 hours of development per hour of learner seat time. 
                    AI can realistically save <strong>~75%</strong> of development hours for Level 1 content. SMEs still need to review text and quiz accuracy.
                  </p>
                  
                  <div className="space-y-3 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-1">Content prep (PDF/SOP parsing)</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              {formatHours(courseBuilderResults.traditional.phases.contentPrep)}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-sm font-medium text-green-600">
                              {formatHours(courseBuilderResults.ai.phases.contentPrep)}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-bold">
                          90%
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-1">Storyboard & design</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              {formatHours(courseBuilderResults.traditional.phases.storyboard)}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-sm font-medium text-green-600">
                              {formatHours(courseBuilderResults.ai.phases.storyboard)}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-bold">
                          75%
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-1">Build in tool</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              {formatHours(courseBuilderResults.traditional.phases.build)}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-sm font-medium text-green-600">
                              {formatHours(courseBuilderResults.ai.phases.build)}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-bold">
                          75%
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-1">QA & SME review</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              {formatHours(courseBuilderResults.traditional.phases.qaReview)}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-sm font-medium text-yellow-600">
                              {formatHours(courseBuilderResults.ai.phases.qaReview)}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 font-bold">
                          50%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-100 rounded-lg p-4 border-2 border-green-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700 font-semibold mb-1">Total AI Development Time</p>
                        <p className="text-xs text-green-600">~75% overall reduction</p>
                      </div>
                      <p className="text-3xl font-bold text-green-900">
                        {formatHours(courseBuilderResults.ai.devHours)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Side-by-Side Comparison */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Side-by-Side Comparison</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-4 px-4 font-bold text-gray-900">Metric</th>
                      <th className="text-center py-4 px-4 font-bold text-red-600">Traditional</th>
                      <th className="text-center py-4 px-4 font-bold text-green-600">AI-Powered</th>
                      <th className="text-center py-4 px-4 font-bold text-blue-600">Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-4 px-4 font-medium text-gray-700">Dev Hours per Course</td>
                      <td className="text-center py-4 px-4 text-red-600 font-bold">
                        {formatHours(courseBuilderResults.traditional.devHours)}
                      </td>
                      <td className="text-center py-4 px-4 text-green-600 font-bold">
                        {formatHours(courseBuilderResults.ai.devHours)}
                      </td>
                      <td className="text-center py-4 px-4 text-blue-600 font-bold">
                        {formatPercent(courseBuilderResults.savings.percentTimeSaved)}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-4 px-4 font-medium text-gray-700">
                        Cost per Course (@{formatCurrency(courseBuilderInputs.blendedRate)}/hr)
                      </td>
                      <td className="text-center py-4 px-4 text-red-600 font-bold">
                        {formatCurrency(courseBuilderResults.traditional.costPerCourse)}
                      </td>
                      <td className="text-center py-4 px-4 text-green-600 font-bold">
                        {formatCurrency(courseBuilderResults.ai.costPerCourse)}
                      </td>
                      <td className="text-center py-4 px-4 text-blue-600 font-bold">
                        {formatCurrency(courseBuilderResults.savings.costPerCourse)}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-4 px-4 font-medium text-gray-700">Annual Courses</td>
                      <td className="text-center py-4 px-4 font-bold text-gray-700">
                        {courseBuilderInputs.coursesPerYear}
                      </td>
                      <td className="text-center py-4 px-4 font-bold text-gray-700">
                        {courseBuilderInputs.coursesPerYear}
                      </td>
                      <td className="text-center py-4 px-4 text-gray-400">—</td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td className="py-4 px-4 font-bold text-gray-900">Annual Total Cost</td>
                      <td className="text-center py-4 px-4 text-red-600 font-bold text-lg">
                        {formatCurrency(courseBuilderResults.traditional.totalAnnualCost)}
                      </td>
                      <td className="text-center py-4 px-4 text-green-600 font-bold text-lg">
                        {formatCurrency(courseBuilderResults.ai.totalAnnualCost)}
                      </td>
                      <td className="text-center py-4 px-4 text-blue-600 font-bold text-lg">
                        {formatCurrency(courseBuilderResults.savings.annualCost)}
                      </td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="py-4 px-4 font-bold text-blue-900">Payback Period</td>
                      <td className="text-center py-4 px-4 text-gray-400">—</td>
                      <td className="text-center py-4 px-4 text-gray-400">—</td>
                      <td className="text-center py-4 px-4 text-blue-600 font-bold text-lg">
                        {displayPayback(courseBuilderResults.roi.paybackMonths)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white mb-8">
              <h2 className="text-2xl font-bold mb-6">Executive Summary</h2>
              
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Break-even point</p>
                  <p className="text-3xl font-bold">
                    {displayPayback(courseBuilderResults.roi.paybackMonths)}
                  </p>
                  <p className="text-xs opacity-80 mt-1">
                    {courseBuilderResults.roi.implementationCost > 0 
                      ? `($${(courseBuilderResults.roi.implementationCost/1000).toFixed(0)}K setup)` 
                      : 'no setup cost'}
                  </p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Annual savings</p>
                  <p className="text-3xl font-bold">{formatCurrency(courseBuilderResults.savings.annualCost)}</p>
                  <p className="text-xs opacity-80 mt-1">per year</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Payback ratio</p>
                  <p className="text-3xl font-bold">{formatPaybackRatio(courseBuilderResults.roi.paybackRatio)}x</p>
                  <p className="text-xs opacity-80 mt-1">return on investment</p>
                </div>
              </div>

              <div className="bg-white bg-opacity-20 rounded-xl p-6 backdrop-blur-sm">
                <p className="text-lg font-bold mb-4">
                  Based on an average {courseBuilderInputs.seatTimeMinutes}-minute SOP course, your team can reduce development time 
                  from {formatHours(courseBuilderResults.traditional.devHours)} to about {formatHours(courseBuilderResults.ai.devHours)} per course — 
                  a {formatPercent(courseBuilderResults.savings.percentTimeSaved)} efficiency gain.
                </p>
                
                <p className="text-base mb-4">
                  For a team producing {courseBuilderInputs.coursesPerYear} courses annually, this translates 
                  to <strong>{formatCurrency(courseBuilderResults.savings.annualCost)}+ in yearly savings</strong> and faster delivery of compliance updates.
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>
                      {displayPayback(courseBuilderResults.roi.paybackMonths) === 'Immediate' 
                        ? 'Immediate positive ROI (no implementation cost)' 
                        : `Break-even point: ${displayPayback(courseBuilderResults.roi.paybackMonths)} of production`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>Payback ratio: <strong>{formatPaybackRatio(courseBuilderResults.roi.paybackRatio)}x</strong> return</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>Free up {formatHours(courseBuilderResults.savings.annualHours)} annually for other initiatives</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <button className="px-8 py-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:shadow-xl transition-all flex items-center gap-2">
                <Download className="w-5 h-5" />
                Download Analysis
              </button>
              <button className="px-8 py-4 rounded-lg bg-white text-gray-700 font-bold hover:shadow-xl transition-all flex items-center gap-2 border-2 border-gray-200">
                <ArrowRight className="w-5 h-5" />
                Schedule Demo
              </button>
            </div>
          </>
        )}

        {/* ONBOARDING NAVIGATOR CALCULATOR */}
        {selectedApp === 'onboarding' && (
          <>
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-3">
                    Total Company Size (Employees)
                  </label>
                  <input
                    type="number"
                    value={companySize}
                    onChange={(e) => setCompanySize(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-3">
                    Annual New Hires
                  </label>
                  <input
                    type="number"
                    value={annualHires}
                    onChange={(e) => setAnnualHires(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Input Parameters */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Cost & Impact Parameters</h2>
                <div className="flex gap-3">
                  <button
                    onClick={resetOnboardingDefaults}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reset to Defaults
                  </button>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition-all flex items-center gap-2"
                  >
                    {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showDetails ? 'Hide' : 'Show'} Details
                  </button>
                </div>
              </div>

              {showDetails && (
                <div className="space-y-8">
                  {/* Time & Cost per Hire */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Time & Cost Investment per New Hire
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                      {['hrTimePerHire', 'managerTimePerHire', 'itTimePerHire'].map(key => (
                        <div key={key} className="border-2 border-gray-100 rounded-xl p-4">
                          <label className="block text-gray-700 font-medium mb-2">
                            {ONBOARDING_METRICS[key].label}
                          </label>
                          <input
                            type="number"
                            value={onboardingInputs[key]}
                            onChange={(e) => handleOnboardingInputChange(key, e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            {ONBOARDING_METRICS[key].description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hourly Rates */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Hourly Rates
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                      {['hrHourlyRate', 'managerHourlyRate', 'itHourlyRate'].map(key => (
                        <div key={key} className="border-2 border-gray-100 rounded-xl p-4">
                          <label className="block text-gray-700 font-medium mb-2">
                            {ONBOARDING_METRICS[key].label}
                          </label>
                          <input
                            type="number"
                            value={onboardingInputs[key]}
                            onChange={(e) => handleOnboardingInputChange(key, e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            {ONBOARDING_METRICS[key].description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Automation & Productivity */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                      Automation & Productivity Impact
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                      {['automationSavings', 'timeToProductivity', 'productivityImprovement', 'averageSalary'].map(key => (
                        <div key={key} className="border-2 border-gray-100 rounded-xl p-4">
                          <label className="block text-gray-700 font-medium mb-2">
                            {ONBOARDING_METRICS[key].label}
                          </label>
                          <input
                            type="number"
                            value={onboardingInputs[key]}
                            onChange={(e) => handleOnboardingInputChange(key, e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            {ONBOARDING_METRICS[key].description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Retention Section */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      Retention & Turnover Impact
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                      {['firstYearTurnover', 'turnoverReduction', 'replacementCost'].map(key => (
                        <div key={key} className="border-2 border-gray-100 rounded-xl p-4">
                          <label className="block text-gray-700 font-medium mb-2">
                            {ONBOARDING_METRICS[key].label}
                          </label>
                          <input
                            type="number"
                            value={onboardingInputs[key]}
                            onChange={(e) => handleOnboardingInputChange(key, e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            {ONBOARDING_METRICS[key].description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results Dashboard for Onboarding */}
            {onboardingResults && (
              <>
                {/* ROI Summary Cards */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <TrendingUp className="w-8 h-8" />
                      <span className="text-sm font-medium opacity-90">First Year</span>
                    </div>
                    <p className="text-4xl font-bold mb-1">{formatPercent(onboardingResults.roi.firstYearROI)}</p>
                    <p className="text-sm opacity-90">Return on Investment</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <Clock className="w-8 h-8" />
                      <span className="text-sm font-medium opacity-90">Payback</span>
                    </div>
                    <p className="text-4xl font-bold mb-1">
                      {isFinite(onboardingResults.roi.paybackMonths) 
                        ? onboardingResults.roi.paybackMonths.toFixed(1) 
                        : 'N/A'}
                    </p>
                    <p className="text-sm opacity-90">Months to Break Even</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <DollarSign className="w-8 h-8" />
                      <span className="text-sm font-medium opacity-90">3-Year</span>
                    </div>
                    <p className="text-4xl font-bold mb-1">{formatCurrency(onboardingResults.roi.threeYearBenefit)}</p>
                    <p className="text-sm opacity-90">Net Benefit</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <BarChart3 className="w-8 h-8" />
                      <span className="text-sm font-medium opacity-90">Annual</span>
                    </div>
                    <p className="text-4xl font-bold mb-1">{formatCurrency(onboardingResults.benefits.totalAnnualBenefit)}</p>
                    <p className="text-sm opacity-90">Total Benefit</p>
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Annual Benefits Breakdown</h2>
                  <div className="space-y-6">
                    
                    {/* Time Savings */}
                    <div className="border-2 border-blue-100 rounded-xl p-6 bg-blue-50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Clock className="w-6 h-6 text-blue-600" />
                          <h3 className="text-xl font-bold text-gray-900">Administrative Time Savings</h3>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">{formatCurrency(onboardingResults.benefits.annualTimeSavings)}</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-gray-600 mb-1">Time Saved per Hire</p>
                          <p className="text-lg font-bold text-gray-900">{formatCurrency(onboardingResults.benefits.timeSavingsPerHire)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-gray-600 mb-1">Total Annual Hires</p>
                          <p className="text-lg font-bold text-gray-900">{annualHires}</p>
                        </div>
                      </div>
                    </div>

                    {/* Productivity Gains */}
                    <div className="border-2 border-green-100 rounded-xl p-6 bg-green-50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-6 h-6 text-green-600" />
                          <h3 className="text-xl font-bold text-gray-900">Accelerated Productivity</h3>
                        </div>
                        <span className="text-2xl font-bold text-green-600">{formatCurrency(onboardingResults.benefits.annualProductivityGains)}</span>
                      </div>
                    </div>

                    {/* Retention Impact */}
                    <div className="border-2 border-purple-100 rounded-xl p-6 bg-purple-50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Users className="w-6 h-6 text-purple-600" />
                          <h3 className="text-xl font-bold text-gray-900">Improved Retention</h3>
                        </div>
                        <span className="text-2xl font-bold text-purple-600">{formatCurrency(onboardingResults.benefits.annualRetentionSavings)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-4">
                  <button className="px-8 py-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:shadow-xl transition-all flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Download Full Report
                  </button>
                  <button className="px-8 py-4 rounded-lg bg-white text-gray-700 font-bold hover:shadow-xl transition-all flex items-center gap-2 border-2 border-gray-200">
                    <ArrowRight className="w-5 h-5" />
                    Schedule Consultation
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Placeholder for other apps */}
        {!['coursebuilder', 'onboarding'].includes(selectedApp) && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calculator className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">ROI Calculator Coming Soon</h2>
              <p className="text-lg text-gray-600 mb-8">
                We're building a comprehensive ROI calculator for {APPS[selectedApp].name}. Check back soon!
              </p>
              <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                <h3 className="font-bold text-gray-900 mb-3">Want early access?</h3>
                <p className="text-gray-700 mb-4">Contact us to discuss how {APPS[selectedApp].name} can deliver value for your organization.</p>
                <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:shadow-lg transition-all">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>All calculations are estimates based on industry benchmarks and your inputs.</p>
          <p className="mt-1">Actual results may vary based on implementation and organizational factors.</p>
        </div>

      </div>
    </div>
  );
}