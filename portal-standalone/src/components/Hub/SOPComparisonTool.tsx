import React, { useState, useCallback, useRef } from 'react';
import { ArrowLeft, GitCompare, Upload, FileText, X, CheckCircle, AlertCircle, FileUp, Download, ArrowRight, AlertTriangle, Info, Eye, ChevronDown, ChevronRight, Sparkles, Shield } from 'lucide-react';
import { extractDocument, compareDocuments, type ComparisonResult, type SectionChange as LegacySectionChange } from '../../lib/documentExtractor';
import { extractDocument as extractSectionedDocument, compareDocumentsCombined, type SimpleComparisonResult, type SectionChange, type ChangeSignificance, type ChangeCategory, type FullTextComparisonResult, type ChangeRegion } from '../../lib/simpleDocumentCompare';
import { compareDocumentFilesWithAI, type AIComparisonResult, type AIDetectedChange } from '../../lib/aiDocumentCompare';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use cdnjs with legacy js format
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

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
  const [expandedDiffs, setExpandedDiffs] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedEditorial, setExpandedEditorial] = useState<Set<string>>(new Set());
  const [expandedDiffDetails, setExpandedDiffDetails] = useState<Set<string>>(new Set());
  const [showFullDiff, setShowFullDiff] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [hideExactWording, setHideExactWording] = useState(false);
  const [includeAppendix, setIncludeAppendix] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  // AI Comparison state
  const [useAIComparison, setUseAIComparison] = useState(true); // Default to AI mode
  const [aiResult, setAiResult] = useState<AIComparisonResult | null>(null);
  const [aiComparisonLoading, setAiComparisonLoading] = useState(false);

  // Batch related changes within the same section (group by changeSummary)
  const getBatchedChanges = (changes: ChangeRegion[] | undefined, significance: 'substantive' | 'editorial') => {
    if (!changes) return [];
    const filtered = changes.filter(c => c.significance === significance);
    
    // Group by changeSummary to batch related changes
    const grouped = new Map<string, ChangeRegion[]>();
    for (const change of filtered) {
      const key = change.changeSummary || change.descriptor;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(change);
    }
    
    // Convert to array of batched changes
    return Array.from(grouped.entries()).map(([summary, items]) => ({
      summary,
      items,
      count: items.length,
      changeNature: items[0].changeNature,
      affectedArea: items[0].affectedArea,
      suggestedAction: items[0].suggestedAction,
      category: items[0].category
    }));
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Toggle editorial section within a section
  const toggleEditorial = (sectionId: string) => {
    setExpandedEditorial(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Toggle diff detail view
  const toggleDiffDetail = (regionId: string) => {
    setExpandedDiffDetails(prev => {
      const next = new Set(prev);
      if (next.has(regionId)) {
        next.delete(regionId);
      } else {
        next.add(regionId);
      }
      return next;
    });
  };

  // Calculate change breakdown for a section
  const getSectionChangeBreakdown = (sectionTitle: string) => {
    if (!hybridResult?.fullTextResult?.changeRegions) return { procedural: 0, editorial: 0 };
    const sectionChanges = hybridResult.fullTextResult.changeRegions.filter(
      r => r.parentSection === sectionTitle
    );
    return {
      procedural: sectionChanges.filter(c => c.significance === 'substantive').length,
      editorial: sectionChanges.filter(c => c.significance === 'editorial').length
    };
  };

  // Get sorted sections - procedural first, then editorial-only
  const getSortedSections = () => {
    if (!hybridResult?.fullTextResult?.sections) return [];
    const sectionsWithChanges = hybridResult.fullTextResult.sections.filter(s => s.hasChanges);
    
    return sectionsWithChanges.sort((a, b) => {
      const aBreakdown = getSectionChangeBreakdown(a.title);
      const bBreakdown = getSectionChangeBreakdown(b.title);
      // Sort by procedural count descending, then by total changes
      if (bBreakdown.procedural !== aBreakdown.procedural) {
        return bBreakdown.procedural - aBreakdown.procedural;
      }
      return b.changeCount - a.changeCount;
    });
  };

  // Get the section with most procedural changes
  const getMostImpactedSection = () => {
    if (!hybridResult?.fullTextResult?.sections) return null;
    const sectionsWithChanges = hybridResult.fullTextResult.sections.filter(s => s.hasChanges);
    let maxProcedural = 0;
    let mostImpacted = null;
    
    for (const section of sectionsWithChanges) {
      const breakdown = getSectionChangeBreakdown(section.title);
      if (breakdown.procedural > maxProcedural) {
        maxProcedural = breakdown.procedural;
        mostImpacted = section;
      }
    }
    return mostImpacted;
  };

  // Get review recommendation
  const getReviewRecommendation = () => {
    if (!hybridResult) return { needsReview: false, message: '' };
    const substantive = hybridResult.fullTextResult?.summary.substantive || hybridResult.summary.substantive || 0;
    const removed = hybridResult.summary.removed || 0;
    
    if (substantive > 0 || removed > 0) {
      return { 
        needsReview: true, 
        message: 'Review required'
      };
    }
    return { 
      needsReview: false, 
      message: 'Low risk - editorial only'
    };
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
    setAiComparisonLoading(useAIComparison);
    setComparisonResult(null);
    setHybridResult(null);
    setAiResult(null);
    setError(null);

    try {
      if (useAIComparison) {
        // AI-powered comparison with verification
        console.log('Starting AI-powered comparison...');
        const aiComparisonResult = await compareDocumentFilesWithAI(file1.file, file2.file);
        setAiResult(aiComparisonResult);
        console.log('AI comparison complete:', aiComparisonResult.summary);
      } else {
        // Traditional diff-based comparison
        const result = await compareDocumentsCombined(file1.file, file2.file);
        setHybridResult(result);
      }
    } catch (err) {
      console.error('Comparison error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Comparison failed';
      setError(errorMessage);
    } finally {
      setComparisonLoading(false);
      setAiComparisonLoading(false);
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

  // Export Delta Training Pack
  const exportDeltaTrainingPack = async (includeFullComparison: boolean = false) => {
    if (!hybridResult) return;
    
    const file1 = files.find(f => f.id === sop1);
    const file2 = files.find(f => f.id === sop2);
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Get procedural and editorial changes
    const proceduralChanges = hybridResult.fullTextResult?.changeRegions?.filter(c => c.significance === 'substantive') || [];
    const editorialChanges = hybridResult.fullTextResult?.changeRegions?.filter(c => c.significance === 'editorial') || [];
    const sectionsAffected = hybridResult.fullTextResult?.summary.sectionsAffected || 
      (hybridResult.summary.modified + hybridResult.summary.added + hybridResult.summary.removed);
    
    // Determine training status
    const trainingRequired = proceduralChanges.length > 0;
    const trainingStatus = proceduralChanges.length === 0 ? 'NOT REQUIRED' : 
      proceduralChanges.length <= 3 ? 'REQUIRED (partial)' : 'REQUIRED (comprehensive)';
    
    // Get most impacted section
    const sectionCounts = new Map<string, number>();
    proceduralChanges.forEach(c => {
      sectionCounts.set(c.parentSection, (sectionCounts.get(c.parentSection) || 0) + 1);
    });
    const mostImpactedSection = Array.from(sectionCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    // Batch changes by summary for the impact table
    const batchedProcedural = getBatchedChanges(hybridResult.fullTextResult?.changeRegions, 'substantive');
    const batchedEditorial = getBatchedChanges(hybridResult.fullTextResult?.changeRegions, 'editorial');
    
    // Build HTML content for the Delta Training Pack
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Delta Training Pack</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1F2937; }
          h1 { color: #6B21A8; font-size: 20pt; margin-bottom: 6pt; border-bottom: 3px solid #6B21A8; padding-bottom: 8pt; }
          h2 { color: #1F2937; font-size: 14pt; margin-top: 20pt; margin-bottom: 10pt; background-color: #F3F4F6; padding: 8pt 12pt; }
          h3 { color: #374151; font-size: 12pt; margin-top: 14pt; margin-bottom: 6pt; }
          .executive-box { background-color: #FEF3C7; border: 2px solid #F59E0B; padding: 16pt; margin: 16pt 0; }
          .status-required { background-color: #FEE2E2; color: #991B1B; font-weight: bold; padding: 4pt 8pt; display: inline-block; }
          .status-not-required { background-color: #D1FAE5; color: #065F46; font-weight: bold; padding: 4pt 8pt; display: inline-block; }
          .impact-table { border-collapse: collapse; width: 100%; margin: 12pt 0; font-size: 10pt; }
          .impact-table td, .impact-table th { border: 1px solid #D1D5DB; padding: 8pt; text-align: left; vertical-align: top; }
          .impact-table th { background-color: #6B21A8; color: white; font-weight: bold; }
          .impact-table tr:nth-child(even) { background-color: #F9FAFB; }
          .procedural-row { border-left: 4px solid #F97316; }
          .editorial-row { border-left: 4px solid #3B82F6; }
          .training-scope { background-color: #EFF6FF; border: 1px solid #3B82F6; padding: 12pt; margin: 12pt 0; }
          .scope-include { color: #065F46; }
          .scope-exclude { color: #6B7280; }
          .checklist { background-color: #F9FAFB; padding: 12pt; margin: 12pt 0; border: 1px solid #E5E7EB; }
          .checklist-item { margin: 8pt 0; font-size: 11pt; }
          .checkbox { display: inline-block; width: 14pt; height: 14pt; border: 2px solid #6B7280; margin-right: 8pt; vertical-align: middle; }
          .evidence-section { background-color: #FFF7ED; border: 1px solid #FDBA74; padding: 12pt; margin: 12pt 0; page-break-inside: avoid; }
          .highlight-added { background-color: #BBF7D0; }
          .highlight-removed { background-color: #FECACA; text-decoration: line-through; }
          .page-break { page-break-before: always; }
          .footer { font-size: 9pt; color: #6B7280; margin-top: 24pt; border-top: 1px solid #E5E7EB; padding-top: 8pt; }
          .bullet { margin-left: 16pt; }
        </style>
      </head>
      <body>
        <!-- PAGE 1: EXECUTIVE CHANGE SUMMARY -->
        <h1>Delta Training Pack</h1>
        <p style="font-size: 10pt; color: #6B7280;">Generated: ${today}</p>
        
        <div class="executive-box">
          <h2 style="margin-top: 0; background: none; padding: 0;">Executive Change Summary</h2>
          <table style="width: 100%; border: none; margin: 12pt 0;">
            <tr>
              <td style="border: none; width: 30%;"><strong>Document:</strong></td>
              <td style="border: none;">${file1?.title || 'SOP Document'}</td>
            </tr>
            <tr>
              <td style="border: none;"><strong>Version Comparison:</strong></td>
              <td style="border: none;">v${file1?.version || '1.0'} → v${file2?.version || '2.0'}</td>
            </tr>
            <tr>
              <td style="border: none;"><strong>Effective Date:</strong></td>
              <td style="border: none;">${today}</td>
            </tr>
          </table>
          
          <h3>Change Classification Summary</h3>
          <ul style="margin: 8pt 0;">
            <li><strong>${proceduralChanges.length}</strong> procedural changes detected</li>
            <li><strong>${editorialChanges.length}</strong> editorial changes</li>
            <li><strong>${sectionsAffected}</strong> sections affected</li>
            <li>Primary impact area: <strong>${mostImpactedSection}</strong></li>
          </ul>
          
          <h3>Training Status</h3>
          <p>
            <span class="${trainingRequired ? 'status-required' : 'status-not-required'}">
              Training Update: ${trainingStatus}
            </span>
          </p>
        </div>
        
        <!-- PAGE 2: CHANGE-BY-CHANGE IMPACT TABLE -->
        <div class="page-break"></div>
        <h2>Change-by-Change Impact Table</h2>
        <p style="font-size: 10pt; color: #6B7280;">Each row represents one meaningful change. This replaces word-by-word review.</p>
        
        <table class="impact-table">
          <tr>
            <th style="width: 20%;">Section</th>
            <th style="width: 35%;">Change Statement</th>
            <th style="width: 15%;">Type</th>
            <th style="width: 15%;">Training Impact</th>
            <th style="width: 15%;">Action</th>
          </tr>
    `;
    
    // Add procedural changes to impact table
    for (const batch of batchedProcedural) {
      const trainingImpact = 'Required';
      html += `
          <tr class="procedural-row">
            <td>${batch.affectedArea}</td>
            <td>${batch.summary}${batch.count > 1 ? ` <em>(${batch.count} related changes)</em>` : ''}</td>
            <td><strong style="color: #C2410C;">Procedural</strong></td>
            <td><strong style="color: #991B1B;">${trainingImpact}</strong></td>
            <td>${batch.suggestedAction}</td>
          </tr>
      `;
    }
    
    // Add editorial changes (summarized)
    if (batchedEditorial.length > 0) {
      html += `
          <tr class="editorial-row">
            <td>Various</td>
            <td>${editorialChanges.length} editorial/formatting changes</td>
            <td>Editorial</td>
            <td>None</td>
            <td>No action required</td>
          </tr>
      `;
    }
    
    html += `
        </table>
        
        <!-- DELTA TRAINING SCOPE -->
        <h2>Delta Training Scope</h2>
        <div class="training-scope">
          <h3 class="scope-include" style="margin-top: 0;">Training update SHOULD address:</h3>
          <ul>
    `;
    
    // List what training should address
    const uniqueSummaries = new Set<string>();
    for (const batch of batchedProcedural) {
      if (!uniqueSummaries.has(batch.summary)) {
        uniqueSummaries.add(batch.summary);
        html += `<li>${batch.summary}</li>`;
      }
    }
    if (uniqueSummaries.size === 0) {
      html += `<li><em>No procedural changes requiring training updates</em></li>`;
    }
    
    html += `
          </ul>
          
          <h3 class="scope-exclude">Training does NOT need to address:</h3>
          <ul>
            <li>Editorial wording changes (${editorialChanges.length} identified)</li>
            <li>Formatting changes</li>
            <li>Reordered sections without content change</li>
            <li>Typographical corrections</li>
          </ul>
        </div>
        
        <!-- TRAINING UPDATE CHECKLIST -->
        <h2>Training Update Checklist</h2>
        <div class="checklist">
          <div class="checklist-item"><span class="checkbox"></span> Training content updated to reflect delta</div>
          <div class="checklist-item"><span class="checkbox"></span> Assessment updated (if applicable)</div>
          <div class="checklist-item"><span class="checkbox"></span> SME review completed</div>
          <div class="checklist-item"><span class="checkbox"></span> QA approval recorded</div>
          <div class="checklist-item"><span class="checkbox"></span> LMS deployment completed</div>
          <div class="checklist-item"><span class="checkbox"></span> Training effectiveness verified</div>
        </div>
        
        <div class="footer">
          <p><strong>Document Control:</strong> This Delta Training Pack is for decision-making; the full comparison is for evidence.</p>
          <p>Generated by Document Change Review Tool | ${today}</p>
        </div>
    `;
    
    // APPENDIX: Reference Evidence (only if includeFullComparison is true)
    if (includeFullComparison && batchedProcedural.length > 0) {
      html += `
        <div class="page-break"></div>
        <h2>Appendix: Reference Evidence</h2>
        <p style="font-size: 10pt; color: #6B7280;">Sentence-level before/after excerpts for procedural changes. This section matches the UI format for audit evidence.</p>
        
        <style>
          .change-card { border: 2px solid #FDBA74; border-radius: 8pt; margin: 16pt 0; overflow: hidden; page-break-inside: avoid; }
          .change-header { background-color: #FFF7ED; padding: 12pt; border-bottom: 1px solid #FDBA74; }
          .change-type { font-size: 9pt; color: #C2410C; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5pt; margin-bottom: 4pt; }
          .change-summary { font-size: 12pt; font-weight: bold; color: #1F2937; margin-bottom: 6pt; }
          .change-action { font-size: 10pt; color: #C2410C; font-weight: 600; }
          .sentence-context { padding: 12pt; }
          .sentence-box { border: 1px solid #FED7AA; border-radius: 6pt; margin: 8pt 0; overflow: hidden; }
          .sentence-before { background-color: #FEF2F2; padding: 10pt; border-bottom: 1px solid #FED7AA; }
          .sentence-after { background-color: #F0FDF4; padding: 10pt; }
          .sentence-label { font-size: 9pt; color: #6B7280; font-weight: 600; margin-bottom: 4pt; }
          .sentence-text { font-size: 10pt; color: #374151; font-style: italic; }
          .word-evidence { background-color: #F9FAFB; padding: 12pt; border-top: 1px solid #E5E7EB; }
          .word-label { font-size: 9pt; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5pt; margin-bottom: 8pt; }
          .word-removed { background-color: #FEE2E2; padding: 6pt 8pt; border-radius: 4pt; margin: 4pt 0; font-size: 9pt; }
          .word-added { background-color: #DCFCE7; padding: 6pt 8pt; border-radius: 4pt; margin: 4pt 0; font-size: 9pt; }
        </style>
      `;
      
      // Group by section for better organization
      const sectionGroups = new Map<string, typeof batchedProcedural>();
      for (const batch of batchedProcedural) {
        const section = batch.items[0]?.parentSection || 'General';
        if (!sectionGroups.has(section)) {
          sectionGroups.set(section, []);
        }
        sectionGroups.get(section)!.push(batch);
      }
      
      for (const [sectionName, batches] of sectionGroups) {
        html += `<h3 style="color: #C2410C; margin-top: 20pt;">${sectionName}</h3>`;
        
        for (const batch of batches) {
          html += `
            <div class="change-card">
              <!-- LAYER 1: Change Statement -->
              <div class="change-header">
                <div class="change-type">Procedural Change${batch.count > 1 ? ` (${batch.count} related)` : ''}</div>
                <div class="change-summary">${escapeHtml(batch.summary)}</div>
                <div class="change-action">Action: ${escapeHtml(batch.suggestedAction)}</div>
              </div>
              
              <!-- LAYER 2: Sentence-Level Context -->
              <div class="sentence-context">
          `;
          
          // Show up to 3 sentence pairs
          const itemsToShow = batch.items.slice(0, 3);
          for (const item of itemsToShow) {
            html += `
                <div class="sentence-box">
                  ${item.oldSentence ? `
                    <div class="sentence-before">
                      <div class="sentence-label">Before (v1.0):</div>
                      <div class="sentence-text">"${escapeHtml(item.oldSentence)}"</div>
                    </div>
                  ` : ''}
                  ${item.newSentence ? `
                    <div class="sentence-after">
                      <div class="sentence-label">After (v2.0):</div>
                      <div class="sentence-text">"${escapeHtml(item.newSentence)}"</div>
                    </div>
                  ` : ''}
                </div>
            `;
          }
          
          if (batch.items.length > 3) {
            html += `<p style="font-size: 9pt; color: #6B7280; font-style: italic;">+ ${batch.items.length - 3} more related changes</p>`;
          }
          
          html += `
              </div>
              
              <!-- LAYER 3: Word-Level Evidence -->
              <div class="word-evidence">
                <div class="word-label">Word-Level Evidence</div>
          `;
          
          for (const item of batch.items) {
            if (item.oldText) {
              html += `<div class="word-removed"><strong style="color: #991B1B;">Removed:</strong> ${escapeHtml(item.oldText)}</div>`;
            }
            if (item.newText) {
              html += `<div class="word-added"><strong style="color: #166534;">Added:</strong> ${escapeHtml(item.newText)}</div>`;
            }
          }
          
          html += `
              </div>
            </div>
          `;
        }
      }
    }
    
    html += `
      </body>
      </html>
    `;
    
    // Create blob and download
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Delta_Training_Pack_${file1?.title || 'SOP'}_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Legacy export function (kept for backward compatibility)
  const exportToWord = async () => {
    exportDeltaTrainingPack(false);
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

  // Export AI Delta Training Pack
  const exportAIDeltaTrainingPack = async () => {
    if (!aiResult) return;
    
    const file1 = files.find(f => f.id === sop1);
    const file2 = files.find(f => f.id === sop2);
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timestamp = new Date().toISOString();
    
    // Separate verified and unverified changes
    const verifiedSubstantive = aiResult.contentChanges.filter(c => c.verified && c.significance === 'substantive');
    const unverifiedSubstantive = aiResult.contentChanges.filter(c => !c.verified && c.significance === 'substantive');
    const verifiedEditorial = aiResult.contentChanges.filter(c => c.verified && c.significance === 'editorial');
    const verifiedMetadata = aiResult.metadataChanges.filter(c => c.verified);
    const unverifiedMetadata = aiResult.metadataChanges.filter(c => !c.verified);
    
    // Determine training status based on VERIFIED changes only
    const trainingRequired = verifiedSubstantive.length > 0;
    const trainingStatus = verifiedSubstantive.length === 0 ? 'NOT REQUIRED' : 
      verifiedSubstantive.length <= 3 ? 'REQUIRED (partial)' : 'REQUIRED (comprehensive)';
    
    // Get most impacted section from verified changes
    const sectionCounts = new Map<string, number>();
    verifiedSubstantive.forEach(c => {
      const section = c.section || 'General';
      sectionCounts.set(section, (sectionCounts.get(section) || 0) + 1);
    });
    const mostImpactedSection = Array.from(sectionCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    // Build HTML content for the Change Impact Delta Pack
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Change Impact Delta Pack</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1F2937; }
          h1 { color: #1E3A5F; font-size: 18pt; margin-bottom: 6pt; border-bottom: 2px solid #1E3A5F; padding-bottom: 6pt; }
          h2 { color: #1F2937; font-size: 13pt; margin-top: 18pt; margin-bottom: 8pt; background-color: #F3F4F6; padding: 6pt 10pt; }
          h3 { color: #374151; font-size: 11pt; margin-top: 12pt; margin-bottom: 6pt; }
          .verified-badge { background-color: #10B981; color: white; padding: 2pt 6pt; font-size: 8pt; border-radius: 3pt; }
          .unverified-badge { background-color: #F59E0B; color: white; padding: 2pt 6pt; font-size: 8pt; border-radius: 3pt; }
          .executive-box { background-color: #F8FAFC; border: 1px solid #CBD5E1; padding: 12pt; margin: 12pt 0; }
          .warning-box { background-color: #FEF3C7; border: 1px solid #F59E0B; padding: 10pt; margin: 10pt 0; }
          .status-required { background-color: #FEE2E2; color: #991B1B; font-weight: bold; padding: 4pt 8pt; display: inline-block; }
          .status-not-required { background-color: #D1FAE5; color: #065F46; font-weight: bold; padding: 4pt 8pt; display: inline-block; }
          .change-table { border-collapse: collapse; width: 100%; margin: 10pt 0; font-size: 10pt; table-layout: fixed; }
          .change-table td, .change-table th { border: 1px solid #D1D5DB; padding: 6pt; text-align: left; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }
          .change-table th { background-color: #1E3A5F; color: white; font-weight: bold; }
          .change-table tr:nth-child(even) { background-color: #F9FAFB; }
          .substantive-row { border-left: 4px solid #F97316; }
          .editorial-row { border-left: 4px solid #6B7280; }
          .metadata-row { border-left: 4px solid #3B82F6; }
          .old-value { background-color: #FEE2E2; padding: 6pt; border-radius: 3pt; margin: 4pt 0; }
          .new-value { background-color: #D1FAE5; padding: 6pt; border-radius: 3pt; margin: 4pt 0; }
          .impact-note { background-color: #F1F5F9; padding: 6pt; border-radius: 3pt; margin: 4pt 0; font-size: 9pt; border-left: 2px solid #64748B; }
          .page-break { page-break-before: always; }
          .footer { font-size: 9pt; color: #6B7280; margin-top: 24pt; border-top: 1px solid #E5E7EB; padding-top: 8pt; }
          .verification-summary { background-color: #F0FDF4; border: 1px solid #10B981; padding: 10pt; margin: 10pt 0; }
          .doc-comparison { display: table; width: 100%; margin: 10pt 0; }
          .doc-box { display: table-cell; width: 48%; padding: 10pt; vertical-align: top; }
          .doc-old { background-color: #FEF2F2; border: 1px solid #FECACA; }
          .doc-new { background-color: #F0FDF4; border: 1px solid #BBF7D0; }
        </style>
      </head>
      <body>
        <!-- PAGE 1: EXECUTIVE CHANGE SUMMARY -->
        <h1>Change Impact Delta Pack</h1>
        <p style="font-size: 10pt; color: #6B7280;">Generated: ${today} | Automated change detection with source verification</p>
        
        <div class="executive-box">
          <h2 style="margin-top: 0; background: none; padding: 0; color: #1E3A5F;">Executive Change Summary</h2>
          
          <!-- Document Version Comparison -->
          <div class="doc-comparison">
            <div class="doc-box doc-old">
              <p style="font-size: 9pt; color: #991B1B; margin: 0 0 4pt 0;"><strong>ORIGINAL DOCUMENT</strong></p>
              <p style="margin: 4pt 0;"><strong>${escapeHtml(aiResult.oldMetadata.title || file1?.title || 'Unknown')}</strong></p>
              <p style="font-size: 10pt; margin: 2pt 0;">Version: ${escapeHtml(aiResult.oldMetadata.version || 'N/A')}</p>
              <p style="font-size: 10pt; margin: 2pt 0;">Effective: ${escapeHtml(aiResult.oldMetadata.effectiveDate || 'N/A')}</p>
            </div>
            <div class="doc-box doc-new">
              <p style="font-size: 9pt; color: #166534; margin: 0 0 4pt 0;"><strong>REVISED DOCUMENT</strong></p>
              <p style="margin: 4pt 0;"><strong>${escapeHtml(aiResult.newMetadata.title || file2?.title || 'Unknown')}</strong></p>
              <p style="font-size: 10pt; margin: 2pt 0;">Version: ${escapeHtml(aiResult.newMetadata.version || 'N/A')}</p>
              <p style="font-size: 10pt; margin: 2pt 0;">Effective: ${escapeHtml(aiResult.newMetadata.effectiveDate || 'N/A')}</p>
            </div>
          </div>
          
          <h3>Change Classification Summary</h3>
          <div class="verification-summary">
            <p style="margin: 0 0 6pt 0;"><strong>Source-Verified Changes:</strong></p>
            <ul style="margin: 4pt 0 10pt 20pt;">
              <li><strong>${verifiedSubstantive.length}</strong> substantive (impacting) changes <span class="verified-badge">✓ VERIFIED</span></li>
              <li><strong>${verifiedEditorial.length}</strong> editorial / formatting changes <span class="verified-badge">✓ VERIFIED</span></li>
              <li><strong>${verifiedMetadata.length}</strong> document control changes <span class="verified-badge">✓ VERIFIED</span></li>
            </ul>
            <p style="font-size: 9pt; color: #065F46; margin: 0;">
              <strong>${aiResult.summary.verified} of ${aiResult.summary.totalChanges}</strong> changes verified against source documents
            </p>
          </div>
          
          <p style="margin: 8pt 0;">Primary impact area: <strong>${escapeHtml(mostImpactedSection)}</strong></p>
          
          <h3>Training Status</h3>
          <p>
            <span class="${trainingRequired ? 'status-required' : 'status-not-required'}">
              Training Update: ${trainingStatus}
            </span>
          </p>
          <p style="font-size: 9pt; color: #6B7280; margin-top: 6pt;">
            Training determination is based solely on verified substantive changes affecting procedures or access controls.
          </p>
        </div>
    `;
    
    // Document Control Changes Section
    if (verifiedMetadata.length > 0) {
      html += `
        <h2>Document Control Changes <span class="verified-badge">✓ VERIFIED</span></h2>
        <p style="font-size: 10pt; color: #6B7280;">Changes to document headers, version info, and metadata</p>
        
        <table class="change-table">
          <tr>
            <th style="width: 25%;">Field</th>
            <th style="width: 30%;">Previous Value</th>
            <th style="width: 30%;">New Value</th>
            <th style="width: 15%;">Status</th>
          </tr>
      `;
      
      for (const change of verifiedMetadata) {
        html += `
          <tr class="metadata-row">
            <td><strong>${escapeHtml(change.description)}</strong><br><span style="font-size: 9pt; color: #6B7280;">${escapeHtml(change.section || '')}</span></td>
            <td><div class="old-value">${escapeHtml(change.oldValue || '(empty)')}</div></td>
            <td><div class="new-value">${escapeHtml(change.newValue || '(empty)')}</div></td>
            <td><span class="verified-badge">✓ Verified</span></td>
          </tr>
        `;
      }
      
      html += `</table>`;
    }
    
    // Verified Procedural and Policy Changes Section
    if (verifiedSubstantive.length > 0) {
      html += `
        <div class="page-break"></div>
        <h2>Procedural and Policy Changes - Training Required <span class="verified-badge">✓ VERIFIED</span></h2>
        <p style="font-size: 10pt; color: #6B7280;">Changes affecting procedures, requirements, or compliance</p>
        
        <table class="change-table">
          <tr>
            <th style="width: 20%;">Section</th>
            <th style="width: 25%;">Change</th>
            <th style="width: 20%;">Old Value</th>
            <th style="width: 20%;">New Value</th>
            <th style="width: 15%;">Category</th>
          </tr>
      `;
      
      for (const change of verifiedSubstantive) {
        html += `
          <tr class="substantive-row">
            <td><strong>${escapeHtml(change.sectionNumber || '')}</strong><br><span style="font-size: 9pt;">${escapeHtml(change.section || '')}</span></td>
            <td>
              <strong>${escapeHtml(change.description)}</strong>
              ${change.impact ? `<div class="impact-note"><strong>Impact:</strong> ${escapeHtml(change.impact)}</div>` : ''}
            </td>
            <td><div class="old-value">${escapeHtml(change.oldValue || '(none - added)')}</div></td>
            <td><div class="new-value">${escapeHtml(change.newValue || '(none - removed)')}</div></td>
            <td><span style="background-color: #EDE9FE; padding: 2pt 6pt; border-radius: 3pt; font-size: 9pt;">${escapeHtml(change.category || 'general')}</span></td>
          </tr>
        `;
      }
      
      html += `</table>`;
    }
    
    // Unverified Changes Section (with warning)
    if (unverifiedSubstantive.length > 0 || unverifiedMetadata.length > 0) {
      html += `
        <div class="page-break"></div>
        <h2>Changes Requiring Review <span class="unverified-badge">⚠ REQUIRES REVIEW</span></h2>
        
        <div class="warning-box">
          <p style="margin: 0;"><strong>⚠ CAUTION:</strong> The following changes could not be automatically verified against the source documents. 
          Please manually review these before including in training materials.</p>
        </div>
      `;
      
      if (unverifiedSubstantive.length > 0) {
        html += `
          <h3>Unverified Procedural and Policy Changes</h3>
          <table class="change-table">
            <tr>
              <th style="width: 20%;">Section</th>
              <th style="width: 30%;">Change</th>
              <th style="width: 20%;">Old Value</th>
              <th style="width: 20%;">New Value</th>
              <th style="width: 10%;">Status</th>
            </tr>
        `;
        
        for (const change of unverifiedSubstantive) {
          html += `
            <tr style="background-color: #FFFBEB;">
              <td>${escapeHtml(change.sectionNumber || '')} ${escapeHtml(change.section || '')}</td>
              <td>${escapeHtml(change.description)}</td>
              <td><div class="old-value">${escapeHtml(change.oldValue || '(none)')}</div></td>
              <td><div class="new-value">${escapeHtml(change.newValue || '(none)')}</div></td>
              <td><span class="unverified-badge">⚠ Unverified</span></td>
            </tr>
          `;
        }
        
        html += `</table>`;
      }
      
      if (unverifiedMetadata.length > 0) {
        html += `
          <h3>Unverified Metadata Changes</h3>
          <table class="change-table">
            <tr>
              <th>Field</th>
              <th>Old Value</th>
              <th>New Value</th>
              <th>Status</th>
            </tr>
        `;
        
        for (const change of unverifiedMetadata) {
          html += `
            <tr style="background-color: #FFFBEB;">
              <td>${escapeHtml(change.description)}</td>
              <td><div class="old-value">${escapeHtml(change.oldValue || '(empty)')}</div></td>
              <td><div class="new-value">${escapeHtml(change.newValue || '(empty)')}</div></td>
              <td><span class="unverified-badge">⚠ Unverified</span></td>
            </tr>
          `;
        }
        
        html += `</table>`;
      }
    }
    
    // Analysis Summary
    if (aiResult.aiAnalysis) {
      html += `
        <div class="page-break"></div>
        <h2>Change Analysis Summary</h2>
        <div style="background-color: #F5F3FF; border: 1px solid #C4B5FD; padding: 16pt; border-radius: 4pt;">
          <p style="margin: 0;">${escapeHtml(aiResult.aiAnalysis)}</p>
        </div>
      `;
    }
    
    // Footer with audit trail
    html += `
        <div class="footer">
          <p><strong>Change Impact Delta Pack</strong></p>
          <p>Part of CapNorth Hub – Controlled Document Change & Training Impact Suite</p>
          <p>Generated: ${timestamp}</p>
          <p>Methodology: Automated change detection with source verification</p>
          <p>Verification Rate: ${aiResult.summary.verified} of ${aiResult.summary.totalChanges} changes verified (${Math.round((aiResult.summary.verified / aiResult.summary.totalChanges) * 100)}%)</p>
          <p style="font-size: 8pt; color: #9CA3AF;">Verified changes have been confirmed against source documents. 
          Changes requiring review should be manually verified before use in official training materials.</p>
        </div>
      </body>
      </html>
    `;
    
    // Create blob and download
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Change_Impact_Delta_Pack_${file1?.title || 'Document'}_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Render diff content - with proper table support
  const renderDiffContent = (
    fullDiff: Array<{ value: string; added?: boolean; removed?: boolean }>,
    newHtml?: string
  ) => {
    // Check if document has tables
    const hasTables = newHtml && newHtml.includes('<table');
    
    return (
      <div className="space-y-6">
        {/* Inline diff for text changes */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {fullDiff.map((part, idx) => (
            <span
              key={idx}
              className={
                part.added
                  ? 'bg-green-200 text-green-900 px-0.5 rounded font-medium'
                  : part.removed
                    ? 'bg-red-200 text-red-900 line-through px-0.5 rounded'
                    : 'text-slate-700'
              }
            >
              {part.value}
            </span>
          ))}
        </div>
        
        {/* Render tables if present */}
        {hasTables && (
          <div className="border-t pt-6">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Document Tables
            </h4>
            <div 
              className="prose prose-sm max-w-none overflow-x-auto"
              dangerouslySetInnerHTML={{ 
                __html: `<style>
                  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; }
                  th, td { border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; text-align: left; }
                  th { background-color: #f1f5f9; font-weight: 600; color: #334155; }
                  tr:nth-child(even) { background-color: #f8fafc; }
                  tr:hover { background-color: #f1f5f9; }
                </style>${newHtml.match(/<table[\s\S]*?<\/table>/gi)?.join('') || ''}` 
              }}
            />
          </div>
        )}
      </div>
    );
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
              <h1 className="text-xl font-bold">Change Impact Review</h1>
              <p className="text-purple-200 text-sm">Side-by-side comparison with full traceability and verification</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="font-semibold">{user.name}</p>
            <p className="text-purple-200 text-sm">{user.organization}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <GitCompare className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Change Impact Review</h2>
          </div>
          <p className="text-purple-100">
            Side-by-side comparison of controlled documents with full traceability and verification.
          </p>
        </div>

        {/* Upload + Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          {/* File Uploader */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Documents</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload two document versions to identify and validate all changes.
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
            <h3 className="text-lg font-bold text-gray-900 mb-4">Select Documents to Compare</h3>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Baseline Document (Approved)
                </label>
                <select
                  value={sop1}
                  onChange={(e) => setSop1(e.target.value)}
                  disabled={completedFiles.length < 2}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">{completedFiles.length < 2 ? 'Upload at least two documents...' : 'Select document...'}</option>
                  {completedFiles.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Comparison Document (Revised)
                </label>
                <select
                  value={sop2}
                  onChange={(e) => setSop2(e.target.value)}
                  disabled={completedFiles.length < 2}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">{completedFiles.length < 2 ? 'Upload at least two documents...' : 'Select document...'}</option>
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

            {/* Enhanced Comparison Toggle */}
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-purple-600" />
                  <div>
                    <p className="font-bold text-purple-900">Source-Verified Comparison</p>
                    <p className="text-sm text-purple-700">Comprehensive change detection with validation</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAIComparison}
                    onChange={(e) => setUseAIComparison(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              {useAIComparison && (
                <div className="mt-3 flex items-center gap-2 text-sm text-purple-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>All detected changes are validated against source documents</span>
                </div>
              )}
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
              className="w-full px-6 py-3 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {comparisonLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing Changes...
                </>
              ) : (
                <>
                  <GitCompare className="w-5 h-5" />
                  Run Change Impact Review
                </>
              )}
            </button>
          </div>
        </div>

        {/* Verified Comparison Results */}
        {aiResult && (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Verified Comparison Results</h2>
                    <p className="text-purple-200">All detected changes are validated against source documents.</p>
                  </div>
                </div>
                <button
                  onClick={exportAIDeltaTrainingPack}
                  className="px-4 py-2 bg-white text-purple-700 rounded-lg font-bold hover:bg-purple-50 transition-all flex items-center gap-2 shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  Export Delta Pack
                </button>
              </div>
              
              {/* Document Metadata Comparison */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-sm text-purple-200 mb-1">Original Document</p>
                  <p className="font-bold">{aiResult.oldMetadata.title || 'Unknown'}</p>
                  <p className="text-sm">Version: {aiResult.oldMetadata.version || 'N/A'}</p>
                  <p className="text-sm">Effective: {aiResult.oldMetadata.effectiveDate || 'N/A'}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-sm text-purple-200 mb-1">Modified Document</p>
                  <p className="font-bold">{aiResult.newMetadata.title || 'Unknown'}</p>
                  <p className="text-sm">Version: {aiResult.newMetadata.version || 'N/A'}</p>
                  <p className="text-sm">Effective: {aiResult.newMetadata.effectiveDate || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Change Summary</h3>
              <div className={`grid gap-4 ${aiResult.summary.unverified > 0 ? 'grid-cols-5' : 'grid-cols-4'}`}>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{aiResult.summary.totalChanges}</p>
                  <p className="text-sm text-blue-700">Total Changes</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-orange-600">{aiResult.summary.substantive}</p>
                  <p className="text-sm text-orange-700">Substantive (Impacting)</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-gray-600">{aiResult.summary.editorial}</p>
                  <p className="text-sm text-gray-700">Editorial / Formatting</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{aiResult.summary.verified}</p>
                  <p className="text-sm text-green-700">Source-Verified</p>
                </div>
                {aiResult.summary.unverified > 0 && (
                  <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-amber-600">{aiResult.summary.unverified}</p>
                    <p className="text-sm text-amber-700">Requires Review</p>
                  </div>
                )}
              </div>
            </div>

            {/* Document Control Changes */}
            {aiResult.metadataChanges.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-blue-600 text-white px-6 py-4">
                  <h3 className="text-lg font-bold">Document Control Changes</h3>
                  <p className="text-blue-200 text-sm">Version, effective date, and header changes</p>
                </div>
                <div className="p-6 space-y-4">
                  {aiResult.metadataChanges.map((change, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border-2 ${change.verified ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{change.description}</span>
                          {change.verified ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Source-Verified
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Requires Review</span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">{change.section}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-xs text-red-600 font-semibold mb-1">OLD VALUE</p>
                          <p className="text-red-800 font-mono">{change.oldValue || '(empty)'}</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <p className="text-xs text-green-600 font-semibold mb-1">NEW VALUE</p>
                          <p className="text-green-800 font-mono">{change.newValue || '(empty)'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Procedural and Policy Changes */}
            {aiResult.contentChanges.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-orange-600 text-white px-6 py-4">
                  <h3 className="text-lg font-bold">Procedural and Policy Changes</h3>
                  <p className="text-orange-200 text-sm">Changes affecting procedures, requirements, or compliance</p>
                </div>
                <div className="p-6 space-y-4">
                  {aiResult.contentChanges.map((change, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border-2 ${
                      change.significance === 'substantive' 
                        ? (change.verified ? 'border-orange-200 bg-orange-50' : 'border-amber-200 bg-amber-50')
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900">{change.description}</span>
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                            change.significance === 'substantive' 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {change.significance === 'substantive' ? 'Substantive' : 'Editorial'}
                          </span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                            {change.category}
                          </span>
                          {change.verified ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Source-Verified
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Requires Review</span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">{change.sectionNumber} {change.section}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-xs text-red-600 font-semibold mb-1">OLD VALUE</p>
                          <p className="text-red-800">{change.oldValue || '(none - added)'}</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <p className="text-xs text-green-600 font-semibold mb-1">NEW VALUE</p>
                          <p className="text-green-800">{change.newValue || '(none - removed)'}</p>
                        </div>
                      </div>
                      
                      {change.impact && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs text-blue-600 font-semibold mb-1">IMPACT</p>
                          <p className="text-blue-800 text-sm">{change.impact}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis Summary */}
            {aiResult.aiAnalysis && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Change Analysis Summary
                </h3>
                <p className="text-gray-700">{aiResult.aiAnalysis}</p>
              </div>
            )}

            {/* CapNorth Hub Differentiator */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl shadow-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                Designed for Regulated Environments
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Source-Verified Changes</p>
                    <p className="text-slate-300 text-sm">Every change validated against original documents</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Section-Level Traceability</p>
                    <p className="text-slate-300 text-sm">Clear attribution to document sections</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Export-Ready</p>
                    <p className="text-slate-300 text-sm">Audit and training impact assessment</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Traditional Comparison Results */}
        {hybridResult && (
          <div className="space-y-6">
            {/* Decision Panel - Primary Focus */}
            <div className="bg-white rounded-2xl shadow-xl border-l-4 border-orange-500 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-500 uppercase tracking-wide mb-2">Change Significance</h3>
                    {(() => {
                      const recommendation = getReviewRecommendation();
                      const substantive = hybridResult.fullTextResult?.summary.substantive || hybridResult.summary.substantive || 0;
                      return (
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${
                          recommendation.needsReview 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          <span className={`w-3 h-3 rounded-full ${recommendation.needsReview ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                          {recommendation.message}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowExportOptions(!showExportOptions)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export Delta Pack
                      <ChevronDown className={`w-4 h-4 transition-transform ${showExportOptions ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showExportOptions && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-10">
                        <h4 className="font-semibold text-gray-900 mb-3">Export Options</h4>
                        <label className="flex items-start gap-3 mb-4 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeAppendix}
                            onChange={(e) => setIncludeAppendix(e.target.checked)}
                            className="w-4 h-4 mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-700">Include full comparison as appendix</span>
                            <p className="text-xs text-gray-500 mt-0.5">Adds detailed before/after evidence for auditors</p>
                          </div>
                        </label>
                        <button
                          onClick={() => {
                            exportDeltaTrainingPack(includeAppendix);
                            setShowExportOptions(false);
                          }}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download Delta Training Pack
                        </button>
                        <p className="text-xs text-gray-400 mt-3 text-center">
                          The Delta Training Pack is for decision-making;<br/>the full comparison is for evidence.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="space-y-3 mb-6">
                  {(hybridResult.fullTextResult?.summary.substantive || hybridResult.summary.substantive || 0) > 0 && (
                    <div className="flex items-center gap-3 text-gray-800">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span><strong className="text-orange-700">{hybridResult.fullTextResult?.summary.substantive || hybridResult.summary.substantive}</strong> procedural changes detected</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-gray-800">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span><strong>{hybridResult.fullTextResult?.summary.sectionsAffected || (hybridResult.summary.modified + hybridResult.summary.added + hybridResult.summary.removed)}</strong> sections affected</span>
                  </div>
                  {(() => {
                    const mostImpacted = getMostImpactedSection();
                    if (mostImpacted) {
                      const breakdown = getSectionChangeBreakdown(mostImpacted.title);
                      if (breakdown.procedural > 0) {
                        return (
                          <div className="flex items-center gap-3 text-gray-800">
                            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                            <span>Majority of changes in: <strong>{mostImpacted.title}</strong></span>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>

                {/* Primary Action Button */}
                {!showSections && (
                  <button
                    onClick={() => setShowSections(true)}
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    Review Impacted Sections
                  </button>
                )}
              </div>
            </div>

            {/* Section Navigation - Only shown after clicking "Review Impacted Sections" */}
            {showSections && hybridResult.fullTextResult && hybridResult.fullTextResult.sections.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Impacted Sections
                  </h3>
                  <div className="flex items-center gap-4">
                    {/* Hide exact wording toggle for senior users */}
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideExactWording}
                        onChange={(e) => setHideExactWording(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Hide exact wording</span>
                    </label>
                    <button
                      onClick={() => setShowSections(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Collapse
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {getSortedSections().map((section, idx) => {
                    const breakdown = getSectionChangeBreakdown(section.title);
                    const isExpanded = expandedSections.has(section.id);
                    const hasProcedural = breakdown.procedural > 0;
                    const isEditorialExpanded = expandedEditorial.has(section.id);
                    
                    // Get changes for this section
                    const sectionChanges = hybridResult.fullTextResult?.changeRegions?.filter(
                      r => r.parentSection === section.title
                    ) || [];
                    const proceduralChanges = sectionChanges.filter(c => c.significance === 'substantive');
                    const editorialChanges = sectionChanges.filter(c => c.significance === 'editorial');
                    
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border-2 transition-all overflow-hidden ${
                          hasProcedural ? 'border-orange-200' : 'border-gray-200'
                        }`}
                      >
                        {/* Section Header - Collapsed Row */}
                        <button
                          onClick={() => toggleSection(section.id)}
                          className={`w-full p-4 flex items-center justify-between transition-colors ${
                            hasProcedural ? 'bg-orange-50 hover:bg-orange-100' : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-900">{section.title}</span>
                            {hasProcedural && (
                              <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 text-sm">
                              {breakdown.procedural > 0 && (
                                <span className="text-orange-700">
                                  {breakdown.procedural} procedural
                                </span>
                              )}
                              {breakdown.editorial > 0 && (
                                <span className="text-gray-500">
                                  {breakdown.editorial} editorial
                                </span>
                              )}
                            </div>
                            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        
                        {/* Expanded Section Content - Change Cards */}
                        {isExpanded && (
                          <div className="border-t bg-white">
                            {/* Procedural Changes - Batched Change Cards */}
                            {proceduralChanges.length > 0 && (() => {
                              const batchedProcedural = getBatchedChanges(sectionChanges, 'substantive');
                              return (
                                <div className="p-4 border-b border-gray-100">
                                  <h4 className="text-sm font-bold text-orange-700 mb-3 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                    Procedural Changes ({proceduralChanges.length})
                                  </h4>
                                  <div className="space-y-3">
                                    {batchedProcedural.map((batch, bIdx) => {
                                      const detailKey = `${section.id}-proc-batch-${bIdx}`;
                                      const showDetail = expandedDiffDetails.has(detailKey);
                                      return (
                                        <div key={bIdx} className="bg-white rounded-lg border-2 border-orange-200 overflow-hidden">
                                          {/* LAYER 1: Change Statement (Decision Layer) */}
                                          <div className="p-4 bg-orange-50">
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <div className="text-xs text-orange-600 font-medium uppercase tracking-wide mb-1">
                                                  Procedural Change {batch.count > 1 ? `(${batch.count} related)` : ''}
                                                </div>
                                                <h5 className="font-semibold text-gray-900 mb-2">{batch.summary}</h5>
                                                <p className="text-sm text-orange-700 font-medium">
                                                  Action: {batch.suggestedAction}
                                                </p>
                                              </div>
                                            </div>
                                            
                                            {/* LAYER 2: Sentence-Level Context (Default visible) */}
                                            <div className="mt-4 space-y-2">
                                              {batch.items.slice(0, 2).map((item, iIdx) => (
                                                <div key={iIdx} className="text-sm bg-white rounded-lg border border-orange-100 overflow-hidden">
                                                  {item.oldSentence && (
                                                    <div className="px-3 py-2 border-b border-orange-100 bg-red-50/50">
                                                      <span className="text-xs text-gray-500 font-medium">Before (v1.0):</span>
                                                      <p className="text-gray-700 mt-0.5">"{item.oldSentence}"</p>
                                                    </div>
                                                  )}
                                                  {item.newSentence && (
                                                    <div className="px-3 py-2 bg-green-50/50">
                                                      <span className="text-xs text-gray-500 font-medium">After (v2.0):</span>
                                                      <p className="text-gray-700 mt-0.5">"{item.newSentence}"</p>
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                              {batch.items.length > 2 && (
                                                <p className="text-xs text-gray-500 italic">+ {batch.items.length - 2} more related changes</p>
                                              )}
                                            </div>
                                            
                                            {/* LAYER 3: Word-level diff (Evidence - expandable) */}
                                            {!hideExactWording && (
                                              <button
                                                onClick={() => toggleDiffDetail(detailKey)}
                                                className="mt-3 text-xs text-orange-600 hover:text-orange-800 font-medium flex items-center gap-1"
                                              >
                                                <Eye className="w-3 h-3" />
                                                {showDetail ? 'Hide word-level diff' : 'View word-level diff (evidence)'}
                                              </button>
                                            )}
                                          </div>
                                          
                                          {/* LAYER 3 Content: Word-level diff blocks */}
                                          {showDetail && !hideExactWording && (
                                            <div className="p-4 bg-gray-50 border-t border-orange-200">
                                              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Word-Level Evidence</p>
                                              <div className="space-y-2">
                                                {batch.items.map((item, iIdx) => (
                                                  <div key={iIdx} className="text-xs space-y-1">
                                                    {item.oldText && (
                                                      <div className="bg-red-50 p-2 rounded border border-red-100">
                                                        <span className="text-red-600 font-medium">Removed: </span>
                                                        <span className="text-red-800">{item.oldText}</span>
                                                      </div>
                                                    )}
                                                    {item.newText && (
                                                      <div className="bg-green-50 p-2 rounded border border-green-100">
                                                        <span className="text-green-600 font-medium">Added: </span>
                                                        <span className="text-green-800">{item.newText}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                            
                            {/* Editorial Changes - Collapsed by default, simpler list */}
                            {editorialChanges.length > 0 && (
                              <div className="p-4">
                                <button
                                  onClick={() => toggleEditorial(section.id)}
                                  className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-gray-700"
                                >
                                  <span className="font-medium flex items-center gap-2">
                                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                    Editorial Changes ({editorialChanges.length})
                                  </span>
                                  <ChevronRight className={`w-4 h-4 transition-transform ${isEditorialExpanded ? 'rotate-90' : ''}`} />
                                </button>
                                
                                {isEditorialExpanded && (() => {
                                  const batchedEditorial = getBatchedChanges(sectionChanges, 'editorial');
                                  return (
                                    <div className="mt-3 space-y-2">
                                      {batchedEditorial.map((batch, bIdx) => {
                                        const detailKey = `${section.id}-edit-batch-${bIdx}`;
                                        const showDetail = expandedDiffDetails.has(detailKey);
                                        return (
                                          <div key={bIdx} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <p className="text-sm text-gray-700">
                                                  {batch.summary}
                                                  {batch.count > 1 && <span className="text-gray-400 ml-1">({batch.count})</span>}
                                                </p>
                                              </div>
                                              {!hideExactWording && (
                                                <button
                                                  onClick={() => toggleDiffDetail(detailKey)}
                                                  className="text-xs text-gray-500 hover:text-gray-700 font-medium ml-2 whitespace-nowrap"
                                                >
                                                  {showDetail ? 'Hide' : 'View wording'}
                                                </button>
                                              )}
                                            </div>
                                            {showDetail && !hideExactWording && (
                                              <div className="mt-2 pt-2 border-t border-gray-200 text-xs space-y-1">
                                                {batch.items.map((item, iIdx) => (
                                                  <div key={iIdx} className="space-y-1">
                                                    {item.oldText && (
                                                      <div className="bg-red-50 p-2 rounded border border-red-100">
                                                        <span className="text-red-600 font-medium">Was: </span>
                                                        <span className="text-red-800">{item.oldText}</span>
                                                      </div>
                                                    )}
                                                    {item.newText && (
                                                      <div className="bg-green-50 p-2 rounded border border-green-100">
                                                        <span className="text-green-600 font-medium">Now: </span>
                                                        <span className="text-green-800">{item.newText}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Supporting Evidence - Full Document Diff (Last Resort) */}
            {showSections && hybridResult.fullTextResult && (
              <div className="mt-10 pt-6 border-t-2 border-dashed border-gray-200">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Supporting Evidence</p>
                <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                  <button
                    onClick={() => setShowFullDiff(!showFullDiff)}
                    className="w-full px-5 py-3 flex items-center justify-between text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Eye className="w-4 h-4" />
                      <span className="font-medium">View Detailed Comparison</span>
                      <span className="text-gray-300">— for audit evidence only</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFullDiff ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showFullDiff && (
                    <>
                      <div className="px-5 py-2 bg-gray-100 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-500">
                        <span className="font-medium">Legend:</span>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">Added</span>
                        <span className="bg-red-100 text-red-700 line-through px-2 py-0.5 rounded">Removed</span>
                      </div>
                      <div className="p-5 max-h-[500px] overflow-y-auto bg-white border-t border-gray-200">
                        {renderDiffContent(hybridResult.fullTextResult.fullDiff, hybridResult.fullTextResult.newHtml)}
                      </div>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center italic">
                  The Delta Training Pack is for decision-making; this comparison is for evidence.
                </p>
              </div>
            )}

            {/* Fallback to section-based changes if no full-text result */}
            {!hybridResult.fullTextResult && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Section Changes</h3>
                <div className="space-y-3">
                  {hybridResult.changes.map((change, idx) => renderHybridChange(change, idx))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
