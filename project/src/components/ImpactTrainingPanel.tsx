import { useState } from 'react';
import { 
  Users, 
  GraduationCap, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Package,
  FileText,
  ArrowRight
} from 'lucide-react';
import {
  type Role,
  type TrainingCurriculum,
  type SOPRoleMapping,
  type ImpactMapResult,
  type DeltaMicroModule,
  parseRoleMappingFile,
  analyzeImpact,
  generateDeltaMicroModule,
  exportDeltaModuleToWord,
  exportDeltaModuleToPDF,
  generateAuditEvidencePack,
  exportAuditEvidencePackToJSON,
  exportAuditEvidencePackToPDF,
  downloadRoleMappingTemplate
} from '../lib/exportUtils';

interface ImpactTrainingPanelProps {
  comparisonResult: any;
  auditTrail: any[];
  onAuditEntry: (action: string, details: any) => void;
}

export default function ImpactTrainingPanel({ 
  comparisonResult, 
  auditTrail,
  onAuditEntry 
}: ImpactTrainingPanelProps) {
  // State
  const [roles, setRoles] = useState<Role[]>([]);
  const [curricula, setCurricula] = useState<TrainingCurriculum[]>([]);
  const [sopRoleMappings, setSopRoleMappings] = useState<SOPRoleMapping[]>([]);
  const [impactMapResult, setImpactMapResult] = useState<ImpactMapResult | null>(null);
  const [deltaModule, setDeltaModule] = useState<DeltaMicroModule | null>(null);
  const [isUploadingRoles, setIsUploadingRoles] = useState(false);
  const [roleUploadErrors, setRoleUploadErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'impact' | 'delta' | 'audit'>('impact');

  // Handlers
  const handleRoleMappingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingRoles(true);
    setRoleUploadErrors([]);

    try {
      const result = await parseRoleMappingFile(file);
      if (result.errors.length > 0) {
        setRoleUploadErrors(result.errors);
      }
      setRoles(result.roles);
      setCurricula(result.curricula);
      setSopRoleMappings(result.mappings);

      onAuditEntry('ROLE_MAPPING_UPLOADED', {
        fileName: file.name,
        rolesCount: result.roles.length,
        curriculaCount: result.curricula.length,
        mappingsCount: result.mappings.length,
        errors: result.errors.length
      });
    } catch (error) {
      console.error('Error uploading role mapping:', error);
      setRoleUploadErrors(['Failed to parse file. Please check the format.']);
    } finally {
      setIsUploadingRoles(false);
    }
  };

  const handleAnalyzeImpact = () => {
    if (!comparisonResult || roles.length === 0) return;
    const result = analyzeImpact(comparisonResult, roles, sopRoleMappings, curricula);
    setImpactMapResult(result);
    onAuditEntry('IMPACT_ANALYSIS_COMPLETED', {
      affectedRolesCount: result.affectedRoles.length,
      affectedCurriculaCount: result.affectedCurricula.length,
      trainingGapsCount: result.trainingGaps.length
    });
  };

  const handleGenerateDeltaModule = () => {
    if (!comparisonResult) return;
    const module = generateDeltaMicroModule(comparisonResult, 'demo.user@company.com');
    setDeltaModule(module);
    onAuditEntry('DELTA_MODULE_GENERATED', {
      moduleId: module.id,
      changedSectionsCount: module.changedSections.length,
      criticalChanges: module.summary.criticalChanges
    });
  };

  const handleExportDeltaWord = async () => {
    if (!deltaModule) return;
    await exportDeltaModuleToWord(deltaModule);
    onAuditEntry('DELTA_MODULE_EXPORTED', { format: 'DOCX', moduleId: deltaModule.id });
  };

  const handleExportDeltaPDF = () => {
    if (!deltaModule) return;
    exportDeltaModuleToPDF(deltaModule);
    onAuditEntry('DELTA_MODULE_EXPORTED', { format: 'PDF', moduleId: deltaModule.id });
  };

  const handleExportAuditJSON = () => {
    if (!comparisonResult) return;
    const pack = generateAuditEvidencePack(comparisonResult, auditTrail, 'demo.user@company.com');
    exportAuditEvidencePackToJSON(pack);
    onAuditEntry('AUDIT_PACK_EXPORTED', { format: 'JSON', packId: pack.id });
  };

  const handleExportAuditPDF = () => {
    if (!comparisonResult) return;
    const pack = generateAuditEvidencePack(comparisonResult, auditTrail, 'demo.user@company.com');
    exportAuditEvidencePackToPDF(pack);
    onAuditEntry('AUDIT_PACK_EXPORTED', { format: 'PDF', packId: pack.id });
  };

  const handleDownloadTemplate = async () => {
    await downloadRoleMappingTemplate();
    onAuditEntry('TEMPLATE_DOWNLOADED', { type: 'ROLE_MAPPING' });
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'high': return 'bg-red-50 border-red-300 text-red-900';
      case 'medium': return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      case 'low': return 'bg-blue-50 border-blue-300 text-blue-900';
      default: return 'bg-gray-50 border-gray-300 text-gray-900';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (!comparisonResult) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Comparison Data</h3>
        <p className="text-gray-500">
          Please complete an SOP comparison first to access Impact & Training features.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feature Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Impact & Training Tools</h2>
          <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">NEW</span>
        </div>
        <p className="text-emerald-100">
          Analyze change impact on roles, generate delta training modules, and export audit evidence packs
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('impact')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'impact' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Impact Map
        </button>
        <button
          onClick={() => setActiveTab('delta')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'delta' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Delta Module
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'audit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4" />
          Audit Pack
        </button>
      </div>

      {/* IMPACT MAP TAB */}
      {activeTab === 'impact' && (
        <div className="space-y-6">
          {/* Role Mapping Upload */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Role & Curricula Mapping
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload Section */}
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Upload an Excel file with your organization's roles, SOP mappings, and training curricula to analyze impact.
                </p>
                
                <div className="flex gap-3">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleRoleMappingUpload}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {isUploadingRoles ? 'Processing...' : 'Upload Role Mapping'}
                      </span>
                    </div>
                  </label>
                  
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Template
                  </button>
                </div>

                {roleUploadErrors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-1">Upload Errors:</p>
                    <ul className="text-xs text-red-700 space-y-1">
                      {roleUploadErrors.map((err, idx) => (
                        <li key={idx}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Current Data Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Loaded Data</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">{roles.length}</p>
                    <p className="text-xs text-gray-500">Roles</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{sopRoleMappings.length}</p>
                    <p className="text-xs text-gray-500">Mappings</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{curricula.length}</p>
                    <p className="text-xs text-gray-500">Curricula</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyzeImpact}
              disabled={roles.length === 0}
              className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              Analyze Impact on Roles & Training
            </button>
          </div>

          {/* Impact Results */}
          {impactMapResult && (
            <div className="space-y-6">
              {/* Affected Roles */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-600" />
                  Affected Roles ({impactMapResult.affectedRoles.length})
                </h3>
                
                {impactMapResult.affectedRoles.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No roles affected by these changes.</p>
                ) : (
                  <div className="space-y-3">
                    {impactMapResult.affectedRoles.map((ar, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border-2 ${getSeverityColor(ar.priority)}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{ar.role.name}</h4>
                            <p className="text-sm opacity-75">{ar.role.department}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getPriorityBadge(ar.priority)}`}>
                              {ar.priority.toUpperCase()} PRIORITY
                            </span>
                            {ar.trainingRequired && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">
                                TRAINING REQUIRED
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm">
                          <strong>Impacted Sections:</strong> {ar.impactedSections.join(', ') || 'All sections'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Affected Curricula */}
              {impactMapResult.affectedCurricula.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                    Affected Training Curricula ({impactMapResult.affectedCurricula.length})
                  </h3>
                  <div className="space-y-3">
                    {impactMapResult.affectedCurricula.map((ac, idx) => (
                      <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-purple-900">{ac.curriculum.moduleName}</h4>
                          {ac.updateRequired && (
                            <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded-full text-xs font-bold">
                              UPDATE REQUIRED
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Training Gaps & Recommendations */}
              <div className="grid md:grid-cols-2 gap-6">
                {impactMapResult.trainingGaps.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      Training Gaps
                    </h3>
                    <div className="space-y-2">
                      {impactMapResult.trainingGaps.map((gap, idx) => (
                        <div key={idx} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm text-yellow-800">{gap}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {impactMapResult.recommendations.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Recommendations
                    </h3>
                    <div className="space-y-2">
                      {impactMapResult.recommendations.map((rec, idx) => (
                        <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-green-800">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DELTA MODULE TAB */}
      {activeTab === 'delta' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Delta Micro-Module Generator
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Generate a focused training module containing only the changed sections from the SOP comparison.
              The module preserves SOP header formatting and includes training notes for each change.
            </p>

            <button
              onClick={handleGenerateDeltaModule}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Generate Delta Training Module
            </button>
          </div>

          {/* Delta Module Preview */}
          {deltaModule && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Delta Module Preview</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportDeltaWord}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Word
                  </button>
                  <button
                    onClick={handleExportDeltaPDF}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                </div>
              </div>

              {/* Module Header */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-bold text-lg text-gray-900 mb-3">{deltaModule.sopHeader.title}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Document ID</p>
                    <p className="font-medium">{deltaModule.sopHeader.documentId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Version Change</p>
                    <p className="font-medium">{deltaModule.sopHeader.oldVersion} → {deltaModule.sopHeader.newVersion}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Department</p>
                    <p className="font-medium">{deltaModule.sopHeader.department || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Est. Training Time</p>
                    <p className="font-medium text-blue-600">{deltaModule.summary.trainingTimeEstimate}</p>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{deltaModule.summary.totalChanges}</p>
                  <p className="text-sm text-gray-600">Total Changes</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-3xl font-bold text-red-600">{deltaModule.summary.criticalChanges}</p>
                  <p className="text-sm text-gray-600">Critical Changes</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{deltaModule.changedSections.length}</p>
                  <p className="text-sm text-gray-600">Sections to Review</p>
                </div>
              </div>

              {/* Changed Sections */}
              <h4 className="font-bold text-gray-900 mb-4">Changed Sections</h4>
              <div className="space-y-4">
                {deltaModule.changedSections.map((section, idx) => (
                  <div key={idx} className={`border-2 rounded-lg p-4 ${getSeverityColor(section.severity)}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold">{section.sectionTitle}</h5>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          section.changeType === 'modified' ? 'bg-yellow-200 text-yellow-800' :
                          section.changeType === 'new' ? 'bg-green-200 text-green-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {section.changeType.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getPriorityBadge(section.severity)}`}>
                          {section.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Side by side comparison */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {section.oldContent && (
                        <div className="bg-white/50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-500 mb-1">Previous Version:</p>
                          <p className="text-sm">{section.oldContent}</p>
                        </div>
                      )}
                      {section.newContent && (
                        <div className="bg-white/50 rounded-lg p-3 border-l-4 border-blue-400">
                          <p className="text-xs font-semibold text-blue-600 mb-1">New Version:</p>
                          <p className="text-sm font-medium">{section.newContent}</p>
                        </div>
                      )}
                    </div>

                    {section.trainingNotes && (
                      <div className="mt-3 p-2 bg-white/30 rounded">
                        <p className="text-xs font-semibold text-gray-600">Training Notes:</p>
                        <p className="text-sm">{section.trainingNotes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AUDIT PACK TAB */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              Audit Evidence Pack
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Generate a comprehensive audit evidence pack containing version information, change summary, 
              links to exact SOP sections, and the complete approval/review log.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Pack Contents</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  SOP version details (old vs new)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Complete change summary with section counts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Detailed differences with exact text
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Critical changes highlighted
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Full audit trail with timestamps
                </li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleExportAuditJSON}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Export as JSON
              </button>
              <button
                onClick={handleExportAuditPDF}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg font-semibold hover:from-red-700 hover:to-orange-700 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Export as PDF
              </button>
            </div>
          </div>

          {/* Current Audit Trail Preview */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Current Session Audit Trail</h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {auditTrail.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No audit entries yet.</p>
              ) : (
                auditTrail.slice(0, 20).map((entry, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-blue-600">{entry.action}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">User: {entry.user}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
