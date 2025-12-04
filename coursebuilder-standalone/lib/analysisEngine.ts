interface TechRow {
  id: string;
  category: string;
  techType: string;
  name: string;
  vendor: string;
  function: string;
  users: string;
  adoption: string;
  cost: string;
  satisfaction: string;
  integration: string;
  notes: string;
  recommendation: string;
  priority: string;
}

interface AnalysisResult {
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  costAnalysis: {
    totalCost: number;
    costPerUser: number;
    highCostTools: Array<{ name: string; cost: number; users: number }>;
    optimization: string;
  };
  adoptionAnalysis: {
    averageAdoption: number;
    lowAdoptionTools: Array<{ name: string; adoption: number; recommendation: string }>;
    insight: string;
  };
  integrationAnalysis: {
    fullyIntegrated: number;
    partiallyIntegrated: number;
    notIntegrated: number;
    gaps: string[];
  };
  satisfactionAnalysis: {
    averageSatisfaction: number;
    lowSatisfactionTools: Array<{ name: string; satisfaction: string; priority: string }>;
    insight: string;
  };
  redundancyAnalysis: {
    overlaps: Array<{ category: string; types: string[]; tools: string[] }>;
    consolidationOpportunities: string[];
  };
  gapAnalysis: {
    capabilityGaps: Array<{ category: string; type: string; description: string; impact: string }>;
    redundancies: Array<{ category: string; type: string; tools: string[]; recommendation: string }>;
    underutilized: Array<{ name: string; adoption: number; cost: number; recommendation: string }>;
    integrationIssues: Array<{ tool: string; issue: string; impact: string }>;
  };
  priorityActions: Array<{
    action: string;
    priority: string;
    rationale: string;
    affectedTools: string[];
  }>;
}

