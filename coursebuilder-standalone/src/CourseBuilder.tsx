import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Settings, Eye, Download, CheckCircle, AlertCircle, Loader, ArrowLeft, Image, Percent, Activity, FileDown, Edit2, Save, X, FolderOpen, Trash2, RefreshCw, Users, Clock, CheckSquare } from 'lucide-react';
import * as courseApi from '../lib/courseBuilderApi';
import { generateSCORMPackage } from '../lib/scormGenerator';
import { validateSCORMStructure, getSCORMCompatibilityInfo } from '../lib/scormValidator';
import { extractTextFromPDF, validateDocumentText, getTextPreview, PDFExtractionResult } from '../lib/pdfExtractor';
import { parseAPIError, ErrorDetails } from '../lib/errorHandler';
import { testEdgeFunctionConnection, APITestResult } from '../lib/apiTester';
import * as auditTrail from '../lib/auditTrail';
import * as courseStorage from '../lib/courseStorage';
import { StoredCourse } from '../lib/courseStorage';
import ErrorModal from '../components/ErrorModal';

const EnhancedCourseBuilder = () => {
  const [step, setStep] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState('');
  const [pdfExtractionResult, setPdfExtractionResult] = useState<PDFExtractionResult | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [currentError, setCurrentError] = useState<ErrorDetails | null>(null);
  const [apiTestResult, setApiTestResult] = useState<APITestResult | null>(null);
  const [isTestingAPI, setIsTestingAPI] = useState(false);
  const [config, setConfig] = useState({
    passingScore: 80,
    maxAttempts: 3,
    scormVersion: '1.2',
    brandingLogo: null,
    generationMode: 'strict', // strict = 100% accuracy
    questionMode: 'ai', // 'ai' or 'manual' or 'hybrid'
    includeQuiz: true, // true = include quiz, false = acknowledgment only
    questionCount: 5 // number of questions to include (1-10)
  });
  const [manualQuestions, setManualQuestions] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [courseData, setCourseData] = useState(null);
  const [verificationReport, setVerificationReport] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewModule, setPreviewModule] = useState(0);
  const [showPreviewQuiz, setShowPreviewQuiz] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [documentVersion, setDocumentVersion] = useState('1.0');
  const [gxpFields, setGxpFields] = useState({
    sopNumber: '',
    effectiveDate: '',
    reviewCycle: 'Annual',
    regulatoryStatus: 'Draft',
    dataClassification: 'Internal',
    retentionPeriod: '10 years'
  });

  // NEW STATE FOR CONTENT EDITING
  const [editingContent, setEditingContent] = useState<{
    moduleIndex: number;
    sectionIndex: number;
    section: any;
  } | null>(null);
  const [showContentEditor, setShowContentEditor] = useState(false);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);

  // SAVED COURSES STATE
  const [showSavedCourses, setShowSavedCourses] = useState(false);
  const [savedCourses, setSavedCourses] = useState<StoredCourse[]>([]);
  const [clientFilter, setClientFilter] = useState('');
  const [uniqueClients, setUniqueClients] = useState<string[]>([]);
  const [currentSavedCourseId, setCurrentSavedCourseId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const logoInputRef = useRef(null);

  // ============================================
  // SAVED COURSES FUNCTIONS
  // ============================================

  // Load saved courses on mount
  useEffect(() => {
    refreshSavedCourses();
  }, []);

  const refreshSavedCourses = () => {
    const courses = clientFilter 
      ? courseStorage.getCoursesByClient(clientFilter)
      : courseStorage.getAllCourses();
    setSavedCourses(courses);
    setUniqueClients(courseStorage.getUniqueClients());
  };

  const handleSaveCourse = (status: StoredCourse['status'] = 'draft') => {
    if (!clientName.trim()) {
      alert('Please enter a client name before saving.');
      return;
    }

    const savedCourse = courseStorage.saveCourse({
      id: currentSavedCourseId || undefined,
      clientName: clientName.trim(),
      courseTitle: courseTitle || 'Untitled Course',
      documentText,
      courseData,
      config: config as any,
      gxpFields,
      documentVersion,
      verificationReport,
      status,
      sopContentCleared: false
    });

    setCurrentSavedCourseId(savedCourse.id);
    refreshSavedCourses();
    alert(`✓ Course saved successfully!`);
  };

  const handleLoadCourse = (course: StoredCourse) => {
    if (course.sopContentCleared) {
      alert('⚠️ This course has been completed and SOP content was cleared. You can view quiz questions but cannot regenerate the course.');
    }

    setClientName(course.clientName);
    setCourseTitle(course.courseTitle);
    setDocumentText(course.documentText);
    setCourseData(course.courseData);
    setConfig(course.config as any);
    setGxpFields(course.gxpFields);
    setDocumentVersion(course.documentVersion);
    setVerificationReport(course.verificationReport);
    setCurrentSavedCourseId(course.id);
    setShowSavedCourses(false);

    // Navigate to appropriate step
    if (course.courseData) {
      setStep('review');
    } else if (course.documentText) {
      setStep('configure');
    } else {
      setStep('upload');
    }
  };

  const handleDeleteCourse = (id: string) => {
    if (confirm('Are you sure you want to delete this saved course? This cannot be undone.')) {
      courseStorage.deleteCourse(id);
      refreshSavedCourses();
      if (currentSavedCourseId === id) {
        setCurrentSavedCourseId(null);
      }
    }
  };

  const handleCompleteAndCleanup = (id: string) => {
    if (confirm(
      '⚠️ Complete & Cleanup\n\n' +
      'This will:\n' +
      '• Mark the course as completed\n' +
      '• Delete the SOP document content\n' +
      '• Keep quiz questions and metadata for reference\n\n' +
      'This action cannot be undone. Continue?'
    )) {
      courseStorage.completeAndCleanup(id);
      refreshSavedCourses();
      alert('✓ Course completed and SOP content cleared.');
    }
  };

  const renderFormattedContent = (text: string, colorClass: string = 'text-gray-700') => {
    const lines = text.split('\n').filter(line => line.trim());
    const bulletLines = lines.filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'));
    const hasBullets = bulletLines.length > 0;

    if (hasBullets) {
      const result = [];
      let currentList = [];

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          currentList.push(
            <li key={`li-${idx}`} className={`${colorClass} mb-2 leading-relaxed`}>
              {trimmed.substring(1).trim()}
            </li>
          );
        } else if (trimmed.length > 0) {
          if (currentList.length > 0) {
            result.push(
              <ul key={`ul-${result.length}`} className="list-disc ml-6 mb-4">
                {currentList}
              </ul>
            );
            currentList = [];
          }
          result.push(
            <p key={`p-${idx}`} className={`${colorClass} mb-4 leading-relaxed`}>
              {trimmed}
            </p>
          );
        }
      });

      if (currentList.length > 0) {
        result.push(
          <ul key={`ul-${result.length}`} className="list-disc ml-6 mb-4">
            {currentList}
          </ul>
        );
      }

      return result;
    } else {
      return lines.map((line, idx) => (
        <p key={idx} className={`${colorClass} mb-4 leading-relaxed`}>
          {line}
        </p>
      ));
    }
  };

  // ============================================
  // CLIENT PREVIEW GENERATOR
  // ============================================

  const generateClientPreviewHTML = () => {
    if (!courseData) return '';

    const escapeHtml = (text: string): string => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const formatContent = (text: string): string => {
      const lines = text.split(/\\n|\n/).filter(line => line.trim());
      const bulletPattern = /^[•\-\*]\s*/;
      const hasListItems = lines.some(line => bulletPattern.test(line.trim()));

      if (hasListItems) {
        const listItems = lines
          .filter(line => line.trim().length > 0)
          .map(line => {
            const trimmed = line.trim();
            if (bulletPattern.test(trimmed)) {
              const cleanText = trimmed.replace(bulletPattern, '');
              return `<li>${escapeHtml(cleanText)}</li>`;
            } else if (trimmed.length > 0) {
              return trimmed;
            }
            return '';
          })
          .filter(line => line.length > 0);

        const hasNonListContent = listItems.some(item => !item.startsWith('<li>'));

        if (hasNonListContent) {
          const formatted = [];
          let currentList = [];

          for (const item of listItems) {
            if (item.startsWith('<li>')) {
              currentList.push(item);
            } else {
              if (currentList.length > 0) {
                formatted.push(`<ul>${currentList.join('')}</ul>`);
                currentList = [];
              }
              formatted.push(`<p>${escapeHtml(item)}</p>`);
            }
          }

          if (currentList.length > 0) {
            formatted.push(`<ul>${currentList.join('')}</ul>`);
          }

          return formatted.join('');
        } else {
          return `<ul>${listItems.join('')}</ul>`;
        }
      } else {
        return lines
          .filter(line => line.trim().length > 0)
          .map(line => `<p>${escapeHtml(line.trim())}</p>`)
          .join('');
      }
    };

    // Build modules HTML with interactive checkboxes for important sections
    let checkboxCounter = 0;
    const modulesHTML = courseData.modules.map((module, idx) => {
      const sectionsHTML = module.content.map(section => {
        const isInteractive = section.type === 'callout-important' || section.type === 'callout-key';
        const checkboxId = isInteractive ? `checkbox-${idx}-${checkboxCounter++}` : null;
        
        return `
      <div class="content-section section-${section.type || 'text'}">
        ${section.heading ? `<h3>${escapeHtml(section.heading)}</h3>` : ''}
        ${formatContent(section.body)}
        ${isInteractive ? `
        <label class="acknowledge-checkbox" for="${checkboxId}">
          <input type="checkbox" id="${checkboxId}" onchange="markAcknowledged('${checkboxId}', ${idx})">
          <span class="checkbox-label">I have read and understood this ${section.type === 'callout-important' ? 'important information' : 'key point'}</span>
        </label>
        ` : ''}
      </div>
    `;
      }).join('\n');

      return `
      <section class="slide" id="slide-${idx}" style="${idx === 0 ? 'display: block;' : 'display: none;'}">
        ${courseData.logo ? `<img src="${courseData.logo}" alt="Logo" class="module-logo" />` : ''}
        <h2>${escapeHtml(module.title)}</h2>
        <p class="duration"><span class="duration-icon">📚</span> Duration: ${escapeHtml(module.duration || '10-15 mins')}</p>
        <div class="module-content">
          ${sectionsHTML}
        </div>
      </section>`;
    }).join('\n');

    const hasQuiz = config.includeQuiz && courseData.quiz && courseData.quiz.questions && courseData.quiz.questions.length > 0;

    // Build quiz HTML (single slide at the end)
    const quizHTML = hasQuiz
      ? `
      <section class="slide quiz-slide" id="slide-${courseData.modules.length}" style="display: none;">
        ${courseData.logo ? `<img src="${courseData.logo}" alt="Logo" class="module-logo" />` : ''}
        <h2><span class="section-icon">📝</span> Final Assessment</h2>
        <p class="duration"><span class="duration-icon">ℹ️</span> Passing Score: ${config.passingScore}% | Maximum Attempts: ${config.maxAttempts}</p>

        <div class="module-content">
          <div class="content-section section-quiz">
            ${courseData.quiz.questions.map((q, qIndex) => `
              <div class="quiz-question">
                <h3>Question ${qIndex + 1} of ${courseData.quiz.questions.length}</h3>
                <p class="question-text">${escapeHtml(q.question)}</p>
                ${q.sourceReference ? `<p class="source-reference">📌 Source: ${escapeHtml(q.sourceReference)}</p>` : ''}
                <ul class="quiz-options">
                  ${q.options.map((opt, optIndex: number) => `<li class="quiz-option${optIndex === q.correctAnswer ? ' correct-answer' : ''}">${escapeHtml(opt)}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </div>
      </section>`
      : '';

    const totalSlides = courseData.modules.length + (hasQuiz ? 1 : 0);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(courseData.title)} - Client Preview</title>
  <style>
    :root { --brand-navy: #2E3192; --brand-cyan: #00C5B8; --brand-dark-blue: #1a1f5c; --shadow-sm: 0 4px 6px rgba(46, 49, 146, 0.1); --shadow-md: 0 10px 30px rgba(46, 49, 146, 0.15); --shadow-lg: 0 20px 60px rgba(46, 49, 146, 0.2); }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.6; color: #111827; background: linear-gradient(135deg, #f8f9fc 0%, #e8eef5 100%); }
    .preview-banner { background: #ff9800; color: white; padding: 15px; text-align: center; font-weight: bold; position: sticky; top: 0; z-index: 200; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .course-header { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); padding: 1.5rem 2rem; box-shadow: 0 4px 20px rgba(46, 49, 146, 0.1); position: sticky; top: 0; z-index: 100; border-bottom: 2px solid transparent; border-image: linear-gradient(90deg, var(--brand-navy), var(--brand-cyan)) 1; }
    .course-header h1 { font-size: 2rem; margin-bottom: 0.5rem; font-weight: 800; background: linear-gradient(135deg, var(--brand-navy), var(--brand-cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .progress-container { position: relative; width: 100%; height: 12px; background: #e5e7eb; border-radius: 12px; margin: 1rem 0 0.5rem 0; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
    .progress-bar { height: 100%; background: linear-gradient(90deg, var(--brand-navy), var(--brand-cyan)); border-radius: 12px; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); width: 0%; box-shadow: 0 0 20px rgba(0, 197, 184, 0.4); }
    .progress-text { font-size: 0.875rem; font-weight: 600; color: #4b5563; }
    .module-indicator { font-size: 0.875rem; font-weight: 500; color: #6b7280; }
    .course-content { max-width: 900px; margin: 2rem auto; padding: 0 2rem; }
    .slide { background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border-radius: 20px; padding: 3rem; box-shadow: var(--shadow-lg); min-height: 500px; position: relative; overflow: hidden; }
    .slide::before { content: ''; position: absolute; top: -100px; right: -100px; width: 300px; height: 300px; background: radial-gradient(circle, rgba(0, 197, 184, 0.08) 0%, transparent 70%); border-radius: 50%; pointer-events: none; }
    .slide::after { content: ''; position: absolute; bottom: -100px; left: -100px; width: 300px; height: 300px; background: radial-gradient(circle, rgba(46, 49, 146, 0.08) 0%, transparent 70%); border-radius: 50%; pointer-events: none; }
    .module-logo { height: 56px; margin-bottom: 1.5rem; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1)); }
    .slide h2 { font-size: 2.5rem; margin-bottom: 0.5rem; font-weight: 800; background: linear-gradient(135deg, var(--brand-navy), var(--brand-cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1.2; position: relative; z-index: 1; }
    .duration { color: #6b7280; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.5rem; }
    .duration-icon { font-size: 1.2rem; }
    .module-content { margin-top: 2rem; }
    .content-section { margin-bottom: 2rem; position: relative; z-index: 1; }
    .content-section h3 { color: #1f2937; margin-bottom: 1rem; font-size: 1.5rem; font-weight: 700; }
    .content-section p { color: #4b5563; line-height: 1.8; font-size: 1.05rem; }
    .content-section ul { list-style-type: disc; margin-left: 1.5rem; margin-top: 0.75rem; margin-bottom: 0.75rem; color: #4b5563; }
    .content-section li { line-height: 1.8; font-size: 1.05rem; margin-bottom: 0.5rem; padding-left: 0.5rem; }
    .section-objectives { background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%); border-left: 5px solid var(--brand-navy); padding: 2rem; border-radius: 16px; box-shadow: var(--shadow-md); }
    .section-objectives h3 { color: var(--brand-navy); font-weight: 800; }
    .section-objectives p { color: #1e40af; font-weight: 500; }
    .section-summary { background: linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%); border-left: 5px solid #6b7280; padding: 1.5rem; border-radius: 16px; box-shadow: var(--shadow-md); border: 2px solid #e5e7eb; }
    .section-summary h3 { color: #374151; font-weight: 700; }
    .section-summary p { color: #4b5563; font-weight: 500; }
    .section-callout-important { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-left: 5px solid #dc2626; padding: 1.5rem; border-radius: 16px; box-shadow: var(--shadow-md); }
    .section-callout-important h3, .section-callout-important h4 { color: #991b1b; font-weight: 700; }
    .section-callout-important p { color: #7f1d1d; font-weight: 500; }
    .section-callout-key { background: linear-gradient(135deg, #fef3c7 0%, #fef9e6 100%); border-left: 5px solid #f59e0b; padding: 1.5rem; border-radius: 16px; box-shadow: var(--shadow-md); }
    .section-callout-key h3, .section-callout-key h4 { color: #92400e; font-weight: 700; }
    .section-callout-key p { color: #78350f; font-weight: 500; }
    .acknowledge-checkbox { display: flex; align-items: center; gap: 12px; margin-top: 1rem; padding: 12px 16px; background: rgba(255, 255, 255, 0.8); border: 2px solid #d1d5db; border-radius: 10px; cursor: pointer; transition: all 0.3s ease; user-select: none; }
    .acknowledge-checkbox:hover { border-color: var(--brand-cyan); background: rgba(255, 255, 255, 0.95); }
    .acknowledge-checkbox input[type="checkbox"] { width: 22px; height: 22px; accent-color: var(--brand-cyan); cursor: pointer; flex-shrink: 0; }
    .acknowledge-checkbox .checkbox-label { font-size: 0.95rem; font-weight: 600; color: #374151; }
    .acknowledge-checkbox:has(input:checked) { border-color: #10b981; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); }
    .acknowledge-checkbox:has(input:checked) .checkbox-label { color: #065f46; }
    .quiz-options { list-style-type: none; padding-left: 0; margin-top: 0.75rem; }
    .quiz-option { margin-bottom: 0.5rem; padding: 0.6rem 0.9rem; border-radius: 10px; background: #f3f4f6; color: #374151; }
    .quiz-option.correct-answer { border-left: 4px solid #16a34a; background: #ecfdf3; font-weight: 600; color: #166534; position: relative; padding-left: 2.2rem; }
    .quiz-option.correct-answer::before { content: '✓'; position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%); color: #16a34a; font-weight: 900; }
    .slide-navigation { max-width: 900px; margin: 2rem auto; padding: 0 2rem; display: flex; justify-content: space-between; gap: 1rem; }
    .btn { padding: 1rem 2rem; border: none; border-radius: 12px; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: var(--shadow-sm); }
    .btn-primary { background: linear-gradient(135deg, var(--brand-navy), var(--brand-cyan)); color: white; }
    .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0, 197, 184, 0.4); }
    .btn-secondary { background: linear-gradient(135deg, #6b7280, #4b5563); color: white; }
    .btn-secondary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }
    ${gxpFields.sopNumber || documentVersion || (config.includeQuiz && config.passingScore) ? `
    .metadata-grid { background: white; padding: 1.5rem 2rem; margin-bottom: 0.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; border-radius: 12px; box-shadow: var(--shadow-sm); }
    .metadata-item { display: flex; flex-direction: column; }
    .metadata-label { font-size: 0.75rem; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .metadata-value { font-size: 1rem; color: #111827; font-weight: 600; margin-top: 0.25rem; }` : ''}
  </style>
</head>
<body>
  <div class="preview-banner">📋 COURSE PREVIEW - Review version for client feedback</div>

  <header class="course-header">
    <h1>${escapeHtml(courseData.title)}</h1>
    <div class="progress-container">
      <div class="progress-bar" id="progressBar"></div>
    </div>
    <p class="progress-text" id="progressText">0% Complete</p>
    <p class="module-indicator" id="moduleIndicator">Slide 1 of ${totalSlides}</p>
  </header>

  ${gxpFields.sopNumber || documentVersion || (config.includeQuiz && config.passingScore) ? `
  <div class="course-content" style="margin-top: 1rem; margin-bottom: 0;">
    <div class="metadata-grid">
      ${documentVersion ? `<div class="metadata-item"><span class="metadata-label">VERSION</span><span class="metadata-value">${escapeHtml(documentVersion)}</span></div>` : ''}
      ${config.includeQuiz && config.passingScore ? `<div class="metadata-item"><span class="metadata-label">PASSING SCORE</span><span class="metadata-value">${config.passingScore}%</span></div>` : ''}
      ${gxpFields.sopNumber ? `<div class="metadata-item"><span class="metadata-label">SOP NUMBER</span><span class="metadata-value">${escapeHtml(gxpFields.sopNumber)}</span></div>` : ''}
      ${gxpFields.effectiveDate ? `<div class="metadata-item"><span class="metadata-label">EFFECTIVE DATE</span><span class="metadata-value">${escapeHtml(gxpFields.effectiveDate)}</span></div>` : ''}
    </div>
  </div>` : ''}

  <main class="course-content">
    ${modulesHTML}
    ${quizHTML}
  </main>

  <nav class="slide-navigation">
    <button id="prevBtn" class="btn btn-secondary" onclick="previousSlide()" disabled>← Previous</button>
    <button id="nextBtn" class="btn btn-primary" onclick="nextSlide()">Next →</button>
  </nav>

  <script>
    const TOTAL_SLIDES = ${totalSlides};
    const NUM_MODULES = ${courseData.modules.length};
    let currentSlide = 0;
    
    // Track acknowledged checkboxes
    function markAcknowledged(checkboxId, slideIndex) {
      // Visual feedback only in preview - no navigation blocking
      console.log('Acknowledged:', checkboxId, 'on slide', slideIndex);
    }

    function goToSlide(slideIndex) {
      if (slideIndex < 0 || slideIndex >= TOTAL_SLIDES) return;
      document.getElementById('slide-' + currentSlide).style.display = 'none';
      currentSlide = slideIndex;
      document.getElementById('slide-' + currentSlide).style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      updateProgress();
      updateNavigation();
    }

    function nextSlide() {
      if (currentSlide < TOTAL_SLIDES - 1) {
        goToSlide(currentSlide + 1);
      }
    }

    function previousSlide() {
      if (currentSlide > 0) {
        goToSlide(currentSlide - 1);
      }
    }

    function updateProgress() {
      const progress = ((currentSlide + 1) / TOTAL_SLIDES) * 100;
      document.getElementById('progressBar').style.width = progress + '%';
      document.getElementById('progressText').textContent = Math.round(progress) + '% Complete';
      document.getElementById('moduleIndicator').textContent = 'Slide ' + (currentSlide + 1) + ' of ' + TOTAL_SLIDES;
    }

    function updateNavigation() {
      const prevBtn = document.getElementById('prevBtn');
      const nextBtn = document.getElementById('nextBtn');
      prevBtn.disabled = (currentSlide === 0);
      if (currentSlide === TOTAL_SLIDES - 1) {
        nextBtn.style.display = 'none';
      } else {
        nextBtn.style.display = 'block';
      }
    }

    window.onload = function() {
      updateProgress();
      updateNavigation();
    };

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') previousSlide();
      if (e.key === 'ArrowRight') nextSlide();
    });
  </script>
</body>
</html>`;
  };

  // ============================================
  // FILE UPLOAD HANDLERS
  // ============================================

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setProcessingStage('Extracting text from PDF...');
    setIsProcessing(true);

    if (file.type === 'application/pdf') {
      try {
        const result = await extractTextFromPDF(file);
        setPdfExtractionResult(result);

        if (result.isValid) {
          setDocumentText(result.text);
          setCourseTitle(file.name.replace('.pdf', ''));
        } else {
          const errorDetails: ErrorDetails = {
            title: 'PDF Extraction Failed',
            message: 'Unable to extract readable text from the PDF.',
            suggestions: result.errors,
            recoveryActions: [
              'Try a different PDF file',
              'Ensure the PDF contains text (not just images)',
              'Check if the PDF is not password-protected'
            ]
          };
          setCurrentError(errorDetails);
        }
      } catch (error) {
        setCurrentError(parseAPIError(error));
      }
    }

    setIsProcessing(false);
  };

  const testAPIConnection = async () => {
    setIsTestingAPI(true);
    try {
      const result = await testEdgeFunctionConnection();
      setApiTestResult(result);

      if (!result.success) {
        const errorDetails: ErrorDetails = {
          title: 'API Connection Test Failed',
          message: result.message,
          suggestions: [result.details || ''],
          recoveryActions: [
            'Check ANTHROPIC_SETUP.md for configuration instructions',
            'Try again in a few moments',
            'Use Manual Question mode as an alternative'
          ]
        };
        setCurrentError(errorDetails);
      }
    } catch (error) {
      setCurrentError(parseAPIError(error));
    } finally {
      setIsTestingAPI(false);
    }
  };

  const handleExportAuditLog = async (format: 'json' | 'csv') => {
    try {
      await auditTrail.exportAuditLog(format);
      alert(`Audit log exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      setCurrentError(parseAPIError(error));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setConfig(prev => ({ ...prev, brandingLogo: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // ============================================
  // CONTENT EDITING FUNCTIONS
  // ============================================

  const openContentEditor = (moduleIndex: number, sectionIndex: number) => {
    const section = courseData.modules[moduleIndex].content[sectionIndex];
    setEditingContent({
      moduleIndex,
      sectionIndex,
      section: JSON.parse(JSON.stringify(section)) // Deep clone
    });
    setShowContentEditor(true);
  };

  const saveContentEdit = () => {
    if (!editingContent) return;

    const updatedCourseData = { ...courseData };
    updatedCourseData.modules[editingContent.moduleIndex].content[editingContent.sectionIndex] = editingContent.section;
    
    setCourseData(updatedCourseData);
    setShowContentEditor(false);
    setEditingContent(null);
    setHasUnsavedEdits(true);

    alert('✓ Content updated successfully! Don\'t forget to export your SCORM package to save changes.');
  };

  const cancelContentEdit = () => {
    if (hasContentChanged()) {
      if (confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        setShowContentEditor(false);
        setEditingContent(null);
      }
    } else {
      setShowContentEditor(false);
      setEditingContent(null);
    }
  };

  const hasContentChanged = () => {
    if (!editingContent) return false;
    const original = courseData.modules[editingContent.moduleIndex].content[editingContent.sectionIndex];
    return JSON.stringify(original) !== JSON.stringify(editingContent.section);
  };

  // ============================================
  // CLIENT PREVIEW DOWNLOAD HANDLER
  // ============================================

  const handleDownloadClientPreview = () => {
    if (!courseData) {
      alert('⚠️ Please generate the course first before downloading preview');
      return;
    }

    if (!courseData.modules || courseData.modules.length === 0) {
      alert('⚠️ Course has no modules to preview');
      return;
    }

    try {
      // Generate preview HTML
      const html = generateClientPreviewHTML();

      // Create blob and download
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${courseTitle.replace(/[^a-z0-9]/gi, '_')}_CLIENT_PREVIEW.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log the action
      console.log('Client preview downloaded:', {
        action: 'CLIENT_PREVIEW_DOWNLOADED',
        documentId: currentDocumentId,
        courseId: currentCourseId,
        generationId: currentGenerationId,
        filename: `${courseTitle}_CLIENT_PREVIEW.html`,
        timestamp: new Date().toISOString(),
        modules: courseData.modules.length,
        questions: courseData.quiz?.questions.length || 0,
        hasQuiz: config.includeQuiz
      });

      alert('✅ Client preview downloaded successfully!\n\n📄 File: ' + courseTitle + '_CLIENT_PREVIEW.html\n\n' +
            '💡 Send this HTML file to your client.\n' +
            'They can open it in any web browser to review the course.');

    } catch (error) {
      console.error('Preview generation failed:', error);
      alert('❌ Failed to generate preview: ' + error.message);
    }
  };

  // ============================================
  // MANUAL QUESTION CREATION
  // ============================================

  const createNewQuestion = () => {
    setEditingQuestion({
      id: `manual_q${Date.now()}`,
      question: '',
      options: ['', ''],  // Start with minimum 2 options, user can add up to 10
      correctAnswer: 0,
      explanation: '',
      isManual: true
    });
    setShowQuestionEditor(true);
  };

  const saveManualQuestion = () => {
    if (!editingQuestion.question.trim() || !editingQuestion.options.every(opt => opt.trim())) {
      alert('Please fill in the question and all answer options');
      return;
    }

    const updatedQuestions = editingQuestion.existingIndex !== undefined
      ? manualQuestions.map((q, idx) => idx === editingQuestion.existingIndex ? editingQuestion : q)
      : [...manualQuestions, editingQuestion];

    setManualQuestions(updatedQuestions);
    setShowQuestionEditor(false);
    setEditingQuestion(null);
  };

  const editGeneratedQuestion = (questionIndex: number) => {
    const question = courseData.quiz.questions[questionIndex];
    setEditingQuestion({
      ...question,
      existingIndex: questionIndex,
      isGeneratedQuestion: true
    });
    setShowQuestionEditor(true);
  };

  const saveEditedGeneratedQuestion = () => {
    if (!editingQuestion.question.trim() || !editingQuestion.options.every(opt => opt.trim())) {
      alert('Please fill in the question and all answer options');
      return;
    }

    const updatedQuestions = [...courseData.quiz.questions];
    updatedQuestions[editingQuestion.existingIndex] = {
      ...editingQuestion,
      isManual: true // Mark as manually edited
    };

    setCourseData({
      ...courseData,
      quiz: { questions: updatedQuestions }
    });

    // Re-verify questions
    verifyQuestions({ questions: updatedQuestions }, documentText).then(verification => {
      setVerificationReport(verification);
    });

    setShowQuestionEditor(false);
    setEditingQuestion(null);
  };

  const deleteGeneratedQuestion = (questionIndex: number) => {
    if (!confirm('Delete this question? This cannot be undone.')) {
      return;
    }

    const updatedQuestions = courseData.quiz.questions.filter((_, idx) => idx !== questionIndex);

    setCourseData({
      ...courseData,
      quiz: { questions: updatedQuestions }
    });

    // Re-verify questions
    verifyQuestions({ questions: updatedQuestions }, documentText).then(verification => {
      setVerificationReport(verification);
    });
  };

  const editManualQuestion = (question, index) => {
    setEditingQuestion({ ...question, existingIndex: index });
    setShowQuestionEditor(true);
  };

  const deleteManualQuestion = (index) => {
    if (confirm('Delete this question?')) {
      setManualQuestions(manualQuestions.filter((_, idx) => idx !== index));
    }
  };

  const verifyManualQuestion = (question) => {
    // Verify manual question against source document
    if (!documentText) return { score: 0, verified: false, similarity: 0, contentRelevant: false };

    // Extract key terms from the question (words longer than 4 chars, excluding common words)
    const commonWords = ['what', 'when', 'where', 'which', 'should', 'would', 'could', 'does', 'have', 'been', 'will', 'this', 'that', 'these', 'those', 'there', 'their'];
    const questionWords = question.question.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4 && !commonWords.includes(w));

    // Check if question terms actually appear in document
    const documentLower = documentText.toLowerCase();
    const matchingTerms = questionWords.filter(term => documentLower.includes(term));
    const termMatchRate = questionWords.length > 0 ? (matchingTerms.length / questionWords.length) : 0;

    // Calculate content similarity (how much question content appears in document)
    const similarity = calculateSimilarity(
      question.question + ' ' + (question.explanation || ''),
      documentText
    );

    // Check if the correct answer appears in the document
    const correctAnswer = question.options[question.correctAnswer] || '';
    const answerWords = correctAnswer.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
    const answerInDoc = answerWords.length > 0 && answerWords.some(w => documentLower.includes(w));

    // Scoring:
    // - 40% for term match rate (are question terms in the document?)
    // - 40% for similarity score (does question content match document?)
    // - 20% for answer relevance (is answer found in document?)
    const termScore = termMatchRate * 40;
    const similarityScore = (similarity / 100) * 40;
    const answerScore = answerInDoc ? 20 : 0;
    const score = termScore + similarityScore + answerScore;

    // Content is relevant if at least 50% of question terms appear in document
    const contentRelevant = termMatchRate >= 0.5;

    return {
      score: Math.round(score),
      verified: score >= 70 && contentRelevant,
      similarity: Math.round(similarity),
      contentRelevant,
      termMatchRate: Math.round(termMatchRate * 100),
      status: score >= 80 && contentRelevant ? 'verified' : score >= 60 && contentRelevant ? 'warning' : 'needs-review'
    };
  };

  // ============================================
  // COURSE GENERATION (100% ACCURACY)
  // ============================================

  const generateCourse = async () => {
    setIsProcessing(true);
    setStep('processing');

    try {
      let questions = { questions: [] };
      let verification = null;

      // Only generate quiz if includeQuiz is true
      if (config.includeQuiz) {
        // Handle different question modes
        if (config.questionMode === 'manual') {
          // Use only manual questions
          setProcessingStage('Using your custom questions...');
          questions = { questions: manualQuestions };

        } else if (config.questionMode === 'hybrid') {
          // Combine AI + manual questions
          setProcessingStage('Extracting facts from document...');
          const facts = await extractVerifiableFacts(documentText);

          setProcessingStage('Generating AI questions...');
          const aiQuestions = await generateQuestionsFromFacts(facts, documentText);

          questions = {
            questions: [...aiQuestions.questions, ...manualQuestions]
          };

        } else {
          // AI-only mode (original flow)
          setProcessingStage('Extracting facts from document...');
          const facts = await extractVerifiableFacts(documentText);

          setProcessingStage('Generating quiz questions...');
          questions = await generateQuestionsFromFacts(facts, documentText);
        }

        // STEP 3: Verify 100% accuracy
        setProcessingStage('Verifying accuracy...');
        verification = await verifyQuestions(questions, documentText);
      } else {
        setProcessingStage('Skipping quiz generation...');
      }

      // STEP 4: Generate course structure
      setProcessingStage('Building course structure...');
      const facts = (config.includeQuiz && config.questionMode !== 'manual')
        ? await extractVerifiableFacts(documentText)
        : [];
      const modules = await generateModulesFromDocument(documentText, facts);

      const course = {
        title: courseTitle,
        logo: config.brandingLogo,
        modules,
        quiz: questions,
        verification,
        questionMode: config.questionMode,
        includeQuiz: config.includeQuiz
      };

      setCourseData(course);
      setVerificationReport(verification);

      setProcessingStage('Recording course generation...');
      const courseRecord = await auditTrail.createCourse(
        courseTitle,
        modules.length,
        questions.questions.length,
        config.scormVersion as string,
        config.includeQuiz
      );

      if (courseRecord && currentDocumentId) {
        setCurrentCourseId(courseRecord.id);

        await auditTrail.linkCourseToDocument(
          courseRecord.id,
          currentDocumentId,
          documentVersion
        );

        const generation = await auditTrail.recordCourseGeneration(
          courseRecord.id,
          currentDocumentId,
          'initial',
          {
            passingScore: config.passingScore,
            maxAttempts: config.maxAttempts,
            scormVersion: config.scormVersion,
            questionMode: config.questionMode,
            includeQuiz: config.includeQuiz,
            brandingLogo: config.brandingLogo ? 'yes' : 'no'
          },
          verification || {}
        );

        if (generation) {
          setCurrentGenerationId(generation.id);
          console.log('Course generation tracked:', generation.id);
        }
      }

      setStep('preview');

    } catch (error) {
      console.error('Course generation error:', error);
      setCurrentError(parseAPIError(error));
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================
  // STEP 1: EXTRACT VERIFIABLE FACTS (100% FROM DOCUMENT)
  // ============================================

  const extractVerifiableFacts = async (text) => {
    return await courseApi.extractVerifiableFacts(text);
  };

  // ============================================
  // STEP 2: GENERATE QUESTIONS FROM VERIFIED FACTS
  // ============================================

  const generateQuestionsFromFacts = async (facts, sourceText) => {
    return await courseApi.generateQuestionsFromFacts(facts, sourceText, 5);
  };

  // ============================================
  // STEP 3: VERIFY 100% ACCURACY
  // ============================================

  const verifyQuestions = async (questionData, sourceText) => {
    const questions = questionData.questions;
    const verifications = [];
    let totalScore = 0;

    for (const q of questions) {
      // Verify quote exists in source
      const quoteExists = q.exactQuote ? sourceText.includes(q.exactQuote) : false;

      // Calculate similarity of question to source
      const similarity = calculateSimilarity(q.question + ' ' + (q.explanation || ''), sourceText);

      // Verify correct answer is in the quote
      const correctOption = q.options[q.correctAnswer];
      const answerVerifiable = q.exactQuote && correctOption
        ? (q.exactQuote.toLowerCase().includes(correctOption.toLowerCase()) ||
           checkSemanticMatch(correctOption, q.exactQuote))
        : false;

      const score = (quoteExists ? 40 : 0) +
                    (similarity > 70 ? 30 : 0) +
                    (answerVerifiable ? 30 : 0);

      totalScore += score;

      verifications.push({
        questionId: q.id,
        question: q.question,
        quoteExists,
        similarity: Math.round(similarity),
        answerVerifiable,
        score: Math.round(score),
        status: score >= 90 ? 'verified' : score >= 70 ? 'warning' : 'failed',
        issues: [
          !quoteExists && 'Quote not found in source document',
          similarity <= 70 && `Low similarity: ${Math.round(similarity)}%`,
          !answerVerifiable && 'Answer not verifiable from quote'
        ].filter(Boolean)
      });
    }

    const averageScore = Math.round(totalScore / questions.length);
    const allVerified = verifications.every(v => v.status === 'verified');

    return {
      overallScore: averageScore,
      totalQuestions: questions.length,
      verified: verifications.filter(v => v.status === 'verified').length,
      warnings: verifications.filter(v => v.status === 'warning').length,
      failed: verifications.filter(v => v.status === 'failed').length,
      allVerified,
      details: verifications,
      summary: allVerified 
        ? `✅ All ${questions.length} questions verified (${averageScore}% accuracy)`
        : `⚠️ ${verifications.filter(v => v.status !== 'verified').length} questions need review`
    };
  };

  // ============================================
  // SIMILARITY CALCULATION
  // ============================================

  const calculateSimilarity = (text1, text2) => {
    // Convert to lowercase and extract meaningful words
    const words1 = text1.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3); // Filter short words
    
    const words2 = text2.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/);
    
    // Count matches
    const matches = words1.filter(w => 
      words2.some(w2 => w2.includes(w) || w.includes(w2))
    ).length;
    
    return (matches / words1.length) * 100;
  };

  const checkSemanticMatch = (answer, quote) => {
    // Check if key terms from answer appear in quote
    const answerTerms = answer.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const quoteText = quote.toLowerCase();
    
    const matchCount = answerTerms.filter(term => quoteText.includes(term)).length;
    return (matchCount / answerTerms.length) >= 0.5; // At least 50% of key terms match
  };

  // ============================================
  // STEP 4: GENERATE COURSE MODULES
  // ============================================

  const generateModulesFromDocument = async (text, facts) => {
    return await courseApi.generateModulesFromDocument(text, facts);
  };

  // ============================================
  // SCORM EXPORT
  // ============================================

  const exportSCORM = async () => {
    try {
      setIsProcessing(true);
      setProcessingStage('Validating SCORM structure...');

      const validation = validateSCORMStructure(courseData, config);

      if (!validation.valid) {
        alert(`Cannot export SCORM package:\n\n${validation.errors.join('\n')}`);
        setIsProcessing(false);
        return;
      }

      if (validation.warnings.length > 0) {
        const proceed = confirm(
          `Warnings found:\n\n${validation.warnings.join('\n')}\n\nDo you want to continue with export?`
        );
        if (!proceed) {
          setIsProcessing(false);
          return;
        }
      }

      setProcessingStage('Generating SCORM package...');

      const blob = await generateSCORMPackage(courseData, config);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${courseTitle.replace(/[^a-z0-9]/gi, '_')}_SCORM_${config.scormVersion}.zip`;
      a.click();

      URL.revokeObjectURL(url);

      if (currentGenerationId) {
        await auditTrail.recordCourseExport(currentGenerationId);
        console.log('Export recorded for generation:', currentGenerationId);
      }

      setIsProcessing(false);

      const compatInfo = getSCORMCompatibilityInfo(config.scormVersion);
      alert(
        `SCORM ${config.scormVersion} package generated successfully!\n\n` +
        `The ZIP file has been downloaded and is ready to upload to your LMS.\n\n` +
        `Compatible with: ${compatInfo.compatibility.slice(0, 3).join(', ')}, and more.`
      );
    } catch (error) {
      console.error('Error generating SCORM package:', error);
      alert('Error generating SCORM package. Please check the console for details.');
      setIsProcessing(false);
    }
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderUploadStep = () => (
    <div className="max-w-4xl mx-auto">
      {/* Saved Courses Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { refreshSavedCourses(); setShowSavedCourses(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all font-semibold"
        >
          <FolderOpen className="w-5 h-5" />
          Saved Courses ({savedCourses.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload Training Document</h2>
          <p className="text-gray-600">Upload a PDF containing your training content (SOP, policy, procedure)</p>
        </div>

        {/* Client Name Field */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Users className="w-4 h-4 inline mr-2" />
            Client Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            placeholder="Enter client/company name for this course"
          />
          <p className="text-xs text-gray-500 mt-1">Required for saving and organizing courses</p>
        </div>

        {/* Document Guidelines */}
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">📄 Document Guidelines</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Maximum:</strong> 30 pages or 75,000 characters</li>
            <li>• <strong>Optimal:</strong> 10-25 pages for best results</li>
            <li>• <strong>Format:</strong> PDF with selectable text (not scanned images)</li>
            <li>• <strong>Content:</strong> SOPs, policies, procedures, training materials</li>
          </ul>
        </div>

        <div className="border-4 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-all cursor-pointer"
             onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700 mb-2">
            {uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop'}
          </p>
          <p className="text-sm text-gray-500">PDF files only • Max 10MB • Up to 30 pages</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {documentText && (
          <div className="mt-8">
            {/* Document Size Warning */}
            {pdfExtractionResult && (pdfExtractionResult.pageCount > 30 || pdfExtractionResult.characterCount > 75000) && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-orange-900"> Large Document Warning</p>
                    <p className="text-sm text-orange-800 mt-1">
                      Your document has <strong>{pdfExtractionResult.pageCount} pages</strong> and <strong>{pdfExtractionResult.characterCount.toLocaleString()} characters</strong>.
                    </p>
                    <p className="text-sm text-orange-700 mt-1">
                      The system will process the first ~30 pages (75,000 characters) for optimal performance. 
                      Content beyond this limit may not be included in the generated course.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900">Document loaded successfully</p>
                  {pdfExtractionResult && (
                    <p className="text-sm text-green-700">
                      {pdfExtractionResult.pageCount} pages • {pdfExtractionResult.wordCount} words • {pdfExtractionResult.characterCount.toLocaleString()} characters
                      {pdfExtractionResult.characterCount <= 75000 && (
                        <span className="ml-2 text-green-600"> Within limits</span>
                      )}
                    </p>
                  )}
                  {currentDocumentId && (
                    <p className="text-xs text-green-600 mt-1">
                      📋 Document ID: {currentDocumentId.substring(0, 8)}... • Version: {documentVersion}
                    </p>
                  )}
                  {pdfExtractionResult && pdfExtractionResult.warnings.length > 0 && (
                    <div className="mt-2 text-xs text-yellow-700">
                      {pdfExtractionResult.warnings.map((warning, idx) => (
                        <p key={idx}>⚠️ {warning}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {documentText && (
              <details className="mb-6 bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer mb-2">
                  Preview Extracted Text
                </summary>
                <div className="mt-3 p-3 bg-white rounded border text-sm text-gray-700 max-h-48 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{getTextPreview(documentText, 1000)}</pre>
                </div>
              </details>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course Title</label>
                <input
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Enter course title"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Document Version</label>
                <input
                  type="text"
                  value={documentVersion}
                  onChange={(e) => setDocumentVersion(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., 1.0, 2.1, etc."
                />
                <p className="text-xs text-gray-500 mt-1">For audit trail tracking</p>
              </div>
            </div>

            {/* GxP Compliance Fields */}
            <details className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <summary className="font-semibold text-blue-900 cursor-pointer mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                GxP Compliance Information (Optional)
              </summary>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SOP/Policy Number</label>
                  <input
                    type="text"
                    value={gxpFields.sopNumber}
                    onChange={(e) => setGxpFields({...gxpFields, sopNumber: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., PV-SYS-SOP-002"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Effective Date</label>
                  <input
                    type="date"
                    value={gxpFields.effectiveDate}
                    onChange={(e) => setGxpFields({...gxpFields, effectiveDate: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Review Cycle</label>
                  <select
                    value={gxpFields.reviewCycle}
                    onChange={(e) => setGxpFields({...gxpFields, reviewCycle: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Annual">Annual</option>
                    <option value="Biennial">Biennial</option>
                    <option value="Triennial">Triennial</option>
                    <option value="As Needed">As Needed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Regulatory Status</label>
                  <select
                    value={gxpFields.regulatoryStatus}
                    onChange={(e) => setGxpFields({...gxpFields, regulatoryStatus: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Superseded">Superseded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Data Classification</label>
                  <select
                    value={gxpFields.dataClassification}
                    onChange={(e) => setGxpFields({...gxpFields, dataClassification: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Public">Public</option>
                    <option value="Internal">Internal</option>
                    <option value="Confidential">Confidential</option>
                    <option value="Restricted">Restricted</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Retention Period</label>
                  <select
                    value={gxpFields.retentionPeriod}
                    onChange={(e) => setGxpFields({...gxpFields, retentionPeriod: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="5 years">5 years</option>
                    <option value="10 years">10 years</option>
                    <option value="15 years">15 years</option>
                    <option value="25 years">25 years</option>
                    <option value="Permanent">Permanent</option>
                  </select>
                </div>
              </div>
            </details>

            <button
              onClick={async () => {
                if (!uploadedFile || !pdfExtractionResult) return;

                setIsProcessing(true);
                setProcessingStage('Creating document record...');

                const document = await auditTrail.createDocument(
                  uploadedFile,
                  {
                    text: documentText,
                    pageCount: pdfExtractionResult.pageCount,
                    wordCount: pdfExtractionResult.wordCount
                  },
                  documentVersion,
                  gxpFields
                );

                if (document) {
                  setCurrentDocumentId(document.id);
                  console.log('Document tracked:', document.id, 'with GxP fields');
                }

                setIsProcessing(false);
                setStep('configure');
              }}
              disabled={!courseTitle.trim() || isProcessing}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {processingStage}
                </>
              ) : (
                'Continue to Configuration →'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderConfigureStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Configure Course Settings</h2>
          <p className="text-gray-600">Customize your course generation options</p>
        </div>

        {/* API Connection Test */}
        <div className="mb-8 p-6 border-2 border-gray-300 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-600" />
                AI Service Status
              </h3>
              <p className="text-sm text-gray-600 mt-1">Test your connection to the AI service before generating</p>
            </div>
            <button
              onClick={testAPIConnection}
              disabled={isTestingAPI}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isTestingAPI ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>Test Connection</>
              )}
            </button>
          </div>
          {apiTestResult && (
            <div className={`p-4 rounded-lg border-2 ${
              apiTestResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {apiTestResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className={`font-semibold ${
                    apiTestResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {apiTestResult.message}
                  </p>
                  {apiTestResult.details && (
                    <p className="text-sm text-gray-700 mt-1">{apiTestResult.details}</p>
                  )}
                  {apiTestResult.latency && (
                    <p className="text-xs text-gray-500 mt-1">Response time: {apiTestResult.latency}ms</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export Audit Log */}
        <div className="mb-8 p-6 border-2 border-gray-300 rounded-xl bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileDown className="w-6 h-6 text-gray-600" />
                Export Audit Log
              </h3>
              <p className="text-sm text-gray-600 mt-1">Download a complete history of your documents and courses</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExportAuditLog('json')}
                className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Export JSON
              </button>
              <button
                onClick={() => handleExportAuditLog('csv')}
                className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Quiz Inclusion Option */}
        <div className="mb-8 p-6 border-2 border-purple-200 bg-purple-50 rounded-xl">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-600" />
            Assessment Type
          </h3>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 transition-all bg-white">
              <input
                type="radio"
                name="includeQuiz"
                checked={config.includeQuiz === true}
                onChange={() => setConfig({...config, includeQuiz: true})}
                className="mt-1 w-5 h-5 text-purple-600"
              />
              <div className="flex-1">
                <p className="font-bold text-gray-900">Include Quiz Assessment</p>
                <p className="text-sm text-gray-600 mt-1">
                  Course includes quiz questions and requires passing score for completion
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 transition-all bg-white">
              <input
                type="radio"
                name="includeQuiz"
                checked={config.includeQuiz === false}
                onChange={() => setConfig({...config, includeQuiz: false})}
                className="mt-1 w-5 h-5 text-purple-600"
              />
              <div className="flex-1">
                <p className="font-bold text-gray-900">No Quiz (Acknowledgment Only)</p>
                <p className="text-sm text-gray-600 mt-1">
                  Course ends with a read and sign acknowledgment page instead of a quiz
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Question Mode Selection */}
        {config.includeQuiz && (
          <div className="mb-8 p-6 border-2 border-blue-200 bg-blue-50 rounded-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-600" />
              Question Generation Mode
            </h3>

            <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-all bg-white">
              <input
                type="radio"
                name="questionMode"
                value="ai"
                checked={config.questionMode === 'ai'}
                onChange={(e) => setConfig({...config, questionMode: e.target.value})}
                className="mt-1 w-5 h-5 text-blue-600"
              />
              <div className="flex-1">
                <p className="font-bold text-gray-900">AI-Generated Questions</p>
                <p className="text-sm text-gray-600 mt-1">
                  Automatically generate 100% verified questions from your document
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-all bg-white">
              <input
                type="radio"
                name="questionMode"
                value="manual"
                checked={config.questionMode === 'manual'}
                onChange={(e) => setConfig({...config, questionMode: e.target.value})}
                className="mt-1 w-5 h-5 text-blue-600"
              />
              <div className="flex-1">
                <p className="font-bold text-gray-900">Create My Own Questions</p>
                <p className="text-sm text-gray-600 mt-1">
                  Manually write custom questions and answers
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-all bg-white">
              <input
                type="radio"
                name="questionMode"
                value="hybrid"
                checked={config.questionMode === 'hybrid'}
                onChange={(e) => setConfig({...config, questionMode: e.target.value})}
                className="mt-1 w-5 h-5 text-blue-600"
              />
              <div className="flex-1">
                <p className="font-bold text-gray-900">Hybrid (AI + Manual)</p>
                <p className="text-sm text-gray-600 mt-1">
                  Combine AI-generated questions with your custom questions
                </p>
              </div>
            </label>
          </div>

          {/* Manual Question Creator */}
          {(config.questionMode === 'manual' || config.questionMode === 'hybrid') && (
            <div className="mt-6 p-6 bg-white border-2 border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-900">Your Custom Questions ({manualQuestions.length})</h4>
                <button
                  onClick={createNewQuestion}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all"
                >
                  + Add Question
                </button>
              </div>

              {manualQuestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">No custom questions yet</p>
                  <p className="text-sm">Click "Add Question" to create your first question</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {manualQuestions.map((q, idx) => {
                    const verification = verifyManualQuestion(q);
                    return (
                      <div key={idx} className={`p-4 border-2 rounded-lg ${
                        verification.verified ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 mb-1">Q{idx + 1}: {q.question}</p>
                            <div className="flex gap-2 text-xs">
                              <span className={`px-2 py-1 rounded ${
                                verification.verified ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
                              }`}>
                                {verification.score}% Match
                              </span>
                              {!verification.contentRelevant && (
                                <span className="px-2 py-1 rounded bg-red-100 text-red-700">
                                  Not relevant to document
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => editManualQuestion(q, idx)}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-all text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteManualQuestion(idx)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-all text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 mt-2">
                          <p className="font-medium">Answer: {q.options[q.correctAnswer]}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {config.questionMode === 'manual' && manualQuestions.length < 3 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  ⚠️ Minimum 3 questions required. You have {manualQuestions.length}.
                </div>
              )}
            </div>
          )}
          </div>
        )}

        {/* Quiz Settings */}
        {config.includeQuiz && (
          <div className="mb-8 p-6 border-2 border-gray-200 rounded-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-600" />
              Quiz Settings
            </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Questions</label>
              <select
                value={config.questionCount}
                onChange={(e) => setConfig({...config, questionCount: parseInt(e.target.value)})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <option key={n} value={n}>{n} question{n > 1 ? 's' : ''}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {config.questionMode === 'ai' ? 'AI will generate this many questions' : 
                 config.questionMode === 'manual' ? 'Add at least this many questions' : 
                 'Combined AI + manual questions'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Passing Score (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={config.passingScore}
                onChange={(e) => setConfig({...config, passingScore: parseInt(e.target.value)})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Max Attempts</label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.maxAttempts}
                onChange={(e) => setConfig({...config, maxAttempts: parseInt(e.target.value)})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">SCORM Version</label>
            <select
              value={config.scormVersion}
              onChange={(e) => setConfig({...config, scormVersion: e.target.value})}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              <option value="1.2">SCORM 1.2 (Most Compatible)</option>
              <option value="2004">SCORM 2004 (Advanced Features)</option>
            </select>
          </div>
          </div>
        )}

        {/* Branding Settings */}
        <div className="mb-8 p-6 border-2 border-gray-200 rounded-xl">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Image className="w-6 h-6 text-purple-600" />
            Branding
          </h3>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Company Logo (Optional)
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => logoInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-lg hover:bg-gray-200 transition-all"
              >
                Choose Logo
              </button>
              {config.brandingLogo && (
                <div className="flex items-center gap-2">
                  <img src={config.brandingLogo} alt="Logo preview" className="h-12 w-12 object-contain border rounded" />
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <button
                    onClick={() => setConfig({...config, brandingLogo: null})}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <p className="text-sm text-gray-500 mt-2">
              Your logo will appear on the course title page
            </p>
          </div>
        </div>

        {/* Accuracy Mode */}
        <div className="mb-8 p-6 border-2 border-green-200 bg-green-50 rounded-xl">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Percent className="w-6 h-6 text-green-600" />
            Content Accuracy Mode
          </h3>
          
          <div className="bg-white rounded-lg p-4 border-2 border-green-300">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-bold text-gray-900 mb-1">Strict Verification Mode (Enabled)</p>
                <p className="text-sm text-gray-700 mb-2">
                  All quiz questions will be 100% verified against your source document:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>✓ Questions must reference exact quotes from the document</li>
                  <li>✓ Answers must be directly verifiable from source text</li>
                  <li>✓ Each question includes source section reference</li>
                  <li>✓ Automated accuracy verification (target: 95%+ match)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setStep('upload')}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
          >
            ← Back
          </button>
          <button
            onClick={generateCourse}
            disabled={
              config.includeQuiz && (
                (config.questionMode === 'manual' && manualQuestions.length < 3) ||
                (config.questionMode === 'hybrid' && manualQuestions.length < 1)
              )
            }
            className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!config.includeQuiz && 'Generate Course (Acknowledgment Only)'}
            {config.includeQuiz && config.questionMode === 'ai' && 'Generate Course (100% Verified)'}
            {config.includeQuiz && config.questionMode === 'manual' && `Generate Course with ${manualQuestions.length} Custom Questions`}
            {config.includeQuiz && config.questionMode === 'hybrid' && `Generate Course (AI + ${manualQuestions.length} Custom)`}
          </button>
        </div>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
        <Loader className="w-16 h-16 text-blue-600 mx-auto mb-6 animate-spin" />
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Generating Your Course...</h2>
        <p className="text-lg text-gray-600 mb-8">{processingStage}</p>
        
        <div className="max-w-md mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500"
                 style={{ width: processingStage.includes('facts') ? '20%' : 
                                processingStage.includes('quiz') ? '40%' : 
                                processingStage.includes('Verifying') ? '60%' : 
                                processingStage.includes('structure') ? '80%' : '100%' }}>
            </div>
          </div>
          
          <div className="mt-6 text-sm text-gray-500 space-y-2">
            <p>✓ Extracting verifiable facts from document</p>
            <p>✓ Generating quiz questions with source verification</p>
            <p>✓ Running 100% accuracy checks</p>
            <p>✓ Building course modules</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (!courseData) return null;

    return (
      <div className="max-w-6xl mx-auto">
        {/* Unsaved Changes Warning */}
        {hasUnsavedEdits && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-orange-900">You have unsaved content edits</p>
              <p className="text-sm text-orange-800">Export your SCORM package to save all changes permanently.</p>
            </div>
          </div>
        )}

        {/* Verification Report - Only show if quiz is included */}
        {verificationReport && (
        <div className={`rounded-2xl shadow-xl p-8 mb-8 ${
          verificationReport.allVerified
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200'
            : 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200'
        }`}>
          <div className="flex items-center gap-4 mb-6">
            {verificationReport.allVerified ? (
              <CheckCircle className="w-12 h-12 text-green-600" />
            ) : (
              <AlertCircle className="w-12 h-12 text-yellow-600" />
            )}
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Verification Report</h2>
              <p className={`text-lg ${verificationReport.allVerified ? 'text-green-700' : 'text-yellow-700'}`}>
                {verificationReport.summary}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Overall Score</p>
              <p className="text-3xl font-bold text-blue-600">{verificationReport.overallScore}%</p>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Verified</p>
              <p className="text-3xl font-bold text-green-600">{verificationReport.verified}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Warnings</p>
              <p className="text-3xl font-bold text-yellow-600">{verificationReport.warnings}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Failed</p>
              <p className="text-3xl font-bold text-red-600">{verificationReport.failed}</p>
            </div>
          </div>

          {/* Detailed Verification */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4">Detailed Verification Results</h3>
            <div className="space-y-3">
              {verificationReport.details.map((detail, idx) => {
                const question = courseData.quiz.questions[idx];
                const isManual = question?.isManual;
                
                return (
                  <div key={idx} className={`p-4 rounded-lg border-2 ${
                    detail.status === 'verified' ? 'bg-green-50 border-green-200' : 
                    detail.status === 'warning' ? 'bg-yellow-50 border-yellow-200' : 
                    'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">Question {idx + 1}</p>
                        {isManual && (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-purple-100 text-purple-700">
                            CUSTOM
                          </span>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        detail.status === 'verified' ? 'bg-green-600 text-white' : 
                        detail.status === 'warning' ? 'bg-yellow-600 text-white' : 
                        'bg-red-600 text-white'
                      }`}>
                        {detail.score}% Match
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{detail.question}</p>
                    <div className="flex gap-4 text-xs">
                      <span className={detail.quoteExists ? 'text-green-600' : 'text-red-600'}>
                        {detail.quoteExists ? '✓' : '✗'} Quote Verified
                      </span>
                      <span className={detail.similarity > 70 ? 'text-green-600' : 'text-red-600'}>
                        {detail.similarity > 70 ? '✓' : '✗'} {detail.similarity}% Similarity
                      </span>
                      <span className={detail.answerVerifiable ? 'text-green-600' : 'text-red-600'}>
                        {detail.answerVerifiable ? '✓' : '✗'} Answer Verified
                      </span>
                    </div>
                    {detail.issues.length > 0 && (
                      <div className="mt-2 text-xs text-red-600">
                        Issues: {detail.issues.join(', ')}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => editGeneratedQuestion(idx)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-all text-sm font-semibold"
                      >
                        Edit Question
                      </button>
                      <button
                        onClick={() => deleteGeneratedQuestion(idx)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-all text-sm font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}

        {/* Course Preview */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {courseData.logo && (
                <img src={courseData.logo} alt="Logo" className="h-16 w-16 object-contain border rounded p-1" />
              )}
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{courseData.title}</h2>
                <p className="text-gray-600">
                  {courseData.modules.length} modules
                  {courseData.includeQuiz !== false && courseData.quiz.questions.length > 0 && ` • ${courseData.quiz.questions.length} quiz questions`}
                  {courseData.includeQuiz === false && ' • Acknowledgment only'}
                </p>
                {currentDocumentId && currentCourseId && (
                  <div className="mt-2 text-xs bg-blue-50 border border-blue-200 rounded px-3 py-2 inline-block">
                    <p className="text-blue-800">
                      <strong>Audit Trail:</strong> Document v{documentVersion} → Course ID: {currentCourseId.substring(0, 8)}...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modules Preview */}
          <div className="space-y-4">
            {courseData.modules.map((module, idx) => (
              <div key={idx} className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-all">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{module.title}</h3>
                  <p className="text-sm text-gray-500">{module.duration}</p>
                </div>
                <div className="text-sm text-gray-600">
                  {module.content.length} content sections
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => setStep('configure')}
            disabled={isProcessing}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Regenerate
          </button>
          <button
            onClick={() => { setShowPreview(true); setPreviewModule(0); setShowPreviewQuiz(false); }}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Eye className="w-5 h-5" />
            Preview Course
          </button>
          <button
            onClick={handleDownloadClientPreview}
            disabled={!courseData}
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Download standalone HTML preview that clients can open in any browser"
          >
            <FileDown className="w-5 h-5" />
            Download Client Preview
          </button>
          <button
            onClick={exportSCORM}
            disabled={courseData.includeQuiz !== false && (!verificationReport || !verificationReport.allVerified) || isProcessing}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Generating Package...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                {courseData.includeQuiz === false
                  ? 'Export SCORM Package'
                  : (verificationReport && verificationReport.allVerified
                      ? 'Export SCORM Package'
                      : 'Fix Issues Before Export')}
              </>
            )}
          </button>
        </div>

        {/* Save Course Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => handleSaveCourse('generated')}
            className="px-6 py-3 bg-indigo-100 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-200 transition-all flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save Course for Later
            {currentSavedCourseId && <span className="text-xs bg-indigo-200 px-2 py-0.5 rounded-full">Saved</span>}
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            AI Course Builder
          </h1>
          <p className="text-xl text-gray-600">
            100% Verified • Custom Branding • Manual Questions
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-4">
            {['upload', 'configure', 'processing', 'preview'].map((s, idx) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                  step === s ? 'bg-blue-600 text-white' : 
                  ['upload', 'configure', 'processing', 'preview'].indexOf(step) > idx ? 'bg-green-600 text-white' : 
                  'bg-gray-200 text-gray-600'
                }`}>
                  <span className="font-semibold capitalize">{s}</span>
                </div>
                {idx < 3 && (
                  <div className={`w-12 h-1 ${
                    ['upload', 'configure', 'processing', 'preview'].indexOf(step) > idx ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        {step === 'upload' && renderUploadStep()}
        {step === 'configure' && renderConfigureStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'preview' && renderPreviewStep()}
      </div>

      {/* Question Editor Modal */}
      {showQuestionEditor && editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingQuestion.existingIndex !== undefined ? 'Edit Question' : 'Create New Question'}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Question Text */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Question <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({...editingQuestion, question: e.target.value})}
                  placeholder="e.g., What is the minimum handwashing time?"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Answer Options */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Answer Options (minimum 2, maximum 10) <span className="text-red-600">*</span>
                  </label>
                  <span className="text-sm text-gray-500">{editingQuestion.options.length} options</span>
                </div>
                <div className="space-y-3">
                  {editingQuestion.options.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={editingQuestion.correctAnswer === idx}
                        onChange={() => setEditingQuestion({...editingQuestion, correctAnswer: idx})}
                        className="w-5 h-5 text-green-600"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...editingQuestion.options];
                          newOptions[idx] = e.target.value;
                          setEditingQuestion({...editingQuestion, options: newOptions});
                        }}
                        placeholder={`Option ${idx + 1} ${idx === editingQuestion.correctAnswer ? '(Correct Answer)' : ''}`}
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                      {editingQuestion.options.length > 2 && (
                        <button
                          onClick={() => {
                            const newOptions = editingQuestion.options.filter((_, i) => i !== idx);
                            const newCorrectAnswer = editingQuestion.correctAnswer >= newOptions.length 
                              ? newOptions.length - 1 
                              : editingQuestion.correctAnswer > idx 
                                ? editingQuestion.correctAnswer - 1 
                                : editingQuestion.correctAnswer;
                            setEditingQuestion({...editingQuestion, options: newOptions, correctAnswer: newCorrectAnswer});
                          }}
                          className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {editingQuestion.options.length < 10 && (
                  <button
                    onClick={() => setEditingQuestion({...editingQuestion, options: [...editingQuestion.options, '']})}
                    className="mt-3 px-4 py-2 bg-green-100 text-green-700 font-semibold rounded-lg hover:bg-green-200 transition-all flex items-center gap-2"
                  >
                    + Add Option
                  </button>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  ✓ Click the radio button to mark the correct answer. You can add up to 10 options.
                </p>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Explanation (Optional)
                </label>
                <textarea
                  value={editingQuestion.explanation}
                  onChange={(e) => setEditingQuestion({...editingQuestion, explanation: e.target.value})}
                  placeholder="Explain why this answer is correct"
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Verification Preview */}
              {documentText && editingQuestion.question && editingQuestion.options[editingQuestion.correctAnswer] && (
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Real-time Verification</p>
                  {(() => {
                    const verification = verifyManualQuestion(editingQuestion);
                    return (
                      <div className="text-sm space-y-2">
                        <p className={verification.verified ? 'text-green-700' : verification.contentRelevant ? 'text-yellow-700' : 'text-red-700'}>
                          Match Score: {verification.score}%
                          {verification.verified ? ' ✓ Verified' : verification.contentRelevant ? ' ⚠️ Needs Review' : ' ✗ Not Relevant'}
                        </p>
                        <p className="text-gray-700">
                          Content Similarity: {verification.similarity}% •
                          Terms Match: {verification.termMatchRate}%
                        </p>
                        {!verification.contentRelevant && (
                          <p className="text-red-700 font-semibold">
                            ⚠️ This question does not appear to be based on the document content.
                          </p>
                        )}
                        {verification.contentRelevant && !verification.verified && (
                          <p className="text-yellow-700">
                            💡 Tip: Make your question more specific to the document content to improve the match score.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6 flex gap-4">
              <button
                onClick={() => {
                  setShowQuestionEditor(false);
                  setEditingQuestion(null);
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={editingQuestion.isGeneratedQuestion ? saveEditedGeneratedQuestion : saveManualQuestion}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:shadow-lg transition-all"
              >
                {editingQuestion.isGeneratedQuestion ? 'Update Question' : (editingQuestion.existingIndex !== undefined ? 'Update Question' : 'Save Question')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Preview Modal */}
      {showPreview && courseData && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Preview Header */}
            <div className="bg-gray-50 border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Course Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto">
              {!showPreviewQuiz ? (
                // Module Preview
                <div className="bg-white">
                  <div className="bg-blue-900 text-white px-8 py-8">
                    {courseData.logo && (
                      <img src={courseData.logo} alt="Logo" className="h-12 mb-4 object-contain" style={{filter: 'brightness(0) invert(1)'}} />
                    )}
                    <h1 className="text-3xl font-bold mb-2">{courseData.title}</h1>
                    <p className="text-lg opacity-90">Module {previewModule + 1} of {courseData.modules.length}</p>
                  </div>

                  <div className="px-8 py-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">{courseData.modules[previewModule].title}</h2>
                    <p className="text-gray-600 mb-8"><strong>Estimated Duration:</strong> {courseData.modules[previewModule].duration}</p>

                    {courseData.modules[previewModule].content.map((section, sectionIdx) => (
                      <div key={sectionIdx} className="relative group">
                        {/* EDIT BUTTON - appears on hover */}
                        <button
                          onClick={() => openContentEditor(previewModule, sectionIdx)}
                          className="absolute -left-3 top-0 bg-blue-600 text-white p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-blue-700"
                          title="Edit this content section"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {section.type === 'objectives' && (
                          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-lg">
                            <h3 className="text-xl font-bold text-blue-900 mb-4">{section.heading}</h3>
                            <div className="font-medium">{renderFormattedContent(section.body, 'text-blue-800')}</div>
                          </div>
                        )}
                        
                        {section.type === 'summary' && (
                          <div className="bg-green-50 border-2 border-green-500 p-6 mt-8 mb-8 rounded-lg">
                            <h3 className="text-xl font-bold text-green-900 mb-4">{section.heading}</h3>
                            <div className="font-medium">{renderFormattedContent(section.body, 'text-green-800')}</div>
                          </div>
                        )}
                        
                        {section.type === 'callout-key' && (
                          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-5 mb-6 rounded-lg">
                            <h4 className="text-lg font-semibold text-yellow-900 mb-3">{section.heading}</h4>
                            {renderFormattedContent(section.body, 'text-yellow-800')}
                          </div>
                        )}
                        
                        {section.type === 'callout-important' && (
                          <div className="bg-red-50 border-l-4 border-red-500 p-5 mb-6 rounded-lg">
                            <h4 className="text-lg font-semibold text-red-900 mb-3">{section.heading}</h4>
                            <div className="font-medium">{renderFormattedContent(section.body, 'text-red-800')}</div>
                          </div>
                        )}
                        
                        {section.type === 'callout-definition' && (
                          <div className="bg-indigo-50 border-l-4 border-indigo-500 p-5 mb-6 rounded-lg">
                            <h4 className="text-lg font-semibold text-indigo-900 mb-3">{section.heading}</h4>
                            {renderFormattedContent(section.body, 'text-indigo-800')}
                          </div>
                        )}
                        
                        {(!section.type || section.type === 'content') && (
                          <div className="mb-8">
                            <h3 className="text-2xl font-semibold text-gray-900 mb-4">{section.heading}</h3>
                            {renderFormattedContent(section.body, 'text-gray-700')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : courseData.includeQuiz !== false ? (
                // Quiz Preview
                <div className="bg-white">
                  <div className="bg-blue-900 text-white px-8 py-8">
                    {courseData.logo && (
                      <img src={courseData.logo} alt="Logo" className="h-12 mb-4 object-contain" style={{filter: 'brightness(0) invert(1)'}} />
                    )}
                    <h1 className="text-3xl font-bold mb-2">{courseData.title}</h1>
                    <p className="text-lg opacity-90">Final Assessment</p>
                  </div>

                  <div className="px-8 py-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Final Assessment</h2>
                    <p className="text-gray-600 mb-8"><strong>Passing Score:</strong> {config.passingScore}% | <strong>Questions:</strong> {courseData.quiz.questions.length}</p>

                    {courseData.quiz.questions.map((q, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
                        <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">
                          Question {idx + 1} of {courseData.quiz.questions.length}
                        </div>
                        <div className="text-lg font-semibold text-gray-900 mb-4">{q.question}</div>

                        {/* Source Citation */}
                        <div className="mb-4 space-y-2">
                          {q.sourceReference && (
                            <div className="flex items-start gap-2">
                              <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded text-sm font-semibold whitespace-nowrap">
                                Source: {q.sourceReference}
                              </span>
                            </div>
                          )}
                          {q.exactQuote && (
                            <div className="bg-gray-50 border-l-4 border-blue-500 p-3 rounded">
                              <p className="text-xs font-semibold text-gray-600 mb-1">Exact Source Quote:</p>
                              <p className="text-sm text-gray-800 italic">"{q.exactQuote}"</p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {q.options.map((option, optIdx) => (
                            <div key={optIdx} className="flex items-start gap-3 p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition-colors cursor-pointer">
                              <input type="radio" name={`preview-q${idx}`} className="mt-1" />
                              <label className="flex-1 cursor-pointer text-gray-700">{option}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Preview Navigation */}
            <div className="bg-white border-t px-6 py-4 flex items-center justify-between">
              {!showPreviewQuiz ? (
                <>
                  <button
                    onClick={() => {
                      if (previewModule > 0) {
                        setPreviewModule(previewModule - 1);
                      }
                    }}
                    disabled={previewModule === 0}
                    className="px-5 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous Module
                  </button>
                  <span className="text-gray-600 font-medium">
                    Module {previewModule + 1} of {courseData.modules.length}
                  </span>
                  <button
                    onClick={() => {
                      if (previewModule < courseData.modules.length - 1) {
                        setPreviewModule(previewModule + 1);
                      } else if (courseData.includeQuiz !== false) {
                        setShowPreviewQuiz(true);
                      }
                    }}
                    className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all"
                    disabled={previewModule >= courseData.modules.length - 1 && courseData.includeQuiz === false}
                    style={{opacity: previewModule >= courseData.modules.length - 1 && courseData.includeQuiz === false ? '0.5' : '1'}}
                  >
                    {previewModule < courseData.modules.length - 1
                      ? 'Next Module →'
                      : (courseData.includeQuiz !== false ? 'Continue to Quiz →' : 'End of Course')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowPreviewQuiz(false);
                      setPreviewModule(courseData.modules.length - 1);
                    }}
                    className="px-5 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
                  >
                    ← Back to Modules
                  </button>
                  <span className="text-gray-600 font-medium">Final Assessment</span>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all"
                  >
                    Close Preview
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content Editor Modal */}
      {showContentEditor && editingContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-blue-600 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Edit Content Section</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Module {editingContent.moduleIndex + 1} • Section {editingContent.sectionIndex + 1}
                </p>
              </div>
              <button
                onClick={cancelContentEdit}
                className="p-2 hover:bg-blue-700 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Editor Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Section Type
                </label>
                <select
                  value={editingContent.section.type || 'content'}
                  onChange={(e) => setEditingContent({
                    ...editingContent,
                    section: { ...editingContent.section, type: e.target.value }
                  })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="content">Standard Content</option>
                  <option value="objectives">Learning Objectives</option>
                  <option value="summary">Summary</option>
                  <option value="callout-key">Key Point Callout</option>
                  <option value="callout-important">Important Note</option>
                  <option value="callout-definition">Definition</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Changes the visual styling and emphasis of this section
                </p>
              </div>

              {/* Heading */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Section Heading <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={editingContent.section.heading}
                  onChange={(e) => setEditingContent({
                    ...editingContent,
                    section: { ...editingContent.section, heading: e.target.value }
                  })}
                  placeholder="e.g., Introduction, Key Steps, Safety Requirements"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Body Content */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Content <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={editingContent.section.body}
                  onChange={(e) => setEditingContent({
                    ...editingContent,
                    section: { ...editingContent.section, body: e.target.value }
                  })}
                  placeholder="Enter the content for this section. You can use:&#10;• Bullet points (start lines with • or -)&#10;&#10;Regular paragraphs&#10;&#10;Multiple paragraphs separated by blank lines"
                  rows={15}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-mono text-sm"
                />
                <div className="mt-2 flex items-start gap-2 text-xs text-gray-500">
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 flex-1">
                    <p className="font-semibold text-blue-900 mb-1">Formatting Tips:</p>
                    <ul className="space-y-1">
                      <li>• Start lines with <code className="bg-blue-100 px-1 rounded">•</code> or <code className="bg-blue-100 px-1 rounded">-</code> for bullet points</li>
                      <li>• Leave blank lines between paragraphs</li>
                      <li>• Content will be automatically formatted in the output</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Live Preview
                </label>
                <div className={`p-6 rounded-lg border-2 ${
                  editingContent.section.type === 'objectives' ? 'bg-blue-50 border-blue-200' :
                  editingContent.section.type === 'summary' ? 'bg-green-50 border-green-200' :
                  editingContent.section.type === 'callout-key' ? 'bg-yellow-50 border-yellow-200' :
                  editingContent.section.type === 'callout-important' ? 'bg-red-50 border-red-200' :
                  editingContent.section.type === 'callout-definition' ? 'bg-indigo-50 border-indigo-200' :
                  'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-lg font-bold mb-3 ${
                    editingContent.section.type === 'objectives' ? 'text-blue-900' :
                    editingContent.section.type === 'summary' ? 'text-green-900' :
                    editingContent.section.type === 'callout-key' ? 'text-yellow-900' :
                    editingContent.section.type === 'callout-important' ? 'text-red-900' :
                    editingContent.section.type === 'callout-definition' ? 'text-indigo-900' :
                    'text-gray-900'
                  }`}>
                    {editingContent.section.heading || 'Section Heading'}
                  </h3>
                  <div className={`${
                    editingContent.section.type === 'objectives' ? 'text-blue-800' :
                    editingContent.section.type === 'summary' ? 'text-green-800' :
                    editingContent.section.type === 'callout-key' ? 'text-yellow-800' :
                    editingContent.section.type === 'callout-important' ? 'text-red-800' :
                    editingContent.section.type === 'callout-definition' ? 'text-indigo-800' :
                    'text-gray-700'
                  }`}>
                    {editingContent.section.body ? (
                      renderFormattedContent(editingContent.section.body, 
                        editingContent.section.type === 'objectives' ? 'text-blue-800' :
                        editingContent.section.type === 'summary' ? 'text-green-800' :
                        editingContent.section.type === 'callout-key' ? 'text-yellow-800' :
                        editingContent.section.type === 'callout-important' ? 'text-red-800' :
                        editingContent.section.type === 'callout-definition' ? 'text-indigo-800' :
                        'text-gray-700'
                      )
                    ) : (
                      <p className="text-gray-400 italic">Content will appear here...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Warning about compliance */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900 text-sm">Compliance Notice</p>
                    <p className="text-xs text-yellow-800 mt-1">
                      You're editing AI-generated content that was verified against your source document. 
                      Make sure your edits maintain accuracy and compliance with the original document.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 border-t-2 border-gray-200 p-6 flex gap-4">
              <button
                onClick={cancelContentEdit}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveContentEdit}
                disabled={!editingContent.section.heading || !editingContent.section.body}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {currentError && (
        <ErrorModal
          error={currentError}
          onClose={() => setCurrentError(null)}
          onRetry={() => {
            setCurrentError(null);
            if (step === 'processing') {
              generateCourse();
            }
          }}
        />
      )}

      {/* Saved Courses Modal */}
      {showSavedCourses && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Saved Courses</h2>
                    <p className="text-indigo-200 text-sm">Load, edit, or manage your saved courses</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSavedCourses(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Client Filter */}
              <div className="mt-4 flex gap-4">
                <select
                  value={clientFilter}
                  onChange={(e) => { setClientFilter(e.target.value); refreshSavedCourses(); }}
                  className="flex-1 px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="" className="text-gray-900">All Clients</option>
                  {uniqueClients.map(client => (
                    <option key={client} value={client} className="text-gray-900">{client}</option>
                  ))}
                </select>
                <button
                  onClick={refreshSavedCourses}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Course List */}
            <div className="flex-1 overflow-y-auto p-6">
              {savedCourses.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No saved courses found</p>
                  <p className="text-gray-400 text-sm mt-2">Courses will appear here after you save them</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedCourses.map(course => (
                    <div
                      key={course.id}
                      className={`border-2 rounded-xl p-4 transition-all hover:shadow-md ${
                        course.status === 'completed' ? 'border-green-200 bg-green-50' :
                        course.status === 'exported' ? 'border-blue-200 bg-blue-50' :
                        course.status === 'generated' ? 'border-purple-200 bg-purple-50' :
                        'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              course.status === 'completed' ? 'bg-green-200 text-green-800' :
                              course.status === 'exported' ? 'bg-blue-200 text-blue-800' :
                              course.status === 'generated' ? 'bg-purple-200 text-purple-800' :
                              'bg-gray-200 text-gray-800'
                            }`}>
                              {course.status.toUpperCase()}
                            </span>
                            {course.sopContentCleared && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-200 text-yellow-800">
                                SOP CLEARED
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-gray-900 text-lg">{course.courseTitle}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {course.clientName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(course.updatedAt).toLocaleDateString()}
                            </span>
                            {course.gxpFields?.sopNumber && (
                              <span className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                {course.gxpFields.sopNumber}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLoadCourse(course)}
                            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all font-semibold text-sm flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Load
                          </button>
                          {course.status !== 'completed' && (
                            <button
                              onClick={() => handleCompleteAndCleanup(course.id)}
                              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all font-semibold text-sm flex items-center gap-2"
                              title="Complete & Cleanup - Clears SOP content"
                            >
                              <CheckSquare className="w-4 h-4" />
                              Complete
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                            title="Delete course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t-2 border-gray-200 p-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {savedCourses.length} course{savedCourses.length !== 1 ? 's' : ''} saved
              </p>
              <button
                onClick={() => setShowSavedCourses(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedCourseBuilder;