import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  ArrowRight, 
  ArrowLeft,
  Loader,
  RefreshCw,
  Plus,
  Minus,
  Edit3,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Eye
} from 'lucide-react';
import { 
  extractDocument, 
  compareDocuments,
  SimpleComparisonResult,
  SectionChange
} from '../../lib/simpleDocumentCompare';

interface SimpleDocumentReviewProps {
  onBack: () => void;
  user: {
    name: string;
    email: string;
    organization: string;
  };
}

type Step = 'upload' | 'comparing' | 'results';

const SimpleDocumentReview: React.FC<SimpleDocumentReviewProps> = ({ onBack, user }) => {
  const [step, setStep] = useState<Step>('upload');
  const [oldFile, setOldFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [result, setResult] = useState<SimpleComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  
  const oldFileRef = useRef<HTMLInputElement>(null);
  const newFileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File, isOld: boolean) => {
    setError(null);
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['docx', 'doc', 'pdf'].includes(extension || '')) {
      setError('Please upload a Word (.docx) or PDF file.');
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
      setError('Please upload both documents.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setStep('comparing');
    
    try {
      const [oldDoc, newDoc] = await Promise.all([
        extractDocument(oldFile),
        extractDocument(newFile)
      ]);
      
      const comparisonResult = compareDocuments(oldDoc, newDoc);
      setResult(comparisonResult);
      setExpandedSections(new Set(comparisonResult.changes.map((_, i) => i))); // Expand all by default
      setStep('results');
    } catch (err) {
      console.error('Comparison error:', err);
      setError(err instanceof Error ? err.message : 'Failed to compare documents.');
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setOldFile(null);
    setNewFile(null);
    setResult(null);
    setError(null);
    setExpandedSections(new Set());
  };

  const toggleSection = (idx: number) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setExpandedSections(newSet);
  };

  const getChangeTypeStyle = (type: 'added' | 'removed' | 'modified') => {
    switch (type) {
      case 'added': return { 
        bg: 'bg-green-50', 
        border: 'border-green-500', 
        icon: <Plus className="w-5 h-5 text-green-600" />, 
        label: 'New in current version', 
        sublabel: 'Content not present in previous version',
        labelColor: 'text-green-700' 
      };
      case 'removed': return { 
        bg: 'bg-red-50', 
        border: 'border-red-500', 
        icon: <Minus className="w-5 h-5 text-red-600" />, 
        label: 'Removed from current version', 
        sublabel: 'Content not found elsewhere in document',
        labelColor: 'text-red-700' 
      };
      case 'modified': return { 
        bg: 'bg-slate-50', 
        border: 'border-slate-400', 
        icon: <Edit3 className="w-5 h-5 text-slate-600" />, 
        label: 'Changed', 
        sublabel: 'Verbatim differences shown below',
        labelColor: 'text-slate-700' 
      };
    }
  };

  const getUncertaintyBadges = (change: SectionChange) => {
    const badges: { icon: React.ReactNode; text: string; color: string }[] = [];
    
    if (change.matchConfidence !== undefined && change.matchConfidence < 0.7) {
      badges.push({
        icon: <AlertTriangle className="w-3 h-3" />,
        text: 'Low match confidence',
        color: 'bg-amber-100 text-amber-700 border-amber-300'
      });
    }
    
    if (change.possibleRelocation) {
      badges.push({
        icon: <HelpCircle className="w-3 h-3" />,
        text: 'Possible relocation – verify manually',
        color: 'bg-purple-100 text-purple-700 border-purple-300'
      });
    }
    
    if (change.structureUnclear) {
      badges.push({
        icon: <AlertTriangle className="w-3 h-3" />,
        text: 'Section structure unclear',
        color: 'bg-orange-100 text-orange-700 border-orange-300'
      });
    }
    
    return badges;
  };

  const renderSectionChange = (change: SectionChange, idx: number) => {
    const style = getChangeTypeStyle(change.changeType);
    const isExpanded = expandedSections.has(idx);
    const uncertaintyBadges = getUncertaintyBadges(change);
    
    return (
      <div key={idx} className={`${style.bg} border-l-4 ${style.border} rounded-r-xl overflow-hidden shadow-sm`}>
        {/* Section Header */}
        <button
          onClick={() => toggleSection(idx)}
          className="w-full p-4 flex items-center justify-between hover:bg-black/5 transition-all"
        >
          <div className="flex items-center gap-3">
            {style.icon}
            <div className="text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${style.labelColor}`}>{style.label}</span>
              </div>
              <h4 className="font-bold text-gray-900 text-lg">{change.sectionTitle}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{style.sublabel}</p>
              
              {/* Uncertainty Badges */}
              {uncertaintyBadges.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {uncertaintyBadges.map((badge, i) => (
                    <span key={i} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${badge.color}`}>
                      {badge.icon}
                      {badge.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-xl">{isExpanded ? '−' : '+'}</span>
          </div>
        </button>
        
        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4">
            {change.changeType === 'added' && (
              <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                <p className="text-xs font-semibold text-green-700 mb-2">Current version content:</p>
                <p className="text-gray-800 whitespace-pre-wrap">{change.newContent}</p>
              </div>
            )}
            
            {change.changeType === 'removed' && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                <p className="text-xs font-semibold text-red-700 mb-2">Previous version content:</p>
                <p className="text-gray-800 whitespace-pre-wrap">{change.oldContent}</p>
              </div>
            )}
            
            {change.changeType === 'modified' && change.diffParts && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Previous version:</p>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">
                    {change.diffParts.map((part, i) => (
                      <span 
                        key={i} 
                        className={part.removed ? 'bg-red-200 text-red-900' : part.added ? 'hidden' : ''}
                      >
                        {part.value}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-white border-2 border-emerald-300 rounded-lg p-4">
                  <p className="text-xs font-semibold text-emerald-700 mb-2">Current version:</p>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">
                    {change.diffParts.map((part, i) => (
                      <span 
                        key={i} 
                        className={part.added ? 'bg-green-200 text-green-900 font-semibold' : part.removed ? 'hidden' : ''}
                      >
                        {part.value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold">Document Revision Review</h1>
                <p className="text-emerald-200 text-sm">Factual Change Detection</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">{user.name}</p>
            <p className="text-emerald-200 text-sm">{user.organization}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-xl text-red-800">
            <p className="font-semibold">Error: {error}</p>
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Documents to Compare</h2>
            <p className="text-gray-600 mb-8">Upload the previous and current versions of your document.</p>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Old Document */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  Previous Version
                </h3>
                <input
                  ref={oldFileRef}
                  type="file"
                  accept=".docx,.doc,.pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], true)}
                />
                {oldFile ? (
                  <div className="border-2 border-gray-300 bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{oldFile.name}</p>
                        <p className="text-sm text-gray-600">{(oldFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={() => setOldFile(null)} className="text-gray-400 hover:text-red-600 text-xl">×</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => oldFileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-gray-500 hover:bg-gray-50 transition-all"
                  >
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Click to upload previous version</p>
                  </button>
                )}
              </div>

              {/* New Document */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  Current Version
                </h3>
                <input
                  ref={newFileRef}
                  type="file"
                  accept=".docx,.doc,.pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], false)}
                />
                {newFile ? (
                  <div className="border-2 border-emerald-300 bg-emerald-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{newFile.name}</p>
                        <p className="text-sm text-gray-600">{(newFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={() => setNewFile(null)} className="text-gray-400 hover:text-red-600 text-xl">×</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => newFileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                  >
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Click to upload current version</p>
                  </button>
                )}
              </div>
            </div>

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
            <p className="text-gray-600">Finding differences between versions...</p>
          </div>
        )}

        {/* STEP 3: Results */}
        {step === 'results' && result && (
          <div className="space-y-6">
            {/* Summary Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Comparison Complete</h2>
                  <p className="text-emerald-100">{result.summary.totalChanges} difference(s) found</p>
                </div>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  New Comparison
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{result.summary.totalChanges}</p>
                <p className="text-sm text-gray-600">Total Changes</p>
              </div>
              <div className="bg-green-50 rounded-xl shadow p-4 text-center border-2 border-green-200">
                <p className="text-3xl font-bold text-green-600">{result.summary.added}</p>
                <p className="text-sm text-gray-600">Added</p>
              </div>
              <div className="bg-amber-50 rounded-xl shadow p-4 text-center border-2 border-amber-200">
                <p className="text-3xl font-bold text-amber-600">{result.summary.modified}</p>
                <p className="text-sm text-gray-600">Changed</p>
              </div>
              <div className="bg-red-50 rounded-xl shadow p-4 text-center border-2 border-red-200">
                <p className="text-3xl font-bold text-red-600">{result.summary.removed}</p>
                <p className="text-sm text-gray-600">Removed</p>
              </div>
            </div>

            {/* Sections Analyzed Info */}
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-gray-600 text-sm">
                <span className="font-semibold">{result.summary.sectionsAnalyzed}</span> sections analyzed
              </p>
              <p className="text-gray-500 text-xs mt-1">
                This tool identifies textual differences only. No interpretation of significance or impact is provided.
              </p>
            </div>

            {/* Changes List */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Section Changes</h3>
              
              {result.changes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <p className="text-xl font-semibold">No differences found</p>
                  <p>The documents appear to be identical.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {result.changes.map((change, idx) => renderSectionChange(change, idx))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleDocumentReview;
