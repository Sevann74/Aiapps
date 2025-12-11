import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Settings, Eye, Download, CheckCircle, AlertCircle, Loader, ArrowLeft, Send, Package } from 'lucide-react';
import { signIn, signOut, createUser, type UserProfile } from './lib/authService';
import { uploadDocument, downloadDocument } from './lib/storageService';
import { createJob, getJobs, updateJob } from './lib/jobsService';

// ============================================
// SIMPLIFIED ICON COMPONENT
// ============================================
const Icon = ({ name, className = "w-5 h-5" }) => {
  const icons = {
    package: "📦", upload: "⬆️", eye: "👁️", download: "⬇️",
    clock: "🕐", check: "✅", edit: "✏️", file: "📄",
    send: "📤", arrow: "←", building: "🏢", user: "👤",
    lock: "🔒", logout: "🚪", mail: "📧", trash: "🗑️",
    plus: "➕", refresh: "🔄"
  };
  return <span className={`inline-block ${className}`}>{icons[name] || "●"}</span>;
};

// ============================================
// COURSE STATUS CONFIGURATIONS
// ============================================
const COURSE_STATUSES = {
  submitted: { label: 'Submitted', color: 'blue', icon: 'clock' },
  in_progress: { label: 'Processing', color: 'yellow', icon: 'refresh' },
  pending_review: { label: 'Review Ready', color: 'purple', icon: 'eye' },
  revision_requested: { label: 'Revision Requested', color: 'orange', icon: 'edit' },
  approved: { label: 'Completed', color: 'green', icon: 'check' },
  delivered: { label: 'Delivered', color: 'green', icon: 'package' },
  closed: { label: 'Archived', color: 'gray', icon: 'lock' }
};

// ============================================
// MAIN COMPONENT
// ============================================
const StreamlinedCourseBuilder = () => {
  // Authentication state - Login required (persisted to localStorage for demo)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('coursebuilder_session');
    return saved ? JSON.parse(saved).isAuthenticated : false;
  });
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('coursebuilder_session');
    return saved ? JSON.parse(saved).user : null;
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // View state
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, submit, job-detail, admin-dashboard, admin-job-detail, admin-onboard-client, admin-manage-clients
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [revisionComment, setRevisionComment] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState<{jobId: string; eta: string} | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [showRevisionBox, setShowRevisionBox] = useState(false);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info'; message: string; details?: string} | null>(null);
  
  // Client submission form
  const [clientForm, setClientForm] = useState({
    courseTitle: '',
    contactEmail: '',
    quizMode: 'ai', // ai, manual, hybrid, none
    questionCount: 5, // Number of quiz questions (max 10)
    passingScore: 80, // Passing score percentage
    maxAttempts: 3, // Max quiz attempts
    scormVersion: '1.2', // SCORM version
    sopNumber: '',
    documentVersion: '', // Document Version Number (mandatory)
    effectiveDate: '',
    regulatoryStatus: 'Draft',
    comments: ''
  });
  
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileChecksum, setFileChecksum] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [manualQuestions, setManualQuestions] = useState<any[]>([]);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [companyLogo, setCompanyLogo] = useState<{name: string; data: string} | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const scormInputRef = useRef<HTMLInputElement>(null);
  const auditInputRef = useRef<HTMLInputElement>(null);
  
  // Admin state
  const [adminNotes, setAdminNotes] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [finalScormFile, setFinalScormFile] = useState(null);
  const [auditLogFile, setAuditLogFile] = useState(null);
  
  // New client onboarding
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    email: '',
    password: '',
    organization: '',
    companyLogo: null as {name: string; data: string} | null
  });
  const clientLogoInputRef = useRef<HTMLInputElement>(null);
  
  // Mock users database - load from localStorage
  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem('coursebuilder_clients');
    return saved ? JSON.parse(saved) : [
      {
        id: 'client-001',
        email: 'sarah@abcpharma.com',
        password: 'demo123',
        name: 'Sarah Johnson',
        role: 'client',
        organization: 'ABC Pharma',
        createdAt: new Date().toISOString()
      }
    ];
  });
  
  // Save clients to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('coursebuilder_clients', JSON.stringify(clients));
  }, [clients]);
  
  const mockUsers = {
    ...clients.reduce((acc, client) => {
      acc[client.email] = client;
      return acc;
    }, {}),
    'david.dergazarian@navigantlearning.com': {
      id: 'admin-001',
      email: 'david.dergazarian@navigantlearning.com',
      password: 'admin123',
      name: 'David Dergazarian',
      role: 'admin',
      organization: 'Learning Conversion Hub'
    }
  };
  
  // Jobs state - load from localStorage
  const [jobs, setJobs] = useState(() => {
    const savedJobs = localStorage.getItem('streamlinedCourseJobs');
    if (savedJobs) {
      // Migrate old ETA values to new 24 hours standard
      const parsedJobs = JSON.parse(savedJobs);
      return parsedJobs.map((job: any) => ({
        ...job,
        eta: 'Up to 24 hours' // Standardize all ETAs
      }));
    }
    
    return [
      {
        id: 'J001',
        clientId: 'client-001',
        clientName: 'Sarah Johnson',
        clientEmail: 'sarah@abcpharma.com',
        organization: 'ABC Pharma',
        status: 'pending_review',
        courseTitle: 'Lab Safety Procedures',
        sopNumber: 'SOP-LAB-001',
        effectiveDate: '2025-01-15',
        estimatedSeatTime: 45,
        quizMode: 'ai',
        comments: 'Please ensure compliance with ISO 17025',
        fileName: 'lab-safety-procedures.pdf',
        fileChecksum: 'abc123def456...',
        submittedAt: '2025-01-07T10:30:00Z',
        updatedAt: '2025-01-08T14:20:00Z',
        eta: '24 hours',
        previewFileName: 'Client preview last.html',
        previewContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lab Safety Procedures - Course Preview</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #2E3192, #00C5B8); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
    .content { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
    h1 { margin: 0; font-size: 2em; }
    h2 { color: #2E3192; border-bottom: 2px solid #00C5B8; padding-bottom: 10px; }
    .important { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
    .quiz { background: #e7f3ff; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .option { background: white; padding: 10px; margin: 8px 0; border: 2px solid #ddd; border-radius: 5px; cursor: pointer; }
    .option:hover { border-color: #2E3192; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔬 Lab Safety Procedures</h1>
    <p>SOP-LAB-001 | Effective Date: January 15, 2025</p>
  </div>
  
  <div class="content">
    <h2>Module 1: Introduction to Lab Safety</h2>
    <p>Welcome to the Lab Safety Procedures training course. This course covers essential safety protocols and procedures required for working in laboratory environments.</p>
    
    <div class="important">
      <strong>⚠️ Important:</strong> All personnel must complete this training before entering laboratory facilities.
    </div>
    
    <h3>Learning Objectives</h3>
    <ul>
      <li>Understand basic laboratory safety principles</li>
      <li>Identify common laboratory hazards</li>
      <li>Apply proper personal protective equipment (PPE) procedures</li>
      <li>Follow emergency response protocols</li>
    </ul>
  </div>
  
  <div class="content">
    <h2>Module 2: Personal Protective Equipment (PPE)</h2>
    <p>Proper use of PPE is critical for laboratory safety. This section covers the selection, use, and maintenance of laboratory PPE.</p>
    
    <h3>Required PPE</h3>
    <ul>
      <li><strong>Lab Coat:</strong> Must be worn at all times in the laboratory</li>
      <li><strong>Safety Glasses:</strong> Required when handling chemicals or biological materials</li>
      <li><strong>Gloves:</strong> Select appropriate glove type based on hazard assessment</li>
      <li><strong>Closed-toe Shoes:</strong> No sandals or open-toed footwear permitted</li>
    </ul>
    
    <div class="important">
      <strong>⚠️ Critical Safety Point:</strong> Never remove PPE until you have exited the laboratory area.
    </div>
  </div>
  
  <div class="content">
    <h2>Module 3: Chemical Safety</h2>
    <p>Proper handling and storage of chemicals is essential for maintaining a safe laboratory environment.</p>
    
    <h3>Key Principles</h3>
    <ul>
      <li>Always read Safety Data Sheets (SDS) before using chemicals</li>
      <li>Store chemicals according to compatibility groups</li>
      <li>Use fume hoods when working with volatile substances</li>
      <li>Label all chemical containers clearly</li>
      <li>Dispose of chemical waste according to institutional procedures</li>
    </ul>
  </div>
  
  <div class="content quiz">
    <h2>📝 Knowledge Check</h2>
    <p><strong>Question 1:</strong> Which of the following PPE items is required at all times in the laboratory?</p>
    <div class="option">A) Safety goggles</div>
    <div class="option" style="border-color: #28a745; background: #d4edda;"><strong>✓ B) Lab coat (Correct Answer)</strong></div>
    <div class="option">C) Face shield</div>
    <div class="option">D) Respirator</div>
    
    <p style="margin-top: 20px;"><strong>Question 2:</strong> What should you do before using any chemical in the laboratory?</p>
    <div class="option">A) Ask a colleague</div>
    <div class="option" style="border-color: #28a745; background: #d4edda;"><strong>✓ B) Read the Safety Data Sheet (Correct Answer)</strong></div>
    <div class="option">C) Smell the chemical</div>
    <div class="option">D) Test a small amount first</div>
  </div>
  
  <div class="content">
    <p style="text-align: center; color: #666; font-size: 0.9em;">
      <strong>Course Preview</strong> | This is a demonstration of the actual course content that will be delivered to learners.
    </p>
  </div>
</body>
</html>`,
        auditLog: [
          { timestamp: '2025-01-07T10:30:00Z', action: 'Job submitted', actor: 'sarah@abcpharma.com', ip: '192.168.1.1' },
          { timestamp: '2025-01-07T10:30:05Z', action: 'Email notification sent', actor: 'system', details: 'Sent to david.dergazarian@navigantlearning.com' },
{ timestamp: '2025-01-08T09:15:00Z', action: 'Admin downloaded SOP', actor: 'david.dergazarian@navigantlearning.com', ip: '10.0.0.1' },
          { timestamp: '2025-01-08T14:20:00Z', action: 'Preview uploaded', actor: 'david.dergazarian@navigantlearning.com', details: 'Client preview last.html' }
        ]
      }
    ];
  });
  
  // Load jobs from Supabase when authenticated
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  
  useEffect(() => {
    const loadJobsFromSupabase = async () => {
      if (!isAuthenticated || !currentUser) return;
      setIsLoadingJobs(true);
      try {
        const result = await getJobs();
        if (result.success && result.jobs && result.jobs.length > 0) {
          setJobs(result.jobs);
        }
      } catch (error) {
        console.error('Failed to load jobs:', error);
      }
      setIsLoadingJobs(false);
    };
    loadJobsFromSupabase();
  }, [isAuthenticated, currentUser]);
  
  // Save jobs to localStorage as backup
  useEffect(() => {
    if (jobs.length > 0) {
      localStorage.setItem('streamlinedCourseJobs', JSON.stringify(jobs));
    }
  }, [jobs]);
  
  // ============================================
  // AUTHENTICATION
  // ============================================
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
      // Try Supabase auth first
      const result = await signIn(loginEmail, loginPassword);
      
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        setCurrentView(result.user.role === 'admin' ? 'admin-dashboard' : 'dashboard');
        localStorage.setItem('coursebuilder_session', JSON.stringify({ isAuthenticated: true, user: result.user }));
      } else {
        alert(result.error || 'Invalid credentials. Try:\nClient: sarah@abcpharma.com / demo123\nAdmin: david.dergazarian@navigantlearning.com / admin123');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('dashboard');
    setLoginEmail('');
    setLoginPassword('');
    // Clear session from localStorage
    localStorage.removeItem('coursebuilder_session');
  };
  
  // ============================================
  // FILE UPLOAD HANDLERS
  // ============================================
  
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFile(file);
    
    // Auto-fill course title from filename
    if (!clientForm.courseTitle) {
      setClientForm({
        ...clientForm,
        courseTitle: file.name.replace(/\.[^/.]+$/, '')
      });
    }
    
    // Calculate checksum (simplified - in production use proper SHA-256)
    const reader = new FileReader();
    reader.onload = (event) => {
      const checksum = btoa(String(event.target.result).substring(0, 32));
      setFileChecksum(checksum);
    };
    reader.readAsArrayBuffer(file);
  };
  
  // ============================================
  // CLIENT SUBMISSION
  // ============================================
  
  const handleSubmitJob = async () => {
    // Validation
    if (!uploadedFile) {
      alert('Please upload an SOP document');
      return;
    }
    if (!clientForm.courseTitle) {
      alert('Please enter a course title');
      return;
    }
    if (!clientForm.contactEmail) {
      alert('Please enter your contact email');
      return;
    }
    if (!clientForm.documentVersion) {
      alert('Please enter the Document Version Number');
      return;
    }
    
    // Validate manual questions if hybrid/manual mode
    if ((clientForm.quizMode === 'manual' || clientForm.quizMode === 'hybrid') && manualQuestions.length === 0) {
      alert('Please add at least one manual question for this quiz mode');
      return;
    }
    
    // Generate job ID first
    const jobId = `J${String(jobs.length + 1).padStart(3, '0')}`;
    
    // Upload document to Supabase Storage
    const uploadResult = await uploadDocument(uploadedFile, jobId, currentUser.id);
    if (!uploadResult.success) {
      alert(`Failed to upload document: ${uploadResult.error}`);
      return;
    }
    
    // Create new job
    const newJob = {
      id: jobId,
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientEmail: currentUser.email,
      organization: currentUser.organization,
      status: 'submitted',
      courseTitle: clientForm.courseTitle,
      sopNumber: clientForm.sopNumber,
      documentVersion: clientForm.documentVersion,
      effectiveDate: clientForm.effectiveDate,
      regulatoryStatus: clientForm.regulatoryStatus,
      quizMode: clientForm.quizMode,
      questionCount: clientForm.questionCount,
      passingScore: clientForm.passingScore,
      maxAttempts: clientForm.maxAttempts,
      scormVersion: clientForm.scormVersion,
      comments: clientForm.comments,
      fileName: uploadedFile.name,
      filePath: uploadResult.path,
      fileChecksum: fileChecksum,
      manualQuestions: clientForm.quizMode === 'manual' || clientForm.quizMode === 'hybrid' ? manualQuestions : [],
      companyLogo: companyLogo,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eta: 'Up to 24 hours',
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          action: 'Job submitted',
          actor: currentUser.email,
          details: `File: ${uploadedFile.name}, Checksum: ${fileChecksum}`
        },
        {
          timestamp: new Date().toISOString(),
          action: 'Document uploaded to secure storage',
          actor: 'system',
          details: `Path: ${uploadResult.path}`
        }
      ]
    };
    
    // Save to Supabase and add to local state
    const createResult = await createJob(newJob);
    if (createResult.success && createResult.job) {
      setJobs([createResult.job, ...jobs]);
    } else {
      console.error('Failed to save to Supabase:', createResult.error);
      setJobs([newJob, ...jobs]);
    }
    
    // Send email notifications (simulated)
    sendEmailNotification(newJob, 'admin');
    sendEmailNotification(newJob, 'client');
    
    // Reset form
    setClientForm({
      courseTitle: '',
      contactEmail: '',
      quizMode: 'ai',
      questionCount: 5,
      passingScore: 80,
      maxAttempts: 3,
      scormVersion: '1.2',
      sopNumber: '',
      documentVersion: '',
      effectiveDate: '',
      regulatoryStatus: 'Draft',
      comments: ''
    });
    setUploadedFile(null);
    setFileChecksum('');
    setConfirmCheckbox(false);
    setManualQuestions([]);
    setCompanyLogo(null);
    
    // Show success message inline
    setSubmissionSuccess({ jobId: newJob.id, eta: newJob.eta });
  };
  
  // ============================================
  // EMAIL NOTIFICATION (Simulated)
  // ============================================
  

  const sendEmailNotification = (job, recipient) => {
    if (recipient === 'admin') {
      sendAdminEmail(job);
    } else if (recipient === 'client') {
      sendClientEmail(job);
    }
  };
  
  const sendAdminEmail = (job) => {
    console.log(`
📧 SENDING EMAIL NOTIFICATION
═══════════════════════════════════════════════════════════
To: david.dergazarian@navigantlearning.com
From: Learning Conversion Hub <noreply@navigantlearning.com>
Subject: 🆕 New Course Request: ${job.courseTitle}
Priority: HIGH

═══════════════════════════════════════════════════════════
🚀 NEW COURSE DEVELOPMENT REQUEST
═══════════════════════════════════════════════════════════

A new course has been submitted and requires your attention.

📋 REQUEST DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Job ID:              ${job.id}
Course Title:        ${job.courseTitle}
SOP Number:          ${job.sopNumber || 'N/A'}
Regulatory Status:   ${job.regulatoryStatus}

👤 CLIENT INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:                ${job.clientName}
Email:               ${job.clientEmail}
Organization:        ${job.organization}

⚙️ COURSE SPECIFICATIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quiz Mode:           ${job.quizMode.toUpperCase()}
Number of Questions: ${job.questionCount || 5}

📎 SOURCE DOCUMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File Name:           ${job.fileName}
Checksum:            ${job.fileChecksum}
Submitted:           ${new Date(job.submittedAt).toLocaleString()}

${job.comments ? `💬 CLIENT COMMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${job.comments}

` : ''}${job.manualQuestions?.length > 0 ? `📝 MANUAL QUESTIONS PROVIDED: ${job.manualQuestions.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${job.manualQuestions.map((q, i) => `
${i + 1}. ${q.question}
   A) ${q.options[0]}
   B) ${q.options[1]}
   C) ${q.options[2]}
   D) ${q.options[3]}
   Correct: ${String.fromCharCode(65 + q.correctAnswer)}
