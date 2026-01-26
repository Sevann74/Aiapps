import React, { useState, useCallback, useRef } from 'react';
import { ArrowLeft, GitCompare, Upload, FileText, X, CheckCircle, AlertCircle, FileUp, Download, ArrowRight, AlertTriangle, Info, Eye, Sparkles, Cpu } from 'lucide-react';
import { extractDocument, compareDocuments, type ComparisonResult, type SectionChange } from '../../lib/documentExtractor';
import { complianceQueryService, type SOPComparisonResponse } from '../../lib/complianceQueryService';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface SOPComparisonToolProps {
  user: {
    name: string;
    email: string;
    organization: string;
    organization_id?: string;
    role?: string;
  };
  onBack: () => void;
}

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  title: string;
  content: string;
  version: string;
  status: 'completed' | 'error' | 'processing';
  error?: string;
}

export default function SOPComparisonTool({ user, onBack }: SOPComparisonToolProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [sop1, setSop1] = useState('');
  const [sop2, setSop2] = useState('');
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [aiComparisonResult, setAiComparisonResult] = useState<SOPComparisonResponse | null>(null);
  const [expandedDiffs, setExpandedDiffs] = useState<Set<number>>(new Set());
  const [comparisonMode, setComparisonMode] = useState<'ai' | 'deterministic'>('ai');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Direct extraction functions for better error handling
  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    return fullText.trim();
  };

  const extractTextFromWord = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const processFile = async (file: File): Promise<UploadedFile> => {
    const base: UploadedFile = {
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      title: file.name.replace(/\.[^.]+$/, ''),
      content: '',
      version: '1.0',
      status: 'processing'
    };

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx');

    if (!isPdf && !isDocx) {
      return { ...base, status: 'error', error: 'Only PDF and DOCX files are supported.' };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { ...base, status: 'error', error: 'File too large (max 10 MB).' };
    }

    try {
      let content = '';
      if (isPdf) {
        content = await extractTextFromPDF(file);
      } else {
        content = await extractTextFromWord(file);
      }
      
      // Extract version from filename
      const versionMatch = file.name.match(/v?(\d+\.?\d*)/i);
      const version = versionMatch ? versionMatch[1] : '1.0';
      
      return {
        ...base,
        title: file.name.replace(/\.[^.]+$/, ''),
        content,
        version,
        status: 'completed'
      };
    } catch (err) {
      console.error('Document extraction error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract document content.';
      return { ...base, status: 'error', error: errorMessage };
    }
  };

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList) return;

    const existing = [...files];
    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(fileList)) {
      if (existing.some(f => f.name === file.name && f.size === file.size)) {
        continue;
      }
      const processed = await processFile(file);
      newFiles.push(processed);
    }

    const combined = [...existing, ...newFiles].slice(0, 5);
    setFiles(combined);
  };

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      addFiles(e.dataTransfer.files);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    if (sop1 === id) setSop1('');
    if (sop2 === id) setSop2('');
  };

  const compareSOPs = async () => {
    if (!sop1 || !sop2) return;

    const file1 = files.find(f => f.id === sop1);
    const file2 = files.find(f => f.id === sop2);

    if (!file1 || !file2) return;

    setComparisonLoading(true);
    setComparisonResult(null);
    setAiComparisonResult(null);
    setError(null);

    try {
      if (comparisonMode === 'ai') {
        // AI-powered comparison using Claude
        const result = await complianceQueryService.compareSOPs(
          { id: file1.id, title: file1.title, content: file1.content, version: file1.version },
          { id: file2.id, title: file2.title, content: file2.content, version: file2.version }
        );
        setAiComparisonResult(result);
      } else {
        // Deterministic comparison using local engine
        const doc1 = await extractDocument(file1.file);
        const doc2 = await extractDocument(file2.file);
        const result = compareDocuments(doc1, doc2);
        setComparisonResult(result);
      }
    } catch (err) {
      console.error('Comparison error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Comparison failed';
      setError(errorMessage);
    } finally {
      setComparisonLoading(false);
    }
  };

  const toggleDiff = (idx: number) => {
    const newExpanded = new Set(expandedDiffs);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedDiffs(newExpanded);
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'NO_CHANGE': return 'bg-gray-100 text-gray-600';
      case 'EDITORIAL': return 'bg-blue-100 text-blue-700';
      case 'SUBSTANTIVE': return 'bg-amber-100 text-amber-700';
      case 'RELOCATED': return 'bg-purple-100 text-purple-700';
      case 'NEW': return 'bg-green-100 text-green-700';
      case 'RETIRED': return 'bg-red-100 text-red-700';
      case 'MANUAL_REVIEW': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getClassificationLabel = (classification: string) => {
    switch (classification) {
      case 'NO_CHANGE': return 'No Change';
      case 'EDITORIAL': return 'Editorial';
      case 'SUBSTANTIVE': return 'Substantive';
      case 'RELOCATED': return 'Relocated';
      case 'NEW': return 'New';
      case 'RETIRED': return 'Retired';
      case 'MANUAL_REVIEW': return 'Manual Review';
      default: return classification;
    }
  };

  const completedFiles = files.filter(f => f.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <GitCompare className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">SOP Comparison Tool</h1>
              <p className="text-purple-200 text-sm">Compare SOPs side-by-side</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="font-semibold">{user.name}</p>
            <p className="text-purple-200 text-sm">{user.organization}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Feature Cards */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6 border border-pink-200">
          <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-pink-600" />
            SOP Comparison Mode Features 🔄 <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">NEW!</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-semibold text-pink-900 mb-1">🔄 Side-by-side Comparison</h4>
              <p className="text-gray-600">Upload two SOP versions and see them compared section by section. AI identifies every change, addition, and deletion.</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-semibold text-pink-900 mb-1">🎨 Visual Difference Highlighting</h4>
              <p className="text-gray-600">Changes are color-coded and clearly marked. See exactly what text was modified, added, or removed between versions.</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-semibold text-pink-900 mb-1">⚠️ Severity Indicators</h4>
              <p className="text-gray-600">Each change is classified as High, Medium, or Low priority based on compliance impact and operational significance.</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-semibold text-pink-900 mb-1">🚨 Critical Changes Alert</h4>
              <p className="text-gray-600">High-priority changes are highlighted at the top with clear warnings about compliance implications and required actions.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-semibold text-pink-900 mb-1">📊 Impact Assessment</h4>
              <p className="text-gray-600">AI analyzes the business and compliance impact of each change, helping prioritize review and implementation efforts.</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-semibold text-pink-900 mb-1">✅ Recommended Actions</h4>
              <p className="text-gray-600">Get specific, actionable recommendations for each change including training needs, validation requirements, and timeline suggestions.</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-semibold text-pink-900 mb-1">📄 Export Report</h4>
              <p className="text-gray-600">Generate comprehensive comparison reports for change control documentation, regulatory submissions, and team reviews.</p>
            </div>
          </div>
        </div>

        {/* Header Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <GitCompare className="w-8 h-8" />
            <h2 className="text-2xl font-bold">SOP Comparison Tool</h2>
          </div>
          <p className="text-purple-100">
            Compare two SOPs side-by-side to identify differences, track changes, and ensure compliance
          </p>
        </div>

        {/* Upload + Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          {/* File Uploader */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Upload SOPs</h3>
            <p className="text-sm text-gray-600 mb-4">
              Drag and drop PDF or DOCX SOPs here, then pick which versions you want to compare below.
            </p>
            
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/40'
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-semibold text-purple-700">Click to upload</span>
                  <span className="mx-1">or</span>
                  <span>drag and drop SOP files</span>
                </div>
                <p className="text-xs text-gray-500">PDF or DOCX, up to 10 MB, max 5 files</p>
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleChange}
                />
              </div>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-purple-600" />
                  Uploaded SOPs
                </h4>
                <ul className="space-y-2">
                  {files.map(file => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between border rounded-lg px-3 py-2 bg-white"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            file.status === 'completed'
                              ? 'bg-green-100 text-green-600'
                              : file.status === 'processing'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {file.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : file.status === 'processing' ? (
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.title}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)} • v{file.version}
                            {file.error && <span className="text-red-600 ml-2">{file.error}</span>}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Selection */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Select SOPs to Compare</h3>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  SOP 1 (Baseline)
                </label>
                <select
                  value={sop1}
                  onChange={(e) => setSop1(e.target.value)}
                  disabled={completedFiles.length < 2}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">{completedFiles.length < 2 ? 'Upload at least two SOPs...' : 'Select SOP...'}</option>
                  {completedFiles.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  SOP 2 (Comparison)
                </label>
                <select
                  value={sop2}
                  onChange={(e) => setSop2(e.target.value)}
                  disabled={completedFiles.length < 2}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">{completedFiles.length < 2 ? 'Upload at least two SOPs...' : 'Select SOP...'}</option>
                  {completedFiles.map((file) => (
                    <option
                      key={file.id}
                      value={file.id}
                      disabled={file.id === sop1}
                    >
                      {file.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Mode Toggle */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Comparison Mode</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setComparisonMode('ai')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                    comparisonMode === 'ai' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <Sparkles className={`w-6 h-6 ${comparisonMode === 'ai' ? 'text-purple-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <p className={`font-bold ${comparisonMode === 'ai' ? 'text-purple-900' : 'text-gray-700'}`}>AI-Powered</p>
                    <p className="text-xs text-gray-500">Claude analysis with recommendations</p>
                  </div>
                </button>
                <button
                  onClick={() => setComparisonMode('deterministic')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                    comparisonMode === 'deterministic' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <Cpu className={`w-6 h-6 ${comparisonMode === 'deterministic' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <p className={`font-bold ${comparisonMode === 'deterministic' ? 'text-blue-900' : 'text-gray-700'}`}>Deterministic</p>
                    <p className="text-xs text-gray-500">Audit-safe with full trail</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Comparison Error</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            <button
              onClick={compareSOPs}
              disabled={!sop1 || !sop2 || comparisonLoading}
              className={`w-full px-6 py-3 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 ${
                comparisonMode === 'ai' 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
              }`}
            >
              {comparisonLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {comparisonMode === 'ai' ? 'AI Analyzing...' : 'Comparing...'}
                </>
              ) : (
                <>
                  {comparisonMode === 'ai' ? <Sparkles className="w-5 h-5" /> : <GitCompare className="w-5 h-5" />}
                  {comparisonMode === 'ai' ? 'Compare with AI' : 'Compare (Deterministic)'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Comparison Results */}
        {aiComparisonResult && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Comparison Summary
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{aiComparisonResult.summary.totalSections}</p>
                  <p className="text-xs text-gray-600">Total Sections</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{aiComparisonResult.summary.identicalSections}</p>
                  <p className="text-xs text-gray-600">Identical</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{aiComparisonResult.summary.modifiedSections}</p>
                  <p className="text-xs text-gray-600">Modified</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{aiComparisonResult.summary.newSections}</p>
                  <p className="text-xs text-gray-600">New</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{aiComparisonResult.summary.removedSections}</p>
                  <p className="text-xs text-gray-600">Removed</p>
                </div>
              </div>

              {/* Critical Changes Alert */}
              {aiComparisonResult.criticalChanges.length > 0 && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="font-bold text-red-900 mb-2">Critical Changes Detected</p>
                      <ul className="space-y-1">
                        {aiComparisonResult.criticalChanges.map((change, idx) => (
                          <li key={idx} className="text-sm text-red-800">• {change}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Differences */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Differences</h3>
              <div className="space-y-4">
                {aiComparisonResult.differences.map((diff, idx) => (
                  <div key={idx} className={`border-2 rounded-xl p-5 ${
                    diff.severity === 'high' ? 'bg-red-50 border-red-300' :
                    diff.severity === 'medium' ? 'bg-yellow-50 border-yellow-300' :
                    'bg-blue-50 border-blue-300'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-lg">{diff.section}</h4>
                      <div className="flex gap-2">
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                          diff.type === 'modified' ? 'bg-yellow-200 text-yellow-800' :
                          diff.type === 'new' ? 'bg-blue-200 text-blue-800' :
                          'bg-red-200 text-red-800'
                        }`}>{diff.type.toUpperCase()}</span>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                          diff.severity === 'high' ? 'bg-red-200 text-red-800' :
                          diff.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-blue-200 text-blue-800'
                        }`}>{diff.severity.toUpperCase()}</span>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-3">
                      <div className="bg-white rounded-lg p-3 border">
                        <p className="text-xs font-bold text-gray-600 mb-1">Previous</p>
                        <p className="text-sm">{diff.sop1Text || <span className="italic text-gray-400">Not present</span>}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <p className="text-xs font-bold text-purple-600 mb-1">New</p>
                        <p className="text-sm">{diff.sop2Text || <span className="italic text-gray-400">Removed</span>}</p>
                      </div>
                    </div>
                    
                    <div className="bg-white/50 rounded-lg p-3">
                      <p className="text-xs font-bold text-gray-700 mb-1">Impact</p>
                      <p className="text-sm">{diff.impact}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {aiComparisonResult.recommendations.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">AI Recommendations</h3>
                <div className="space-y-3">
                  {aiComparisonResult.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-800">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deterministic Comparison Results */}
        {comparisonResult && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Comparison Summary</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{comparisonResult.summary.totalBlocks}</p>
                  <p className="text-xs text-gray-600">Total</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">{comparisonResult.summary.unchanged}</p>
                  <p className="text-xs text-gray-600">Unchanged</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{comparisonResult.summary.editorial}</p>
                  <p className="text-xs text-gray-600">Editorial</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{comparisonResult.summary.substantive}</p>
                  <p className="text-xs text-gray-600">Substantive</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{comparisonResult.summary.relocated}</p>
                  <p className="text-xs text-gray-600">Relocated</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{comparisonResult.summary.new}</p>
                  <p className="text-xs text-gray-600">New</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{comparisonResult.summary.retired}</p>
                  <p className="text-xs text-gray-600">Retired</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{comparisonResult.summary.manualReview}</p>
                  <p className="text-xs text-gray-600">Review</p>
                </div>
              </div>

              {/* Manual Review Alert */}
              {comparisonResult.summary.manualReview > 0 && (
                <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="font-bold text-orange-900 mb-1">Manual Review Required</p>
                      <p className="text-sm text-orange-800">
                        {comparisonResult.summary.manualReview} section(s) could not be automatically matched and require manual verification.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Differences */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Detailed Differences</h3>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>

              <div className="space-y-3">
                {comparisonResult.changes.map((change, idx) => (
                  <div 
                    key={idx} 
                    className={`border-2 rounded-xl overflow-hidden ${
                      change.classification === 'SUBSTANTIVE' ? 'border-amber-300' :
                      change.classification === 'MANUAL_REVIEW' ? 'border-orange-300' :
                      change.classification === 'RETIRED' ? 'border-red-300' :
                      change.classification === 'NEW' ? 'border-green-300' :
                      'border-gray-200'
                    }`}
                  >
                    <button
                      onClick={() => toggleDiff(idx)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">{change.sectionId}</span>
                        <span className="text-gray-600">–</span>
                        <span className="text-gray-700">{change.sectionTitle}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getClassificationColor(change.classification)}`}>
                          {getClassificationLabel(change.classification)}
                        </span>
                        {change.manualReviewRequired && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700">
                            ⚠️ Review
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Confidence: {Math.round(change.confidence * 100)}%</span>
                        <Eye className="w-4 h-4" />
                      </div>
                    </button>

                    {expandedDiffs.has(idx) && (
                      <div className="border-t p-4 bg-gray-50">
                        {/* Audit Trail Info */}
                        <div className="mb-4 p-3 bg-white rounded-lg border text-xs">
                          <p className="font-semibold text-gray-700 mb-1">Audit Trail</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-gray-600">
                            <span>Match: {change.matchTier}</span>
                            <span>Confidence: {Math.round(change.confidence * 100)}%</span>
                            {change.auditTrail.jaccardScore && <span>Jaccard: {(change.auditTrail.jaccardScore * 100).toFixed(1)}%</span>}
                            {change.auditTrail.tfidfScore && <span>TF-IDF: {(change.auditTrail.tfidfScore * 100).toFixed(1)}%</span>}
                          </div>
                        </div>

                        {/* Side-by-side comparison */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                            <p className="text-xs font-bold text-gray-600 mb-2">Previous Version</p>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                              {change.oldContent || <span className="italic text-gray-500">Section not present</span>}
                            </p>
                          </div>

                          <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                            <p className="text-xs font-bold text-purple-600 mb-2">New Version</p>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                              {change.newContent || <span className="italic text-gray-500">Section removed</span>}
                            </p>
                          </div>
                        </div>

                        {/* Keyword Delta */}
                        {change.auditTrail.keywordDeltaDetails && (
                          <div className="mt-4 p-3 bg-white rounded-lg border">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Keyword Changes Detected</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {change.auditTrail.keywordDeltaDetails.obligationChanged && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded">Obligation Changed</span>
                              )}
                              {change.auditTrail.keywordDeltaDetails.roleChanged && (
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">Role Changed</span>
                              )}
                              {change.auditTrail.keywordDeltaDetails.timingChanged && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Timing Changed</span>
                              )}
                              {change.auditTrail.keywordDeltaDetails.thresholdChanged && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Threshold Changed</span>
                              )}
                              {change.auditTrail.keywordDeltaDetails.recordsChanged && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Records Changed</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {comparisonResult.changes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="font-semibold">No differences found</p>
                    <p className="text-sm">The two documents appear to be identical.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
