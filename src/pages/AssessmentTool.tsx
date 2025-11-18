import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AnalysisPanel } from '../components/AnalysisPanel';
import { generateAnalysis } from '../lib/analysisEngine';
import {
  Save,
  Download,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Settings,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

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

const categories = {
  Plan: ['Career Planning', 'Skills Tracking', 'Assessment'],
  Discover: ['Content Curation', 'Recommendation'],
  Consume: [
    'Video Library',
    'Content Libraries',
    'Microlearning',
    'LEP / LXP',
    'MOOC / Cohort',
    'Gamification',
  ],
  Experiment: ['Video Practice', 'AR/VR', 'Project Marketplace'],
  Connect: ['Mentoring / Coaching', 'Collaborative Learning', 'Expertise Directories'],
  Perform: [
    'Performance Tracking',
    'Enablement',
    'Certification',
    'Knowledge Repositories',
  ],
  'Manage & Create': [
    'Back Office Training Mgt',
    'LMS',
    'LCMS',
    'Content Creation',
    'Extended Enterprise',
  ],
  Analyze: ['LRS', 'Analytics', 'Surveys & Evaluations'],
};

const satisfactionLevels = ['1 - Poor', '2 - Fair', '3 - Good', '4 - Very Good', '5 - Excellent'];
const integrationStatus = [
  'Fully Integrated',
  'Partially Integrated',
  'Not Integrated',
  'Standalone',
  'Unknown',
];
const recommendations = [
  'Keep & Optimize',
  'Consolidate',
  'Replace',
  'Retire',
  'Expand Usage',
  'Under Review',
];
const priorities = ['Critical', 'High', 'Medium', 'Low'];

export const AssessmentTool: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [assessmentName, setAssessmentName] = useState('');
  const [rows, setRows] = useState<TechRow[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [weights, setWeights] = useState({
    adoption: 25,
    satisfaction: 30,
    integration: 20,
    cost: 25,
  });
  const [showWeights, setShowWeights] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      loadAssessment(id);
    } else {
      setAssessmentName(`Assessment ${new Date().toLocaleDateString()}`);
      addRow();
    }
  }, [searchParams]);

  const loadAssessment = async (id: string) => {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (data && !error) {
      setAssessmentName(data.name);
      setRows(data.data?.rows || []);
      setWeights(data.weights);
      setAnalysis(data.analysis);
      setSavedId(id);
    }
  };

  const addRow = () => {
    const newRow: TechRow = {
      id: crypto.randomUUID(),
      category: '',
      techType: '',
      name: '',
      vendor: '',
      function: '',
      users: '',
      adoption: '',
      cost: '',
      satisfaction: '',
      integration: '',
      notes: '',
      recommendation: '',
      priority: '',
    };
    setRows([...rows, newRow]);
  };

  const deleteRow = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof TechRow, value: string) => {
    setRows(
      rows.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
          if (field === 'category') {
            updated.techType = '';
          }
          return updated;
        }
        return r;
      })
    );
  };

  const calculateScore = (row: TechRow): number => {
    const adoptionVal = parseFloat(row.adoption) || 0;
    const adoptionScore = (adoptionVal / 100) * (weights.adoption / 100);

    const satisfactionNum = row.satisfaction ? parseInt(row.satisfaction.charAt(0)) : 0;
    const satisfactionScore = (satisfactionNum / 5) * (weights.satisfaction / 100);

    const integrationMap: Record<string, number> = {
      'Fully Integrated': 1,
      'Partially Integrated': 0.7,
      Standalone: 0.5,
      'Not Integrated': 0.3,
      Unknown: 0.5,
    };
    const integrationScore =
      (integrationMap[row.integration] || 0) * (weights.integration / 100);

    const usersVal = parseFloat(row.users.replace(/[^0-9]/g, '')) || 1;
    const costVal = parseFloat(row.cost.replace(/[^0-9.]/g, '')) || 0;
    const costPerUser = costVal / usersVal;
    const costScore = costPerUser === 0 ? 0 : Math.max(0, 1 - costPerUser / 100) * (weights.cost / 100);

    const totalScore = (adoptionScore + satisfactionScore + integrationScore + costScore) * 100;
    return Math.round(totalScore);
  };

  const handleGenerateAnalysis = async () => {
    if (rows.length === 0) {
      setSaveMessage('Please add technologies before generating analysis');
      return;
    }

    setGeneratingAnalysis(true);
    const analysisResult = generateAnalysis(rows, weights);
    setAnalysis(analysisResult);
    setShowAnalysis(true);
    setGeneratingAnalysis(false);

    if (savedId) {
      await supabase
        .from('assessments')
        .update({
          analysis: analysisResult,
          analysis_generated_at: new Date().toISOString(),
        })
        .eq('id', savedId);
    }
  };

  const saveAssessment = async () => {
    if (!assessmentName.trim()) {
      setSaveMessage('Please enter an assessment name');
      return;
    }

    setSaving(true);
    setSaveMessage('');

    const assessmentData = {
      user_id: user!.id,
      name: assessmentName,
      data: { rows },
      weights,
      analysis,
      analysis_generated_at: analysis ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (savedId) {
      const result = await supabase
        .from('assessments')
        .update(assessmentData)
        .eq('id', savedId);
      error = result.error;
    } else {
      const result = await supabase
        .from('assessments')
        .insert(assessmentData)
        .select()
        .single();
      error = result.error;
      if (result.data) {
        setSavedId(result.data.id);
      }
    }

    setSaving(false);
    if (error) {
      setSaveMessage('Error saving assessment');
    } else {
      setSaveMessage('Assessment saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const exportToCSV = () => {
    let csv =
      'Category,Technology Type,Technology Name,Vendor,Primary Function,Users,Adoption %,Annual Cost,Satisfaction,Integration,Key Issues/Notes,Recommendation,Priority,Overall Score\n';

    rows.forEach((row) => {
      const score = calculateScore(row);
      const values = [
        row.category,
        row.techType,
        row.name,
        row.vendor,
        row.function,
        row.users,
        row.adoption,
        row.cost,
        row.satisfaction,
        row.integration,
        row.notes,
        row.recommendation,
        row.priority,
        score.toString(),
      ];
      csv += values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `${assessmentName.replace(/[^a-z0-9]/gi, '_')}_${date}.csv`;
    a.click();
  };

  const getSummaryStats = () => {
    const totalCost = rows.reduce(
      (sum, r) => sum + (parseFloat(r.cost.replace(/[^0-9.]/g, '')) || 0),
      0
    );
    const avgAdoption =
      rows.filter((r) => r.adoption).length > 0
        ? rows.reduce((sum, r) => sum + (parseFloat(r.adoption) || 0), 0) /
          rows.filter((r) => r.adoption).length
        : 0;
    const avgSatisfaction =
      rows.filter((r) => r.satisfaction).length > 0
        ? rows.reduce((sum, r) => sum + (parseInt(r.satisfaction?.charAt(0) || '0') || 0), 0) /
          rows.filter((r) => r.satisfaction).length
        : 0;
    const criticalCount = rows.filter((r) => r.priority === 'Critical').length;
    const highCount = rows.filter((r) => r.priority === 'High').length;

    return { totalCost, avgAdoption, avgSatisfaction, criticalCount, highCount };
  };

  const stats = getSummaryStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-navigant-blue to-navigant-dark-blue text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-blue-100 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Learning Technology Assessment</h1>
          <p className="text-blue-100">
            Comprehensive evaluation of your learning technology stack
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Name
              </label>
              <input
                type="text"
                value={assessmentName}
                onChange={(e) => setAssessmentName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter assessment name..."
              />
            </div>
            <div className="flex gap-2 mt-6 md:mt-0 flex-wrap">
              <button
                onClick={() => setShowWeights(!showWeights)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center"
              >
                <Settings className="w-4 h-4 mr-2" />
                Weights
              </button>
              <button
                onClick={handleGenerateAnalysis}
                disabled={generatingAnalysis || rows.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-md hover:from-cyan-600 hover:to-blue-600 transition-colors flex items-center disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generatingAnalysis ? 'Generating...' : 'Generate Analysis'}
              </button>
              <button
                onClick={saveAssessment}
                disabled={saving}
                className="px-4 py-2 bg-navigant-blue text-white rounded-md hover:bg-navigant-dark-blue transition-colors flex items-center disabled:bg-gray-400"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-navigant-navy text-white rounded-md hover:bg-blue-900 transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {saveMessage && (
            <div
              className={`mt-4 p-3 rounded-md flex items-center ${
                saveMessage.includes('Error')
                  ? 'bg-red-50 text-red-700'
                  : 'bg-green-50 text-green-700'
              }`}
            >
              {saveMessage.includes('Error') ? (
                <AlertCircle className="w-5 h-5 mr-2" />
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              {saveMessage}
            </div>
          )}
        </div>

        {showWeights && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Evaluation Category Weights
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Adjust the importance of each factor in calculating the overall score (total must
              equal 100%)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adoption Rate
                </label>
                <input
                  type="number"
                  value={weights.adoption}
                  onChange={(e) =>
                    setWeights({ ...weights, adoption: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Satisfaction
                </label>
                <input
                  type="number"
                  value={weights.satisfaction}
                  onChange={(e) =>
                    setWeights({ ...weights, satisfaction: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Integration
                </label>
                <input
                  type="number"
                  value={weights.integration}
                  onChange={(e) =>
                    setWeights({ ...weights, integration: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Efficiency
                </label>
                <input
                  type="number"
                  value={weights.cost}
                  onChange={(e) =>
                    setWeights({ ...weights, cost: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="mt-4 text-sm">
              <strong>Total: </strong>
              <span
                className={
                  weights.adoption + weights.satisfaction + weights.integration + weights.cost ===
                  100
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {weights.adoption + weights.satisfaction + weights.integration + weights.cost}%
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Technologies</h2>
            <button
              onClick={addRow}
              className="px-4 py-2 bg-navigant-blue text-white rounded-md hover:bg-navigant-dark-blue transition-colors flex items-center text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Technology
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Category</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Vendor</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Users</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Adoption %</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Cost</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Satisfaction</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Integration</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">
                    Recommendation
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Priority</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Score</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <select
                        value={row.category}
                        onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        <option value="">Select...</option>
                        {Object.keys(categories).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={row.techType}
                        onChange={(e) => updateRow(row.id, 'techType', e.target.value)}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-xs"
                        disabled={!row.category}
                      >
                        <option value="">Select...</option>
                        {row.category &&
                          categories[row.category as keyof typeof categories]?.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-xs"
                        placeholder="Tech name"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={row.vendor}
                        onChange={(e) => updateRow(row.id, 'vendor', e.target.value)}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-xs"
                        placeholder="Vendor name"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={row.users}
                        onChange={(e) => updateRow(row.id, 'users', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                        placeholder="500"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={row.adoption}
                        onChange={(e) => updateRow(row.id, 'adoption', e.target.value)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                        placeholder="75"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={row.cost}
                        onChange={(e) => updateRow(row.id, 'cost', e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-xs"
                        placeholder="50000"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={row.satisfaction}
                        onChange={(e) => updateRow(row.id, 'satisfaction', e.target.value)}
                        className="w-28 px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        <option value="">Select...</option>
                        {satisfactionLevels.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={row.integration}
                        onChange={(e) => updateRow(row.id, 'integration', e.target.value)}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        <option value="">Select...</option>
                        {integrationStatus.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={row.recommendation}
                        onChange={(e) => updateRow(row.id, 'recommendation', e.target.value)}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        <option value="">Select...</option>
                        {recommendations.map((rec) => (
                          <option key={rec} value={rec}>
                            {rec}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={row.priority}
                        onChange={(e) => updateRow(row.id, 'priority', e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        <option value="">Select...</option>
                        {priorities.map((pri) => (
                          <option key={pri} value={pri}>
                            {pri}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-navigant-dark-blue rounded text-xs font-semibold">
                        {calculateScore(row)}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No technologies added yet. Click "Add Technology" to get started.</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Summary Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Technologies</p>
              <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Annual Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.totalCost.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Adoption</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(stats.avgAdoption)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Satisfaction</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.avgSatisfaction.toFixed(1)}/5
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">High Priority</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.criticalCount + stats.highCount}
              </p>
            </div>
          </div>
        </div>

        {analysis && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="w-full flex items-center justify-between text-left mb-4"
            >
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-cyan-500" />
                AI-Powered Assessment Analysis
              </h2>
              {showAnalysis ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {showAnalysis && <AnalysisPanel analysis={analysis} />}
          </div>
        )}
      </div>
    </div>
  );
};