`).join('\n')}

` : ''}⏰ EXPECTED TURNAROUND:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETA: ${job.eta}

🔗 NEXT STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Log into admin dashboard
2. Download source document
3. Review requirements
4. Generate course content
5. Upload preview for client review

═══════════════════════════════════════════════════════════
Learning Conversion Hub
© ${new Date().getFullYear()} All rights reserved.
═══════════════════════════════════════════════════════════

NOTE: This email was sent from an automated system.
      Check your admin dashboard for full details.
    `);

    // In production, add actual Microsoft Graph API call here:
    // await sendEmailViaGraphAPI({ ... });

    console.log('✅ Admin email notification sent successfully');
  };
  
  const sendClientEmail = (job) => {
    console.log(`
📧 SENDING CLIENT EMAIL NOTIFICATION
═══════════════════════════════════════════════════════════
To: ${job.clientEmail}
From: Learning Conversion Hub <noreply@navigantlearning.com>
Subject: ✅ Course Generation Started: ${job.courseTitle}

═══════════════════════════════════════════════════════════
🎉 YOUR COURSE IS BEING CREATED
═══════════════════════════════════════════════════════════

Dear ${job.clientName},

Your course is now being generated from your SOP document.

📋 YOUR COURSE DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Course ID:           ${job.id}
Course Title:        ${job.courseTitle}
SOP Number:          ${job.sopNumber || 'N/A'}
Quiz Mode:           ${job.quizMode.toUpperCase()}

⏰ WHAT HAPPENS NEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Your SOP is being processed
2. Course content is generated automatically
3. You'll receive your preview (Processing time: ${job.eta})
4. Review and approve, or request changes

📧 You'll receive email updates at each step.

