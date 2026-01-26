import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  ArrowRight, 
  Download, 
  AlertCircle, 
  CheckCircle,
  ArrowLeft,
  Loader,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { 
  extractDocument, 
  compareDocuments, 
  ExtractedDocument, 
  ComparisonResult 
} from '../../lib/documentExtractor';
import {
  generateTrainingImpactReport,
  detectTrainingIndicators,
  categorizeChange,
  SOPChange,
  TrainingIndicators,
  ComparisonMetadata,
  TrainingImpactReportData
} from '../../lib/trainingImpactReport';

interface SOPCompareProps {
  onBack: () => void;
  user: {
    name: string;
    email: string;
    organization: string;
  };
}

type Step = 'upload' | 'comparing' | 'results';

const SOPCompare: React.FC<SOPCompareProps> = ({ onBack, user }) => {
  const [step, setStep] = useState<Step>('upload');
  const [oldFile, setOldFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [oldDoc, setOldDoc] = useState<ExtractedDocument | null>(null);
  const [newDoc, setNewDoc] = useState<ExtractedDocument | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // Metadata form state
  const [metadata, setMetadata] = useState<ComparisonMetadata>({
    sopTitle: '',
    sopId: '',
    previousVersion: '',
    newVersion: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    comparisonDate: new Date().toISOString().split('T')[0],
    department: ''
  });
  
  const oldFileRef = useRef<HTMLInputElement>(null);
  const newFileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File, isOld: boolean) => {
    setError(null);
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['docx', 'doc', 'pdf'].includes(extension || '')) {
      setError('Please upload a Word (.docx) or PDF file.');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB.');
      return;
    }
    
    if (isOld) {
      setOldFile(file);
    } else {
      setNewFile(file);
    }
  };

  const handleCompare = async () => {
    if (!oldFile || !newFile) {
      setError('Please upload both the old and new SOP documents.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setStep('comparing');
    
    try {
      // Extract text from both documents
      const [extractedOld, extractedNew] = await Promise.all([
        extractDocument(oldFile),
        extractDocument(newFile)
      ]);
      
      setOldDoc(extractedOld);
      setNewDoc(extractedNew);
      
      // Compare documents
      const result = compareDocuments(extractedOld, extractedNew);
      setComparisonResult(result);
      
      // Auto-populate metadata from extracted documents
      setMetadata(prev => ({
        ...prev,
        sopTitle: extractedNew.metadata.title || extractedOld.metadata.title || prev.sopTitle,
        sopId: extractedNew.metadata.sopId || extractedOld.metadata.sopId || prev.sopId,
        previousVersion: extractedOld.metadata.version || prev.previousVersion,
        newVersion: extractedNew.metadata.version || prev.newVersion,
        department: extractedNew.metadata.department || extractedOld.metadata.department || prev.department
      }));
      
      setStep('results');
    } catch (err) {
      console.error('Comparison error:', err);
      setError(err instanceof Error ? err.message : 'Failed to compare documents. Please check the file formats.');
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!comparisonResult) return;
    
    setIsGeneratingReport(true);
    
    try {
      // Convert comparison changes to SOPChange format with training flags
      const sopChanges: SOPChange[] = comparisonResult.changes.map(change => {
        const { changeType, trainingFlag } = categorizeChange(change.oldContent, change.newContent);
        return {
          section: `${change.sectionId} - ${change.sectionTitle}`,
          changeType,
          previousText: change.oldContent.substring(0, 500) + (change.oldContent.length > 500 ? '...' : ''),
          newText: change.newContent.substring(0, 500) + (change.newContent.length > 500 ? '...' : ''),
          trainingFlag
        };
      });
      
      const indicators = detectTrainingIndicators(sopChanges);
      
      const reportData: TrainingImpactReportData = {
        metadata,
        changes: sopChanges,
        indicators,
        summary: {
          totalSectionsChanged: comparisonResult.summary.totalChanges,
          added: comparisonResult.summary.added,
          modified: comparisonResult.summary.modified,
          removed: comparisonResult.summary.removed
        }
      };
      
      await generateTrainingImpactReport(reportData);
    } catch (err) {
      console.error('Report generation error:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setOldFile(null);
    setNewFile(null);
    setOldDoc(null);
    setNewDoc(null);
    setComparisonResult(null);
    setError(null);
    setMetadata({
      sopTitle: '',
      sopId: '',
      previousVersion: '',
      newVersion: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      comparisonDate: new Date().toISOString().split('T')[0],
      department: ''
    });
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'added': return 'bg-green-100 text-green-800 border-green-300';
      case 'removed': return 'bg-red-100 text-red-800 border-red-300';
      case 'modified': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 text-white py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <FileSpreadsheet className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">SOP Compare</h1>
              <p className="text-emerald-200 text-sm">Training Impact Assessment Tool</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="font-semibold">{user.name}</p>
            <p className="text-emerald-200 text-sm">{user.organization}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-emerald-600" />
                Upload SOP Documents
              </h2>
              <p className="text-gray-600 mb-4">
                Upload the <strong>previous version</strong> and <strong>new version</strong> of your SOP document.
                The tool will identify textual changes and generate a Training Impact Assessment report.
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm text-emerald-800">
                  <strong>Supported formats:</strong> Word (.docx) and PDF files up to 50MB
                </p>
                <p className="text-sm text-emerald-700 mt-1">
                  <strong>Note:</strong> This tool identifies textual changes only. No regulatory interpretation or recommendations are provided.
                </p>
              </div>
            </div>

            {/* Upload Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Old Document */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  Previous Version (Old SOP)
                </h3>
                
                <input
                  ref={oldFileRef}
                  type="file"
                  accept=".docx,.doc,.pdf"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], true)}
                  className="hidden"
                />
                
                {oldFile ? (
                  <div className="border-2 border-emerald-300 bg-emerald-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{oldFile.name}</p>
                        <p className="text-sm text-gray-600">{(oldFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={() => setOldFile(null)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => oldFileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                  >
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Click to upload old SOP</p>
                    <p className="text-gray-400 text-sm mt-1">Word or PDF</p>
                  </button>
                )}
              </div>

              {/* New Document */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  New Version (Updated SOP)
                </h3>
                
                <input
                  ref={newFileRef}
                  type="file"
                  accept=".docx,.doc,.pdf"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], false)}
                  className="hidden"
                />
                
                {newFile ? (
                  <div className="border-2 border-emerald-300 bg-emerald-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{newFile.name}</p>
                        <p className="text-sm text-gray-600">{(newFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={() => setNewFile(null)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => newFileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                  >
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Click to upload new SOP</p>
                    <p className="text-gray-400 text-sm mt-1">Word or PDF</p>
                  </button>
                )}
              </div>
            </div>

            {/* Compare Button */}
            <button
              onClick={handleCompare}
              disabled={!oldFile || !newFile}
              className="w-full px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
            >
              <FileText className="w-6 h-6" />
              Compare Documents
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* STEP 2: Comparing */}
        {step === 'comparing' && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Loader className="w-16 h-16 text-emerald-600 mx-auto mb-6 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Documents</h2>
            <p className="text-gray-600">
              Extracting text and identifying changes between versions...
            </p>
          </div>
        )}

        {/* STEP 3: Results */}
        {step === 'results' && comparisonResult && (
          <div className="space-y-6">
            {/* Summary Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Comparison Complete</h2>
                  <p className="text-emerald-100">
                    {comparisonResult.summary.totalChanges} change(s) identified between document versions
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    New Comparison
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{comparisonResult.summary.totalChanges}</p>
                <p className="text-sm text-gray-600">Total Changes</p>
              </div>
              <div className="bg-green-50 rounded-xl shadow p-4 text-center border border-green-200">
                <p className="text-3xl font-bold text-green-600">{comparisonResult.summary.added}</p>
                <p className="text-sm text-gray-600">Added</p>
              </div>
              <div className="bg-yellow-50 rounded-xl shadow p-4 text-center border border-yellow-200">
                <p className="text-3xl font-bold text-yellow-600">{comparisonResult.summary.modified}</p>
                <p className="text-sm text-gray-600">Modified</p>
              </div>
              <div className="bg-red-50 rounded-xl shadow p-4 text-center border border-red-200">
                <p className="text-3xl font-bold text-red-600">{comparisonResult.summary.removed}</p>
                <p className="text-sm text-gray-600">Removed</p>
              </div>
            </div>

            {/* Metadata Form */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Document Metadata</h3>
              <p className="text-sm text-gray-600 mb-4">
                Review and complete the metadata below. This information will appear in the Training Impact Report.
              </p>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">SOP Title *</label>
                  <input
                    type="text"
                    value={metadata.sopTitle}
                    onChange={(e) => setMetadata({...metadata, sopTitle: e.target.value})}
                    placeholder="e.g., Equipment Calibration Procedure"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">SOP ID *</label>
                  <input
                    type="text"
                    value={metadata.sopId}
                    onChange={(e) => setMetadata({...metadata, sopId: e.target.value})}
                    placeholder="e.g., SOP-QC-2024-089"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={metadata.department}
                    onChange={(e) => setMetadata({...metadata, department: e.target.value})}
                    placeholder="e.g., Quality Control"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Previous Version *</label>
                  <input
                    type="text"
                    value={metadata.previousVersion}
                    onChange={(e) => setMetadata({...metadata, previousVersion: e.target.value})}
                    placeholder="e.g., 3.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">New Version *</label>
                  <input
                    type="text"
                    value={metadata.newVersion}
                    onChange={(e) => setMetadata({...metadata, newVersion: e.target.value})}
                    placeholder="e.g., 3.2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={metadata.effectiveDate}
                    onChange={(e) => setMetadata({...metadata, effectiveDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Changes List */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Detected Changes</h3>
              
              {comparisonResult.changes.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-600">No significant changes detected between documents.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {comparisonResult.changes.map((change, idx) => (
                    <div key={idx} className={`border-2 rounded-xl p-4 ${getChangeTypeColor(change.changeType)}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold">
                          {change.sectionId} — {change.sectionTitle}
                        </h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          change.changeType === 'added' ? 'bg-green-200 text-green-800' :
                          change.changeType === 'removed' ? 'bg-red-200 text-red-800' :
                          'bg-yellow-200 text-yellow-800'
                        }`}>
                          {change.changeType}
                        </span>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        {change.oldContent && (
                          <div className="bg-white/60 rounded-lg p-3">
                            <p className="text-xs font-semibold text-gray-500 mb-1">Previous Version:</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {change.oldContent.substring(0, 300)}
                              {change.oldContent.length > 300 && '...'}
                            </p>
                          </div>
                        )}
                        {change.newContent && (
                          <div className="bg-white/60 rounded-lg p-3 border-l-4 border-emerald-400">
                            <p className="text-xs font-semibold text-emerald-600 mb-1">New Version:</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {change.newContent.substring(0, 300)}
                              {change.newContent.length > 300 && '...'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generate Report Button */}
            <button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport || !metadata.sopTitle || !metadata.sopId || !metadata.previousVersion || !metadata.newVersion}
              className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
            >
              {isGeneratingReport ? (
                <>
                  <Loader className="w-6 h-6 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="w-6 h-6" />
                  Download Training Impact Report (Word)
                </>
              )}
            </button>
            
            <p className="text-center text-sm text-gray-500">
              The report will contain: Administrative header, Executive summary, Structured change table, 
              Training relevance indicators, and Sign-off section.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SOPCompare;
