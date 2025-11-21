import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, TrendingUp, DollarSign, Users, Clock, CheckCircle, PieChart, BarChart3, ArrowRight, Download, RefreshCw, ChevronDown, ChevronUp, Layers, FileText, Zap, Info, Shield } from 'lucide-react';

// ============================================
// APP DEFINITIONS
// ============================================

type AppId = 'coursebuilder' | 'onboarding' | 'career' | 'learning' | 'compliance';

const APPS: Record<AppId, {
  id: AppId;
  name: string;
  description: string;
  color: string;
  icon: any;
  enabled: boolean;
}> = {
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
    enabled: true
  },
  learning: {
    id: 'learning',
    name: 'Learning Tech Navigator',
    description: 'Evaluate learning technology solutions',
    color: 'from-blue-500 to-purple-600',
    icon: Layers,
    enabled: true
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

// ============================================
// CAREER SKILLS NAVIGATOR ROI MODEL (SIMPLIFIED)
// ============================================

type CareerIndustry = 'tech' | 'healthcare' | 'retail' | 'manufacturing' | 'finance';

const CAREER_METRICS = {
  // Core inputs (always visible)
  employees: {
    label: 'How many employees are you upskilling?',
    default: 50,
    description: 'Enter the number participating in this skills program.'
  },
  averageSalary: {
    label: 'What is the average salary for these employees? ($)',
    default: 85000,
    description: 'Use your best estimate. We\'ll calculate fully-loaded cost automatically.'
  },

  // Advanced settings (prefilled by industry)
  turnoverRate: {
    label: 'Annual turnover rate (%)',
    default: 15,
    description: 'Prefilled from industry benchmarks. Adjust if needed.'
  },
  replacementCostMultiplier: {
    label: 'Cost to replace an employee (% of salary)',
    default: 120,
    description: 'Typical replacement cost as a percentage of salary.'
  },
  productivityDrag: {
    label: 'Productivity loss due to skills gaps (%)',
    default: 15,
    description: 'Estimated productivity drag from unfilled skills (10–22%).'
  },
  timeToSkillDays: {
    label: 'Time to close skills gaps today (days)',
    default: 360,
    description: 'Typical time to fully ramp skills today (240–540 days).'
  },
  annualPlatformCost: {
    label: 'Annual platform cost ($)',
    default: 45000,
    description: 'Annual subscription for your career and skills platform.'
  },
  internalHiringCostMultiplier: {
    label: 'Internal hiring cost (% of salary)',
    default: 70,
    description: 'Cost of internal promotion vs external hire (typically 50–80%).'
  },
  projectImprovementRate: {
    label: 'Project efficiency improvement (% of salary)',
    default: 12,
    description: 'Impact of skills clarity on project ramp-up and cycle time (10–15%).'
  }
};

const CAREER_INDUSTRY_PRESETS: Record<CareerIndustry, {
  turnoverRate: number;
  replacementCostMultiplier: number;
  productivityDrag: number;
  timeToSkillDays: number;
  internalHiringCostMultiplier: number;
  projectImprovementRate: number;
}> = {
  tech: {
    turnoverRate: 14,
    replacementCostMultiplier: 140,
    productivityDrag: 15,
    timeToSkillDays: 360,
    internalHiringCostMultiplier: 70,
    projectImprovementRate: 2
  },
  healthcare: {
    turnoverRate: 18,
    replacementCostMultiplier: 120,
    productivityDrag: 12,
    timeToSkillDays: 360,
    internalHiringCostMultiplier: 65,
    projectImprovementRate: 2
  },
  retail: {
    turnoverRate: 30,
    replacementCostMultiplier: 60,
    productivityDrag: 10,
    timeToSkillDays: 300,
    internalHiringCostMultiplier: 50,
    projectImprovementRate: 1.5
  },
  manufacturing: {
    turnoverRate: 18,
    replacementCostMultiplier: 110,
    productivityDrag: 14,
    timeToSkillDays: 360,
    internalHiringCostMultiplier: 65,
    projectImprovementRate: 2
  },
  finance: {
    turnoverRate: 11,
    replacementCostMultiplier: 130,
    productivityDrag: 13,
    timeToSkillDays: 360,
    internalHiringCostMultiplier: 70,
    projectImprovementRate: 2
  }
};

// ============================================
// COMPLIANCEQUERY PRO ROI MODEL
// ============================================

const COMPLIANCE_METRICS = {
  knowledgeWorkers: {
    label: 'Knowledge workers using ComplianceQuery Pro',
    default: 40,
    description: 'People who regularly look up SOPs / policies (QA, QC, PV, RA, etc.)'
  },
  queriesPerPersonPerWeek: {
    label: 'Compliance questions per person per week (typical range)',
    default: 12,
    description: 'We will map ranges like Rare / Medium / Frequent to realistic values'
  },
  manualMinutesPerQuery: {
    label: 'Current time to answer a question (minutes, typical range)',
    default: 15,
    description: 'We use conservative ranges for manual search time so you do not have to guess exact minutes'
  },
  cqMinutesPerQuery: {
    label: 'Time with ComplianceQuery Pro (minutes)',
    default: 4,
    description: 'Fixed assumption (3–5 minutes) including reading answer and checking sources'
  },
  blendedRate: {
    label: 'Average loaded hourly rate ($/hour)',
    default: 85,
    description: 'Average fully loaded cost of QA/QC/RA staff'
  },
  smeHourlyRate: {
    label: 'SME hourly rate ($/hour)',
    default: 120,
    description: 'Average fully loaded cost for QA/RA SMEs handling escalations'
  },
  percentEscalated: {
    label: '% of queries that require SME escalation',
    default: 25,
    description: 'Portion of questions that currently go to QA/RA SMEs for answers'
  },
  smeResponseHours: {
    label: 'Average SME response time (hours)',
    default: 4,
    description: 'Average time someone waits for an SME response today'
  },
  percentDoubleCheck: {
    label: '% of answers that require double-checking today',
    default: 40,
    description: 'Portion of answers where users re-open SOPs or ask others to confirm'
  },
  percentDuplicates: {
    label: '% of queries that are duplicates',
    default: 20,
    description: 'Repeated questions because people cannot see each other’s prior lookups'
  },
  incidentsPerYear: {
    label: 'Compliance incidents per year (linked to documentation errors)',
    default: 3,
    description: 'Deviations, CAPAs, or near-misses where wrong / outdated SOP info played a role'
  },
  avgIncidentCost: {
    label: 'Average cost per incident ($)',
    default: 40000,
    description: 'Investigation, rework, batch impact, external consultants'
  },
  percentIncidentWrongSOP: {
    label: '% of documentation incidents caused by wrong / outdated SOP info',
    default: 40,
    description: 'Share of documentation-related incidents driven by wrong or outdated versions (conservative)'
  },
  incidentReduction: {
    label: 'Incident reduction with better answers (%)',
    default: 30,
    description: 'Conservative estimate of avoided incidents due to faster, sourced answers'
  },
  annualLicense: {
    label: 'Annual ComplianceQuery Pro license ($)',
    default: 60000,
    description: 'Platform subscription for your organisation'
  },
  implementationCost: {
    label: 'One-time implementation / validation cost ($)',
    default: 25000,
    description: 'Setup, validation, training, and change management'
  },
  monthlyAuditHours: {
    label: 'Hours per month preparing audit evidence',
    default: 15,
    description: 'Time spent collecting evidence, screenshots, and SOP references for audits'
  },
  auditReduction: {
    label: 'Audit prep time reduction with AI (%)',
    default: 40,
    description: 'Reduction due to answers including sources, versions, and citations'
  },
  wrongVersionRate: {
    label: '% of times a wrong SOP version is accessed today',
    default: 8,
    description: 'Used to illustrate version-control risk and confidence uplift'
  }
};

export default function UnifiedROICalculator() {
  const navigate = useNavigate();
  const [selectedApp, setSelectedApp] = useState<AppId>('coursebuilder');
  const [companySize, setCompanySize] = useState(500);
  const [annualHires, setAnnualHires] = useState(100);
  
  type TeamSizePreset = '5-10' | '11-25' | '26-50';
  type QueryFreqPreset = 'low' | 'medium' | 'high';
  type AnswerSpeedPreset = 'fast' | 'medium' | 'slow';
  type AuditBurdenPreset = 'light' | 'medium' | 'heavy';

  const [courseBuilderInputs, setCourseBuilderInputs] = useState(
    Object.fromEntries(
      Object.entries(COURSEBUILDER_METRICS).map(([key, config]) => [key, (config as any).default])
    ) as Record<keyof typeof COURSEBUILDER_METRICS, number>
  );
  
  // Preset selections for ComplianceQuery Pro (ultra-simple inputs)
  const [teamSizePreset, setTeamSizePreset] = useState<TeamSizePreset>('26-50');
  const [queryFreqPreset, setQueryFreqPreset] = useState<QueryFreqPreset>('medium');
  const [answerSpeedPreset, setAnswerSpeedPreset] = useState<AnswerSpeedPreset>('medium');
  const [auditBurdenPreset, setAuditBurdenPreset] = useState<AuditBurdenPreset>('medium');
  
  const [onboardingInputs, setOnboardingInputs] = useState(
    Object.fromEntries(
      Object.entries(ONBOARDING_METRICS).map(([key, config]) => [key, (config as any).default])
    ) as Record<keyof typeof ONBOARDING_METRICS, number>
  );

  const [careerInputs, setCareerInputs] = useState(
    Object.fromEntries(
      Object.entries(CAREER_METRICS).map(([key, config]) => [key, (config as any).default])
    ) as Record<keyof typeof CAREER_METRICS, number>
  );

  const [complianceInputs, setComplianceInputs] = useState(
    Object.fromEntries(
      Object.entries(COMPLIANCE_METRICS).map(([key, config]) => [key, (config as any).default])
    ) as Record<keyof typeof COMPLIANCE_METRICS, number>
  );
  
  const [showDetails, setShowDetails] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCareerMethodology, setShowCareerMethodology] = useState(false);
  const [showComplianceMethodology, setShowComplianceMethodology] = useState(false);
  const [showCourseBuilderMethodology, setShowCourseBuilderMethodology] = useState(false);
  const [showOnboardingMethodology, setShowOnboardingMethodology] = useState(false);

  const [careerIndustry, setCareerIndustry] = useState<CareerIndustry>('tech');

  // Optional add-ons for Career ROI (default OFF for conservatism)
  const [includeCareerMobility, setIncludeCareerMobility] = useState(false);
  const [includeCareerProjects, setIncludeCareerProjects] = useState(false);

  const applyCareerIndustryPresets = (industry: CareerIndustry) => {
    const presets = CAREER_INDUSTRY_PRESETS[industry];
    setCareerIndustry(industry);
    setCareerInputs(prev => ({
      ...prev,
      turnoverRate: presets.turnoverRate,
      replacementCostMultiplier: presets.replacementCostMultiplier,
      productivityDrag: presets.productivityDrag,
      timeToSkillDays: presets.timeToSkillDays,
      internalHiringCostMultiplier: presets.internalHiringCostMultiplier,
      projectImprovementRate: presets.projectImprovementRate
    }));
  };
  
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

  // ============================================
  // CAREER SKILLS NAVIGATOR CALCULATIONS (SIMPLIFIED)
  // ============================================

  const calculateCareerROI = () => {
    const employees = careerInputs.employees || 0;
    const baseSalary = careerInputs.averageSalary || 0;
    const fullyLoaded = baseSalary * 1.3;

    const turnoverRate = (careerInputs.turnoverRate || 0) / 100;
    const replacementCostMultiplier = (careerInputs.replacementCostMultiplier || 0) / 100;
    const productivityDrag = (careerInputs.productivityDrag || 0) / 100;
    const timeToSkillDays = careerInputs.timeToSkillDays || 0;
    const annualPlatformCost = careerInputs.annualPlatformCost || 0;
    const internalHiringCostMultiplier = (careerInputs.internalHiringCostMultiplier || 0) / 100;
    const projectImprovementRate = (careerInputs.projectImprovementRate || 0) / 100;

    if (employees <= 0 || baseSalary <= 0) return null;

    const replacementCost = fullyLoaded * replacementCostMultiplier;
    const internalHiringCost = fullyLoaded * internalHiringCostMultiplier;

    // A. Productivity Gains
    const daysReduced = timeToSkillDays * 0.5; // assume 50% faster time-to-skill
    const productivityGains =
      employees * fullyLoaded * productivityDrag * (daysReduced / 365);

    // B. Turnover Savings
    const turnoverReductionRate = 0.07; // mid of 5–12%
    const reductionInLeavers = employees * turnoverRate * turnoverReductionRate;
    const turnoverSavings = reductionInLeavers * replacementCost;

    // C. Internal Mobility Savings (optional, capped)
    const internalPromotionRate = 0.08; // conservative share of internal mobility
    const externalHiringCost = replacementCost;
    let internalMobilitySavings = 0;
    if (includeCareerMobility) {
      const rawMobility =
        employees * internalPromotionRate * (externalHiringCost - internalHiringCost);
      const maxMobilityPerEmployee = 2000; // cap $1,000–$2,000 per employee
      internalMobilitySavings = Math.min(rawMobility, employees * maxMobilityPerEmployee);
    }

    // D. Project Efficiency Gains (optional, capped, base-salary based)
    let projectEfficiencyGains = 0;
    if (includeCareerProjects) {
      const rawProject = employees * baseSalary * projectImprovementRate;
      const maxProjectRate = 0.03; // cap at 3% of salary
      const cappedRate = Math.min(projectImprovementRate, maxProjectRate);
      projectEfficiencyGains = employees * baseSalary * cappedRate;
      // ensure we don't exceed the rawProject (in case presets are very small)
      projectEfficiencyGains = Math.min(projectEfficiencyGains, rawProject);
    }

    const totalAnnualBenefit =
      productivityGains + turnoverSavings + internalMobilitySavings + projectEfficiencyGains;

    const totalCost = annualPlatformCost;

    if (totalAnnualBenefit <= 0 || totalCost <= 0) {
      return {
        components: {
          productivityGains,
          turnoverSavings,
          internalMobilitySavings,
          projectEfficiencyGains
        },
        costs: { totalCost },
        roi: {
          totalAnnualBenefit,
          firstYearROI: 0,
          paybackMonths: Infinity
        }
      };
    }

    const firstYearROI = ((totalAnnualBenefit - totalCost) / totalCost) * 100;
    const paybackMonths = (totalCost / totalAnnualBenefit) * 12;

    return {
      components: {
        productivityGains,
        turnoverSavings,
        internalMobilitySavings,
        projectEfficiencyGains
      },
      costs: { totalCost },
      roi: {
        totalAnnualBenefit,
        firstYearROI,
        paybackMonths
      }
    };
  };

  // ============================================
  // COMPLIANCEQUERY PRO CALCULATIONS
  // ============================================

  const calculateComplianceROI = () => {
    const teamSizeMap: Record<TeamSizePreset, number> = {
      '5-10': 8,
      '11-25': 18,
      '26-50': 35
    };

    const queryFreqMap: Record<QueryFreqPreset, number> = {
      low: 5,
      medium: 10,
      high: 15
    };

    const auditBurdenMap: Record<AuditBurdenPreset, number> = {
      light: 1,
      medium: 5,
      heavy: 10
    };

    const people = teamSizeMap[teamSizePreset];
    const queriesPerWeek = queryFreqMap[queryFreqPreset];
    const manualMinutes = 15; // fixed manual answer time
    const cqMinutes = 4; // fixed AI answer time (3–5 minutes)
    const rate = complianceInputs.blendedRate || 85;

    if (people <= 0 || queriesPerWeek <= 0 || manualMinutes <= 0 || cqMinutes <= 0 || rate <= 0) {
      return null;
    }

    // Annual query volume
    const annualQueries = people * queriesPerWeek * 52;

    // A. Productivity savings
    const minutesSavedPerQuery = manualMinutes - cqMinutes; // 11 minutes
    const productivityHoursSaved = (annualQueries * minutesSavedPerQuery) / 60;
    const productivitySavings = productivityHoursSaved * rate;

    // B. SME escalation reduction (fixed conservative assumptions)
    const smeEscalationRate = 0.20; // 20% of questions go to SMEs
    const smeMinutesSavedPerQuery = 5; // 5 minutes of SME time saved per question
    const smeHourlyRate = 120; // assumed SME rate
    const smeHoursSaved = (annualQueries * smeEscalationRate * smeMinutesSavedPerQuery) / 60;
    const smeSavings = smeHoursSaved * smeHourlyRate;

    // C. Audit prep savings
    const monthlyAuditHours = auditBurdenMap[auditBurdenPreset];
    const auditReduction = 0.40; // AI eliminates 40% of audit prep time
    const annualAuditHours = monthlyAuditHours * 12;
    const auditHoursSaved = annualAuditHours * auditReduction;
    const auditSavings = auditHoursSaved * rate;

    // Fixed compliance assurance value
    const complianceAssuranceValue = 1200; // small, conservative, fixed

    const annualLicense = complianceInputs.annualLicense;
    const implementationCost = complianceInputs.implementationCost;
    const firstYearCost = annualLicense + implementationCost;
    const ongoingAnnualCost = annualLicense;

    const totalAnnualBenefit = productivitySavings + smeSavings + auditSavings + complianceAssuranceValue;
    const netFirstYearBenefit = totalAnnualBenefit - firstYearCost;
    const netOngoingBenefit = totalAnnualBenefit - ongoingAnnualCost;

    const paybackMonths = totalAnnualBenefit > 0 ? firstYearCost / (totalAnnualBenefit / 12) : Infinity;
    const firstYearROI = firstYearCost > 0 ? ((totalAnnualBenefit - firstYearCost) / firstYearCost) * 100 : Infinity;
    const threeYearBenefit = (totalAnnualBenefit * 3) - firstYearCost - (ongoingAnnualCost * 2);
    const threeYearROI = firstYearCost + ongoingAnnualCost * 2 > 0
      ? (threeYearBenefit / (firstYearCost + ongoingAnnualCost * 2)) * 100
      : Infinity;

    return {
      usage: {
        annualQueries,
        productivityHoursSaved,
        productivitySavings
      },
      benefits: {
        smeHoursSaved,
        smeSavings,
        auditHoursSaved,
        auditSavings,
        complianceAssuranceValue
      },
      costs: {
        annualLicense,
        implementationCost,
        firstYearCost,
        ongoingAnnualCost
      },
      roi: {
        totalAnnualBenefit,
        netFirstYearBenefit,
        netOngoingBenefit,
        paybackMonths,
        firstYearROI,
        threeYearBenefit,
        threeYearROI
      }
    };
  };

  const courseBuilderResults = selectedApp === 'coursebuilder' ? calculateCourseBuilderROI() : null;
  const onboardingResults = selectedApp === 'onboarding' ? calculateOnboardingROI() : null;
  const careerResults = selectedApp === 'career' ? calculateCareerROI() : null;
  const complianceResults = selectedApp === 'compliance' ? calculateComplianceROI() : null;

  const COMPLIANCE_COST_KEYS: (keyof typeof COMPLIANCE_METRICS)[] = [
    'annualLicense',
    'implementationCost'
  ];

  const ONBOARDING_TIME_KEYS: (keyof typeof ONBOARDING_METRICS)[] = [
    'hrTimePerHire',
    'managerTimePerHire',
    'itTimePerHire'
  ];

  const ONBOARDING_RATE_KEYS: (keyof typeof ONBOARDING_METRICS)[] = [
    'hrHourlyRate',
    'managerHourlyRate',
    'itHourlyRate'
  ];

  const ONBOARDING_IMPACT_KEYS: (keyof typeof ONBOARDING_METRICS)[] = [
    'automationSavings',
    'timeToProductivity',
    'productivityImprovement',
    'averageSalary'
  ];

  const ONBOARDING_RETENTION_KEYS: (keyof typeof ONBOARDING_METRICS)[] = [
    'firstYearTurnover',
    'turnoverReduction',
    'replacementCost'
  ];

  const handleCourseBuilderInputChange = (key: keyof typeof COURSEBUILDER_METRICS, value: string) => {
    setCourseBuilderInputs(prev => ({
      ...prev,
      [key]: value === '' ? '' : parseFloat(value) || 0
    }));
  };

  const handleComplianceInputChange = (key: keyof typeof COMPLIANCE_METRICS, value: string) => {
    setComplianceInputs(prev => ({
      ...prev,
      [key]: value === '' ? '' : parseFloat(value) || 0
    }));
  };

  const handleOnboardingInputChange = (key: keyof typeof ONBOARDING_METRICS, value: string) => {
    setOnboardingInputs(prev => ({
      ...prev,
      [key]: value === '' ? '' : parseFloat(value) || 0
    }));
  };

  const resetCourseBuilderDefaults = () => {
    setCourseBuilderInputs(
      Object.fromEntries(
        Object.entries(COURSEBUILDER_METRICS).map(([key, config]) => [key, (config as any).default])
      ) as Record<keyof typeof COURSEBUILDER_METRICS, number>
    );
  };

  const resetOnboardingDefaults = () => {
    setOnboardingInputs(
      Object.fromEntries(
        Object.entries(ONBOARDING_METRICS).map(([key, config]) => [key, (config as any).default])
      ) as Record<keyof typeof ONBOARDING_METRICS, number>
    );
  };

  const resetComplianceDefaults = () => {
    setComplianceInputs(
      Object.fromEntries(
        Object.entries(COMPLIANCE_METRICS).map(([key, config]) => [key, (config as any).default])
      ) as Record<keyof typeof COMPLIANCE_METRICS, number>
    );

    // Reset presets to align with defaults
    setTeamSizePreset('26-50');
    setQueryFreqPreset('medium');
    setAnswerSpeedPreset('medium');
    setAuditBurdenPreset('medium');
  };

  const formatCurrency = (amount: number) => {
    if (!isFinite(amount)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    if (!isFinite(hours)) return 'N/A';
    // Use 0 decimals for large numbers (>100), 1 decimal for smaller
    const decimals = hours > 100 ? 0 : 1;
    return `${hours.toFixed(decimals)} hrs`;
  };

  const formatPercent = (value: number) => {
    if (!isFinite(value)) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  const displayPayback = (months: number) => {
    if (!isFinite(months)) return 'N/A';
    if (months === 0) return 'Immediate';
    if (months < 1) return '< 1';
    if (months > 36) return '> 36';
    return `${Math.round(months)} mo`;
  };

  const formatPaybackRatio = (ratio: number) => {
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
                  onClick={() => {
                    if (!app.enabled) return;
                    if (app.id === 'learning') {
                      navigate('/apps/learning-tech-assessment');
                    } else {
                      setSelectedApp(app.id);
                    }
                  }}
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

            {/* Methodology & Sources */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Methodology & Sources</h2>
                <button
                  onClick={() => setShowCourseBuilderMethodology(!showCourseBuilderMethodology)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  {showCourseBuilderMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showCourseBuilderMethodology ? 'Hide details' : 'Show details'}
                </button>
              </div>

              {showCourseBuilderMethodology && (
                <div className="space-y-4 text-sm text-gray-700 max-h-96 overflow-y-auto pr-2">
                  <div>
                    <h3 className="font-semibold mb-1">Summary</h3>
                    <p>
                      ROI estimates are modelled from industry development-time benchmarks and your inputs, producing conservative → optimistic ranges
                      rather than single-point claims.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">Methodology — how the calculator works</h3>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Convert seat time into seat-hours (course runtime in minutes ÷ 60).</li>
                      <li>Estimate traditional development hours as seat-hours × development ratio (hours per seat-hour).</li>
                      <li>Development ratio defaults follow industry benchmarks by level/complexity (see Chapman Alliance and related sources).</li>
                      <li>Calculate traditional per-course labor cost as traditional development hours × blended hourly rate (ID + SME blended).</li>
                      <li>Allocate tooling costs per course as annual tool subscription ÷ courses per year.</li>
                      <li>
                        Compute AI-assisted labor as a range by applying time-savings presets (low / medium / high complexity) to traditional hours
                        for conservative → optimistic scenarios.
                      </li>
                      <li>
                        AI per-course total (range) = AI labor range + AI tool cost share + amortized implementation cost per course.
                      </li>
                      <li>
                        Savings range = Traditional total − AI total (for both conservative and optimistic ends of the range). Annual savings are
                        per-course values × courses per year.
                      </li>
                      <li>
                        Outputs include per-course and annual ranges, percent time-saved, and a clear disclaimer that results are estimates, not guarantees.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">Key assumptions & definitions</h3>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>
                        <span className="font-medium">Development ratio (hours per seat-hour):</span> based on industry ranges, not a single value.
                        Chapman Alliance and related studies show wide variation by level and complexity (e.g. ~49–79 hours up to 184+ hours for
                        interactive content). Higher ratios are recommended for interactive, media-heavy, or regulation-heavy courses.
                      </li>
                      <li>
                        <span className="font-medium">Blended rate:</span> combined instructional design + SME hourly cost, set by you to match
                        local labor markets.
                      </li>
                      <li>
                        <span className="font-medium">Tooling & implementation:</span> annual subscriptions and one-time implementation costs are
                        explicitly modeled and amortized across a configurable number of years.
                      </li>
                      <li>
                        <span className="font-medium">Complexity presets (time-savings):</span> time-savings are modeled as ranges (e.g. Low ~30–40%,
                        Medium ~40–55%, High ~50–65%) to reflect uncertainty in content quality, SME availability, and review cycles.
                      </li>
                      <li>
                        <span className="font-medium">Human-in-the-loop requirement:</span> AI outputs are treated as draft artifacts that require SME/ID
                        review before deployment — the model does not assume zero QA or sign-off time.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">Formula (compact)</h3>
                    <p className="mb-1">traditional_hours = seat_hours × development_ratio</p>
                    <p className="mb-1">
                      traditional_cost_per_course = (traditional_hours × blended_rate) + (traditional_tooling ÷ courses_per_year)
                    </p>
                    <p className="mb-1">
                      ai_hours_range = traditional_hours × (1 − [timeSavingsMax, timeSavingsMin])
                    </p>
                    <p className="mb-1">
                      ai_cost_range = (ai_hours_range × blended_rate) + (ai_tooling ÷ courses_per_year) + implementation_amortized_per_course
                    </p>
                    <p className="mb-1">savings_range = traditional_cost_per_course − ai_cost_range</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">Validation & recommended use</h3>
                    <p>
                      Use the calculator as a planning tool and run a short pilot on 1–3 representative modules to validate assumptions before
                      extrapolating enterprise savings. Recalculate if your development ratio, blended rates, review cycles (e.g., regulatory approval),
                      or number of courses per year change.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">Primary sources & further reading</h3>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>
                        <span className="font-medium">Chapman Alliance:</span> industry study on eLearning development hours by level and complexity.
                        These benchmarks are the primary basis for development ratio ranges.
                      </li>
                      <li>
                        <span className="font-medium">ATD (Association for Talent Development):</span> research and discussions on development time and
                        instructional design benchmarks, used to triangulate Chapman findings and justify using ranges.
                      </li>
                      <li>
                        <span className="font-medium">Industry guides and calculators (eLearning Industry, eLearningArt, etc.):</span> used to validate
                        tooling-share and per-course cost logic.
                      </li>
                    </ul>
                  </div>
                </div>
              )}
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

        {/* CAREER SKILLS NAVIGATOR CALCULATOR */}
        {selectedApp === 'career' && careerResults && (
          <>
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <Clock className="w-8 h-8" />
                  <span className="text-sm font-medium opacity-90">Total Benefit</span>
                </div>
                <p className="text-3xl font-bold mb-1">{formatCurrency(careerResults.roi.totalAnnualBenefit)}</p>
                <p className="text-sm opacity-90">Annual financial impact</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-8 h-8" />
                  <span className="text-sm font-medium opacity-90">First-Year ROI</span>
                </div>
                <p className="text-3xl font-bold mb-1">{formatPercent(careerResults.roi.firstYearROI)}</p>
                <p className="text-sm opacity-90">(Total benefit – cost) / cost</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <Zap className="w-8 h-8" />
                  <span className="text-sm font-medium opacity-90">Payback Period</span>
                </div>
                <p className="text-3xl font-bold mb-1">{displayPayback(careerResults.roi.paybackMonths)}</p>
                <p className="text-sm opacity-90">Months to break even</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <Users className="w-8 h-8" />
                  <span className="text-sm font-medium opacity-90">Employees</span>
                </div>
                <p className="text-3xl font-bold mb-1">{careerInputs.employees}</p>
                <p className="text-sm opacity-90">In upskilling program</p>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-xl p-8 text-white mb-8">
              <h2 className="text-2xl font-bold mb-4">Executive Summary</h2>
              <p className="mb-4 text-sm opacity-90">
                Your investment in upskilling generates measurable value by:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm opacity-95 mb-4">
                <li>Reducing lost productivity from skill gaps</li>
                <li>Decreasing turnover and replacement costs</li>
                <li>Increasing internal mobility (fewer external hires)</li>
                <li>Reducing project delays and ramp-up time</li>
              </ul>
              <p className="text-xs opacity-80">
                All benefits use conservative, research-backed assumptions from SHRM, McKinsey, Korn Ferry, PMI, and LinkedIn.
              </p>
            </div>

            {/* Core Inputs */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Inputs</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Employees */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    How many employees are you upskilling?
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Enter the number participating in this skills program.
                  </p>
                  <input
                    type="number"
                    value={careerInputs.employees}
                    onChange={(e) => setCareerInputs(prev => ({ ...prev, employees: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* Salary */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    What is the average salary for these employees?
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Use your best estimate. We\'ll calculate fully-loaded cost automatically.
                  </p>
                  <input
                    type="number"
                    value={careerInputs.averageSalary}
                    onChange={(e) => setCareerInputs(prev => ({ ...prev, averageSalary: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Select your industry
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    This helps us apply accurate benchmarks for turnover, productivity, and upskilling speed.
                  </p>
                  <select
                    value={careerIndustry}
                    onChange={(e) => applyCareerIndustryPresets(e.target.value as CareerIndustry)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="tech">Technology</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="retail">Retail</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="finance">Finance</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Advanced Settings (Optional)</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    These are pre-filled with industry benchmarks. Adjust if you want.
                  </p>
                </div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showAdvanced ? 'Hide' : 'Show'}
                </button>
              </div>

              {showAdvanced && (
                <div className="mt-4 space-y-6">
                  {/* Optional add-on toggles */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <label className="inline-flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeCareerMobility}
                        onChange={(e) => setIncludeCareerMobility(e.target.checked)}
                        className="mt-1 h-4 w-4 text-orange-600 border-gray-300 rounded"
                      />
                      <span>
                        <span className="font-semibold">Include Internal Mobility Savings</span>
                        <span className="block text-xs text-gray-500">Optional, capped at ~$2,000 per employee per year.</span>
                      </span>
                    </label>

                    <label className="inline-flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeCareerProjects}
                        onChange={(e) => setIncludeCareerProjects(e.target.checked)}
                        className="mt-1 h-4 w-4 text-orange-600 border-gray-300 rounded"
                      />
                      <span>
                        <span className="font-semibold">Include Project Efficiency Gains</span>
                        <span className="block text-xs text-gray-500">Optional, capped at ~1–3% of salary impact per employee.</span>
                      </span>
                    </label>
                  </div>

                  {/* Benchmark-based advanced inputs */}
                  <div className="grid md:grid-cols-3 gap-6">
                    {(['turnoverRate', 'replacementCostMultiplier', 'productivityDrag', 'timeToSkillDays', 'annualPlatformCost', 'internalHiringCostMultiplier', 'projectImprovementRate'] as (keyof typeof CAREER_METRICS)[]).map((key) => {
                      const config = CAREER_METRICS[key];
                      return (
                        <div key={key} className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            {config.label}
                            <div className="group relative inline-block ml-1">
                              <Info className="w-4 h-4 text-gray-400 cursor-help" />
                              <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
                                {config.description}
                              </div>
                            </div>
                          </label>
                          <input
                            type="number"
                            value={careerInputs[key as keyof typeof careerInputs]}
                            onChange={(e) => setCareerInputs(prev => ({
                              ...prev,
                              [key]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ROI Breakdown */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">ROI Breakdown</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Annual Benefits</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="font-medium text-gray-700">Productivity Gains</span>
                      <span className="font-bold text-green-600">{formatCurrency(careerResults.components.productivityGains)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium text-gray-700">Turnover Savings</span>
                      <span className="font-bold text-blue-600">{formatCurrency(careerResults.components.turnoverSavings)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="font-medium text-gray-700">Internal Mobility Savings</span>
                      <span className="font-bold text-purple-600">{formatCurrency(careerResults.components.internalMobilitySavings)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <span className="font-medium text-gray-700">Project Efficiency Gains</span>
                      <span className="font-bold text-orange-600">{formatCurrency(careerResults.components.projectEfficiencyGains)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg border-2 border-gray-300">
                      <span className="font-bold text-gray-900">Total Annual Benefit</span>
                      <span className="font-bold text-gray-900 text-lg">{formatCurrency(careerResults.roi.totalAnnualBenefit)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Investment & ROI</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="font-medium text-gray-700">Total Annual Cost</span>
                      <span className="font-bold text-red-600">{formatCurrency(careerResults.costs.totalCost)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="font-medium text-gray-700">First-Year ROI</span>
                      <span className="font-bold text-green-600">{formatPercent(careerResults.roi.firstYearROI)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="font-medium text-gray-700">Payback Period</span>
                      <span className="font-bold text-purple-600">{displayPayback(careerResults.roi.paybackMonths)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Methodology & Sources */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Methodology & Sources</h2>
                <button
                  onClick={() => setShowCareerMethodology(!showCareerMethodology)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  {showCareerMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showCareerMethodology ? 'Hide details' : 'Show details'}
                </button>
              </div>

              {showCareerMethodology && (
                <div className="space-y-4 text-sm text-gray-700 max-h-96 overflow-y-auto pr-2">
                  <div>
                    <h3 className="font-semibold mb-1">Overview</h3>
                    <p className="mb-1">
                      This ROI model estimates the measurable financial impact of accelerated upskilling by focusing on four outcomes that have strong, research-backed evidence:
                    </p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Reduced productivity loss from skills gaps</li>
                      <li>Decreased turnover and replacement costs</li>
                      <li>Improved internal mobility (optional)</li>
                      <li>Reduced project delays and ramp-up time (optional)</li>
                    </ul>
                    <p className="mt-1">
                      These outcomes are widely recognized by leading workforce research organizations and are incorporated using conservative, benchmark-based assumptions.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">1. Productivity Gains</h3>
                    <p className="mb-1 font-medium">What we measure</p>
                    <p className="mb-1">The value of recovering lost productivity caused by employees lacking required skills.</p>
                    <p className="mb-1 font-medium">How we calculate it</p>
                    <p className="mb-1">
                      Productivity Gains = (Employees × Avg. Salary × Productivity drag %) × (Days of skill gap reduced ÷ 365)
                    </p>
                    <p className="mb-1 font-medium">Benchmarks & sources</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Skills gaps reduce productivity by 10–22% (McKinsey Global Workforce Survey 2021, BCG Talent Productivity Report 2022, Gallup State of the Workplace 2022).</li>
                      <li>Structured skills-development programs reduce time-to-skill by 40–60% (Korn Ferry Future of Work Study 2023, Deloitte Skills-Based Organization Report 2024, WEF Future of Jobs 2023).</li>
                    </ul>
                    <p className="mt-1">
                      The calculator uses conservative values (10–15% productivity drag) unless you adjust them in Advanced Settings.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">2. Turnover Savings</h3>
                    <p className="mb-1 font-medium">What we measure</p>
                    <p className="mb-1">The financial value of reducing voluntary turnover through improved development pathways.</p>
                    <p className="mb-1 font-medium">How we calculate it</p>
                    <p className="mb-1">Turnover Savings = Reduction in turnover × Replacement cost.</p>
                    <p className="mb-1 font-medium">Benchmarks & sources</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Upskilling and internal mobility reduce turnover by 5–12% (LinkedIn Workplace Learning Report 2023, Gallup Employee Retention Study 2022).</li>
                      <li>Replacement cost ranges from 50–150% of salary depending on role (SHRM Human Capital Benchmarking Report 2022).</li>
                    </ul>
                    <p className="mt-1">
                      The model applies lower-bound reductions to avoid overstating impact.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">3. Internal Mobility Savings (optional)</h3>
                    <p className="mb-1 font-medium">What we measure</p>
                    <p className="mb-1">Savings from filling roles internally rather than through external hires.</p>
                    <p className="mb-1 font-medium">How we calculate it</p>
                    <p className="mb-1">Internal Mobility Savings = Internal promotions × Avoided hiring cost.</p>
                    <p className="mb-1 font-medium">Benchmarks & sources</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Internal hires are 20–50% cheaper than external hires (LinkedIn Talent Solutions Internal Mobility Insights 2023).</li>
                      <li>Organizations with strong internal mobility retain employees 2× longer (LinkedIn Workforce Learning Report 2023).</li>
                    </ul>
                    <p className="mt-1">
                      This category is set to $0 by default and capped per employee to keep the ROI conservative and avoid double-counting.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">4. Project Efficiency Gains (optional)</h3>
                    <p className="mb-1 font-medium">What we measure</p>
                    <p className="mb-1">The value of reducing project delays, rework, and long ramp-up times caused by skills mismatches.</p>
                    <p className="mb-1 font-medium">How we calculate it</p>
                    <p className="mb-1">Project Efficiency Gains = Employees × Salary × % improvement in cycle time.</p>
                    <p className="mb-1 font-medium">Benchmarks & sources</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Clear skill visibility reduces project delays by 10–15% (PMI Pulse of the Profession 2023).</li>
                      <li>Skill-aligned work allocation reduces ramp-up time by 10–20% (Deloitte Human Capital Trends 2023).</li>
                    </ul>
                    <p className="mt-1">
                      This category is excluded by default and capped as a small percentage of salary to maintain conservative output.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">5. Cost Inputs</h3>
                    <p className="mb-1">We include platform license, and optionally implementation and HR/L&D admin time, as transparent annual costs that are subtracted from total benefit.</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">6. ROI, Benefit, and Payback</h3>
                    <p className="mb-1">ROI = (Total annual benefit – Total annual cost) ÷ Total annual cost.</p>
                    <p className="mb-1">Payback period = (Total annual cost ÷ Total annual benefit) × 12 months.</p>
                    <p className="mb-1">Total benefit is the sum of Productivity Gains + Turnover Savings + optional Internal Mobility Savings + optional Project Efficiency Gains.</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">7. Conservative modeling approach</h3>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>All assumptions use lower-bound industry benchmarks.</li>
                      <li>No double-counting of benefits.</li>
                      <li>Mobility and project efficiency are off by default.</li>
                      <li>Assumptions are transparent and editable.</li>
                      <li>Productivity impacts are limited to a realistic range (10–15%).</li>
                      <li>Time-to-skill improvements follow validated research ranges (40–60%).</li>
                      <li>Only benefits that are directly measurable are quantified.</li>
                      <li>The model avoids inflated claims like “107% retention improvement” or “50% capacity increase.”</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">8. Data sources (full list)</h3>
                    <p className="mb-1 font-medium">Productivity & skills gaps</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5 mb-1">
                      <li>McKinsey Global Workforce Survey (2021)</li>
                      <li>BCG Talent Productivity Report (2022)</li>
                      <li>WEF Future of Jobs Report (2023)</li>
                    </ul>
                    <p className="mb-1 font-medium">Turnover & retention</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5 mb-1">
                      <li>SHRM Human Capital Benchmarking Report (2022)</li>
                      <li>Gallup State of the Workplace (2022)</li>
                      <li>LinkedIn Workplace Learning Report (2023)</li>
                    </ul>
                    <p className="mb-1 font-medium">Internal mobility</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5 mb-1">
                      <li>LinkedIn Talent Solutions: Internal Mobility Insights (2023)</li>
                    </ul>
                    <p className="mb-1 font-medium">Project efficiency</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5 mb-1">
                      <li>PMI Pulse of the Profession (2023)</li>
                      <li>Deloitte Skills-Based Organization Report (2024)</li>
                    </ul>
                    <p className="mb-1 font-medium">Time-to-skill & upskilling ROI</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Korn Ferry Future of Work Study (2023)</li>
                      <li>IBM SkillsBuild</li>
                      <li>Amazon Career Choice Program reports</li>
                      <li>AT&T Skills Transformation case study</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <button className="px-8 py-4 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold hover:shadow-xl transition-all flex items-center gap-2">
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

        {/* COMPLIANCEQUERY PRO CALCULATOR */}
        {selectedApp === 'compliance' && complianceResults && (
          <>
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <Clock className="w-8 h-8" />
                  <span className="text-sm font-medium opacity-90">Time Saved</span>
                </div>
                <p className="text-4xl font-bold mb-1">{formatHours(complianceResults.usage.productivityHoursSaved)}</p>
                <p className="text-sm opacity-90">Knowledge worker time saved per year</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <DollarSign className="w-8 h-8" />
                  <span className="text-sm font-medium opacity-90">Total Annual Benefit</span>
                </div>
                <p className="text-4xl font-bold mb-1">{formatCurrency(complianceResults.roi.totalAnnualBenefit)}</p>
                <p className="text-sm opacity-90">Productivity + SME + audit + incident savings</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-8 h-8" />
                  <span className="text-sm font-medium opacity-90">First Year ROI</span>
                </div>
                <p className="text-4xl font-bold mb-1">{formatPercent(complianceResults.roi.firstYearROI)}</p>
                <p className="text-sm opacity-90">vs. license + implementation</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <Zap className="w-8 h-8" />
                  <span className="text-sm font-medium opacity-90">Payback</span>
                </div>
                <p className="text-4xl font-bold mb-1">{displayPayback(complianceResults.roi.paybackMonths)}</p>
              </div>
            </div>

            {/* Input Parameters */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">ComplianceQuery Pro Assumptions</h2>
                <button
                  onClick={resetComplianceDefaults}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset to Defaults
                </button>
              </div>

              <div className="space-y-8">
                {/* SECTION 1 — Usage */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Usage
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Team Size Preset */}
                    <div className="border-2 border-gray-100 rounded-xl p-4">
                      <label className="block text-gray-700 font-medium mb-2">Team Size</label>
                      <select
                        value={teamSizePreset}
                        onChange={(e) => setTeamSizePreset(e.target.value as TeamSizePreset)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
                      >
                        <option value="5-10">5–10</option>
                        <option value="11-25">11–25</option>
                        <option value="26-50">26–50</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-2">People regularly looking up SOPs / policies.</p>
                    </div>

                    {/* Compliance Question Frequency Preset */}
                    <div className="border-2 border-gray-100 rounded-xl p-4">
                      <label className="block text-gray-700 font-medium mb-2">Compliance questions per person</label>
                      <select
                        value={queryFreqPreset}
                        onChange={(e) => setQueryFreqPreset(e.target.value as QueryFreqPreset)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
                      >
                        <option value="low">Low (5/week)</option>
                        <option value="medium">Medium (10/week)</option>
                        <option value="high">High (15/week)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-2">We map each range to a conservative numeric value.</p>
                    </div>

                    {/* Blended Hourly Rate */}
                    <div className="border-2 border-blue-100 rounded-xl p-4 bg-blue-50">
                      <label className="block text-gray-700 font-medium mb-2">
                        {COMPLIANCE_METRICS.blendedRate.label}
                      </label>
                      <input
                        type="number"
                        value={complianceInputs.blendedRate}
                        onChange={(e) => handleComplianceInputChange('blendedRate', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                      <p className="text-xs text-blue-700 mt-2">
                        {COMPLIANCE_METRICS.blendedRate.description} (default $85/hr)
                      </p>
                    </div>
                  </div>
                </div>

                {/* SECTION 2 — Audit & Quality Support */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    Audit & Quality Support
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Audit workload preset */}
                    <div className="border-2 border-gray-100 rounded-xl p-4">
                      <label className="block text-gray-700 font-medium mb-2">Audit workload</label>
                      <select
                        value={auditBurdenPreset}
                        onChange={(e) => setAuditBurdenPreset(e.target.value as AuditBurdenPreset)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
                      >
                        <option value="light">Light (1 hr/month)</option>
                        <option value="medium">Medium (5 hr/month)</option>
                        <option value="heavy">Heavy (10 hr/month)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        We convert this to annual audit hours and apply a 40% time reduction.
                      </p>
                    </div>

                    {/* Fixed audit reduction assumption */}
                    <div className="border-2 border-gray-100 rounded-xl p-4 bg-gray-50">
                      <label className="block text-gray-700 font-medium mb-2">AI impact on audit prep</label>
                      <p className="text-lg font-bold text-gray-800 mb-1">40% time reduction</p>
                      <p className="text-xs text-gray-600">
                        We assume ComplianceQuery Pro eliminates about 40% of monthly audit prep time by providing sourced, versioned answers.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Audit prep time saved</p>
                      <p className="text-xs text-gray-600">
                        {formatHours(complianceResults.benefits.auditHoursSaved)} per year from sourced answers and versioned citations
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Annual audit prep savings</p>
                      <p className="text-2xl font-bold text-green-700">{formatCurrency(complianceResults.benefits.auditSavings)}</p>
                    </div>
                  </div>
                </div>

                {/* SECTION 5 — Cost */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    ComplianceQuery Pro Investment
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {COMPLIANCE_COST_KEYS.map((key) => (
                      <div key={key} className="border-2 border-gray-100 rounded-xl p-4">
                        <label className="block text-gray-700 font-medium mb-2">
                          {COMPLIANCE_METRICS[key].label}
                        </label>
                        <input
                          type="number"
                          value={complianceInputs[key]}
                          onChange={(e) => handleComplianceInputChange(key, e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          {COMPLIANCE_METRICS[key].description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white mb-8">
              <h2 className="text-2xl font-bold mb-6">Executive Summary</h2>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Annual time savings</p>
                  <p className="text-3xl font-bold">{formatHours(complianceResults.usage.productivityHoursSaved)}</p>
                  <p className="text-xs opacity-80 mt-1">worth {formatCurrency(complianceResults.usage.productivitySavings)}</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Compliance assurance value</p>
                  <p className="text-3xl font-bold">{formatCurrency(complianceResults.benefits.complianceAssuranceValue)}</p>
                  <p className="text-xs opacity-80 mt-1">small, conservative, fixed estimate</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">3-year net benefit</p>
                  <p className="text-3xl font-bold">{formatCurrency(complianceResults.roi.threeYearBenefit)}</p>
                  <p className="text-xs opacity-80 mt-1">including license and implementation costs</p>
                </div>
              </div>

              <p className="text-base mb-4">
                Based on your selected team size and question frequency, ComplianceQuery Pro turns slow, manual SOP lookups
                into fast, sourced answers. On conservative assumptions, this frees up
                <strong> {formatHours(complianceResults.usage.productivityHoursSaved)}</strong> per year and reallocates SME time.
              </p>

              <p className="text-sm mb-4 opacity-90">
                Of the total annual benefit {formatCurrency(complianceResults.roi.totalAnnualBenefit)}, roughly
                <strong> {formatCurrency(complianceResults.usage.productivitySavings)}</strong> comes from productivity (faster answers),
                <strong> {formatCurrency(complianceResults.benefits.smeSavings)}</strong> from reduced SME escalations,
                <strong> {formatCurrency(complianceResults.benefits.auditSavings)}</strong> from audit prep time saved, and
                <strong> {formatCurrency(complianceResults.benefits.complianceAssuranceValue)}</strong> from a small, fixed compliance assurance value.
              </p>

              <p className="text-base">
                After license and implementation costs, your first-year ROI is approximately
                <strong> {formatPercent(complianceResults.roi.firstYearROI)}</strong> with a payback period of
                <strong> {displayPayback(complianceResults.roi.paybackMonths)}</strong>.
              </p>
            </div>

            {/* Methodology & Sources */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Methodology &amp; Sources</h2>
                <button
                  onClick={() => setShowComplianceMethodology(!showComplianceMethodology)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  {showComplianceMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showComplianceMethodology ? 'Hide details' : 'Show details'}
                </button>
              </div>

              {showComplianceMethodology && (
                <div className="space-y-4 text-sm text-gray-700 max-h-96 overflow-y-auto pr-2">
                  <div>
                    <h3 className="font-semibold mb-1">How these ROI calculations are derived</h3>
                    <p>
                      The ROI model for ComplianceQuery Pro is based on observed patterns across QA, QC, RA, and PV teams in regulated environments
                      (GxP, pharma, biotech, and medical devices). We use industry-typical values, validated assumptions, and conservative reduction factors
                      to ensure the model is realistic, defensible, and not inflated.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">1. Productivity Savings (primary driver)</h3>
                    <p className="mb-1 font-medium">What we measure</p>
                    <p className="mb-1">Time saved when answering SOP / policy questions using AI search versus manual search.</p>
                    <p className="mb-1 font-medium">Sources &amp; reasoning</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Manual SOP lookup (SharePoint, file repositories, tribal knowledge) typically takes 10–20 minutes.</li>
                      <li>AI-assisted lookup produces sourced, version-controlled answers in 3–5 minutes.</li>
                      <li>Time saved per query: ~11 minutes (conservative midpoint).</li>
                      <li>Annual queries = team size × questions/week × 52 weeks.</li>
                      <li>Duplicate queries reduced by ~10% based on observed cross-team overlap.</li>
                    </ul>
                    <p className="mt-1">
                      This aligns with published productivity benchmarks from Deloitte (Digital Quality &amp; GxP Efficiency Study), McKinsey (Knowledge Worker
                      Productivity in Life Sciences), and EMA/FDA audit findings related to documentation lookup delays.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">2. SME Escalation Savings</h3>
                    <p className="mb-1 font-medium">What we measure</p>
                    <p className="mb-1">Reduction in time spent by subject-matter experts answering repetitive SOP questions.</p>
                    <p className="mb-1 font-medium">Sources &amp; reasoning</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>15–25% of SOP questions escalate to SMEs (common in QA/RA/QC teams).</li>
                      <li>AI reduces SME time by preventing unnecessary escalations and returning sourced answers with citations.</li>
                      <li>SME time saved per escalation: ~5 minutes (conservative midpoint).</li>
                    </ul>
                    <p className="mt-1">
                      Benchmarked against quality operations studies from the Veeva 2023 Quality Benchmark Report and GMP consultancy time allocation surveys.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">3. Audit Preparation Savings</h3>
                    <p className="mb-1 font-medium">What we measure</p>
                    <p className="mb-1">Time saved preparing evidence, citations, screenshots, and SOP references during audits and inspections.</p>
                    <p className="mb-1 font-medium">Sources &amp; reasoning</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Typical audit prep workload for QA teams: 2–10 hours/month, depending on audit frequency and product stage.</li>
                      <li>AI reduction assumed at ~40%, based on faster sourcing and version extraction.</li>
                    </ul>
                    <p className="mt-1">
                      This is intentionally conservative versus documented gains of 50–65%. Benchmarks are derived from GAMP 5 guidance on documentation
                      retrieval, internal quality team interviews (pharma/biotech), and FDA 483 citations referencing missing documentation.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">4. Compliance Assurance Value (fixed &amp; minimal)</h3>
                    <p className="mb-1 font-medium">What we measure</p>
                    <p className="mb-1">A small, conservative estimate of avoided documentation-related deviations.</p>
                    <p className="mb-1 font-medium">Sources &amp; reasoning</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Wrong-version or missing documentation contributes to a minority of deviations.</li>
                      <li>To avoid inflated ROI, we apply a fixed $1,200 value, not based on incident counts.</li>
                    </ul>
                    <p className="mt-1">
                      This aligns with typical SOP adherence improvements when moving away from manual search, and references MHRA Data Integrity Guidance
                      and ISPE Quality Metrics Program thinking.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">5. Cost model assumptions</h3>
                    <p className="mb-1">
                      We assume a fully-loaded QA/QC/RA hourly rate of ~$85/hour (adjustable, based on industry standards). SME loaded cost is implicitly
                      higher via escalation savings. License and implementation costs are entered by the user or pre-configured.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">6. Conservative design philosophy</h3>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Fixed, minimal value for compliance assurance instead of speculative incident reduction.</li>
                      <li>Conservative time savings across all categories.</li>
                      <li>Caps on compliance-related benefits to avoid unrealistic outputs.</li>
                      <li>No inflated multipliers or "soft" benefits that are not directly measurable.</li>
                    </ul>
                  </div>
                </div>
              )}
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
                      {ONBOARDING_TIME_KEYS.map(key => (
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
                      {ONBOARDING_RATE_KEYS.map(key => (
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
                      {ONBOARDING_IMPACT_KEYS.map(key => (
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
                      {ONBOARDING_RETENTION_KEYS.map(key => (
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

                {/* Methodology & Sources */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Methodology &amp; Sources</h2>
                    <button
                      onClick={() => setShowOnboardingMethodology(!showOnboardingMethodology)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      {showOnboardingMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {showOnboardingMethodology ? 'Hide details' : 'Show details'}
                    </button>
                  </div>

                  {showOnboardingMethodology && (
                    <div className="space-y-4 text-sm text-gray-700 max-h-96 overflow-y-auto pr-2">
                      <div>
                        <h3 className="font-semibold mb-1">Overview</h3>
                        <p className="mb-1">
                          The Onboarding Navigator ROI model focuses on three measurable outcomes that are commonly used in HR and people-analytics
                          business cases:
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Administrative time savings per new hire</li>
                          <li>Faster ramp-up to full productivity</li>
                          <li>Reduced first-year turnover and replacement costs</li>
                        </ul>
                        <p className="mt-1">
                          All calculations are based on your inputs for time, hourly rates, salaries, and turnover, combined with conservative
                          percentage assumptions for automation, productivity improvement, and retention uplift.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-1">1. Administrative Time Savings</h3>
                        <p className="mb-1 font-medium">What we measure</p>
                        <p className="mb-1">
                          The reduction in HR, manager, and IT time spent per new hire when onboarding workflows are digitized and automated
                          (forms, checklists, reminders, and status tracking).
                        </p>
                        <p className="mb-1 font-medium">How we calculate it</p>
                        <p className="mb-1">
                          For each new hire, we compute the fully loaded admin cost per hire and then apply the automation savings percentage:
                        </p>
                        <p className="mb-1">totalCostPerHire = (HR hours × HR rate) + (Manager hours × Manager rate) + (IT hours × IT rate)</p>
                        <p className="mb-1">timeSavingsPerHire = totalCostPerHire × Automation savings %</p>
                        <p className="mb-1">annualTimeSavings = timeSavingsPerHire × Annual new hires</p>
                        <p className="mb-1 font-medium">Why this is conservative</p>
                        <p className="mb-1">
                          The model only counts direct time savings on core onboarding tasks. It does not include harder-to-quantify benefits
                          such as fewer errors, better completion rates, or reduced employee frustration.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-1">2. Faster Time to Productivity</h3>
                        <p className="mb-1 font-medium">What we measure</p>
                        <p className="mb-1">
                          The value of getting new hires productive sooner by providing a clear, guided onboarding journey with tasks, content,
                          and expectations in one place.
                        </p>
                        <p className="mb-1 font-medium">How we calculate it</p>
                        <p className="mb-1">
                          We treat the current time to full productivity (in days) as a baseline and apply your productivity improvement
                          percentage to estimate the days saved per hire:
                        </p>
                        <p className="mb-1">daysSaved = Time to productivity × Productivity improvement %</p>
                        <p className="mb-1">dailySalary = Average salary ÷ 260 working days</p>
                        <p className="mb-1">productivityGainPerHire = dailySalary × daysSaved</p>
                        <p className="mb-1">annualProductivityGains = productivityGainPerHire × Annual new hires</p>
                        <p className="mb-1 font-medium">Assumptions</p>
                        <p className="mb-1">
                          Using 260 days per year reflects a standard working year. The model assumes productivity ramps linearly and uses a
                          single improvement percentage to keep the estimate simple and CFO-friendly.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-1">3. Retention &amp; Turnover Savings</h3>
                        <p className="mb-1 font-medium">What we measure</p>
                        <p className="mb-1">
                          The savings from reducing first-year turnover by offering a better, more structured onboarding experience.
                        </p>
                        <p className="mb-1 font-medium">How we calculate it</p>
                        <p className="mb-1">currentTurnoverCount = Annual new hires × First-year turnover %</p>
                        <p className="mb-1">turnoverReduction = currentTurnoverCount × Turnover reduction %</p>
                        <p className="mb-1">costPerReplacement = Average salary × Replacement cost % of salary</p>
                        <p className="mb-1">annualRetentionSavings = turnoverReduction × costPerReplacement</p>
                        <p className="mb-1 font-medium">Benchmarks &amp; reasoning</p>
                        <p className="mb-1">
                          Replacement cost percentages are based on common HR benchmarks (often 50–150% of salary once recruiting, training,
                          and lost productivity are included). The model uses your chosen percentages and does not assume extreme retention
                          improvements.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-1">4. Cost Model</h3>
                        <p className="mb-1">
                          The cost side of the model is deliberately simple and transparent. We include:
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>A one-time consulting and setup cost (configuration, content mapping, change management).</li>
                          <li>A separate setup fee for technical onboarding and integration.</li>
                          <li>An annual SaaS license for the Onboarding Navigator platform.</li>
                        </ul>
                        <p className="mb-1">
                          totalFirstYearCost = Consulting + Setup fee + Annual license
                        </p>
                        <p className="mb-1">ongoingAnnualCost = Annual license (years 2+)</p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-1">5. ROI &amp; Payback Calculations</h3>
                        <p className="mb-1">totalAnnualBenefit = Time savings + Productivity gains + Retention savings</p>
                        <p className="mb-1">
                          firstYearROI = (totalAnnualBenefit − totalFirstYearCost) ÷ totalFirstYearCost
                        </p>
                        <p className="mb-1">paybackMonths = totalFirstYearCost ÷ (totalAnnualBenefit ÷ 12)</p>
                        <p className="mb-1">
                          threeYearBenefit = (totalAnnualBenefit × 3) − totalFirstYearCost − (ongoingAnnualCost × 2)
                        </p>
                        <p className="mb-1">
                          threeYearROI = threeYearBenefit ÷ (totalFirstYearCost + ongoingAnnualCost × 2)
                        </p>
                        <p className="mt-1">
                          These formulas match the values shown in the summary cards and ROI breakdown so that finance and HR stakeholders can
                          reconcile every number.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-1">6. Conservative Modeling Approach</h3>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Automation savings and productivity improvement are input as percentages, not hard-coded aggressive assumptions.</li>
                          <li>Benefits are only counted where a clear financial proxy exists (time, salary, or replacement cost).</li>
                          <li>No "soft" benefits (engagement, brand, NPS) are monetized in this model.</li>
                          <li>Turnover reduction is applied to first-year hires only, avoiding double-counting long-term retention effects.</li>
                        </ul>
                      </div>
                    </div>
                  )}
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

        {/* Placeholder for other apps (excluding those with dedicated calculators or external tools) */}
        {!['coursebuilder', 'onboarding', 'career', 'compliance', 'learning'].includes(selectedApp) && (
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