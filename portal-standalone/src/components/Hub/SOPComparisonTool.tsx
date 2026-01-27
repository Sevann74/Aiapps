import React, { useState, useCallback, useRef } from 'react';
import { ArrowLeft, GitCompare, Upload, FileText, X, CheckCircle, AlertCircle, FileUp, Download, ArrowRight, AlertTriangle, Info, Eye, Sparkles, Cpu } from 'lucide-react';
import { extractDocument, compareDocuments, type ComparisonResult, type SectionChange as LegacySectionChange } from '../../lib/documentExtractor';
import { complianceQueryService, type SOPChangeForSummary, type SOPChangeSummary } from '../../lib/complianceQueryService';
import { extractDocument as extractSectionedDocument, compareDocumentsCombined, type SimpleComparisonResult, type SectionChange, type ChangeSignificance, type ChangeCategory, type FullTextComparisonResult, type ChangeRegion } from '../../lib/simpleDocumentCompare';
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
  const [hybridResult, setHybridResult] = useState<SimpleComparisonResult | null>(null);
  const [showSubstantiveOnly, setShowSubstantiveOnly] = useState(false);
  const [showEditorialOnly, setShowEditorialOnly] = useState(false);
  const [aiSummaries, setAiSummaries] = useState<SOPChangeSummary[] | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [expandedDiffs, setExpandedDiffs] = useState<Set<number>>(new Set());
  const [comparisonMode, setComparisonMode] = useState<'ai' | 'deterministic'>('ai');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const summarizeChangesInBatches = async (params: {
    sop1Meta: { id: string; title: string; version?: string };
    sop2Meta: { id: string; title: string; version?: string };
    changes: SOPChangeForSummary[];
  }): Promise<SOPChangeSummary[]> => {
    const batchSize = 12;
    const all: SOPChangeSummary[] = [];

    for (let i = 0; i < params.changes.length; i += batchSize) {
      const batch = params.changes.slice(i, i + batchSize);
      const resp = await complianceQueryService.summarizeSOPChanges({
        sop1: params.sop1Meta,
        sop2: params.sop2Meta,
        changes: batch,
      });

      if (resp?.summaries?.length) {
        all.push(...resp.summaries);
      }
    }

    return all;
  };

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
    setHybridResult(null);
    setAiSummaries(null);
    setAiSummaryError(null);
    setError(null);

    try {
      if (comparisonMode === 'ai') {
        // Never-miss approach: full-text diff with section markers
        // Guarantees no changes are missed while providing section context
        const result = await compareDocumentsCombined(file1.file, file2.file);
        setHybridResult(result);

        const changesForAI: SOPChangeForSummary[] = result.changes.map((c: SectionChange) => ({
          sectionId: c.sectionId,
          sectionTitle: c.sectionTitle,
          changeType: c.changeType,
          oldContent: c.oldContent || '',
          newContent: c.newContent || '',
        }));

        if (changesForAI.length > 0) {
          setAiSummaryLoading(true);
          try {
            const summaries = await summarizeChangesInBatches({
              sop1Meta: { id: file1.id, title: file1.title, version: file1.version },
              sop2Meta: { id: file2.id, title: file2.title, version: file2.version },
              changes: changesForAI,
            });
            setAiSummaries(summaries);
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'AI summary failed';
            setAiSummaryError(msg);
          } finally {
            setAiSummaryLoading(false);
          }
        }
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

  const exportToWord = async () => {
    if (!hybridResult) return;
    
    const file1 = files.find(f => f.id === sop1);
    const file2 = files.find(f => f.id === sop2);
    
    // Build HTML content for the Word document
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>SOP Comparison Report</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.4; }
          h1 { color: #6B21A8; font-size: 18pt; margin-bottom: 10pt; }
          h2 { color: #1F2937; font-size: 14pt; margin-top: 16pt; margin-bottom: 8pt; border-bottom: 1px solid #E5E7EB; padding-bottom: 4pt; }
          h3 { color: #374151; font-size: 12pt; margin-top: 12pt; margin-bottom: 6pt; }
          .summary-table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
          .summary-table td, .summary-table th { border: 1px solid #D1D5DB; padding: 6pt 10pt; text-align: center; }
          .summary-table th { background-color: #F3F4F6; font-weight: bold; }
          .change-section { margin: 12pt 0; padding: 10pt; border: 1px solid #E5E7EB; border-radius: 4pt; page-break-inside: avoid; }
          .substantive { border-left: 4pt solid #F97316; background-color: #FFF7ED; }
          .editorial { border-left: 4pt solid #3B82F6; background-color: #EFF6FF; }
          .badge { display: inline-block; padding: 2pt 6pt; border-radius: 3pt; font-size: 9pt; font-weight: bold; margin-right: 4pt; }
          .badge-added { background-color: #D1FAE5; color: #065F46; }
          .badge-removed { background-color: #FEE2E2; color: #991B1B; }
          .badge-modified { background-color: #FEF3C7; color: #92400E; }
          .badge-substantive { background-color: #FFEDD5; color: #C2410C; }
          .badge-editorial { background-color: #DBEAFE; color: #1E40AF; }
          .key-changes { background-color: #FEF9C3; padding: 8pt; margin: 8pt 0; border-radius: 4pt; }
          .content-box { background-color: #F9FAFB; padding: 8pt; margin: 6pt 0; border: 1px solid #E5E7EB; }
          .highlight-added { background-color: #BBF7D0; font-weight: bold; }
          .highlight-removed { background-color: #FECACA; text-decoration: line-through; }
          .two-column { display: table; width: 100%; }
          .column { display: table-cell; width: 48%; vertical-align: top; padding: 6pt; }
          .old-version { border: 1px solid #D1D5DB; }
          .new-version { border: 1px solid #A855F7; }
        </style>
      </head>
      <body>
        <h1>SOP Comparison Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Previous Version:</strong> ${file1?.title || 'Unknown'} (v${file1?.version || '?'})</p>
        <p><strong>New Version:</strong> ${file2?.title || 'Unknown'} (v${file2?.version || '?'})</p>
        
        <h2>Summary</h2>
        <table class="summary-table">
          <tr>
            <th>Total Sections</th>
            <th>Unchanged</th>
            <th>Modified</th>
            <th>Added</th>
            <th>Removed</th>
            <th>Substantive</th>
            <th>Editorial</th>
          </tr>
          <tr>
            <td>${hybridResult.summary.totalSections}</td>
            <td>${hybridResult.summary.unchanged}</td>
            <td>${hybridResult.summary.modified}</td>
            <td>${hybridResult.summary.added}</td>
            <td>${hybridResult.summary.removed}</td>
            <td style="background-color: #FFEDD5; font-weight: bold;">${hybridResult.summary.substantive}</td>
            <td>${hybridResult.summary.editorial}</td>
          </tr>
        </table>
        
        <h2>Detailed Changes</h2>
    `;
    
    // Add each change
    for (const change of hybridResult.changes) {
      const significanceClass = change.significance === 'substantive' ? 'substantive' : 'editorial';
      const typeBadgeClass = change.changeType === 'added' ? 'badge-added' : change.changeType === 'removed' ? 'badge-removed' : 'badge-modified';
      const significanceBadgeClass = change.significance === 'substantive' ? 'badge-substantive' : 'badge-editorial';
      
      html += `
        <div class="change-section ${significanceClass}">
          <h3>${change.sectionNumber || change.sectionId} – ${change.sectionTitle}</h3>
          <p>
            <span class="badge ${typeBadgeClass}">${change.changeType.toUpperCase()}</span>
            <span class="badge ${significanceBadgeClass}">${change.significance.toUpperCase()}</span>
            <span class="badge" style="background-color: #F3F4F6; color: #374151;">${change.category.charAt(0).toUpperCase() + change.category.slice(1)}</span>
          </p>
      `;
      
      // Key changes
      if (change.keyChanges && change.keyChanges.length > 0) {
        html += `<div class="key-changes"><strong>Key Changes:</strong><ul>`;
        for (const kc of change.keyChanges) {
          html += `<li>${kc}</li>`;
        }
        html += `</ul></div>`;
      }
      
      // Word-level diff
      if (change.diffParts && change.diffParts.length > 0) {
        html += `<div class="content-box"><strong>Changes Highlighted:</strong><p>`;
        for (const part of change.diffParts) {
          if (part.added) {
            html += `<span class="highlight-added">${escapeHtml(part.value)}</span>`;
          } else if (part.removed) {
            html += `<span class="highlight-removed">${escapeHtml(part.value)}</span>`;
          } else {
            html += escapeHtml(part.value);
          }
        }
        html += `</p></div>`;
      }
      
      // Side by side
      html += `
        <div class="two-column">
          <div class="column old-version">
            <p><strong>Previous Version:</strong></p>
            <p>${change.oldContent ? escapeHtml(change.oldContent) : '<em>Section not present</em>'}</p>
          </div>
          <div class="column new-version">
            <p><strong>New Version:</strong></p>
            <p>${change.newContent ? escapeHtml(change.newContent) : '<em>Section removed</em>'}</p>
          </div>
        </div>
      `;
      
      html += `</div>`;
    }
    
    html += `
        <hr style="margin-top: 24pt;">
        <p style="font-size: 9pt; color: #6B7280;">
          This report was generated by the SOP Comparison Tool. 
          Changes marked as <strong>SUBSTANTIVE</strong> may require training review.
          Changes marked as <strong>EDITORIAL</strong> are typically formatting or wording updates.
        </p>
      </body>
      </html>
    `;
    
    // Create blob and download
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOP_Comparison_${file1?.title || 'doc1'}_vs_${file2?.title || 'doc2'}_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  };

  const renderHybridChange = (change: SectionChange, idx: number) => {
    const isExpanded = expandedDiffs.has(idx);
    const summary = aiSummaries?.find(s => s.sectionId === change.sectionId && s.changeType === change.changeType);
    
    const typeBadge =
      change.changeType === 'added'
        ? 'bg-green-100 text-green-700'
        : change.changeType === 'removed'
          ? 'bg-red-100 text-red-700'
          : 'bg-amber-100 text-amber-700';

    const significanceBadge = change.significance === 'substantive'
      ? 'bg-orange-100 text-orange-700 border border-orange-300'
      : 'bg-blue-100 text-blue-600';

    const categoryLabel = change.category.charAt(0).toUpperCase() + change.category.slice(1);

    return (
      <div key={idx} className={`border-2 rounded-xl overflow-hidden ${
        change.significance === 'substantive' ? 'border-orange-300' : 'border-gray-200'
      }`}>
        <button
          onClick={() => toggleDiff(idx)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900">{change.sectionNumber || change.sectionId}</span>
            <span className="text-gray-600">–</span>
            <span className="text-gray-700 truncate max-w-xs">{change.sectionTitle}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeBadge}`}>{String(change.changeType).toUpperCase()}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${significanceBadge}`}>{change.significance.toUpperCase()}</span>
            <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{categoryLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {summary && <span className="text-purple-600 font-medium">AI: {Math.round(summary.confidence)}%</span>}
            <Eye className="w-4 h-4" />
          </div>
        </button>

        {isExpanded && (
          <div className="border-t p-4 bg-gray-50">
            {/* Key Changes Summary */}
            {change.keyChanges && change.keyChanges.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-semibold text-yellow-800 mb-1">Key Changes</p>
                <ul className="text-sm text-yellow-900 space-y-1">
                  {change.keyChanges.map((kc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-yellow-600">•</span>
                      <span>{kc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Summary */}
            {summary && (
              <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-purple-900">AI Summary</p>
                  <span className="text-xs font-bold text-purple-700">Confidence: {Math.round(summary.confidence)}%</span>
                </div>
                <p className="text-sm text-purple-900">{summary.summary}</p>
                {(summary.evidenceOld || summary.evidenceNew) && (
                  <div className="mt-2 text-xs text-purple-700 flex gap-4">
                    {summary.evidenceOld && <span>Old: "{summary.evidenceOld}"</span>}
                    {summary.evidenceNew && <span>New: "{summary.evidenceNew}"</span>}
                  </div>
                )}
              </div>
            )}

            {/* Word-level diff with highlighting */}
            {change.diffParts && change.diffParts.length > 0 && (
              <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
                <p className="text-xs font-semibold text-gray-700 mb-2">Word-Level Changes</p>
                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {change.diffParts.map((part: any, i: number) => (
                    <span 
                      key={i} 
                      className={
                        part.added 
                          ? 'bg-green-200 text-green-900 font-semibold px-0.5 rounded' 
                          : part.removed 
                            ? 'bg-red-200 text-red-900 line-through px-0.5 rounded' 
                            : ''
                      }
                    >
                      {part.value}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
          </div>
        )}
      </div>
    );
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
                    <p className={`font-bold ${comparisonMode === 'ai' ? 'text-purple-900' : 'text-gray-700'}`}>Never Miss (Deterministic + AI Summary)</p>
                    <p className="text-xs text-gray-500">Deterministic finds every change; AI summarizes only</p>
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
                  {comparisonMode === 'ai' ? 'Compare (Never Miss)' : 'Compare (Deterministic)'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Never Miss Results - Full Text Diff with Section Context */}
        {comparisonMode === 'ai' && hybridResult && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Never Miss Comparison</h3>
                    <p className="text-purple-200 text-sm">Every change detected • Full document coverage</p>
                  </div>
                </div>
                <button
                  onClick={() => exportToWord()}
                  className="px-4 py-2 bg-white text-purple-700 rounded-lg font-semibold hover:bg-purple-50 transition-all flex items-center gap-2 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold">{hybridResult.fullTextResult?.summary.totalChanges || hybridResult.changes.length}</p>
                  <p className="text-xs text-purple-200">Changes</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold text-green-300">{hybridResult.fullTextResult?.summary.wordsAdded || hybridResult.summary.added}</p>
                  <p className="text-xs text-purple-200">Words Added</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold text-red-300">{hybridResult.fullTextResult?.summary.wordsRemoved || hybridResult.summary.removed}</p>
                  <p className="text-xs text-purple-200">Words Removed</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold text-orange-300">{hybridResult.fullTextResult?.summary.substantive || hybridResult.summary.substantive}</p>
                  <p className="text-xs text-purple-200">Substantive</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold text-blue-300">{hybridResult.fullTextResult?.summary.editorial || hybridResult.summary.editorial}</p>
                  <p className="text-xs text-purple-200">Editorial</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold">{hybridResult.fullTextResult?.summary.sectionsAffected || hybridResult.summary.modified + hybridResult.summary.added + hybridResult.summary.removed}</p>
                  <p className="text-xs text-purple-200">Sections</p>
                </div>
              </div>
            </div>

            {/* Full-Text Diff View */}
            {hybridResult.fullTextResult && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Full Document Diff
                  </h3>
                  <p className="text-slate-300 text-sm">Inline view showing all changes with highlighting</p>
                </div>
                <div className="p-6 max-h-[500px] overflow-y-auto bg-slate-50">
                  <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
                    {hybridResult.fullTextResult.fullDiff.map((part, idx) => (
                      <span
                        key={idx}
                        className={
                          part.added
                            ? 'bg-green-200 text-green-900 px-0.5 rounded border-b-2 border-green-400'
                            : part.removed
                              ? 'bg-red-200 text-red-900 line-through px-0.5 rounded'
                              : 'text-slate-700'
                        }
                      >
                        {part.value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Section Navigation */}
            {hybridResult.fullTextResult && hybridResult.fullTextResult.sections.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Sections with Changes
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {hybridResult.fullTextResult.sections.filter(s => s.hasChanges).map((section, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:border-purple-400 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-purple-900 truncate">{section.title}</span>
                        <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                          {section.changeCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Change Regions - Grouped by Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Change Details by Section</h3>
                {/* Filter Toggles */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowSubstantiveOnly(!showSubstantiveOnly); setShowEditorialOnly(false); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      showSubstantiveOnly 
                        ? 'bg-orange-600 text-white' 
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Substantive
                  </button>
                  <button
                    onClick={() => { setShowEditorialOnly(!showEditorialOnly); setShowSubstantiveOnly(false); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      showEditorialOnly 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    <Info className="w-3 h-3" />
                    Editorial
                  </button>
                  {(showSubstantiveOnly || showEditorialOnly) && (
                    <button
                      onClick={() => { setShowSubstantiveOnly(false); setShowEditorialOnly(false); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      All
                    </button>
                  )}
                </div>
              </div>

              {/* Change Regions List */}
              {hybridResult.fullTextResult && (
                <div className="space-y-3 mt-4">
                  {(() => {
                    let regions = hybridResult.fullTextResult.changeRegions;
                    if (showSubstantiveOnly) {
                      regions = regions.filter(r => r.significance === 'substantive');
                    } else if (showEditorialOnly) {
                      regions = regions.filter(r => r.significance === 'editorial');
                    }
                    
                    // Group by parent section
                    const grouped = regions.reduce((acc, region) => {
                      if (!acc[region.parentSection]) acc[region.parentSection] = [];
                      acc[region.parentSection].push(region);
                      return acc;
                    }, {} as Record<string, ChangeRegion[]>);
                    
                    if (Object.keys(grouped).length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                          <p className="font-semibold">No differences found</p>
                          <p className="text-sm">The two documents appear to be identical.</p>
                        </div>
                      );
                    }
                    
                    return Object.entries(grouped).map(([section, sectionRegions]) => (
                      <div key={section} className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* Section Header */}
                        <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-600" />
                              <span className="font-semibold text-slate-800">{section}</span>
                            </div>
                            <span className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-full">
                              {sectionRegions.length} change{sectionRegions.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        
                        {/* Changes in this section */}
                        <div className="divide-y divide-gray-100">
                          {sectionRegions.map((region, idx) => (
                            <div key={region.id} className="p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start gap-3">
                                {/* Change type indicator */}
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  region.changeType === 'added' ? 'bg-green-100' :
                                  region.changeType === 'removed' ? 'bg-red-100' : 'bg-amber-100'
                                }`}>
                                  {region.changeType === 'added' ? (
                                    <span className="text-green-600 font-bold text-sm">+</span>
                                  ) : region.changeType === 'removed' ? (
                                    <span className="text-red-600 font-bold text-sm">−</span>
                                  ) : (
                                    <span className="text-amber-600 font-bold text-sm">~</span>
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  {/* Badges row */}
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                      region.changeType === 'added' ? 'bg-green-100 text-green-700' :
                                      region.changeType === 'removed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {region.changeType.toUpperCase()}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                      region.significance === 'substantive' 
                                        ? 'bg-orange-100 text-orange-700 border border-orange-300' 
                                        : 'bg-blue-100 text-blue-600'
                                    }`}>
                                      {region.significance.toUpperCase()}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                      {region.category}
                                    </span>
                                  </div>
                                  
                                  {/* Descriptor */}
                                  <p className="text-sm font-medium text-gray-800 mb-2">{region.descriptor}</p>
                                  
                                  {/* Diff preview */}
                                  <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs">
                                    {region.oldText && (
                                      <div className="mb-2">
                                        <span className="text-red-600 bg-red-100 px-1 rounded line-through">
                                          {region.oldText.length > 150 ? region.oldText.substring(0, 150) + '...' : region.oldText}
                                        </span>
                                      </div>
                                    )}
                                    {region.newText && (
                                      <div>
                                        <span className="text-green-600 bg-green-100 px-1 rounded">
                                          {region.newText.length > 150 ? region.newText.substring(0, 150) + '...' : region.newText}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Fallback to section-based changes if no full-text result */}
              {!hybridResult.fullTextResult && (
                <div className="space-y-3 mt-4">
                  {hybridResult.changes.map((change, idx) => renderHybridChange(change, idx))}
                </div>
              )}

              {aiSummaryLoading && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  Generating AI summaries…
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deterministic Comparison Results */}
        {comparisonMode === 'deterministic' && comparisonResult && (
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
