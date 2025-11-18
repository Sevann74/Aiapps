import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Settings, Eye, Download, CheckCircle, AlertCircle, Loader, ArrowLeft, Send, Package } from 'lucide-react';

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
// JOB STATUS CONFIGURATIONS
// ============================================
const JOB_STATUSES = {
  submitted: { label: 'Submitted', color: 'blue', icon: 'clock' },
  in_progress: { label: 'In Progress', color: 'yellow', icon: 'refresh' },
  pending_review: { label: 'Pending Your Review', color: 'purple', icon: 'eye' },
  revision_requested: { label: 'Revision Requested', color: 'orange', icon: 'edit' },
  approved: { label: 'Approved', color: 'green', icon: 'check' },
  delivered: { label: 'Delivered', color: 'green', icon: 'package' },
  closed: { label: 'Closed', color: 'gray', icon: 'lock' }
};

// ============================================
// MAIN COMPONENT
// ============================================
const StreamlinedCourseBuilder = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // View state
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, submit, job-detail, admin-dashboard, admin-job-detail
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Client submission form
  const [clientForm, setClientForm] = useState({
    courseTitle: '',
    contactEmail: '',
    quizMode: 'ai', // ai, manual, hybrid, none
    sopNumber: '',
    effectiveDate: '',
    estimatedSeatTime: 30,
    regulatoryStatus: 'Draft',
    comments: ''
  });
  
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileChecksum, setFileChecksum] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [manualQuestions, setManualQuestions] = useState([]);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  
  // Admin state
  const [adminNotes, setAdminNotes] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [finalScormFile, setFinalScormFile] = useState(null);
  const [auditLogFile, setAuditLogFile] = useState(null);
  
  const fileInputRef = useRef(null);
  const previewInputRef = useRef(null);
  const scormInputRef = useRef(null);
  const auditInputRef = useRef(null);
  
  // Mock users database
  const mockUsers = {
    'john@abcpharma.com': {
      id: 'client-001',
      email: 'john@abcpharma.com',
      password: 'demo123',
      name: 'John Doe',
      role: 'client',
      organization: 'ABC Pharma'
    },
'admin@aicoursebuilder.com': {
      id: 'admin-001',
      email: 'admin@aicoursebuilder.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin',
      organization: 'AI Course Builder'
    }
  };
  
  // Jobs state - load from localStorage
  const [jobs, setJobs] = useState(() => {
    const savedJobs = localStorage.getItem('streamlinedCourseJobs');
    if (savedJobs) return JSON.parse(savedJobs);
    
    return [
      {
        id: 'J001',
        clientId: 'client-001',
        clientName: 'John Doe',
        clientEmail: 'john@abcpharma.com',
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
        eta: '48 hours',
        auditLog: [
          { timestamp: '2025-01-07T10:30:00Z', action: 'Job submitted', actor: 'john@abcpharma.com', ip: '192.168.1.1' },
          { timestamp: '2025-01-07T10:30:05Z', action: 'Email notification sent', actor: 'system', details: 'Sent to david.dergazarian@navigantlearning.com' },
{ timestamp: '2025-01-08T09:15:00Z', action: 'Admin downloaded SOP', actor: 'admin@aicoursebuilder.com', ip: '10.0.0.1' },
          { timestamp: '2025-01-08T14:20:00Z', action: 'Preview uploaded', actor: 'admin@aicoursebuilder.com', details: 'preview_v1.zip' }
        ]
      }
    ];
  });
  
  // Save jobs to localStorage
  useEffect(() => {
    localStorage.setItem('streamlinedCourseJobs', JSON.stringify(jobs));
  }, [jobs]);
  
  // ============================================
  // AUTHENTICATION
  // ============================================
  
  const handleLogin = (e) => {
    e.preventDefault();
    const user = mockUsers[loginEmail];
    
    if (user && user.password === loginPassword) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      setCurrentView(user.role === 'admin' ? 'admin-dashboard' : 'dashboard');
    } else {
alert('Invalid credentials. Try:\nClient: john@abcpharma.com / demo123\nAdmin: admin@aicoursebuilder.com / admin123');
    }
  };
  
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('dashboard');
    setLoginEmail('');
    setLoginPassword('');
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
    if (!confirmCheckbox) {
      alert('Please confirm the document is approved for conversion');
      return;
    }
    
    // Validate manual questions if hybrid/manual mode
    if ((clientForm.quizMode === 'manual' || clientForm.quizMode === 'hybrid') && manualQuestions.length === 0) {
      alert('Please add at least one manual question for this quiz mode');
      return;
    }
    
    // Create new job
    const newJob = {
      id: `J${String(jobs.length + 1).padStart(3, '0')}`,
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientEmail: currentUser.email,
      organization: currentUser.organization,
      status: 'submitted',
      courseTitle: clientForm.courseTitle,
      sopNumber: clientForm.sopNumber,
      effectiveDate: clientForm.effectiveDate,
      estimatedSeatTime: clientForm.estimatedSeatTime,
      regulatoryStatus: clientForm.regulatoryStatus,
      quizMode: clientForm.quizMode,
      comments: clientForm.comments,
      fileName: uploadedFile.name,
      fileChecksum: fileChecksum,
      manualQuestions: clientForm.quizMode === 'manual' || clientForm.quizMode === 'hybrid' ? manualQuestions : [],
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eta: '48-72 hours',
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          action: 'Job submitted',
          actor: currentUser.email,
          details: `File: ${uploadedFile.name}, Checksum: ${fileChecksum}`
        },
        {
          timestamp: new Date().toISOString(),
          action: 'Email notification sent',
          actor: 'system',
          details: 'Sent to david.dergazarian@navigantlearning.com'
        }
      ]
    };
    
    // Add to jobs
    setJobs([newJob, ...jobs]);
    
    // Send email notification (simulated)
    sendEmailNotification(newJob);
    
    // Reset form
    setClientForm({
      courseTitle: '',
      contactEmail: '',
      quizMode: 'ai',
      sopNumber: '',
      effectiveDate: '',
      estimatedSeatTime: 30,
      regulatoryStatus: 'Draft',
      comments: ''
    });
    setUploadedFile(null);
    setFileChecksum('');
    setConfirmCheckbox(false);
    setManualQuestions([]);
    
    // Show success and redirect
    alert(`✅ Submission successful!\n\nJob ID: ${newJob.id}\nETA: ${newJob.eta}\n\nYou'll receive an email notification when your course is ready for review.`);
    setCurrentView('dashboard');
  };
  
  // ============================================
  // EMAIL NOTIFICATION (Simulated)
  // ============================================

  const sendEmailNotification = (job) => {
    console.log(`
📧 SENDING EMAIL NOTIFICATION
═══════════════════════════════════════════════════════════
To: david.dergazarian@navigantlearning.com
From: AI Course Builder <noreply@navigantlearning.com>
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
Estimated Seat Time: ${job.estimatedSeatTime} minutes
Effective Date:      ${job.effectiveDate || 'Not specified'}

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
AI Course Builder | Navigant Learning
© ${new Date().getFullYear()} All rights reserved.
═══════════════════════════════════════════════════════════

NOTE: This email was sent from an automated system.
      Check your admin dashboard for full details.
    `);

    // In production, add actual Microsoft Graph API call here:
    // await sendEmailViaGraphAPI({ ... });

    console.log('✅ Email notification sent successfully');
    alert('📧 Notification email sent to david.dergazarian@navigantlearning.com\n(Check console for email preview)');
  };
  
  // ============================================
  // MANUAL QUESTION EDITOR
  // ============================================
  
  const addManualQuestion = () => {
    setEditingQuestion({
      id: `q-${Date.now()}`,
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    });
    setShowQuestionEditor(true);
  };
  
  const saveManualQuestion = () => {
    if (!editingQuestion.question || editingQuestion.options.some(opt => !opt)) {
      alert('Please fill in all fields');
      return;
    }
    
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
  
  const adminDownloadSOP = (job) => {
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
    
    alert(`✅ SOP Downloaded\n\nFile: ${job.fileName}\nChecksum: ${job.fileChecksum}\n\nNext: Generate course using your CourseBuilder app, then upload preview or final SCORM.`);
  };
  
  const adminUploadPreview = (job) => {
    const file = previewInputRef.current?.files?.[0];
    if (!file) {
      alert('Please select a preview file');
      return;
    }
    
    setPreviewFile(file);
    
    // Update job status and audit log
    const updatedJobs = jobs.map(j => {
      if (j.id === job.id) {
        return {
          ...j,
          status: 'pending_review',
          updatedAt: new Date().toISOString(),
          previewFileName: file.name,
          auditLog: [
            ...j.auditLog,
            {
              timestamp: new Date().toISOString(),
              action: 'Preview uploaded',
              actor: currentUser.email,
              details: `File: ${file.name}`
            },
            {
              timestamp: new Date().toISOString(),
              action: 'Client notification sent',
              actor: 'system',
              details: `Email sent to ${job.clientEmail}`
            }
          ]
        };
      }
      return j;
    });
    setJobs(updatedJobs);
    
    alert(`✅ Preview Uploaded\n\nStatus changed to: Pending Client Review\nEmail sent to: ${job.clientEmail}`);
    setPreviewFile(null);
  };
  
  const adminUploadFinalSCORM = (job) => {
    const scormFile = scormInputRef.current?.files?.[0];
    const auditFile = auditInputRef.current?.files?.[0];
    
    if (!scormFile || !auditFile) {
      alert('Please select both SCORM package and audit log file');
      return;
    }
    
    setFinalScormFile(scormFile);
    setAuditLogFile(auditFile);
    
    // Update job status
    const updatedJobs = jobs.map(j => {
      if (j.id === job.id) {
        return {
          ...j,
          status: 'delivered',
          updatedAt: new Date().toISOString(),
          scormFileName: scormFile.name,
          auditFileName: auditFile.name,
          downloadExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours
          auditLog: [
            ...j.auditLog,
            {
              timestamp: new Date().toISOString(),
              action: 'Final SCORM uploaded',
              actor: currentUser.email,
              details: `SCORM: ${scormFile.name}, Audit: ${auditFile.name}`
            },
            {
              timestamp: new Date().toISOString(),
              action: 'Delivery notification sent',
              actor: 'system',
              details: `Secure download link sent to ${job.clientEmail}`
            }
          ]
        };
      }
      return j;
    });
    setJobs(updatedJobs);
    
    alert(`✅ Final Package Delivered\n\nSCORM: ${scormFile.name}\nAudit Log: ${auditFile.name}\n\nSecure download link sent to client (expires in 72 hours)`);
    setFinalScormFile(null);
    setAuditLogFile(null);
  };
  
  // ============================================
  // CLIENT ACTIONS
  // ============================================
  
  const clientApprovePreview = (job) => {
    const updatedJobs = jobs.map(j => {
      if (j.id === job.id) {
        return {
          ...j,
          status: 'approved',
          updatedAt: new Date().toISOString(),
          auditLog: [
            ...j.auditLog,
            {
              timestamp: new Date().toISOString(),
              action: 'Preview approved by client',
              actor: currentUser.email,
              details: 'Client approved preview'
            },
            {
              timestamp: new Date().toISOString(),
              action: 'Admin notification sent',
              actor: 'system',
              details: 'Email sent to admin to finalize'
            }
          ]
        };
      }
      return j;
    });
    setJobs(updatedJobs);
    
    alert('✅ Preview Approved\n\nThe admin will now finalize your SCORM package.');
  };
  
  const clientRequestRevision = (job, comment) => {
    if (!comment) {
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
    const config = JOB_STATUSES[status] || JOB_STATUSES.submitted;
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
  // LOGIN SCREEN
  // ============================================
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <Icon name="package" className="w-16 h-16 mx-auto mb-4" style={{fontSize: '64px'}} />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Course Builder</h1>
            <p className="text-gray-600">GxP-Compliant Course Generation</p>
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
            <p className="text-sm text-blue-700">Client: john@abcpharma.com / demo123</p>
            <p className="text-sm text-blue-700">Admin: admin@aicoursebuilder.com / admin123</p>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Submissions</h1>
                <p className="text-gray-600">{currentUser.name} • {currentUser.organization}</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentView('submit')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <Icon name="plus" />
                  New Request
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
                placeholder="Search by job ID, title, or SOP number..."
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
                {Object.entries(JOB_STATUSES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Jobs List */}
          {myJobs.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <Icon name="package" className="w-16 h-16 mx-auto mb-4 text-gray-400" style={{fontSize: '64px'}} />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No submissions yet</h3>
              <p className="text-gray-600 mb-6">Get started by submitting your first SOP for conversion</p>
              <button
                onClick={() => setCurrentView('submit')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                Submit Your First Request
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
                      <p className="text-gray-600 mb-1">Job ID: {job.id} • Submitted: {new Date(job.submittedAt).toLocaleDateString()}</p>
                      {job.sopNumber && <p className="text-gray-600">SOP: {job.sopNumber}</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Quiz Mode</div>
                      <div className="font-semibold text-gray-900 capitalize">{job.quizMode}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Seat Time</div>
                      <div className="font-semibold text-gray-900">{job.estimatedSeatTime} min</div>
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
                          onClick={() => clientApprovePreview(job)}
                          className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all"
                        >
                          Approve Preview
                        </button>
                        <button
                          onClick={() => {
                            const comment = prompt('Please explain what changes you need:');
                            if (comment) clientRequestRevision(job, comment);
                          }}
                          className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-all"
                        >
                          Request Revision
                        </button>
                      </>
                    )}
                    
                    {job.status === 'delivered' && (
                      <button
                        onClick={() => alert(`Downloading: ${job.scormFileName}`)}
                        className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
                      >
                        <Icon name="download" />
                        Download SCORM
                      </button>
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
                <h2 className="text-2xl font-bold text-gray-900">Submit New Course Request</h2>
                <p className="text-gray-600">Convert your SOP to a GxP-compliant SCORM package</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="space-y-6">
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
                    accept=".pdf,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-4">
                      <Icon name="file" className="w-12 h-12 text-green-600" style={{fontSize: '48px'}} />
                      <div className="text-left">
                        <p className="font-bold text-gray-900">{uploadedFile.name}</p>
                        <p className="text-sm text-gray-600">Checksum: {fileChecksum.substring(0, 16)}...</p>
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
                      <p className="text-sm text-gray-500">PDF or DOCX (max 50MB)</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Course Title - REQUIRED */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Course Title <span className="text-red-600">*</span>
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
                <p className="text-sm text-gray-600 mt-1">We'll notify you at this address when your course is ready</p>
              </div>
              
              {/* Quiz Mode - REQUIRED */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Quiz Mode <span className="text-red-600">*</span>
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
              
              {/* Manual Questions - if manual or hybrid */}
              {(clientForm.quizMode === 'manual' || clientForm.quizMode === 'hybrid') && (
                <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Custom Quiz Questions</h4>
                      <p className="text-sm text-gray-600">Add your own assessment questions</p>
                    </div>
                    <button
                      onClick={addManualQuestion}
                      className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <Icon name="plus" />
                      Add Question
                    </button>
                  </div>
                  
                  {manualQuestions.length === 0 ? (
                    <p className="text-sm text-gray-600 italic">No questions added yet. Click "Add Question" to get started.</p>
                  ) : (
                    <div className="space-y-3">
                      {manualQuestions.map((q, idx) => (
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
              
              {/* Advanced Settings - OPTIONAL */}
              <div className="border-t-2 border-gray-200 pt-6">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <span className="font-bold text-gray-900">Advanced Settings (Optional)</span>
                  <span className="text-gray-600">{showAdvanced ? '▲' : '▼'}</span>
                </button>
                
                {showAdvanced && (
                  <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">SOP Number</label>
                        <input
                          type="text"
                          value={clientForm.sopNumber}
                          onChange={(e) => setClientForm({...clientForm, sopNumber: e.target.value})}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          placeholder="e.g., SOP-LAB-001"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Effective Date</label>
                        <input
                          type="date"
                          value={clientForm.effectiveDate}
                          onChange={(e) => setClientForm({...clientForm, effectiveDate: e.target.value})}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated Seat Time (minutes)</label>
                        <input
                          type="number"
                          value={clientForm.estimatedSeatTime}
                          onChange={(e) => setClientForm({...clientForm, estimatedSeatTime: parseInt(e.target.value)})}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Regulatory Status</label>
                        <select
                          value={clientForm.regulatoryStatus}
                          onChange={(e) => setClientForm({...clientForm, regulatoryStatus: e.target.value})}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Approved">Approved</option>
                          <option value="Under Review">Under Review</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Comments / Special Instructions</label>
                      <textarea
                        value={clientForm.comments}
                        onChange={(e) => setClientForm({...clientForm, comments: e.target.value})}
                        rows={3}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="Any specific requirements or instructions for the course..."
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Confirmation Checkbox - REQUIRED */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmCheckbox}
                    onChange={(e) => setConfirmCheckbox(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-gray-900">
                    <strong className="text-red-600">*</strong> I confirm that this document is approved for conversion to a SCORM course package and contains no confidential information that should not be processed.
                  </span>
                </label>
              </div>
              
              {/* Email Notification Info */}
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Icon name="mail" className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-green-900 mb-1">Email Notification</p>
                    <p className="text-sm text-gray-700">
                      When you submit, a notification will be sent to <strong>david.dergazarian@navigantlearning.com</strong> with your course details and attachment. You'll receive updates at <strong>{clientForm.contactEmail || currentUser.email}</strong>.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Submit Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitJob}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <Icon name="send" />
                  Submit Request
                </button>
              </div>
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
              <button
                onClick={handleLogout}
                className="px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all flex items-center gap-2"
              >
                <Icon name="logout" />
                Logout
              </button>
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
                {Object.entries(JOB_STATUSES).map(([key, val]) => (
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
                <label className="text-sm font-semibold text-gray-600">Effective Date</label>
                <p className="text-lg text-gray-900">{selectedJob.effectiveDate ? new Date(selectedJob.effectiveDate).toLocaleDateString() : 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Estimated Seat Time</label>
                <p className="text-lg text-gray-900">{selectedJob.estimatedSeatTime} minutes</p>
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
          </div>
          
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
              <button
                onClick={() => adminDownloadSOP(selectedJob)}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
              >
                <Icon name="download" />
                Download
              </button>
            </div>
            
            <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Next Step:</strong> Download the SOP, then use your CourseBuilder app to generate the SCORM package. Once generated, upload the preview or final package below.
              </p>
            </div>
          </div>
          
          {/* Manual Questions (if provided) */}
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
            
            {/* Upload Preview */}
            <div className="mb-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <h4 className="font-bold text-gray-900 mb-3">Upload Preview (Optional)</h4>
              <p className="text-sm text-gray-700 mb-4">Upload a preview version for client review before finalizing</p>
              <div className="flex items-center gap-4">
                <input
                  ref={previewInputRef}
                  type="file"
                  accept=".zip"
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg"
                />
                <button
                  onClick={() => adminUploadPreview(selectedJob)}
                  className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all"
                >
                  Upload Preview
                </button>
              </div>
            </div>
            
            {/* Upload Final SCORM */}
            <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
              <h4 className="font-bold text-gray-900 mb-3">Upload Final SCORM Package</h4>
              <p className="text-sm text-gray-700 mb-4">Upload the final SCORM package and audit trail to complete delivery</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SCORM Package (.zip)</label>
                  <input
                    ref={scormInputRef}
                    type="file"
                    accept=".zip"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Audit Trail (.xlsx)</label>
                  <input
                    ref={auditInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                
                <button
                  onClick={() => adminUploadFinalSCORM(selectedJob)}
                  className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all"
                >
                  Upload Final Package & Deliver
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
            
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">SOP Number</div>
                <div className="font-semibold text-gray-900">{selectedJob.sopNumber || 'N/A'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Submitted</div>
                <div className="font-semibold text-gray-900">{new Date(selectedJob.submittedAt).toLocaleDateString()}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">ETA</div>
                <div className="font-semibold text-gray-900">{selectedJob.eta || 'N/A'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Last Updated</div>
                <div className="font-semibold text-gray-900">{new Date(selectedJob.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
          
          {/* Status-specific content */}
          {selectedJob.status === 'pending_review' && (
            <div className="bg-purple-50 border-2 border-purple-500 rounded-2xl p-8 mb-6">
              <h3 className="text-2xl font-bold text-purple-900 mb-4">🎉 Preview Ready for Your Review!</h3>
              <p className="text-purple-800 mb-6">Your course preview is ready. Please review and either approve or request changes.</p>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => alert(`Opening preview: ${selectedJob.previewFileName}`)}
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
                <button
                  onClick={() => {
                    const comment = prompt('Please explain what changes you need:');
                    if (comment) clientRequestRevision(selectedJob, comment);
                  }}
                  className="px-6 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-all flex items-center gap-2"
                >
                  <Icon name="edit" />
                  Request Revision
                </button>
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
                    onClick={() => alert(`Downloading: ${selectedJob.scormFileName}`)}
                    className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                  >
                    <Icon name="download" />
                    Download
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-green-200">
                  <div>
                    <p className="font-bold text-gray-900">{selectedJob.auditFileName}</p>
                    <p className="text-sm text-gray-600">Audit Trail</p>
                  </div>
                  <button
                    onClick={() => alert(`Downloading: ${selectedJob.auditFileName}`)}
                    className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                  >
                    <Icon name="download" />
                    Download
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
                <label className="text-sm font-semibold text-gray-600">Estimated Seat Time</label>
                <p className="text-lg text-gray-900">{selectedJob.estimatedSeatTime} minutes</p>
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
  // QUESTION EDITOR MODAL
  // ============================================
  
  if (showQuestionEditor && editingQuestion) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            {manualQuestions.find(q => q.id === editingQuestion.id) ? 'Edit Question' : 'Add Question'}
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
              <label className="block text-sm font-bold text-gray-900 mb-2">Answer Options</label>
              {editingQuestion.options.map((option, idx) => (
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
                </div>
              ))}
              <p className="text-sm text-gray-600 mt-2">Select the radio button for the correct answer</p>
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
  
  return null;
};

export default StreamlinedCourseBuilder;