═══════════════════════════════════════════════════════════
Learning Conversion Hub
© ${new Date().getFullYear()} All rights reserved.
═══════════════════════════════════════════════════════════
    `);
    console.log('✅ Client email notification sent successfully');
  };
  
  // ============================================
  // MANUAL QUESTION EDITOR
  // ============================================
  
  const addManualQuestion = () => {
    console.log('🔵 Add Question button clicked');
    const newQuestion = {
      id: `q-${Date.now()}`,
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    };
    setEditingQuestion(newQuestion);
    setShowQuestionEditor(true);
    console.log('✅ Question editor should now be visible', { showQuestionEditor: true, editingQuestion: newQuestion });
  };
  
  const saveManualQuestion = () => {
    if (!editingQuestion.question || !editingQuestion.question.trim()) {
      alert('Please enter a question');
      return;
    }
    
    // Filter out empty options
    const filledOptions = editingQuestion.options.filter((opt: string) => opt && opt.trim());
    
    if (filledOptions.length < 2) {
      alert('Please provide at least 2 answer options');
      return;
    }
    
    // Update the question with only filled options
    const cleanedQuestion = {
      ...editingQuestion,
      options: filledOptions,
      correctAnswer: editingQuestion.correctAnswer >= filledOptions.length ? 0 : editingQuestion.correctAnswer
    };
    
    const existingIndex = manualQuestions.findIndex(q => q.id === editingQuestion.id);
    if (existingIndex >= 0) {
      const updated = [...manualQuestions];
      updated[existingIndex] = editingQuestion;
      setManualQuestions(updated);
    } else {
      setManualQuestions([...manualQuestions, editingQuestion]);
    }
    
    setEditingQuestion(null);
    setShowQuestionEditor(false);
  };
  
  const deleteManualQuestion = (questionId) => {
    setManualQuestions(manualQuestions.filter(q => q.id !== questionId));
  };
  
  // ============================================
  // ADMIN ACTIONS
  // ============================================
  
  const adminDownloadSOP = async (job) => {
    // Add audit log
    const updatedJobs = jobs.map(j => {
      if (j.id === job.id) {
        return {
          ...j,
          auditLog: [
            ...j.auditLog,
            {
              timestamp: new Date().toISOString(),
              action: 'Admin downloaded SOP',
              actor: currentUser.email,
              details: `File: ${job.fileName}`
            }
          ]
        };
      }
      return j;
    });
    setJobs(updatedJobs);
    
    // Try to download from Supabase Storage if filePath exists
    if (job.filePath) {
      const result = await downloadDocument(job.filePath, job.fileName);
      if (result.success) {
        alert(`✅ SOP Downloaded\n\nFile: ${job.fileName}\n\nNext: Generate course using your CourseBuilder app, then upload preview or final SCORM.`);
        return;
      } else {
        console.error('Download from storage failed:', result.error);
        // Fall through to simulated download
      }
    }
    
    // Fallback: Create a simulated downloadable file (for old jobs without filePath)
    const fileContent = `SOP Document: ${job.courseTitle}\n\nJob ID: ${job.id}\nSOP Number: ${job.sopNumber || 'N/A'}\nSubmitted: ${new Date(job.submittedAt).toLocaleString()}\nChecksum: ${job.fileChecksum}\n\nThis is a simulated SOP file download.\nThe original file was not stored in cloud storage.`;
    
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = job.fileName || `SOP_${job.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert(`⚠️ SOP Downloaded (Simulated)\n\nFile: ${job.fileName}\nChecksum: ${job.fileChecksum}\n\nNote: This job was created before cloud storage was enabled.\n\nNext: Generate course using your CourseBuilder app, then upload preview or final SCORM.`);
  };
  
  // Show in-app notification
  const showNotification = (type: 'success' | 'error' | 'info', message: string, details?: string) => {
    setNotification({ type, message, details });
    setTimeout(() => setNotification(null), 5000);
  };

  const adminUploadFiles = (job) => {
    const previewFile = previewInputRef.current?.files?.[0];
    const scormFile = scormInputRef.current?.files?.[0];
    const auditFile = auditInputRef.current?.files?.[0];
    
    // Validate: at minimum need preview file
    if (!previewFile) {
      showNotification('error', 'Preview Required', 'Please select an HTML preview file.');
      return;
    }
    
    // Read the HTML preview file content
    const reader = new FileReader();
    reader.onload = (event) => {
      const htmlContent = event.target?.result as string;
      
      // Build audit log entries
      const auditEntries = [
        {
          timestamp: new Date().toISOString(),
          action: 'Preview uploaded',
          actor: currentUser.email,
          details: `File: ${previewFile.name}`
        }
      ];
      
      if (scormFile) {
        auditEntries.push({
          timestamp: new Date().toISOString(),
          action: 'SCORM package uploaded',
          actor: currentUser.email,
          details: `SCORM: ${scormFile.name}${auditFile ? `, Audit: ${auditFile.name}` : ''}`
        });
      }
      
      auditEntries.push({
        timestamp: new Date().toISOString(),
        action: 'Client notification sent',
        actor: 'system',
        details: `Email sent to ${job.clientEmail}`
      });
      
      // Update job
      const updatedJobs = jobs.map(j => {
        if (j.id === job.id) {
          return {
            ...j,
            status: 'pending_review',
            updatedAt: new Date().toISOString(),
            previewFileName: previewFile.name,
            previewContent: htmlContent,
            ...(scormFile && { scormFileName: scormFile.name }),
            ...(auditFile && { auditFileName: auditFile.name }),
            auditLog: [...j.auditLog, ...auditEntries]
          };
        }
        return j;
      });
      setJobs(updatedJobs);
      
      // Show in-app notification
      let details = `Preview: ${previewFile.name}`;
      if (scormFile) details += `\nSCORM: ${scormFile.name}`;
      if (auditFile) details += `\nAudit: ${auditFile.name}`;
      showNotification('success', 'Files Uploaded Successfully', `${details}\n\nClient notified at ${job.clientEmail}`);
      
      // Clear file inputs
      if (previewInputRef.current) previewInputRef.current.value = '';
      if (scormInputRef.current) scormInputRef.current.value = '';
      if (auditInputRef.current) auditInputRef.current.value = '';
    };
    
    reader.readAsText(previewFile);
  };
  
  // ============================================
  // CLIENT ACTIONS
  // ============================================
  
  // Generate Audit Trail content for download
  const generateAuditTrail = (job) => {
    const formatDate = (d) => d ? new Date(d).toLocaleString() : 'N/A';
    const previewEntry = job.auditLog?.find(e => e.action === 'Preview uploaded');
    
    return `════════════════════════════════════════════════════════════════════════════════
                         COURSE DEVELOPMENT AUDIT TRAIL
                              GxP Compliance Record
════════════════════════════════════════════════════════════════════════════════

Generated: ${new Date().toLocaleString()}
Document ID: AUDIT-${job.id}-${Date.now()}

────────────────────────────────────────────────────────────────────────────────
1. SOP METADATA
────────────────────────────────────────────────────────────────────────────────
   SOP Title:           ${job.courseTitle}
   SOP Number:          ${job.sopNumber || 'N/A'}
   Document Version:    ${job.documentVersion || 'N/A'}
   SOP File Name:       ${job.fileName}
   File Checksum:       ${job.fileChecksum}
   Effective Date:      ${job.effectiveDate || 'Not specified'}
   Regulatory Status:   ${job.regulatoryStatus || 'N/A'}

────────────────────────────────────────────────────────────────────────────────
2. PROCESS LOG (Timestamps)
────────────────────────────────────────────────────────────────────────────────
   SOP Uploaded:        ${formatDate(job.submittedAt)}
   Preview Delivered:   ${formatDate(previewEntry?.timestamp)}
   Client Approved:     ${formatDate(job.approvedAt)}
   SCORM Delivered:     ${formatDate(job.updatedAt)}

────────────────────────────────────────────────────────────────────────────────
3. USER TRACE
────────────────────────────────────────────────────────────────────────────────
   Uploaded By:         ${job.clientEmail} (${job.clientName})
   Organization:        ${job.organization}
   Approved By:         ${job.approvedBy || job.clientEmail}

────────────────────────────────────────────────────────────────────────────────
4. SCORM METADATA
────────────────────────────────────────────────────────────────────────────────
   SCORM Version:       SCORM 1.2
   Course Title:        ${job.courseTitle}
   Export Date:         ${new Date().toLocaleString()}
   Package File:        ${job.scormFileName || 'SCORM_' + job.id + '.zip'}

────────────────────────────────────────────────────────────────────────────────
5. COMPLETE AUDIT LOG
────────────────────────────────────────────────────────────────────────────────
${job.auditLog?.map((e, i) => `   [${i + 1}] ${formatDate(e.timestamp)}
       Action:  ${e.action}
       Actor:   ${e.actor}
       Details: ${e.details || 'N/A'}
`).join('\n') || '   No entries.'}

════════════════════════════════════════════════════════════════════════════════
                              END OF AUDIT TRAIL
════════════════════════════════════════════════════════════════════════════════
Auto-generated by Learning Conversion Hub
════════════════════════════════════════════════════════════════════════════════`;
  };

  // Download audit trail as PDF - isClientView hides internal timestamps
  const downloadAuditTrail = (job, isClientView = false) => {
    const formatDate = (d) => d ? new Date(d).toLocaleString() : 'N/A';
    const hiddenActions = ['SOP Uploaded', 'Admin downloaded SOP', 'Preview uploaded', 'SCORM package uploaded', 'Audit trail auto-generated', 'Client notification sent'];
    const log = isClientView ? job.auditLog?.filter(e => !hiddenActions.some(a => e.action.includes(a))) : job.auditLog;
    const w = window.open('', '_blank');
    if (!w) { alert('Please allow popups to download PDF'); return; }
    w.document.write('<html><head><title>Audit Trail</title><style>@page{margin:0.5in}body{font-family:Courier New,monospace;font-size:11px;padding:20px}.hdr{text-align:center;border:2px solid #333;padding:15px;margin-bottom:20px}.hdr h1{margin:0 0 5px;font-size:16px}.hdr h2{margin:0;font-size:12px;color:#666}.sec{margin-bottom:20px}.sec-t{background:#f0f0f0;padding:8px 12px;font-weight:bold;border-left:4px solid #333;margin-bottom:10px}.fld{display:flex;margin:5px 0;padding-left:15px}.fld-l{width:150px;font-weight:bold}.ent{background:#fafafa;padding:10px;margin:8px 0;border-left:3px solid #666}.ftr{text-align:center;margin-top:30px;padding-top:15px;border-top:2px solid #333;font-size:10px}</style></head><body>');
    w.document.write('<div class="hdr"><h1>COURSE DEVELOPMENT AUDIT TRAIL</h1><h2>GxP Compliance Record</h2></div>');
    w.document.write('<div class="fld"><span class="fld-l">Generated:</span><span>' + new Date().toLocaleString() + '</span></div>');
    w.document.write('<div class="fld"><span class="fld-l">Document ID:</span><span>AUDIT-' + job.id + '-' + Date.now() + '</span></div>');
    w.document.write('<div class="sec"><div class="sec-t">1. SOP METADATA</div>');
    w.document.write('<div class="fld"><span class="fld-l">SOP Title:</span><span>' + job.courseTitle + '</span></div>');
    w.document.write('<div class="fld"><span class="fld-l">SOP Number:</span><span>' + (job.sopNumber || 'N/A') + '</span></div>');
    w.document.write('<div class="fld"><span class="fld-l">Document Version:</span><span>' + (job.documentVersion || 'N/A') + '</span></div>');
    w.document.write('<div class="fld"><span class="fld-l">SOP File Name:</span><span>' + job.fileName + '</span></div>');
    w.document.write('<div class="fld"><span class="fld-l">File Checksum:</span><span>' + job.fileChecksum + '</span></div>');
    w.document.write('<div class="fld"><span class="fld-l">Effective Date:</span><span>' + (job.effectiveDate || 'Not specified') + '</span></div>');
    w.document.write('<div class="fld"><span class="fld-l">Regulatory Status:</span><span>' + (job.regulatoryStatus || 'N/A') + '</span></div></div>');
    if (!isClientView) {
      w.document.write('<div class="sec"><div class="sec-t">2. PROCESS LOG</div>');
      w.document.write('<div class="fld"><span class="fld-l">SOP Uploaded:</span><span>' + formatDate(job.submittedAt) + '</span></div>');
      w.document.write('<div class="fld"><span class="fld-l">Preview Delivered:</span><span>' + formatDate(job.auditLog?.find(e => e.action === 'Preview uploaded')?.timestamp) + '</span></div>');
      w.document.write('<div class="fld"><span class="fld-l">Client Approved:</span><span>' + formatDate(job.approvedAt) + '</span></div>');
      w.document.write('<div class="fld"><span class="fld-l">SCORM Delivered:</span><span>' + formatDate(job.updatedAt) + '</span></div></div>');
    }
    w.document.write('<div class="sec"><div class="sec-t">' + (isClientView ? '2' : '3') + '. USER TRACE</div>');
    w.document.write('<div class="fld"><span class="fld-l">Uploaded By:</span><span>' + job.clientEmail + ' (' + job.clientName + ')</span></div>');
    w.document.write('<div class="fld"><span class="fld-l">Organization:</span><span>' + job.organization + '</span></div>');
    w.document.write('<div class="fld"><span class="fld-l">Approved By:</span><span>' + (job.approvedBy || job.clientEmail) + '</span></div></div>');
    w.document.write('<div class="sec"><div class="sec-t">' + (isClientView ? '3' : '4') + '. SCORM METADATA</div>');
    w.document.write('<div class="fld"><span class="fld-l">SCORM Version:</span><span>SCORM 1.2</span></div>');
    w.document.write('<div class="fld"><span class="fld-l">Course Title:</span><span>' + job.courseTitle + '</span></div>');
    w.document.write('<div class="fld"><span class="fld-l">Export Date:</span><span>' + formatDate(job.approvedAt || job.updatedAt) + '</span></div>');
    w.document.write('<div class="fld"><span class="fld-l">Package File:</span><span>' + (job.scormFileName || 'SCORM_' + job.id + '.zip') + '</span></div></div>');
    w.document.write('<div class="sec"><div class="sec-t">' + (isClientView ? '4' : '5') + '. AUDIT LOG</div>');
    if (log && log.length > 0) {
      log.forEach((e, i) => {
        w.document.write('<div class="ent"><strong>[' + (i+1) + '] ' + formatDate(e.timestamp) + '</strong><br>Action: ' + e.action + '<br>Actor: ' + e.actor + (e.details ? '<br>Details: ' + e.details : '') + '</div>');
      });
    } else { w.document.write('<p>No entries.</p>'); }
    w.document.write('</div><div class="ftr"><strong>END OF AUDIT TRAIL</strong><br>Auto-generated by Learning Conversion Hub</div></body></html>');
    w.document.close();
    w.onload = function() { setTimeout(function() { w.print(); }, 250); };
  };

  const clientApprovePreview = (job) => {
    const now = new Date().toISOString();
    const updatedJobs = jobs.map(j => {
      if (j.id === job.id) {
        return {
          ...j,
          status: 'delivered',
          updatedAt: now,
          approvedAt: now,
          approvedBy: currentUser.email,
          downloadExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          auditLog: [
            ...j.auditLog,
            { timestamp: now, action: 'Job approved by client', actor: currentUser.email, details: 'Client approved preview and SCORM package' },
            { timestamp: now, action: 'Job delivered', actor: 'system', details: 'SCORM package and audit trail now available for download' }
          ]
        };
      }
      return j;
    });
    setJobs(updatedJobs);
    
    alert('✅ Job Approved!\n\nYour SCORM package and Audit Trail are now available for download in your dashboard.');
  };
  
  const clientRequestRevision = (job, comment) => {
    if (!comment || comment.trim() === '') {
      alert('Please add a comment explaining the revision needed');
      return;
    }
    
    const updatedJobs = jobs.map(j => {
      if (j.id === job.id) {
        return {
          ...j,
          status: 'revision_requested',
          revisionComment: comment,
          updatedAt: new Date().toISOString(),
          auditLog: [
            ...j.auditLog,
            {
              timestamp: new Date().toISOString(),
              action: 'Revision requested',
              actor: currentUser.email,
              details: comment
            },
            {
              timestamp: new Date().toISOString(),
              action: 'Admin notification sent',
              actor: 'system',
              details: 'Email sent to admin'
            }
          ]
        };
      }
      return j;
    });
    setJobs(updatedJobs);
    
    alert('✅ Revision Requested\n\nThe admin has been notified of your feedback.');
  };
  
  // ============================================
  // FILTERING & SEARCH
  // ============================================
  
  const getFilteredJobs = () => {
    let filtered = currentUser.role === 'admin' 
      ? jobs 
      : jobs.filter(j => j.clientId === currentUser.id);
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(j => j.status === filterStatus);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(j => 
        j.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.sopNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };
  
  // ============================================
  // RENDER STATUS BADGE
  // ============================================
  
  const getStatusBadge = (status) => {
    const config = COURSE_STATUSES[status] || COURSE_STATUSES.submitted;
    const colors = {
      blue: 'bg-blue-100 text-blue-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      purple: 'bg-purple-100 text-purple-700',
      orange: 'bg-orange-100 text-orange-700',
      green: 'bg-green-100 text-green-700',
      gray: 'bg-gray-100 text-gray-700'
    };
    
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-bold ${colors[config.color]} flex items-center gap-2`}>
        <Icon name={config.icon} className="w-4 h-4" />
        {config.label}
      </span>
    );
  };
  
  // ============================================
  // MODALS - RENDER FIRST (OVERLAY ON TOP OF EVERYTHING)
  // ============================================
  
  // Question Editor Modal
  if (showQuestionEditor && editingQuestion) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            {manualQuestions.find((q: any) => q.id === editingQuestion.id) ? 'Edit Question' : 'Add Question'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Question</label>
              <input
                type="text"
                value={editingQuestion.question}
                onChange={(e) => setEditingQuestion({...editingQuestion, question: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Enter your question..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Answer Options (minimum 2)</label>
              {editingQuestion.options.map((option: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 mb-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={editingQuestion.correctAnswer === idx}
                    onChange={() => setEditingQuestion({...editingQuestion, correctAnswer: idx})}
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...editingQuestion.options];
                      newOptions[idx] = e.target.value;
                      setEditingQuestion({...editingQuestion, options: newOptions});
                    }}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder={`Option ${idx + 1}`}
                  />
                  {editingQuestion.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = editingQuestion.options.filter((_: any, i: number) => i !== idx);
                        setEditingQuestion({
                          ...editingQuestion,
                          options: newOptions,
                          correctAnswer: editingQuestion.correctAnswer === idx ? 0 : 
                                        editingQuestion.correctAnswer > idx ? editingQuestion.correctAnswer - 1 : editingQuestion.correctAnswer
                        });
                      }}
                      className="px-3 py-1 bg-red-100 text-red-600 font-semibold rounded-lg hover:bg-red-200 transition-all"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion({
                    ...editingQuestion,
                    options: [...editingQuestion.options, '']
                  });
                }}
                className="mt-2 px-4 py-2 bg-green-100 text-green-700 font-semibold rounded-lg hover:bg-green-200 transition-all flex items-center gap-2"
              >
                + Add Option
              </button>
              <p className="text-sm text-gray-600 mt-2">
                Select the radio button for the correct answer. You can add as many options as needed.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Explanation (Optional)</label>
              <textarea
                value={editingQuestion.explanation}
                onChange={(e) => setEditingQuestion({...editingQuestion, explanation: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Explain why this is the correct answer..."
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={() => {
                setShowQuestionEditor(false);
                setEditingQuestion(null);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={saveManualQuestion}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all"
            >
              Save Question
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Preview Modal
  if (showPreviewModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Course Preview</h3>
              <p className="text-gray-600">Review the HTML course file</p>
            </div>
            <button
              onClick={() => {
                setShowPreviewModal(false);
                setPreviewUrl('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
            >
              Close Preview
            </button>
          </div>
          
          <div className="flex-1 p-6 overflow-hidden">
            <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 overflow-hidden">
              {(() => {
                // Find the job with preview content
                const jobWithPreview = jobs.find(j => j.previewFileName === previewUrl);
                
                if (jobWithPreview && jobWithPreview.previewContent) {
                  // Check if content looks like valid HTML
                  const content = jobWithPreview.previewContent;
                  const looksLikeHTML = content.trim().startsWith('<!DOCTYPE') || 
                                        content.trim().startsWith('<html') || 
                                        content.trim().startsWith('<HTML') ||
                                        content.trim().startsWith('<!doctype');
                  
                  if (!looksLikeHTML) {
                    // Show error for non-HTML content (like ZIP files read as text)
                    return (
                      <div className="p-8 flex items-center justify-center h-full">
                        <div className="text-center max-w-lg">
                          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                            <p className="text-sm text-red-900">
                              <strong>⚠️ Invalid Preview File:</strong> The uploaded file does not appear to be a valid HTML file. 
                              It may be a ZIP/SCORM package instead of an HTML preview.
                            </p>
                          </div>
                          <p className="text-gray-600 mt-4">
                            Please upload an <strong>.html</strong> file for the preview.
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            File: <strong>{jobWithPreview.previewFileName}</strong>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  
                  // Display actual HTML content in iframe
                  return (
                    <iframe
                      srcDoc={content}
                      className="w-full h-full border-0"
                      title="Course Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                  );
                } else {
                  // Fallback message if no preview content available
                  return (
                    <div className="p-8 flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded inline-block">
                          <p className="text-sm text-yellow-900">
                            <strong>⚠️ No Preview Available:</strong> The preview file has not been uploaded yet or the content could not be loaded.
                          </p>
                        </div>
                        <p className="text-gray-600 mt-4">
                          Preview file: <strong>{previewUrl}</strong>
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          In production, this would load the actual HTML course file from secure cloud storage.
                        </p>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Revision Request Modal
  if (showRevisionBox && selectedJob) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Request Changes</h3>
          <p className="text-gray-600 mb-6">
            Please explain what changes you need for: <strong>{selectedJob.courseTitle}</strong>
          </p>
          
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Revision Comments <span className="text-red-600">*</span>
            </label>
            <textarea
              value={revisionComment}
              onChange={(e) => setRevisionComment(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
              placeholder="Please be specific about what needs to be changed..."
            />
            <p className="text-sm text-gray-600 mt-2">
              The admin will see your comments and make the necessary changes.
            </p>
          </div>
          
          <div className="flex justify-end gap-4">
            <button
              onClick={() => {
                setShowRevisionBox(false);
                setRevisionComment('');
                setSelectedJob(null);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (revisionComment.trim()) {
                  clientRequestRevision(selectedJob, revisionComment);
                  setShowRevisionBox(false);
                  setRevisionComment('');
                  setSelectedJob(null);
                } else {
                  alert('Please enter revision comments');
                }
              }}
              className="px-6 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-all flex items-center gap-2"
            >
              <Icon name="send" />
              Submit Revision Request
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // ============================================
  // LOGIN SCREEN
  // ============================================
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <Icon name="package" className="w-16 h-16 mx-auto mb-4" style={{fontSize: '64px'}} />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning Conversion Hub</h1>
            <p className="text-gray-600">A guided submission hub for our managed training conversion service</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="your@email.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              Sign In
            </button>
          </form>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-2">Demo Credentials:</p>
            <p className="text-sm text-blue-700">Client: sarah@abcpharma.com / demo123</p>
            <p className="text-sm text-blue-700">Admin: david.dergazarian@navigantlearning.com / admin123</p>
          </div>
        </div>
      </div>
    );
  }
  
  // ============================================
  // CLIENT DASHBOARD
  // ============================================
  
  if (currentView === 'dashboard' && currentUser.role === 'client') {
    const myJobs = getFilteredJobs();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {/* Branded Header Bar */}
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 text-white py-4 px-6 shadow-lg mb-6">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
              <span className="text-2xl">🎓</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Learning Conversion Hub</h1>
              <p className="text-xs text-indigo-200">Managed Training Conversion Service</p>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Conversion Requests</h1>
                <p className="text-gray-600">{currentUser.name} • {currentUser.organization}</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentView('submit')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
                >
                  <Icon name="plus" />
                  Submit Document for Conversion
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all flex items-center gap-2"
                >
                  <Icon name="logout" />
                  Logout
                </button>
              </div>
            </div>
          </div>
          
          {/* Search & Filter */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search by course ID, title, or SOP number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
              >
                <option value="all">All Status</option>
                {Object.entries(COURSE_STATUSES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Courses List */}
          {myJobs.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <Icon name="package" className="w-16 h-16 mx-auto mb-4 text-gray-400" style={{fontSize: '64px'}} />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No conversion requests yet</h3>
              <p className="text-gray-600 mb-6">Submit a document to begin</p>
              <button
                onClick={() => setCurrentView('submit')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                Submit Your First Document
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myJobs.map(job => (
                <div key={job.id} className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{job.courseTitle}</h3>
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-gray-600 mb-1">Course ID: {job.id} • Created: {new Date(job.submittedAt).toLocaleDateString()}</p>
                      {job.sopNumber && <p className="text-gray-600">SOP: {job.sopNumber}</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Quiz Mode</div>
                      <div className="font-semibold text-gray-900 capitalize">{job.quizMode}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">ETA</div>
                      <div className="font-semibold text-gray-900">{job.eta || 'N/A'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Updated</div>
                      <div className="font-semibold text-gray-900">{new Date(job.updatedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        setCurrentView('job-detail');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all"
                    >
                      View Details
                    </button>
                    
                    {job.status === 'pending_review' && (
                      <>
                        <button
                          onClick={() => {
                            console.log('🔵 View Preview button clicked for job:', job.id);
                            setPreviewUrl(job.previewFileName || 'preview.html');
                            setShowPreviewModal(true);
                            console.log('✅ Preview modal should now be visible', { showPreviewModal: true, previewUrl: job.previewFileName });
                          }}
                          className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
                        >
                          <Icon name="eye" />
                          View Preview
                        </button>
                        <button
                          onClick={() => clientApprovePreview(job)}
                          className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedJob(job);
                            setShowRevisionBox(true);
                          }}
                          className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-all"
                        >
                          Request Changes
                        </button>
                      </>
                    )}
                    
                    {job.status === 'delivered' && (
                      <>
                        <button
                          onClick={() => {
                            // Create downloadable file
                            const fileContent = `SCORM Package: ${job.courseTitle}\n\nJob ID: ${job.id}\nPackage: ${job.scormFileName}\nDelivered: ${new Date(job.updatedAt).toLocaleString()}\n\nThis is a simulated SCORM package download.\nIn production, this would download the actual SCORM .zip file from cloud storage.`;
                            const blob = new Blob([fileContent], { type: 'application/zip' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = job.scormFileName || `SCORM_${job.id}.zip`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                          }}
                          className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
                        >
                          <Icon name="download" />
                          Download SCORM
                        </button>
                        <button
                          onClick={() => downloadAuditTrail(job, true)}
                          className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                        >
                          <Icon name="file" />
                          Download Audit
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // ============================================
  // CLIENT SUBMISSION FORM
  // ============================================
  
  if (currentView === 'submit' && currentUser.role === 'client') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <Icon name="arrow" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Submit a Document for Training Conversion</h2>
                <p className="text-gray-600">Upload your document for conversion into a SCORM module</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="space-y-6">
              {/* Document Guidelines */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📄 Document Requirements</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Format:</strong> PDF or Word (.docx) - Word recommended for best results</li>
                  <li>• <strong>Maximum:</strong> 30 pages or 75,000 characters</li>
                  <li>• <strong>Optimal:</strong> 25 pages or under for best results</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-1">⚠️ Not Supported:</p>
                  <p className="text-xs text-blue-700">Scanned/image-only PDFs • Embedded images • Password-protected files • Fillable forms • Digital signatures • Annotations/comments</p>
                </div>
              </div>

              {/* File Upload - REQUIRED */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Upload SOP Document <span className="text-red-600">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-all cursor-pointer"
                     onClick={() => fileInputRef.current?.click()}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-4">
                      <Icon name="file" className="w-12 h-12 text-green-600" style={{fontSize: '48px'}} />
                      <div className="text-left">
                        <p className="font-bold text-gray-900">{uploadedFile.name}</p>
                        <p className="text-sm text-gray-600">Checksum: {fileChecksum ? fileChecksum.substring(0, 16) : ''}...</p>
                        {/* File size warning */}
                        {uploadedFile.size > 5000000 && (
                          <p className="text-sm text-orange-600 font-semibold mt-1">
                            ⚠️ Large file - processing may take longer
                          </p>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFile(null);
                            setFileChecksum('');
                          }}
                          className="text-sm text-red-600 hover:text-red-700 font-semibold mt-1"
                        >
                          Remove file
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Icon name="upload" className="w-12 h-12 mx-auto mb-4 text-gray-400" style={{fontSize: '48px'}} />
                      <p className="text-gray-600 font-semibold">Click to upload or drag and drop</p>
                      <p className="text-sm text-gray-500">PDF or Word (.docx) • Max 50MB • Up to 30 pages</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Training Title - REQUIRED */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Training Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={clientForm.courseTitle}
                  onChange={(e) => setClientForm({...clientForm, courseTitle: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Lab Safety Procedures"
                />
              </div>
              
              {/* Contact Email - REQUIRED */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Contact Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={clientForm.contactEmail}
                  onChange={(e) => setClientForm({...clientForm, contactEmail: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder={currentUser.email}
                />
                <p className="text-sm text-gray-600 mt-1">
                  We'll notify you at this address when your course is ready
                </p>
              </div>
              
              {/* Assessment Options - REQUIRED */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Assessment Options <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-4 gap-4">
                  {['ai', 'manual', 'hybrid', 'none'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setClientForm({...clientForm, quizMode: mode})}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        clientForm.quizMode === mode
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-bold text-gray-900 capitalize mb-1">{mode}</div>
                      <div className="text-xs text-gray-600">
                        {mode === 'ai' && 'AI generates questions'}
                        {mode === 'manual' && 'You provide questions'}
                        {mode === 'hybrid' && 'Mix of both'}
                        {mode === 'none' && 'Acknowledgment only'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Quiz Settings Section - Show for ai, manual, hybrid */}
              {clientForm.quizMode !== 'none' && (
                <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>⚙️</span> Quiz Settings
                  </h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {/* Number of Questions */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Number of Questions
                      </label>
                      <select
                        value={clientForm.questionCount}
                        onChange={(e) => setClientForm({...clientForm, questionCount: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <option key={num} value={num}>{num} questions</option>
                        ))}
                      </select>
                      <p className="text-xs text-blue-600 mt-1">AI will generate this many questions</p>
                    </div>
                    
                    {/* Passing Score */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Passing Score (%)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={clientForm.passingScore}
                        onChange={(e) => setClientForm({...clientForm, passingScore: parseInt(e.target.value) || 80})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                      />
                    </div>
                    
                    {/* Max Attempts */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Max Attempts
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={clientForm.maxAttempts}
                        onChange={(e) => setClientForm({...clientForm, maxAttempts: parseInt(e.target.value) || 3})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                      />
                    </div>
                  </div>
                  
                  {/* SCORM Version */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      SCORM Version
                    </label>
                    <select
                      value={clientForm.scormVersion}
                      onChange={(e) => setClientForm({...clientForm, scormVersion: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                    >
                      <option value="1.2">SCORM 1.2 (Most Compatible)</option>
                      <option value="2004">SCORM 2004 3rd Edition</option>
                    </select>
                  </div>
                </div>
              )}
              
              {/* Branding Section */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>🖼️</span> Branding
                </h4>
                
                {/* Logo Guidelines */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <p className="font-semibold text-blue-800 mb-1">📐 Logo Recommendations:</p>
                  <ul className="text-blue-700 space-y-0.5 text-xs">
                    <li>• <strong>Format:</strong> PNG with transparent background (best) or SVG</li>
                    <li>• <strong>Size:</strong> 200-800px wide, 50-200px tall (4:1 ratio ideal)</li>
                    <li>• <strong>Max file size:</strong> 2MB</li>
                    <li>• <strong>Colors:</strong> Bold, distinct colors work best for auto-theming</li>
                  </ul>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Logo <span className="text-gray-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setCompanyLogo({
                            name: file.name,
                            data: event.target?.result as string
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  {companyLogo ? (
                    <div className="flex items-center gap-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                      <img src={companyLogo.data} alt="Logo preview" className="w-16 h-16 object-contain rounded" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{companyLogo.name}</p>
                        <p className="text-sm text-green-600">Logo uploaded successfully</p>
                      </div>
                      <button
                        onClick={() => setCompanyLogo(null)}
                        className="px-3 py-1 bg-red-100 text-red-600 font-semibold rounded hover:bg-red-200 transition-all text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all"
                    >
                      Choose Logo
                    </button>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    Your logo will appear on the course title page
                  </p>
                </div>
              </div>
              
              {/* Manual Questions - if manual or hybrid */}
              {(clientForm.quizMode === 'manual' || clientForm.quizMode === 'hybrid') && (
                <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Custom Quiz Questions ({manualQuestions.length}/{clientForm.questionCount})</h4>
                      <p className="text-sm text-gray-600">Add your own assessment questions (max {clientForm.questionCount})</p>
                    </div>
                    {manualQuestions.length < clientForm.questionCount && (
                      <button
                        onClick={addManualQuestion}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <Icon name="plus" />
                        Add Question
                      </button>
                    )}
                  </div>
                  
                  {manualQuestions.length === 0 ? (
                    <p className="text-sm text-gray-600 italic">No questions added yet. Click "Add Question" to get started.</p>
                  ) : (
                    <div className="space-y-3">
                      {manualQuestions.map((q: any, idx: number) => (
                        <div key={q.id} className="bg-white rounded-lg p-4 border-2 border-gray-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-2">{idx + 1}. {q.question}</p>
                              <p className="text-sm text-gray-600">{q.options.length} options</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingQuestion(q);
                                  setShowQuestionEditor(true);
                                }}
                                className="px-3 py-1 bg-gray-200 text-gray-700 font-semibold rounded hover:bg-gray-300 transition-all text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteManualQuestion(q.id)}
                                className="px-3 py-1 bg-red-600 text-white font-semibold rounded hover:bg-red-700 transition-all text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Document Version Number - REQUIRED */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Document Version Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={clientForm.documentVersion}
                  onChange={(e) => setClientForm({...clientForm, documentVersion: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., 1.0, 2.1, Rev A"
                />
              </div>
              
              {/* Effective Date - OPTIONAL */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Effective Date <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={clientForm.effectiveDate}
                  onChange={(e) => setClientForm({...clientForm, effectiveDate: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              {/* Submit Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={() => {
                    setCurrentView('dashboard');
                    setSubmissionSuccess(null);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitJob}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <Icon name="send" />
                  Submit for Conversion
                </button>
              </div>
              
              {/* Success Message - Inline */}
              {submissionSuccess && (
                <div className="mt-6 p-6 bg-green-50 border-2 border-green-500 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">✅</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-green-900 mb-2">Document Submitted for Conversion!</h3>
                      <p className="text-green-800 mb-2">
                        <strong>Request ID:</strong> {submissionSuccess.jobId}
                      </p>
                      <p className="text-green-800 mb-4">
                        <strong>Processing Time:</strong> {submissionSuccess.eta}
                      </p>
                      <p className="text-green-700">
                        You will receive an email notification when your training module is ready for review.
                      </p>
                      <button
                        onClick={() => {
                          setSubmissionSuccess(null);
                          setCurrentView('dashboard');
                        }}
                        className="mt-4 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all"
                      >
                        View My Requests
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // ============================================
  // ADMIN DASHBOARD
  // ============================================
  
  if (currentView === 'admin-dashboard' && currentUser.role === 'admin') {
    const allJobs = getFilteredJobs();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
                <p className="text-gray-600">{currentUser.name} • All Client Jobs</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentView('admin-manage-clients')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <Icon name="user" />
                  Manage Clients
                </button>
                <button
                  onClick={() => setCurrentView('admin-onboard-client')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <Icon name="plus" />
                  Onboard Client
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all flex items-center gap-2"
                >
                  <Icon name="logout" />
                  Logout
                </button>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-4 gap-6 mb-6">
            {[
              { label: 'Total Jobs', count: jobs.length, color: 'blue' },
              { label: 'In Progress', count: jobs.filter(j => j.status === 'in_progress').length, color: 'yellow' },
              { label: 'Pending Review', count: jobs.filter(j => j.status === 'pending_review').length, color: 'purple' },
              { label: 'Delivered', count: jobs.filter(j => j.status === 'delivered').length, color: 'green' }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-xl p-6">
                <div className={`text-3xl font-bold text-${stat.color}-600 mb-2`}>{stat.count}</div>
                <div className="text-gray-600 font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
          
          {/* Search & Filter */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none font-semibold"
              >
                <option value="all">All Status</option>
                {Object.entries(COURSE_STATUSES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Jobs List */}
          <div className="space-y-4">
            {allJobs.map(job => (
              <div key={job.id} className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{job.courseTitle}</h3>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="flex items-center gap-4 text-gray-600 mb-2">
                      <div className="flex items-center gap-2">
                        <Icon name="building" className="w-4 h-4" />
                        <span className="font-semibold">{job.organization}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="user" className="w-4 h-4" />
                        <span>{job.clientName}</span>
                      </div>
                    </div>
                    <p className="text-gray-600">Job ID: {job.id} • Submitted: {new Date(job.submittedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs text-purple-600 mb-1">SOP Number</div>
                    <div className="font-semibold text-gray-900">{job.sopNumber || 'N/A'}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs text-purple-600 mb-1">Quiz Mode</div>
                    <div className="font-semibold text-gray-900 capitalize">{job.quizMode}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs text-purple-600 mb-1">File</div>
                    <div className="font-semibold text-gray-900 text-xs truncate">{job.fileName}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs text-purple-600 mb-1">Checksum</div>
                    <div className="font-semibold text-gray-900 text-xs truncate">{job.fileChecksum?.substring(0, 12)}...</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs text-purple-600 mb-1">ETA</div>
                    <div className="font-semibold text-gray-900">{job.eta || 'TBD'}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setCurrentView('admin-job-detail');
                    }}
                    className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all"
                  >
                    Manage Job
                  </button>
                  
                  {job.status === 'submitted' && (
                    <button
                      onClick={() => adminDownloadSOP(job)}
                      className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <Icon name="download" />
                      Download SOP
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // ============================================
  // ADMIN JOB DETAIL / MANAGEMENT
  // ============================================
  
  if (currentView === 'admin-job-detail' && selectedJob && currentUser.role === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => {
                  setCurrentView('admin-dashboard');
                  setSelectedJob(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <Icon name="arrow" />
              </button>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedJob.courseTitle}</h2>
                <p className="text-gray-600">Job ID: {selectedJob.id} • {selectedJob.organization}</p>
              </div>
              {getStatusBadge(selectedJob.status)}
            </div>
            
            {/* Client Info */}
            <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-purple-600 mb-1">Client</div>
                  <div className="font-semibold text-gray-900">{selectedJob.clientName}</div>
                </div>
                <div>
                  <div className="text-xs text-purple-600 mb-1">Email</div>
                  <div className="font-semibold text-gray-900">{selectedJob.clientEmail}</div>
                </div>
                <div>
                  <div className="text-xs text-purple-600 mb-1">Organization</div>
                  <div className="font-semibold text-gray-900">{selectedJob.organization}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Job Details */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Job Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-600">SOP Number</label>
                <p className="text-lg text-gray-900">{selectedJob.sopNumber || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Document Version</label>
                <p className="text-lg text-gray-900">{selectedJob.documentVersion || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Effective Date</label>
                <p className="text-lg text-gray-900">{selectedJob.effectiveDate ? new Date(selectedJob.effectiveDate).toLocaleDateString() : 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Quiz Mode</label>
                <p className="text-lg text-gray-900 capitalize">{selectedJob.quizMode}</p>
              </div>
            </div>
            
            {selectedJob.comments && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="text-sm font-semibold text-gray-600">Client Comments</label>
                <p className="text-gray-900 mt-2 bg-gray-50 p-4 rounded-lg">{selectedJob.comments}</p>
              </div>
            )}
            
            {selectedJob.revisionComment && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="text-sm font-semibold text-red-600">⚠️ Revision Requested</label>
                <p className="text-gray-900 mt-2 bg-red-50 p-4 rounded-lg border-2 border-red-200">{selectedJob.revisionComment}</p>
              </div>
            )}
          </div>
          
          {/* Quiz Settings */}
          {selectedJob.quizMode !== 'none' && (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>⚙️</span> Quiz Settings
              </h3>
              <div className="grid grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <label className="text-sm font-semibold text-blue-600">Number of Questions</label>
                  <p className="text-2xl font-bold text-gray-900">{selectedJob.questionCount || 5}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <label className="text-sm font-semibold text-green-600">Passing Score</label>
                  <p className="text-2xl font-bold text-gray-900">{selectedJob.passingScore || 80}%</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <label className="text-sm font-semibold text-purple-600">Max Attempts</label>
                  <p className="text-2xl font-bold text-gray-900">{selectedJob.maxAttempts || 3}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <label className="text-sm font-semibold text-orange-600">SCORM Version</label>
                  <p className="text-2xl font-bold text-gray-900">{selectedJob.scormVersion === '2004' ? '2004' : '1.2'}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Company Logo / Branding */}
          {selectedJob.companyLogo && (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🖼️</span> Company Branding
              </h3>
              <div className="flex items-center gap-6 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                <img 
                  src={selectedJob.companyLogo.data} 
                  alt="Company Logo" 
                  className="w-24 h-24 object-contain rounded-lg bg-white p-2 border-2 border-gray-200"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{selectedJob.companyLogo.name}</p>
                  <p className="text-sm text-gray-600">Client-provided logo for course branding</p>
                </div>
                <button
                  onClick={() => {
                    // Download logo
                    const link = document.createElement('a');
                    link.href = selectedJob.companyLogo.data;
                    link.download = selectedJob.companyLogo.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  <Icon name="download" />
                  Download Logo
                </button>
              </div>
            </div>
          )}
          
          {/* File Info */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Uploaded Document</h3>
            <div className="flex items-center gap-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg mb-4">
              <Icon name="file" className="w-12 h-12 text-green-600" style={{fontSize: '48px'}} />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{selectedJob.fileName}</p>
                <p className="text-sm text-gray-600">Checksum: {selectedJob.fileChecksum}</p>
                <p className="text-sm text-gray-600">Submitted: {new Date(selectedJob.submittedAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => adminDownloadSOP(selectedJob)}
                  className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                >
                  <Icon name="download" />
                  Download SOP
                </button>
                <button
                  onClick={() => downloadAuditTrail(selectedJob)}
                  className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
                >
                  <Icon name="file" />
                  Download Audit Trail
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Next Step:</strong> Download the SOP, then use your CourseBuilder app to generate the SCORM package. Once generated, upload the preview or final package below.
              </p>
            </div>
          </div>
          
          {/* Manual Questions - if provided */}
          {selectedJob.manualQuestions && selectedJob.manualQuestions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Client-Provided Questions ({selectedJob.manualQuestions.length})
              </h3>
              <div className="space-y-4">
                {selectedJob.manualQuestions.map((q, idx) => (
                  <div key={q.id} className="border-2 border-gray-200 rounded-lg p-4">
                    <div className="font-semibold text-gray-900 mb-3">
                      {idx + 1}. {q.question}
                    </div>
                    <div className="space-y-2 ml-4">
                      {q.options.map((option, optIdx) => (
                        <div key={optIdx} className={`flex items-start gap-2 ${
                          optIdx === q.correctAnswer ? 'text-green-700 font-semibold' : 'text-gray-700'
                        }`}>
                          <span>{optIdx === q.correctAnswer ? '✓' : '○'}</span>
                          <span>{option}</span>
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <div className="mt-3 ml-4 text-sm text-gray-600 bg-gray-50 rounded p-2">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Admin Actions */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Admin Actions</h3>
            
            {/* In-App Notification */}
            {notification && (
              <div className={`mb-6 p-4 rounded-lg border-2 ${
                notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
                notification.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
                'bg-blue-50 border-blue-500 text-blue-800'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-lg">{notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'} {notification.message}</p>
                    {notification.details && (
                      <p className="mt-2 whitespace-pre-line text-sm">{notification.details}</p>
                    )}
                  </div>
                  <button onClick={() => setNotification(null)} className="text-xl font-bold hover:opacity-70">×</button>
                </div>
              </div>
            )}
            
            {/* Combined Upload Form */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-purple-200 rounded-lg">
              <h4 className="font-bold text-gray-900 mb-2">Upload Files for Client Review</h4>
              <p className="text-sm text-gray-700 mb-4">Upload HTML preview (required). Optionally include SCORM package and audit trail.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    HTML Preview <span className="text-red-600">*</span>
                  </label>
                  <input
                    ref={previewInputRef}
                    type="file"
                    accept=".html,.htm"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SCORM Package (.zip) - Optional</label>
                  <input
                    ref={scormInputRef}
                    type="file"
                    accept=".zip"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Audit Trail (.xlsx) - Optional</label>
                  <input
                    ref={auditInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white"
                  />
                </div>
                
                <button
                  onClick={() => adminUploadFiles(selectedJob)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Upload Files & Notify Client
                </button>
              </div>
            </div>
          </div>
          
          {/* Audit Log */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Audit Trail</h3>
            <div className="space-y-3">
              {selectedJob.auditLog?.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-purple-600 mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-gray-900">{entry.action}</p>
                      <p className="text-sm text-gray-600">{new Date(entry.timestamp).toLocaleString()}</p>
                    </div>
                    <p className="text-sm text-gray-600">Actor: {entry.actor}</p>
                    {entry.details && <p className="text-sm text-gray-700 mt-1">{entry.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // ============================================
  // CLIENT JOB DETAIL VIEW
  // ============================================
  
  if (currentView === 'job-detail' && selectedJob && currentUser.role === 'client') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => {
                  setCurrentView('dashboard');
                  setSelectedJob(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <Icon name="arrow" />
              </button>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedJob.courseTitle}</h2>
                <p className="text-gray-600">Job ID: {selectedJob.id}</p>
              </div>
              {getStatusBadge(selectedJob.status)}
            </div>
            
            {/* Client Info */}
            <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-purple-600 mb-1">Client</div>
                  <div className="font-semibold text-gray-900">{selectedJob.clientName}</div>
                </div>
                <div>
                  <div className="text-xs text-purple-600 mb-1">Email</div>
                  <div className="font-semibold text-gray-900">{selectedJob.clientEmail}</div>
                </div>
                <div>
                  <div className="text-xs text-purple-600 mb-1">Organization</div>
                  <div className="font-semibold text-gray-900">{selectedJob.organization}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Job Details */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Job Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-600">SOP Number</label>
                <p className="text-lg text-gray-900">{selectedJob.sopNumber || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Document Version</label>
                <p className="text-lg text-gray-900">{selectedJob.documentVersion || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Effective Date</label>
                <p className="text-lg text-gray-900">{selectedJob.effectiveDate ? new Date(selectedJob.effectiveDate).toLocaleDateString() : 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Quiz Mode</label>
                <p className="text-lg text-gray-900 capitalize">{selectedJob.quizMode}</p>
              </div>
            </div>
            
            {selectedJob.comments && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="text-sm font-semibold text-gray-600">Client Comments</label>
                <p className="text-gray-900 mt-2 bg-gray-50 p-4 rounded-lg">{selectedJob.comments}</p>
              </div>
            )}
            
            {selectedJob.revisionComment && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="text-sm font-semibold text-red-600">⚠️ Revision Requested</label>
                <p className="text-gray-900 mt-2 bg-red-50 p-4 rounded-lg border-2 border-red-200">{selectedJob.revisionComment}</p>
              </div>
            )}
          </div>
          
          {/* Status-specific content */}
          {selectedJob.status === 'pending_review' && (
            <div className="bg-purple-50 border-2 border-purple-500 rounded-2xl p-8 mb-6">
              <h3 className="text-2xl font-bold text-purple-900 mb-4">🎉 Preview Ready for Your Review!</h3>
              <p className="text-purple-800 mb-6">Your course preview is ready. Please review and either approve or request changes.</p>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setPreviewUrl(selectedJob.previewFileName || 'preview.html');
                    setShowPreviewModal(true);
                  }}
                  className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
                >
                  <Icon name="eye" />
                  View Preview
                </button>
                <button
                  onClick={() => clientApprovePreview(selectedJob)}
                  className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                >
                  <Icon name="check" />
                  Approve Preview
                </button>
                <div className="flex-1">
                  <textarea
                    value={revisionComment}
                    onChange={(e) => setRevisionComment(e.target.value)}
                    placeholder="Explain what changes you need..."
                    rows={2}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none mb-2"
                  />
                  <button
                    onClick={() => {
                      if (revisionComment.trim()) {
                        clientRequestRevision(selectedJob, revisionComment);
                        setRevisionComment('');
                      } else {
                        alert('Please enter revision comments');
                      }
                    }}
                    className="px-6 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-all flex items-center gap-2"
                  >
                    <Icon name="edit" />
                    Request Changes
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {selectedJob.status === 'delivered' && (
            <div className="bg-green-50 border-2 border-green-500 rounded-2xl p-8 mb-6">
              <h3 className="text-2xl font-bold text-green-900 mb-4">✅ Your Course Package is Ready!</h3>
              <p className="text-green-800 mb-6">
                Your final SCORM package and audit trail are available for download. 
                {selectedJob.downloadExpiresAt && (
                  <> Download link expires: <strong>{new Date(selectedJob.downloadExpiresAt).toLocaleString()}</strong></>
                )}
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-green-200">
                  <div>
                    <p className="font-bold text-gray-900">{selectedJob.scormFileName}</p>
                    <p className="text-sm text-gray-600">SCORM Package</p>
                  </div>
                  <button
                    onClick={() => {
                      // Create downloadable SCORM file
                      const scormContent = `SCORM Package: ${selectedJob.courseTitle}\n\nJob ID: ${selectedJob.id}\nPackage: ${selectedJob.scormFileName}\nDelivered: ${new Date(selectedJob.updatedAt).toLocaleString()}\n\nThis is a simulated SCORM package download.\nIn production, this would download the actual SCORM .zip file from cloud storage.`;
                      const blob = new Blob([scormContent], { type: 'application/zip' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = selectedJob.scormFileName || `SCORM_${selectedJob.id}.zip`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                      alert(`✅ SCORM Package Downloaded\n\nFile: ${selectedJob.scormFileName}`);
                    }}
                    className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                  >
                    <Icon name="download" />
                    Download
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-green-200">
                  <div>
                    <p className="font-bold text-gray-900">GxP Audit Trail (PDF)</p>
                    <p className="text-sm text-gray-600">Compliance Record</p>
                  </div>
                  <button
                    onClick={() => downloadAuditTrail(selectedJob, true)}
                    className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                  >
                    <Icon name="download" />
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Course Details */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Course Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-600">Document Version</label>
                <p className="text-lg text-gray-900">{selectedJob.documentVersion || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Quiz Mode</label>
                <p className="text-lg text-gray-900 capitalize">{selectedJob.quizMode}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Regulatory Status</label>
                <p className="text-lg text-gray-900">{selectedJob.regulatoryStatus}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Effective Date</label>
                <p className="text-lg text-gray-900">
                  {selectedJob.effectiveDate ? new Date(selectedJob.effectiveDate).toLocaleDateString() : 'Not specified'}
                </p>
              </div>
            </div>
            
            {selectedJob.comments && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="text-sm font-semibold text-gray-600">Your Comments</label>
                <p className="text-gray-900 mt-2 bg-gray-50 p-4 rounded-lg">{selectedJob.comments}</p>
              </div>
            )}
          </div>
          
          {/* Uploaded File */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Uploaded Document</h3>
            <div className="flex items-center gap-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <Icon name="file" className="w-12 h-12 text-green-600" style={{fontSize: '48px'}} />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{selectedJob.fileName}</p>
                <p className="text-sm text-gray-600">Checksum: {selectedJob.fileChecksum}</p>
                <p className="text-sm text-gray-600">Uploaded: {new Date(selectedJob.submittedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // ============================================
  // ADMIN ONBOARD CLIENT VIEW
  // ============================================
  
  if (currentView === 'admin-onboard-client' && currentUser.role === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setCurrentView('admin-dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <Icon name="arrow" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Onboard New Client</h2>
                <p className="text-gray-600">Create a new client account</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Client Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm({...newClientForm, name: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., Sarah Johnson"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={newClientForm.email}
                  onChange={(e) => setNewClientForm({...newClientForm, email: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="client@company.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Organization <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={newClientForm.organization}
                  onChange={(e) => setNewClientForm({...newClientForm, organization: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., ABC Pharma"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Temporary Password <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={newClientForm.password}
                  onChange={(e) => setNewClientForm({...newClientForm, password: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="Temporary password for client"
                />
                <p className="text-sm text-gray-600 mt-1">Client should change this on first login</p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Company Logo <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <input
                  ref={clientLogoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setNewClientForm({
                          ...newClientForm,
                          companyLogo: {
                            name: file.name,
                            data: event.target?.result as string
                          }
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
                {newClientForm.companyLogo ? (
                  <div className="flex items-center gap-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                    <img src={newClientForm.companyLogo.data} alt="Logo preview" className="w-16 h-16 object-contain rounded" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{newClientForm.companyLogo.name}</p>
                      <p className="text-sm text-green-600">Logo uploaded successfully</p>
                    </div>
                    <button
                      onClick={() => setNewClientForm({
                        ...newClientForm,
                        companyLogo: null
                      })}
                      className="px-3 py-1 bg-red-100 text-red-600 font-semibold rounded hover:bg-red-200 transition-all text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => clientLogoInputRef.current?.click()}
                    className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all"
                  >
                    Choose Logo
                  </button>
                )}
                <p className="text-sm text-gray-500 mt-2">Your logo will appear on the course title page</p>
              </div>
              
              <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Icon name="mail" className="w-5 h-5 text-purple-600 mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-purple-900 mb-1">Welcome Email</p>
                    <p className="text-sm text-gray-700">
                      A welcome email with login credentials will be sent to the client's email address.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={() => setCurrentView('admin-dashboard')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newClientForm.name || !newClientForm.email || !newClientForm.organization || !newClientForm.password) {
                      alert('Please fill in all required fields');
                      return;
                    }
                    
                    // Create client in Supabase
                    const result = await createUser(
                      newClientForm.email,
                      newClientForm.password,
                      newClientForm.name,
                      newClientForm.organization,
                      'client'
                    );
                    
                    if (!result.success) {
                      alert(`❌ Failed to create client: ${result.error}`);
                      return;
                    }
                    
                    // Also add to local clients array for UI
                    const newClient = {
                      id: result.user?.id || `client-${Date.now()}`,
                      email: newClientForm.email,
                      password: newClientForm.password,
                      name: newClientForm.name,
                      role: 'client',
                      organization: newClientForm.organization,
                      companyLogo: newClientForm.companyLogo,
                      createdAt: new Date().toISOString()
                    };
                    setClients([...clients, newClient]);
                    
                    console.log(`
📧 SENDING WELCOME EMAIL
═══════════════════════════════════════════════════════════
To: ${newClientForm.email}
From: Learning Conversion Hub <noreply@navigantlearning.com>
Subject: Welcome to Learning Conversion Hub

═══════════════════════════════════════════════════════════
🎉 WELCOME TO LEARNING CONVERSION HUB
═══════════════════════════════════════════════════════════

Dear ${newClientForm.name},

Your account has been created! You can now submit course
development requests through our portal.

🔐 YOUR LOGIN CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email:    ${newClientForm.email}
Password: ${newClientForm.password}

⚠️ Please change your password after first login.

🔗 LOGIN URL:
https://aicoursebuilder.navigantlearning.com/login

═══════════════════════════════════════════════════════════
Learning Conversion Hub
© ${new Date().getFullYear()} All rights reserved.
═══════════════════════════════════════════════════════════
                    `);
                    
                    alert(`✅ Client Onboarded Successfully!\n\nName: ${newClientForm.name}\nEmail: ${newClientForm.email}\nOrganization: ${newClientForm.organization}\n\nClient can now log in with their credentials.`);
                    
                    setNewClientForm({ name: '', email: '', password: '', organization: '', companyLogo: null });
                    setCurrentView('admin-dashboard');
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <Icon name="plus" />
                  Create Client Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // ============================================
  // ADMIN CLIENT MANAGEMENT VIEW
  // ============================================
  
  if (currentView === 'admin-manage-clients' && currentUser.role === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setCurrentView('admin-dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <Icon name="arrow" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Manage Clients</h2>
                <p className="text-gray-600">View and manage all onboarded clients</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Client Accounts ({clients.length})</h3>
              <button
                onClick={() => setCurrentView('admin-onboard-client')}
                className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
              >
                <Icon name="plus" />
                Add New Client
              </button>
            </div>
            
            <div className="space-y-4">
              {clients.map(client => (
                <div key={client.id} className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-300 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-gray-900">{client.name}</h4>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          {client.role}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Email:</span>
                          <span className="ml-2 font-semibold text-gray-900">{client.email}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Organization:</span>
                          <span className="ml-2 font-semibold text-gray-900">{client.organization}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Created:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {new Date(client.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Jobs:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {jobs.filter(j => j.clientEmail === client.email).length}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedClientForEdit(client);
                          const newName = prompt('Edit Client Name:', client.name);
                          if (newName && newName !== client.name) {
                            setClients(clients.map(c => 
                              c.id === client.id ? {...c, name: newName} : c
                            ));
                            alert(`✅ Client name updated to: ${newName}`);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          const newPassword = prompt('Enter new temporary password for ' + client.name + ':');
                          if (newPassword) {
                            setClients(clients.map(c => 
                              c.id === client.id ? {...c, password: newPassword} : c
                            ));
                            console.log(`
📧 PASSWORD RESET EMAIL
═══════════════════════════════════════════════════════════
To: ${client.email}
Subject: Password Reset - Learning Conversion Hub

Dear ${client.name},

Your password has been reset by an administrator.

New Password: ${newPassword}

Please log in and change your password immediately.

═══════════════════════════════════════════════════════════
                            `);
                            alert(`✅ Password reset for ${client.name}\n\nNew password: ${newPassword}\n\nPassword reset email sent to ${client.email}`);
                          }
                        }}
                        className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-all text-sm"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${client.name}? This action cannot be undone.`)) {
                            setClients(clients.filter(c => c.id !== client.id));
                            alert(`✅ Client ${client.name} has been deleted`);
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {clients.length === 0 && (
                <div className="text-center py-12">
                  <Icon name="user" className="w-16 h-16 mx-auto mb-4 text-gray-400" style={{fontSize: '64px'}} />
                  <p className="text-gray-600 font-semibold mb-2">No clients yet</p>
                  <p className="text-sm text-gray-500">Click "Add New Client" to onboard your first client</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

export default StreamlinedCourseBuilder;