export const generateAnalysis = (
  rows: TechRow[],
  weights: { adoption: number; satisfaction: number; integration: number; cost: number }
): AnalysisResult => {
  if (rows.length === 0) {
    return {
      overallScore: 0,
      summary: 'No technologies have been added to analyze.',
      strengths: [],
      weaknesses: [],
      recommendations: ['Add technologies to your assessment to generate analysis.'],
      costAnalysis: {
        totalCost: 0,
        costPerUser: 0,
        highCostTools: [],
        optimization: 'No data available.',
      },
      adoptionAnalysis: {
        averageAdoption: 0,
        lowAdoptionTools: [],
        insight: 'No data available.',
      },
      integrationAnalysis: {
        fullyIntegrated: 0,
        partiallyIntegrated: 0,
        notIntegrated: 0,
        gaps: [],
      },
      satisfactionAnalysis: {
        averageSatisfaction: 0,
        lowSatisfactionTools: [],
        insight: 'No data available.',
      },
      redundancyAnalysis: {
        overlaps: [],
        consolidationOpportunities: [],
      },
      gapAnalysis: {
        capabilityGaps: [],
        redundancies: [],
        underutilized: [],
        integrationIssues: [],
      },
      priorityActions: [],
    };
  }

  const totalCost = rows.reduce((sum, r) => sum + parseFloat(r.cost.replace(/[^0-9.]/g, '') || '0'), 0);
  const totalUsers = rows.reduce((sum, r) => sum + parseFloat(r.users.replace(/[^0-9]/g, '') || '0'), 0);
  const costPerUser = totalUsers > 0 ? totalCost / totalUsers : 0;

  const adoptions = rows
    .filter((r) => r.adoption)
    .map((r) => parseFloat(r.adoption) || 0);
  const avgAdoption = adoptions.length > 0 ? adoptions.reduce((a, b) => a + b, 0) / adoptions.length : 0;

  const satisfactions = rows
    .filter((r) => r.satisfaction)
    .map((r) => parseInt(r.satisfaction.charAt(0)) || 0);
  const avgSatisfaction = satisfactions.length > 0 ? satisfactions.reduce((a, b) => a + b, 0) / satisfactions.length : 0;

  const integrationCounts = {
    fullyIntegrated: rows.filter((r) => r.integration === 'Fully Integrated').length,
    partiallyIntegrated: rows.filter((r) => r.integration === 'Partially Integrated').length,
    notIntegrated: rows.filter((r) => r.integration === 'Not Integrated').length,
  };

  const overallScore = Math.round(
    (avgAdoption / 100) * (weights.adoption / 100) * 100 +
      (avgSatisfaction / 5) * (weights.satisfaction / 100) * 100 +
      (integrationCounts.fullyIntegrated / rows.length) * (weights.integration / 100) * 100 +
      (costPerUser > 0 ? Math.max(0, 1 - costPerUser / 100) : 0.5) * (weights.cost / 100) * 100
  );

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (avgAdoption >= 70) {
    strengths.push(`Strong overall adoption rate of ${avgAdoption.toFixed(1)}% across technologies`);
  } else if (avgAdoption < 50) {
    weaknesses.push(`Low average adoption rate of ${avgAdoption.toFixed(1)}% indicates underutilized investments`);
    recommendations.push('Implement change management and training programs to increase technology adoption');
  }

  if (avgSatisfaction >= 4) {
    strengths.push(`High user satisfaction with average rating of ${avgSatisfaction.toFixed(1)}/5`);
  } else if (avgSatisfaction < 3) {
    weaknesses.push(`Low user satisfaction rating of ${avgSatisfaction.toFixed(1)}/5 suggests user experience issues`);
    recommendations.push('Conduct user feedback sessions to identify satisfaction pain points');
  }

  if (integrationCounts.fullyIntegrated >= rows.length * 0.7) {
    strengths.push(`Strong integration with ${integrationCounts.fullyIntegrated} of ${rows.length} technologies fully integrated`);
  } else if (integrationCounts.notIntegrated >= rows.length * 0.3) {
    weaknesses.push(`${integrationCounts.notIntegrated} technologies not integrated, creating data silos`);
    recommendations.push('Prioritize integration projects to create unified learning ecosystem');
  }

  const highCostTools = rows
    .map((r) => ({
      name: r.name,
      cost: parseFloat(r.cost.replace(/[^0-9.]/g, '') || '0'),
      users: parseFloat(r.users.replace(/[^0-9]/g, '') || '1'),
    }))
    .filter((t) => t.cost > 0)
    .sort((a, b) => b.cost / b.users - a.cost / a.users)
    .slice(0, 5);

  let costOptimization = '';
  if (costPerUser > 50) {
    costOptimization = `High cost per user of $${costPerUser.toFixed(2)} suggests opportunities for optimization through consolidation or renegotiation.`;
    recommendations.push('Review vendor contracts and explore consolidation opportunities to reduce cost per user');
  } else if (costPerUser > 20) {
    costOptimization = `Moderate cost per user of $${costPerUser.toFixed(2)} is within industry norms but can be optimized.`;
  } else {
    costOptimization = `Cost-efficient deployment with $${costPerUser.toFixed(2)} per user.`;
  }

  const lowAdoptionTools = rows
    .filter((r) => parseFloat(r.adoption) < 50 && r.adoption)
    .map((r) => ({
      name: r.name,
      adoption: parseFloat(r.adoption),
      recommendation: r.recommendation,
    }))
    .sort((a, b) => a.adoption - b.adoption);

  let adoptionInsight = '';
  if (lowAdoptionTools.length > rows.length * 0.4) {
    adoptionInsight = `${lowAdoptionTools.length} technologies have adoption below 50%, indicating significant underutilization.`;
  } else if (lowAdoptionTools.length > 0) {
    adoptionInsight = `${lowAdoptionTools.length} technologies show room for adoption improvement.`;
  } else {
    adoptionInsight = 'All technologies show strong adoption rates.';
  }

  const lowSatisfactionTools = rows
    .filter((r) => r.satisfaction && parseInt(r.satisfaction.charAt(0)) <= 2)
    .map((r) => ({
      name: r.name,
      satisfaction: r.satisfaction,
      priority: r.priority,
    }));

  let satisfactionInsight = '';
  if (lowSatisfactionTools.length > 0) {
    satisfactionInsight = `${lowSatisfactionTools.length} technologies have poor satisfaction ratings requiring immediate attention.`;
  } else if (avgSatisfaction < 3.5) {
    satisfactionInsight = 'User satisfaction is moderate with room for improvement.';
  } else {
    satisfactionInsight = 'Users are generally satisfied with current technology stack.';
  }

  const integrationGaps: string[] = [];
  if (integrationCounts.notIntegrated > 0) {
    integrationGaps.push(`${integrationCounts.notIntegrated} tools are completely standalone, limiting data flow`);
  }
  if (integrationCounts.partiallyIntegrated > 0) {
    integrationGaps.push(`${integrationCounts.partiallyIntegrated} tools are partially integrated and could benefit from deeper connections`);
  }

  const categoryGroups = rows.reduce((acc, row) => {
    if (!acc[row.category]) {
      acc[row.category] = {};
    }
    if (!acc[row.category][row.techType]) {
      acc[row.category][row.techType] = [];
    }
    acc[row.category][row.techType].push(row.name);
    return acc;
  }, {} as Record<string, Record<string, string[]>>);

  const overlaps: Array<{ category: string; types: string[]; tools: string[] }> = [];
  Object.entries(categoryGroups).forEach(([category, types]) => {
    Object.entries(types).forEach(([type, tools]) => {
      if (tools.length > 1) {
        overlaps.push({ category, types: [type], tools });
      }
    });
  });

  const consolidationOpportunities: string[] = [];
  if (overlaps.length > 0) {
    overlaps.forEach((overlap) => {
      consolidationOpportunities.push(
        `Consider consolidating ${overlap.tools.length} tools in ${overlap.category}/${overlap.types[0]}: ${overlap.tools.join(', ')}`
      );
    });
  }

  const priorityActions: Array<{
    action: string;
    priority: string;
    rationale: string;
    affectedTools: string[];
  }> = [];

  const criticalTools = rows.filter((r) => r.priority === 'Critical');
  criticalTools.forEach((tool) => {
    if (tool.recommendation === 'Replace' || tool.recommendation === 'Retire') {
      priorityActions.push({
        action: `${tool.recommendation} ${tool.name}`,
        priority: 'Critical',
        rationale: `${tool.name} is marked critical with recommendation to ${tool.recommendation.toLowerCase()}`,
        affectedTools: [tool.name],
      });
    }
  });

  lowSatisfactionTools
    .filter((t) => t.priority === 'High' || t.priority === 'Critical')
    .forEach((tool) => {
      priorityActions.push({
        action: `Address user satisfaction issues with ${tool.name}`,
        priority: tool.priority,
        rationale: `Low satisfaction rating of ${tool.satisfaction} with ${tool.priority.toLowerCase()} priority`,
        affectedTools: [tool.name],
      });
    });

  lowAdoptionTools.slice(0, 3).forEach((tool) => {
    if (tool.adoption < 30) {
      priorityActions.push({
        action: `Increase adoption of ${tool.name}`,
        priority: 'High',
        rationale: `Only ${tool.adoption}% adoption indicates poor ROI on investment`,
        affectedTools: [tool.name],
      });
    }
  });

  if (consolidationOpportunities.length > 0) {
    priorityActions.push({
      action: 'Evaluate technology consolidation opportunities',
      priority: 'Medium',
      rationale: `${overlaps.length} potential redundancies identified across technology stack`,
      affectedTools: overlaps.flatMap((o) => o.tools),
    });
  }

  const allCategories = ['Plan', 'Discover', 'Consume', 'Experiment', 'Connect', 'Perform', 'Manage & Create', 'Analyze'];
  const categoryTypesMap: Record<string, string[]> = {
    Plan: ['Career Planning', 'Skills Tracking', 'Assessment'],
    Discover: ['Content Curation', 'Recommendation'],
    Consume: ['Video Library', 'Content Libraries', 'Microlearning', 'LEP / LXP', 'MOOC / Cohort', 'Gamification'],
    Experiment: ['Video Practice', 'AR/VR', 'Project Marketplace'],
    Connect: ['Mentoring / Coaching', 'Collaborative Learning', 'Expertise Directories'],
    Perform: ['Performance Tracking', 'Enablement', 'Certification', 'Knowledge Repositories'],
    'Manage & Create': ['Back Office Training Mgt', 'LMS', 'LCMS', 'Content Creation', 'Extended Enterprise'],
    Analyze: ['LRS', 'Analytics', 'Surveys & Evaluations'],
  };

  const capabilityGaps: Array<{ category: string; type: string; description: string; impact: string }> = [];
  const coveredCategories = new Set(rows.map((r) => r.category).filter(Boolean));

  allCategories.forEach((category) => {
    if (!coveredCategories.has(category)) {
      capabilityGaps.push({
        category,
        type: 'Missing Category',
        description: `No technologies in the ${category} category`,
        impact: 'Limited capability in this learning area',
      });
    } else {
      const categoryRows = rows.filter((r) => r.category === category);
      const coveredTypes = new Set(categoryRows.map((r) => r.techType).filter(Boolean));
      const expectedTypes = categoryTypesMap[category] || [];

      expectedTypes.forEach((type) => {
        if (!coveredTypes.has(type)) {
          capabilityGaps.push({
            category,
            type,
            description: `No ${type} technology in ${category}`,
            impact: 'Gap in specific functionality',
          });
        }
      });
    }
  });

  const redundancies: Array<{ category: string; type: string; tools: string[]; recommendation: string }> = [];
  overlaps.forEach((overlap) => {
    if (overlap.tools.length > 1) {
      redundancies.push({
        category: overlap.category,
        type: overlap.types[0],
        tools: overlap.tools,
        recommendation: `Consider consolidating ${overlap.tools.length} similar tools to reduce complexity and cost`,
      });
    }
  });

  const underutilized: Array<{ name: string; adoption: number; cost: number; recommendation: string }> = [];
  rows.forEach((row) => {
    const adoption = parseFloat(row.adoption) || 0;
    const cost = parseFloat(row.cost.replace(/[^0-9.]/g, '')) || 0;
    const users = parseFloat(row.users.replace(/[^0-9]/g, '')) || 1;
    const costPerToolUser = cost / users;

    if (adoption < 40 && cost > 0) {
      let rec = 'Low adoption suggests poor ROI';
      if (adoption < 20) {
        rec = 'Consider retiring or replacing - very low adoption';
      } else if (costPerToolUser > 50) {
        rec = 'High cost with low adoption - prioritize for review';
      }
      underutilized.push({
        name: row.name,
        adoption,
        cost,
        recommendation: rec,
      });
    }
  });

  const integrationIssues: Array<{ tool: string; issue: string; impact: string }> = [];
  rows.forEach((row) => {
    if (row.integration === 'Not Integrated' || row.integration === 'Standalone') {
      integrationIssues.push({
        tool: row.name,
        issue: `${row.integration} - no data sharing with other systems`,
        impact: 'Creates data silos and reduces efficiency',
      });
    } else if (row.integration === 'Partially Integrated') {
      integrationIssues.push({
        tool: row.name,
        issue: 'Partially integrated - limited data flow',
        impact: 'Incomplete data picture and manual workarounds',
      });
    }
  });

  let summary = '';
  if (overallScore >= 75) {
    summary = `Your learning technology stack is performing well with an overall health score of ${overallScore}/100. `;
  } else if (overallScore >= 50) {
    summary = `Your learning technology stack shows moderate performance with an overall health score of ${overallScore}/100. `;
  } else {
    summary = `Your learning technology stack requires significant attention with an overall health score of ${overallScore}/100. `;
  }

  summary += `Analysis of ${rows.length} technologies reveals ${strengths.length} key strengths and ${weaknesses.length} areas for improvement. `;

  if (priorityActions.length > 0) {
    summary += `${priorityActions.length} priority actions have been identified for immediate attention.`;
  }

  return {
    overallScore,
    summary,
    strengths,
    weaknesses,
    recommendations,
    costAnalysis: {
      totalCost,
      costPerUser,
      highCostTools,
      optimization: costOptimization,
    },
    adoptionAnalysis: {
      averageAdoption: avgAdoption,
      lowAdoptionTools,
      insight: adoptionInsight,
    },
    integrationAnalysis: {
      fullyIntegrated: integrationCounts.fullyIntegrated,
      partiallyIntegrated: integrationCounts.partiallyIntegrated,
      notIntegrated: integrationCounts.notIntegrated,
      gaps: integrationGaps,
    },
    satisfactionAnalysis: {
      averageSatisfaction: avgSatisfaction,
      lowSatisfactionTools,
      insight: satisfactionInsight,
    },
    redundancyAnalysis: {
      overlaps,
      consolidationOpportunities,
    },
    gapAnalysis: {
      capabilityGaps,
      redundancies,
      underutilized,
      integrationIssues,
    },
    priorityActions,
  };
};
