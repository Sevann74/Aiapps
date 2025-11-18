import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Link2,
  ThumbsUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Target,
  Copy,
  TrendingDown as UnderutilizedIcon,
  Unplug,
} from 'lucide-react';

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

interface AnalysisPanelProps {
  analysis: AnalysisResult;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'Critical') return 'bg-red-100 text-red-800 border-red-300';
    if (priority === 'High') return 'bg-orange-100 text-orange-800 border-orange-300';
    if (priority === 'Medium') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-6 border-2 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-900">Assessment Analysis</h3>
          <div
            className={`text-4xl font-bold px-6 py-3 rounded-lg ${getScoreColor(
              analysis.overallScore
            )}`}
          >
            {analysis.overallScore}/100
          </div>
        </div>
        <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Strengths</h4>
          </div>
          {analysis.strengths.length > 0 ? (
            <ul className="space-y-2">
              {analysis.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start text-sm text-gray-700">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No significant strengths identified.</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Areas for Improvement</h4>
          </div>
          {analysis.weaknesses.length > 0 ? (
            <ul className="space-y-2">
              {analysis.weaknesses.map((weakness, idx) => (
                <li key={idx} className="flex items-start text-sm text-gray-700">
                  <span className="text-orange-600 mr-2">!</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No critical weaknesses identified.</p>
          )}
        </div>
      </div>

      {analysis.recommendations.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Key Recommendations
          </h4>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start text-sm text-gray-700">
                <span className="text-blue-600 mr-2 font-bold">{idx + 1}.</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <DollarSign className="w-6 h-6 text-green-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Cost Analysis</h4>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Total Annual Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                ${analysis.costAnalysis.totalCost.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cost Per User</p>
              <p className="text-xl font-semibold text-gray-900">
                ${analysis.costAnalysis.costPerUser.toFixed(2)}
              </p>
            </div>
            <p className="text-sm text-gray-700 mt-2">{analysis.costAnalysis.optimization}</p>
            {analysis.costAnalysis.highCostTools.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-2">Highest Cost Per User:</p>
                {analysis.costAnalysis.highCostTools.slice(0, 3).map((tool, idx) => (
                  <div key={idx} className="text-xs text-gray-700 mb-1">
                    <span className="font-medium">{tool.name}:</span> $
                    {(tool.cost / tool.users).toFixed(2)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Users className="w-6 h-6 text-blue-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Adoption Analysis</h4>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Average Adoption Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.adoptionAnalysis.averageAdoption.toFixed(1)}%
              </p>
            </div>
            <p className="text-sm text-gray-700">{analysis.adoptionAnalysis.insight}</p>
            {analysis.adoptionAnalysis.lowAdoptionTools.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Low Adoption Technologies:
                </p>
                {analysis.adoptionAnalysis.lowAdoptionTools.slice(0, 3).map((tool, idx) => (
                  <div key={idx} className="text-xs text-gray-700 mb-1">
                    <span className="font-medium">{tool.name}:</span> {tool.adoption.toFixed(1)}%
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Link2 className="w-6 h-6 text-purple-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Integration Status</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Fully Integrated</span>
              <span className="text-sm font-semibold text-green-600">
                {analysis.integrationAnalysis.fullyIntegrated}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Partially Integrated</span>
              <span className="text-sm font-semibold text-yellow-600">
                {analysis.integrationAnalysis.partiallyIntegrated}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Not Integrated</span>
              <span className="text-sm font-semibold text-red-600">
                {analysis.integrationAnalysis.notIntegrated}
              </span>
            </div>
            {analysis.integrationAnalysis.gaps.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-2">Integration Gaps:</p>
                {analysis.integrationAnalysis.gaps.map((gap, idx) => (
                  <p key={idx} className="text-xs text-gray-700 mb-1">
                    • {gap}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <ThumbsUp className="w-6 h-6 text-yellow-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">User Satisfaction</h4>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Average Satisfaction</p>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.satisfactionAnalysis.averageSatisfaction.toFixed(1)}/5
              </p>
            </div>
            <p className="text-sm text-gray-700">{analysis.satisfactionAnalysis.insight}</p>
            {analysis.satisfactionAnalysis.lowSatisfactionTools.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Low Satisfaction Technologies:
                </p>
                {analysis.satisfactionAnalysis.lowSatisfactionTools.map((tool, idx) => (
                  <div key={idx} className="text-xs text-gray-700 mb-1">
                    <span className="font-medium">{tool.name}:</span> {tool.satisfaction}
                    {tool.priority && (
                      <span className="ml-2 text-red-600">({tool.priority})</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Target className="w-7 h-7 text-orange-600 mr-3" />
          <h3 className="text-2xl font-bold text-gray-900">Gap & Redundancy Analysis</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <h4 className="text-lg font-semibold text-gray-900">Capability Gaps</h4>
            </div>
            {analysis.gapAnalysis.capabilityGaps.length > 0 ? (
              <div className="space-y-3">
                {analysis.gapAnalysis.capabilityGaps.slice(0, 5).map((gap, idx) => (
                  <div key={idx} className="border-l-4 border-red-400 pl-3 py-2 bg-red-50">
                    <p className="text-sm font-medium text-gray-900">{gap.description}</p>
                    <p className="text-xs text-gray-600 mt-1">{gap.impact}</p>
                  </div>
                ))}
                {analysis.gapAnalysis.capabilityGaps.length > 5 && (
                  <p className="text-xs text-gray-500 italic">
                    +{analysis.gapAnalysis.capabilityGaps.length - 5} more gaps identified
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No significant capability gaps detected. Your technology stack covers all major areas.
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center mb-3">
              <Copy className="w-5 h-5 text-yellow-600 mr-2" />
              <h4 className="text-lg font-semibold text-gray-900">Redundancies</h4>
            </div>
            {analysis.gapAnalysis.redundancies.length > 0 ? (
              <div className="space-y-3">
                {analysis.gapAnalysis.redundancies.map((redundancy, idx) => (
                  <div key={idx} className="border-l-4 border-yellow-400 pl-3 py-2 bg-yellow-50">
                    <p className="text-sm font-medium text-gray-900">
                      {redundancy.category} / {redundancy.type}
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      {redundancy.tools.join(', ')}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 italic">{redundancy.recommendation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No redundancies detected. Each technology serves a unique purpose.
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center mb-3">
              <UnderutilizedIcon className="w-5 h-5 text-orange-600 mr-2" />
              <h4 className="text-lg font-semibold text-gray-900">Underutilized</h4>
            </div>
            {analysis.gapAnalysis.underutilized.length > 0 ? (
              <div className="space-y-3">
                {analysis.gapAnalysis.underutilized.map((tool, idx) => (
                  <div key={idx} className="border-l-4 border-orange-400 pl-3 py-2 bg-orange-50">
                    <p className="text-sm font-medium text-gray-900">{tool.name}</p>
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>Adoption: {tool.adoption.toFixed(1)}%</span>
                      <span>Cost: ${tool.cost.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 italic">{tool.recommendation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                All technologies show healthy adoption rates relative to their cost.
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center mb-3">
              <Unplug className="w-5 h-5 text-purple-600 mr-2" />
              <h4 className="text-lg font-semibold text-gray-900">Integration Issues</h4>
            </div>
            {analysis.gapAnalysis.integrationIssues.length > 0 ? (
              <div className="space-y-3">
                {analysis.gapAnalysis.integrationIssues.map((issue, idx) => (
                  <div key={idx} className="border-l-4 border-purple-400 pl-3 py-2 bg-purple-50">
                    <p className="text-sm font-medium text-gray-900">{issue.tool}</p>
                    <p className="text-xs text-gray-700 mt-1">{issue.issue}</p>
                    <p className="text-xs text-gray-600 mt-1 italic">{issue.impact}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                All technologies are well-integrated with your ecosystem.
              </p>
            )}
          </div>
        </div>
      </div>

      {analysis.redundancyAnalysis.consolidationOpportunities.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <XCircle className="w-6 h-6 text-yellow-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Consolidation Opportunities</h4>
          </div>
          <p className="text-sm text-gray-700 mb-3">
            Potential technology overlaps detected that may benefit from consolidation:
          </p>
          <ul className="space-y-2">
            {analysis.redundancyAnalysis.consolidationOpportunities.map((opp, idx) => (
              <li key={idx} className="text-sm text-gray-700">
                • {opp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.priorityActions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            Priority Actions
          </h4>
          <div className="space-y-3">
            {analysis.priorityActions.map((action, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-2 ${getPriorityColor(action.priority)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-semibold text-sm">{action.action}</h5>
                  <span className="text-xs font-bold px-2 py-1 rounded">
                    {action.priority}
                  </span>
                </div>
                <p className="text-xs mb-2">{action.rationale}</p>
                {action.affectedTools.length > 0 && (
                  <p className="text-xs font-medium">
                    Affects: {action.affectedTools.slice(0, 3).join(', ')}
                    {action.affectedTools.length > 3 &&
                      ` +${action.affectedTools.length - 3} more`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
