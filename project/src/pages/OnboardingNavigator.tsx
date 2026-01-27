import React, { useState, useMemo } from 'react';
import { Calendar, CheckCircle, Circle, Clock, Users, FileText, TrendingUp, AlertCircle, ChevronRight, Bell, Mail, MessageSquare, BarChart3, Download, Filter, Search, Play, Pause, Target, Award, BookOpen, Briefcase, Settings, Home } from 'lucide-react';

const OnboardingNavigator = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [userRole, setUserRole] = useState('employee'); // employee, manager, hr
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFAQBot, setShowFAQBot] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your onboarding assistant. Ask me anything about your onboarding process!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [showAutomationActivity, setShowAutomationActivity] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTaskForm, setNewTaskForm] = useState({ 
    title: '', 
    category: '', 
    duration: '', 
    priority: 'medium',
    documentUrl: '',
    documentName: '',
    requiresUpload: false
  });
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    name: '',
    role: '',
    department: '',
    startDate: '',
    manager: ''
  });
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  // Automation tracking data
  const [automationStats] = useState({
    thisWeek: {
      emailsSent: 47,
      tasksAutoAssigned: 12,
      escalationsSent: 5,
      questionsAnswered: 28,
      documentReminders: 15,
      complianceAlerts: 8,
      hoursSaved: 18.5,
      costSavings: 925,
      actionsEliminated: 115
    },
    thisMonth: {
      emailsSent: 186,
      tasksAutoAssigned: 45,
      escalationsSent: 18,
      questionsAnswered: 124,
      documentReminders: 67,
      complianceAlerts: 22,
      hoursSaved: 72.3,
      costSavings: 3615,
      actionsEliminated: 462
    }
  });

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Sample data structure for onboarding tasks
  const [employees, setEmployees] = useState([
    {
      id: 1,
      name: 'Sarah Johnson',
      role: 'Software Engineer',
      department: 'Engineering',
      startDate: '2025-10-15',
      daysInRole: 5,
      overallProgress: 45,
      photo: 'SJ',
      manager: 'Alex Chen',
      milestones: {
        week1: { completed: 8, total: 12, percentage: 67 },
        month1: { completed: 15, total: 28, percentage: 54 },
        month3: { completed: 5, total: 45, percentage: 11 }
      },
      tasks: [
        { id: 1, title: 'Complete HR paperwork', category: 'HR', status: 'completed', dueDate: '2025-10-15', priority: 'high' },
        { id: 2, title: 'Setup laptop and accounts', category: 'IT', status: 'completed', dueDate: '2025-10-15', priority: 'high' },
        { id: 3, title: 'Watch company culture video', category: 'HR', status: 'completed', dueDate: '2025-10-16', priority: 'medium' },
        { id: 4, title: 'Meet with direct manager', category: 'Manager', status: 'completed', dueDate: '2025-10-16', priority: 'high' },
        { id: 5, title: 'Complete security training', category: 'Compliance', status: 'in-progress', dueDate: '2025-10-21', priority: 'high' },
        { id: 6, title: 'Review codebase documentation', category: 'Role Training', status: 'in-progress', dueDate: '2025-10-22', priority: 'medium' },
        { id: 7, title: 'Shadow team standup meetings', category: 'Role Training', status: 'pending', dueDate: '2025-10-23', priority: 'medium' },
        { id: 8, title: 'Setup development environment', category: 'IT', status: 'pending', dueDate: '2025-10-23', priority: 'high' },
      ],
      feedback: [
        { milestone: 'Week 1', date: '2025-10-19', confidence: 4, sentiment: 'positive', comments: 'Great support from the team!' }
      ]
    },
    {
      id: 2,
      name: 'Michael Torres',
      role: 'Marketing Specialist',
      department: 'Marketing',
      startDate: '2025-10-01',
      daysInRole: 19,
      overallProgress: 78,
      photo: 'MT',
      manager: 'Lisa Wang',
      milestones: {
        week1: { completed: 12, total: 12, percentage: 100 },
        month1: { completed: 24, total: 28, percentage: 86 },
        month3: { completed: 12, total: 45, percentage: 27 }
      },
      tasks: [
        { id: 9, title: 'Complete brand guidelines review', category: 'Role Training', status: 'completed', dueDate: '2025-10-08', priority: 'high' },
        { id: 10, title: 'Meet marketing team members', category: 'Manager', status: 'completed', dueDate: '2025-10-02', priority: 'medium' },
        { id: 11, title: 'Access to marketing tools', category: 'IT', status: 'completed', dueDate: '2025-10-01', priority: 'high' },
        { id: 12, title: 'First campaign planning session', category: 'Role Training', status: 'in-progress', dueDate: '2025-10-25', priority: 'medium' },
      ],
      feedback: [
        { milestone: 'Week 1', date: '2025-10-05', confidence: 5, sentiment: 'positive', comments: 'Very organized onboarding process' },
        { milestone: 'Month 1', date: '2025-10-19', confidence: 4, sentiment: 'positive', comments: 'Ready to contribute more' }
      ]
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      role: 'HR Coordinator',
      department: 'Human Resources',
      startDate: '2025-09-15',
      daysInRole: 35,
      overallProgress: 92,
      photo: 'ER',
      manager: 'David Kim',
      milestones: {
        week1: { completed: 12, total: 12, percentage: 100 },
        month1: { completed: 28, total: 28, percentage: 100 },
        month3: { completed: 38, total: 45, percentage: 84 }
      },
      tasks: [
        { id: 13, title: 'Complete HRIS certification', category: 'Role Training', status: 'in-progress', dueDate: '2025-10-30', priority: 'medium' },
        { id: 14, title: 'Shadow recruitment interviews', category: 'Role Training', status: 'completed', dueDate: '2025-10-15', priority: 'low' },
      ],
      feedback: [
        { milestone: 'Week 1', date: '2025-09-19', confidence: 5, sentiment: 'positive', comments: 'Excellent structure' },
        { milestone: 'Month 1', date: '2025-10-12', confidence: 5, sentiment: 'positive', comments: 'Feeling very confident' }
      ]
    }
  ]);

  // Automated email sequences
  const emailSequences = {
    preboarding: [
      { day: -7, subject: 'Welcome to the Team!', status: 'sent', recipient: 'Sarah Johnson' },
      { day: -3, subject: 'Your First Day Details', status: 'sent', recipient: 'Sarah Johnson' },
    ],
    onboarding: [
      { day: 1, subject: 'Welcome to Day 1!', status: 'sent', recipient: 'Sarah Johnson' },
      { day: 3, subject: 'Check-in: How\'s it going?', status: 'scheduled', recipient: 'Sarah Johnson' },
      { day: 7, subject: 'First Week Complete!', status: 'scheduled', recipient: 'Sarah Johnson' },
      { day: 30, subject: 'One Month Milestone', status: 'pending', recipient: 'Sarah Johnson' },
    ],
    documentReminders: [
      { type: 'I-9', daysUntilDue: 2, status: 'sent', recipient: 'Sarah Johnson' },
      { type: 'Tax Forms', daysUntilDue: 1, status: 'sent', recipient: 'Sarah Johnson' },
    ]
  };

  // Compliance tracking
  const complianceData = {
    mandatory: ['Security Training', 'Code of Conduct', 'Data Privacy', 'Harassment Prevention'],
    completion: {
      'Sarah Johnson': { completed: 1, total: 4, percentage: 25, overdue: 0 },
      'Michael Torres': { completed: 4, total: 4, percentage: 100, overdue: 0 },
      'Emily Rodriguez': { completed: 4, total: 4, percentage: 100, overdue: 0 }
    }
  };

  // Recent automation activity feed
  const automationActivity = [
    { type: 'email', action: 'Sent "Day 3 Check-in" email to Sarah Johnson', time: '2 hours ago', icon: Mail },
    { type: 'escalation', action: 'Escalated overdue "Setup development environment" to Alex Chen', time: '3 hours ago', icon: AlertCircle },
    { type: 'task', action: 'Auto-assigned 8 tasks to Michael Torres based on Marketing role', time: '5 hours ago', icon: CheckCircle },
    { type: 'document', action: 'Sent document reminder for I-9 to Sarah Johnson', time: '6 hours ago', icon: FileText },
    { type: 'compliance', action: 'Compliance alert: Sarah Johnson - 3 mandatory tasks pending', time: '1 day ago', icon: AlertCircle },
    { type: 'bot', action: 'FAQ Bot answered "How do I request PTO?" for Sarah Johnson', time: '1 day ago', icon: MessageSquare },
    { type: 'email', action: 'Sent welcome sequence email to new hire batch (3 employees)', time: '2 days ago', icon: Mail },
  ];

  // FAQ Bot knowledge base
  const faqKnowledge = [
    {
      question: 'Where is the employee handbook?',
      answer: 'The employee handbook is available in the Documents section of your onboarding portal. You can also find it at: https://company.com/handbook',
      keywords: ['handbook', 'manual', 'policies']
    },
    {
      question: 'How do I request PTO?',
      answer: 'To request time off, log into the HR portal and go to Time Off > Request PTO. Your manager will be notified automatically for approval. You can find the portal here: https://company.com/pto',
      keywords: ['pto', 'time off', 'vacation', 'leave']
    },
    {
      question: 'Who do I contact about benefits?',
      answer: 'For benefits questions, contact our Benefits team at benefits@company.com or call ext. 5500. You can also schedule a 1-on-1 benefits consultation through the HR portal.',
      keywords: ['benefits', 'insurance', 'health', '401k']
    },
    {
      question: 'When do I get paid?',
      answer: 'Payroll runs bi-weekly on Fridays. Your first paycheck will be on the second Friday after your start date. Direct deposit typically arrives by 9am.',
      keywords: ['payroll', 'paycheck', 'paid', 'salary', 'direct deposit']
    },
    {
      question: 'How do I access my email?',
      answer: 'Your email credentials were sent to your personal email. Access your work email at mail.company.com. For login issues, contact IT at it@company.com or ext. 5100.',
      keywords: ['email', 'outlook', 'mail', 'login']
    },
    {
      question: 'Where do I park?',
      answer: 'Employee parking is available in Lot B (behind the building). Your badge will grant access. Visitor parking is in Lot A. For parking issues, contact Facilities at ext. 5200.',
      keywords: ['parking', 'lot', 'badge', 'access']
    },
    {
      question: 'What are the working hours?',
      answer: 'Core hours are 9am-5pm Monday-Friday. Many teams offer flexible schedules. Check with your manager about your team\'s specific schedule and remote work options.',
      keywords: ['hours', 'schedule', 'work time', 'flexible']
    }
  ];

  // Task templates by department (now editable)
  const [taskTemplates, setTaskTemplates] = useState({
    'Engineering': [
      { title: 'Setup development environment', category: 'IT', duration: '1 day', priority: 'high' },
      { title: 'Review codebase and architecture', category: 'Role Training', duration: '3 days', priority: 'high' },
      { title: 'Complete Git workflow training', category: 'Role Training', duration: '2 hours', priority: 'medium' },
      { title: 'Shadow code reviews', category: 'Role Training', duration: '1 week', priority: 'medium' },
      { title: 'First code contribution', category: 'Role Training', duration: '2 weeks', priority: 'high' },
    ],
    'Marketing': [
      { title: 'Review brand guidelines', category: 'Role Training', duration: '1 day', priority: 'high' },
      { title: 'Access to marketing tools (Hubspot, Analytics)', category: 'IT', duration: '1 day', priority: 'high' },
      { title: 'Meet with creative team', category: 'Manager', duration: '1 day', priority: 'medium' },
      { title: 'Review recent campaigns', category: 'Role Training', duration: '2 days', priority: 'medium' },
    ],
    'Human Resources': [
      { title: 'HRIS system training', category: 'Role Training', duration: '2 days', priority: 'high' },
      { title: 'Employee relations policies review', category: 'Compliance', duration: '3 days', priority: 'high' },
      { title: 'Shadow recruitment process', category: 'Role Training', duration: '1 week', priority: 'medium' },
    ],
    'Common': [
      { title: 'Complete HR paperwork', category: 'HR', duration: '2 hours', priority: 'high' },
      { title: 'Watch company culture video', category: 'HR', duration: '30 min', priority: 'medium' },
      { title: 'Security training', category: 'Compliance', duration: '1 hour', priority: 'high' },
      { title: 'Benefits enrollment', category: 'HR', duration: '1 hour', priority: 'high' },
      { title: 'Meet with direct manager', category: 'Manager', duration: '1 hour', priority: 'high' },
      { title: 'Team introduction meeting', category: 'Manager', duration: '1 hour', priority: 'medium' },
      { title: 'Office tour and facilities', category: 'HR', duration: '30 min', priority: 'low' },
    ]
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    const total = employees.length;
    const avgProgress = employees.reduce((sum, emp) => sum + emp.overallProgress, 0) / total;
    const avgDays = employees.reduce((sum, emp) => sum + emp.daysInRole, 0) / total;
    
    const onTrack = employees.filter(emp => emp.overallProgress >= 70).length;
    const needsAttention = employees.filter(emp => emp.overallProgress < 50).length;
    
    const allTasks = employees.flatMap(emp => emp.tasks);
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const overdueTasks = allTasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
    
    const avgSentiment = employees
      .flatMap(emp => emp.feedback)
      .reduce((sum, fb) => sum + fb.confidence, 0) / employees.flatMap(emp => emp.feedback).length;

    return {
      total,
      avgProgress: Math.round(avgProgress),
      avgDays: Math.round(avgDays),
      onTrack,
      needsAttention,
      completedTasks,
      overdueTasks,
      avgSentiment: avgSentiment.toFixed(1)
    };
  }, [employees]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesDept = filterDepartment === 'all' || emp.department === filterDepartment;
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           emp.role.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [employees, filterDepartment, searchTerm]);

  const currentEmployee = userRole === 'employee' ? employees[0] : selectedEmployee || employees[0];

  // Status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'in-progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'overdue': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  // Function to update task status
  const updateTaskStatus = (employeeId, taskId, newStatus) => {
    setEmployees(prevEmployees => 
      prevEmployees.map(emp => {
        if (emp.id === employeeId) {
          const updatedTasks = emp.tasks.map(task => 
            task.id === taskId ? { ...task, status: newStatus } : task
          );
          
          // Recalculate progress
          const completedCount = updatedTasks.filter(t => t.status === 'completed').length;
          const newProgress = Math.round((completedCount / updatedTasks.length) * 100);
          
          // Recalculate milestones (simplified logic)
          const week1Tasks = updatedTasks.slice(0, 4);
          const week1Completed = week1Tasks.filter(t => t.status === 'completed').length;
          
          return {
            ...emp,
            tasks: updatedTasks,
            overallProgress: newProgress,
            milestones: {
              ...emp.milestones,
              week1: {
                ...emp.milestones.week1,
                completed: week1Completed,
                percentage: Math.round((week1Completed / emp.milestones.week1.total) * 100)
              }
            }
          };
        }
        return emp;
      })
    );
  };

  // Function to start a task
  const startTask = (employeeId, taskId) => {
    updateTaskStatus(employeeId, taskId, 'in-progress');
    showNotification('Task started! Keep up the great work.', 'info');
  };

  // Function to complete a task with confirmation
  const completeTask = (employeeId, taskId) => {
    setConfirmAction({
      type: 'complete',
      employeeId,
      taskId,
      message: 'Are you sure you want to mark this task as complete?'
    });
    setShowConfirmModal(true);
  };

  // Function to revert a completed task
  const revertTask = (employeeId, taskId) => {
    setConfirmAction({
      type: 'revert',
      employeeId,
      taskId,
      message: 'Are you sure you want to mark this task as incomplete?'
    });
    setShowConfirmModal(true);
  };

  // Execute the confirmed action
  const executeConfirmedAction = () => {
    if (confirmAction.type === 'complete') {
      updateTaskStatus(confirmAction.employeeId, confirmAction.taskId, 'completed');
      showNotification('🎉 Task completed! Great progress!', 'success');
    } else if (confirmAction.type === 'revert') {
      updateTaskStatus(confirmAction.employeeId, confirmAction.taskId, 'in-progress');
      showNotification('Task marked as incomplete. You can complete it again.', 'info');
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  // Function to view task details
  const viewTaskDetails = (task, employee) => {
    setSelectedTask({ ...task, employee });
    setShowTaskDetailModal(true);
  };

  // FAQ Bot - Simple keyword matching
  const handleFAQBotMessage = (userMessage) => {
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    // Simple keyword matching for demo
    const lowerMessage = userMessage.toLowerCase();
    let response = null;
    
    for (const faq of faqKnowledge) {
      if (faq.keywords.some(keyword => lowerMessage.includes(keyword))) {
        response = faq.answer;
        break;
      }
    }
    
    if (!response) {
      response = "I'm not sure about that. Here are some common questions I can help with:\n\n• Where is the employee handbook?\n• How do I request PTO?\n• Who do I contact about benefits?\n• When do I get paid?\n• How do I access my email?\n\nYou can also contact HR directly at hr@company.com for more help!";
    }
    
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    }, 500);
    
    setChatInput('');
  };

  // Template Management Functions
  const addTaskToTemplate = (department, task) => {
    setTaskTemplates(prev => ({
      ...prev,
      [department]: [...prev[department], task]
    }));
    setNewTaskForm({ 
      title: '', 
      category: '', 
      duration: '', 
      priority: 'medium',
      documentUrl: '',
      documentName: '',
      requiresUpload: false
    });
    showNotification('Task added to template!', 'success');
  };

  const removeTaskFromTemplate = (department, taskIndex) => {
    setTaskTemplates(prev => ({
      ...prev,
      [department]: prev[department].filter((_, index) => index !== taskIndex)
    }));
    showNotification('Task removed from template', 'info');
  };

  const createNewTemplate = (templateName) => {
    if (!templateName || templateName.trim() === '') {
      showNotification('Please enter a template name', 'info');
      return;
    }
    if (taskTemplates[templateName]) {
      showNotification('Template already exists!', 'info');
      return;
    }
    setTaskTemplates(prev => ({
      ...prev,
      [templateName]: []
    }));
    setShowNewTemplateModal(false);
    setNewTemplateName('');
    showNotification(`New template "${templateName}" created!`, 'success');
  };

  // Automatic Task Assignment Based on Role/Department
  const assignTasksFromTemplate = (employee) => {
    const departmentTasks = taskTemplates[employee.department] || [];
    const commonTasks = taskTemplates['Common'] || [];
    
    // Combine department-specific and common tasks
    const allTemplateTasks = [...commonTasks, ...departmentTasks];
    
    // Convert template tasks to actual tasks with IDs and dates
    const assignedTasks = allTemplateTasks.map((template, index) => ({
      id: Date.now() + index,
      title: template.title,
      category: template.category,
      status: 'pending',
      dueDate: calculateDueDate(employee.startDate, index),
      priority: template.priority,
      estimatedDuration: template.duration
    }));

    return assignedTasks;
  };

  // Calculate due dates based on task priority and sequence
  const calculateDueDate = (startDate, taskIndex) => {
    const start = new Date(startDate);
    const daysToAdd = Math.floor(taskIndex / 2) + 1; // Spread tasks over time
    start.setDate(start.getDate() + daysToAdd);
    return start.toISOString().split('T')[0];
  };

  // Create New Employee with Auto-Assigned Tasks
  const createNewEmployee = (employeeData) => {
    const newEmployee = {
      id: employees.length + 1,
      name: employeeData.name,
      role: employeeData.role,
      department: employeeData.department,
      startDate: employeeData.startDate,
      daysInRole: 0,
      overallProgress: 0,
      photo: employeeData.name.split(' ').map(n => n[0]).join(''),
      manager: employeeData.manager,
      milestones: {
        week1: { completed: 0, total: 12, percentage: 0 },
        month1: { completed: 0, total: 28, percentage: 0 },
        month3: { completed: 0, total: 45, percentage: 0 }
      },
      tasks: assignTasksFromTemplate(employeeData), // 🎯 AUTO-ASSIGN TASKS HERE
      feedback: []
    };

    setEmployees(prev => [...prev, newEmployee]);
    setShowNewEmployeeModal(false);
    setNewEmployeeForm({ name: '', role: '', department: '', startDate: '', manager: '' });
    showNotification(`✅ ${employeeData.name} added! ${newEmployee.tasks.length} tasks auto-assigned from ${employeeData.department} template.`, 'success');
  };

  // Chatbot message handler
  const handleChatMessage = (message) => {
    // Add user message
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    setChatInput('');

    // Simple keyword matching for FAQ
    const lowerMessage = message.toLowerCase();
    let response = null;

    // Find matching FAQ
    for (const faq of faqKnowledgeBase) {
      const keywords = faq.question.toLowerCase().split(' ');
      if (keywords.some(keyword => lowerMessage.includes(keyword) && keyword.length > 3)) {
        response = faq.answer;
        break;
      }
    }

    // Default responses
    if (!response) {
      if (lowerMessage.includes('help') || lowerMessage.includes('what can you')) {
        response = "I can help you with:\n• Employee handbook and policies\n• Benefits enrollment\n• Time off requests\n• IT support\n• Payroll questions\n• Dress code\n\nJust ask me anything!";
      } else if (lowerMessage.includes('thank')) {
        response = "You're welcome! Let me know if you need anything else.";
      } else {
        response = "I'm not sure about that specific question, but I can help with policies, benefits, IT support, payroll, and general onboarding questions. Could you rephrase your question?";
      }
    }

    // Add bot response after a brief delay
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    }, 500);
  };

  // Render different views based on user role
  const renderDashboard = () => {
    if (userRole === 'hr') {
      return (
        <div className="space-y-6">
          {/* HR Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Onboarding</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Progress</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.avgProgress}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Needs Attention</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.needsAttention}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Satisfaction</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.avgSentiment}/5</p>
                </div>
                <Award className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Marketing">Marketing</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Sales">Sales</option>
              </select>
            </div>
          </div>

          {/* Employee Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map(employee => (
              <div
                key={employee.id}
                onClick={() => {
                  setSelectedEmployee(employee);
                  setActiveView('employee-detail');
                }}
                className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {employee.photo}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-600">{employee.role}</p>
                      <p className="text-xs text-gray-500">{employee.department}</p>
                    </div>
                  </div>
                  {employee.overallProgress < 50 && (
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  )}
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Overall Progress</span>
                    <span className="font-semibold text-gray-900">{employee.overallProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${employee.overallProgress >= 70 ? 'bg-green-500' : employee.overallProgress >= 40 ? 'bg-blue-500' : 'bg-orange-500'}`}
                      style={{ width: `${employee.overallProgress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>Day {employee.daysInRole}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="w-4 h-4 mr-1" />
                    <span>{employee.manager}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <p className="text-gray-600">Week 1</p>
                    <p className="font-semibold text-gray-900">{employee.milestones.week1.percentage}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600">Month 1</p>
                    <p className="font-semibold text-gray-900">{employee.milestones.month1.percentage}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600">Month 3</p>
                    <p className="font-semibold text-gray-900">{employee.milestones.month3.percentage}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Manager or Employee Dashboard
    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-2">
            {userRole === 'employee' ? `Welcome, ${currentEmployee.name}!` : `Managing ${currentEmployee.name}'s Onboarding`}
          </h2>
          <p className="text-blue-100">
            {userRole === 'employee' 
              ? `Day ${currentEmployee.daysInRole} of your onboarding journey`
              : `Day ${currentEmployee.daysInRole} • ${currentEmployee.role}`}
          </p>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">Week 1</h3>
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-semibold">{currentEmployee.milestones.week1.completed}/{currentEmployee.milestones.week1.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${currentEmployee.milestones.week1.percentage}%` }}
                />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{currentEmployee.milestones.week1.percentage}%</p>
          </div>

          <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">Month 1</h3>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-semibold">{currentEmployee.milestones.month1.completed}/{currentEmployee.milestones.month1.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${currentEmployee.milestones.month1.percentage}%` }}
                />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{currentEmployee.milestones.month1.percentage}%</p>
          </div>

          <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">Month 3</h3>
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-semibold">{currentEmployee.milestones.month3.completed}/{currentEmployee.milestones.month3.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${currentEmployee.milestones.month3.percentage}%` }}
                />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{currentEmployee.milestones.month3.percentage}%</p>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {currentEmployee.tasks.filter(t => t.status !== 'completed').slice(0, 4).map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all">
                <div className="flex items-center space-x-3 flex-1">
                  <button
                    onClick={() => {
                      if (task.status === 'pending') {
                        startTask(currentEmployee.id, task.id);
                      } else if (task.status === 'in-progress') {
                        completeTask(currentEmployee.id, task.id);
                      }
                    }}
                    className="flex-shrink-0 hover:scale-110 transition-transform"
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : task.status === 'in-progress' ? (
                      <Circle className="w-6 h-6 text-blue-600 fill-current" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400 hover:text-blue-500" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-600">{task.category}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className="text-sm text-gray-600">{task.dueDate}</span>
                  <button
                    onClick={() => viewTaskDetails(task, currentEmployee)}
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    Details
                  </button>
                  {task.status === 'pending' && (
                    <button
                      onClick={() => startTask(currentEmployee.id, task.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Start
                    </button>
                  )}
                  {task.status === 'in-progress' && (
                    <button
                      onClick={() => completeTask(currentEmployee.id, task.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTasks = () => {
    const tasksByCategory = currentEmployee.tasks.reduce((acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">All Tasks</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {currentEmployee.tasks.filter(t => t.status === 'completed').length} of {currentEmployee.tasks.length} completed
              </span>
            </div>
          </div>

          {Object.entries(tasksByCategory).map(([category, tasks]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
                {category}
              </h3>
              <div className="space-y-2">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border-2 ${getStatusColor(task.status)} transition-all hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <button
                          onClick={() => {
                            if (task.status === 'pending') {
                              startTask(currentEmployee.id, task.id);
                            } else if (task.status === 'in-progress') {
                              completeTask(currentEmployee.id, task.id);
                            } else if (task.status === 'completed') {
                              revertTask(currentEmployee.id, task.id);
                            }
                          }}
                          className="flex-shrink-0 hover:scale-110 transition-transform mt-0.5"
                        >
                          {task.status === 'completed' ? (
                            <CheckCircle className="w-6 h-6 text-green-600 cursor-pointer hover:text-green-700" />
                          ) : task.status === 'in-progress' ? (
                            <Play className="w-6 h-6 text-blue-600 cursor-pointer hover:text-blue-700" />
                          ) : (
                            <Circle className="w-6 h-6 text-gray-400 cursor-pointer hover:text-blue-500" />
                          )}
                        </button>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{task.title}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Due: {task.dueDate}
                            </span>
                            <span className={`font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority.toUpperCase()} Priority
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              task.status === 'completed' ? 'bg-green-100 text-green-700' :
                              task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {task.status === 'completed' ? 'Completed' :
                               task.status === 'in-progress' ? 'In Progress' :
                               'Not Started'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => viewTaskDetails(task, currentEmployee)}
                          className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                        >
                          View Details
                        </button>
                        {task.status === 'completed' && (
                          <button
                            onClick={() => revertTask(currentEmployee.id, task.id)}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                          >
                            Undo
                          </button>
                        )}
                        {task.status === 'in-progress' && (
                          <button
                            onClick={() => completeTask(currentEmployee.id, task.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Mark Complete
                          </button>
                        )}
                        {task.status === 'pending' && (
                          <button
                            onClick={() => startTask(currentEmployee.id, task.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Start Task
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    const milestones = [
      { day: 1, title: 'First Day', description: 'Welcome & orientation', completed: true },
      { day: 5, title: 'Week 1 Complete', description: 'Initial setup & introductions', completed: true },
      { day: 14, title: '2 Weeks', description: 'Role training begins', completed: currentEmployee.daysInRole >= 14 },
      { day: 30, title: 'Month 1', description: 'First milestone review', completed: currentEmployee.daysInRole >= 30 },
      { day: 60, title: 'Month 2', description: 'Mid-onboarding check-in', completed: currentEmployee.daysInRole >= 60 },
      { day: 90, title: 'Month 3', description: 'Onboarding complete', completed: currentEmployee.daysInRole >= 90 },
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Onboarding Journey</h2>
          
          <div className="relative">
            {milestones.map((milestone, index) => (
              <div key={index} className="mb-8 flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                      milestone.completed
                        ? 'bg-green-500 text-white'
                        : currentEmployee.daysInRole === milestone.day
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {milestone.completed ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <span className="text-sm">{milestone.day}</span>
                    )}
                  </div>
                  {index < milestones.length - 1 && (
                    <div
                      className={`w-0.5 h-16 ${
                        milestone.completed ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
                
                <div className="flex-1 pb-8">
                  <div className={`p-4 rounded-lg border-2 ${
                    milestone.completed
                      ? 'border-green-200 bg-green-50'
                      : currentEmployee.daysInRole === milestone.day
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                      <span className="text-sm text-gray-600">Day {milestone.day}</span>
                    </div>
                    <p className="text-gray-600">{milestone.description}</p>
                    {milestone.completed && (
                      <button
                        onClick={() => {
                          setSelectedMilestone(milestone);
                          setShowFeedbackModal(true);
                        }}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Feedback
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback History */}
        <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback History</h3>
          <div className="space-y-4">
            {currentEmployee.feedback.map((fb, index) => (
              <div key={index} className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">{fb.milestone}</span>
                  <span className="text-sm text-gray-600">{fb.date}</span>
                </div>
                <div className="flex items-center mb-2">
                  <span className="text-sm text-gray-600 mr-2">Confidence:</span>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Award
                        key={star}
                        className={`w-5 h-5 ${star <= fb.confidence ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 italic">"{fb.comments}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDocuments = () => {
    const documents = [
      { name: 'Employment Contract', status: 'completed', uploadDate: '2025-10-15', category: 'HR' },
      { name: 'Tax Forms (W-4)', status: 'completed', uploadDate: '2025-10-15', category: 'HR' },
      { name: 'Benefits Enrollment', status: 'completed', uploadDate: '2025-10-16', category: 'HR' },
      { name: 'Security Acknowledgement', status: 'in-progress', uploadDate: null, category: 'Compliance' },
      { name: 'Code of Conduct', status: 'pending', uploadDate: null, category: 'Compliance' },
      { name: 'Equipment Agreement', status: 'pending', uploadDate: null, category: 'IT' },
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Documents & Forms</h2>
          
          <div className="space-y-3">
            {documents.map((doc, index) => (
              <div key={index} className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className={`w-6 h-6 ${doc.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{doc.category}</span>
                        {doc.uploadDate && <span>Uploaded: {doc.uploadDate}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {doc.status === 'completed' ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <button className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                          Download
                        </button>
                      </>
                    ) : (
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                        Upload
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">Document Reminders</p>
                <p className="text-sm text-gray-700">You have 3 pending documents. Complete them by Oct 25 to stay on track.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };


  const renderTemplates = () => {
    return (
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Onboarding Templates by Department</h2>
              <p className="text-gray-600">Pre-configured task lists that auto-assign to new hires based on their role/department</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowNewEmployeeModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
              >
                <Users className="w-5 h-5" />
                <span>Add New Employee</span>
              </button>
              <button
                onClick={() => setShowNewTemplateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
              >
                <Settings className="w-5 h-5" />
                <span>New Template</span>
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">✨ How It Works</p>
                <p className="text-sm text-gray-700">
                  When you add a new employee, tasks from their department template + common tasks are automatically assigned. 
                  Click "Edit Template" to customize tasks for each department.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Template Cards */}
        {Object.entries(taskTemplates).map(([dept, tasks]) => (
          <div key={dept} className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{dept}</h3>
                <p className="text-sm text-gray-600">{tasks.length} tasks in this template</p>
              </div>
              <button
                onClick={() => {
                  setEditingTemplate(dept);
                  setShowTemplateEditor(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Edit Template</span>
              </button>
            </div>
            
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{task.title}</p>
                      <div className="flex items-center space-x-3 mt-1 text-sm text-gray-600">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{task.category}</span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {task.duration}
                        </span>
                        <span className={`font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {tasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No tasks in this template yet</p>
                <button
                  onClick={() => {
                    setEditingTemplate(dept);
                    setShowTemplateEditor(true);
                  }}
                  className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add tasks to get started
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderAutomation = () => {
    return (
      <div className="space-y-6">
        {/* Automation Stats Dashboard */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Automation Activity</h2>
          <p className="text-purple-100">Real-time tracking of automated onboarding processes</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Mail className="w-8 h-8 text-blue-600" />
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">This Week</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{automationStats.thisWeek.emailsSent}</p>
            <p className="text-sm text-gray-600 mt-1">Automated Emails Sent</p>
          </div>

          <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">This Week</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{automationStats.thisWeek.tasksAutoAssigned}</p>
            <p className="text-sm text-gray-600 mt-1">Tasks Auto-Assigned</p>
          </div>

          <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <MessageSquare className="w-8 h-8 text-purple-600" />
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">This Week</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{automationStats.thisWeek.questionsAnswered}</p>
            <p className="text-sm text-gray-600 mt-1">Questions Answered by Bot</p>
          </div>

          <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-8 h-8 text-orange-600" />
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">This Week</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{automationStats.thisWeek.hoursSaved}</p>
            <p className="text-sm text-gray-600 mt-1">HR Hours Saved</p>
          </div>
        </div>

        {/* ROI Impact */}
        <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productivity Impact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <p className="text-4xl font-bold text-green-600">${automationStats.thisWeek.costSavings}</p>
              <p className="text-sm text-gray-700 mt-2">Cost Savings This Week</p>
              <p className="text-xs text-gray-500 mt-1">At $50/hour HR rate</p>
            </div>
            <div className="text-center p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-4xl font-bold text-blue-600">{automationStats.thisWeek.actionsEliminated}</p>
              <p className="text-sm text-gray-700 mt-2">Manual Actions Eliminated</p>
              <p className="text-xs text-gray-500 mt-1">Reminders, follow-ups, etc.</p>
            </div>
            <div className="text-center p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <p className="text-4xl font-bold text-purple-600">91%</p>
              <p className="text-sm text-gray-700 mt-2">Time Reduction</p>
              <p className="text-xs text-gray-500 mt-1">Per employee onboarding</p>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Automated Actions</h3>
          <div className="space-y-3">
            {automationActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'email' ? 'bg-blue-100' :
                    activity.type === 'escalation' ? 'bg-orange-100' :
                    activity.type === 'task' ? 'bg-green-100' :
                    activity.type === 'document' ? 'bg-purple-100' :
                    activity.type === 'compliance' ? 'bg-red-100' :
                    'bg-gray-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      activity.type === 'email' ? 'text-blue-600' :
                      activity.type === 'escalation' ? 'text-orange-600' :
                      activity.type === 'task' ? 'text-green-600' :
                      activity.type === 'document' ? 'text-purple-600' :
                      activity.type === 'compliance' ? 'text-red-600' :
                      'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-600">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Email Sequences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Automated Email Sequences</h3>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Pre-boarding Sequence</h4>
                {emailSequences.preboarding.map((email, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-blue-200 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{email.subject}</p>
                      <p className="text-xs text-gray-600">Day {email.day} • {email.recipient}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      email.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {email.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Onboarding Sequence</h4>
                {emailSequences.onboarding.slice(0, 4).map((email, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-green-200 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{email.subject}</p>
                      <p className="text-xs text-gray-600">Day {email.day} • {email.recipient}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      email.status === 'sent' ? 'bg-green-100 text-green-700' :
                      email.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {email.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Tracking</h3>
            <div className="space-y-4">
              {Object.entries(complianceData.completion).map(([name, data]) => (
                <div key={name} className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-900">{name}</p>
                    {data.percentage === 100 ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : data.overdue > 0 ? (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold">{data.completed}/{data.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          data.percentage === 100 ? 'bg-green-500' :
                          data.percentage >= 50 ? 'bg-blue-500' :
                          'bg-orange-500'
                        }`}
                        style={{ width: `${data.percentage}%` }}
                      />
                    </div>
                  </div>
                  {data.percentage < 100 && (
                    <p className="text-xs text-orange-600 font-medium">
                      🔔 Auto-reminder scheduled for tomorrow
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Document Reminders */}
        <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Collection Automation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {emailSequences.documentReminders.map((doc, index) => (
              <div key={index} className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-6 h-6 text-yellow-600" />
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    doc.daysUntilDue <= 1 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {doc.daysUntilDue} days left
                  </span>
                </div>
                <p className="font-semibold text-gray-900">{doc.type}</p>
                <p className="text-sm text-gray-600 mb-2">{doc.recipient}</p>
                <div className="flex items-center space-x-1 text-xs text-gray-600">
                  <Mail className="w-3 h-3" />
                  <span>Auto-reminder sent</span>
                </div>
              </div>
            ))}
            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-900">All Others Complete</p>
                <p className="text-sm text-gray-600">No reminders needed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Time to Productivity</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.avgDays} days</p>
                <p className="text-xs text-green-600 mt-1">↓ 12% from last quarter</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasks Completed</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.completedTasks}</p>
                <p className="text-xs text-gray-600 mt-1">Across all employees</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue Tasks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.overdueTasks}</p>
                <p className="text-xs text-orange-600 mt-1">Needs attention</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Satisfaction Score</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.avgSentiment}/5</p>
                <p className="text-xs text-green-600 mt-1">↑ 0.3 from last month</p>
              </div>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Completion by Category</h3>
            <div className="space-y-3">
              {['HR', 'IT', 'Role Training', 'Compliance', 'Manager'].map(cat => {
                const percentage = Math.floor(Math.random() * 30) + 60;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{cat}</span>
                      <span className="font-semibold text-gray-900">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Bottlenecks</h3>
            <div className="space-y-3">
              {[
                { task: 'Equipment setup', delay: '2.3 days avg', impact: 'high' },
                { task: 'System access requests', delay: '1.8 days avg', impact: 'high' },
                { task: 'Benefits enrollment', delay: '1.2 days avg', impact: 'medium' },
                { task: 'Training module completion', delay: '0.9 days avg', impact: 'low' },
              ].map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.task}</p>
                      <p className="text-sm text-gray-600">{item.delay} delay</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      item.impact === 'high' ? 'bg-red-100 text-red-700' :
                      item.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {item.impact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Department Performance</h3>
            <button className="flex items-center space-x-2 px-4 py-2 text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Department</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Active</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Avg Progress</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">On Track</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Satisfaction</th>
                </tr>
              </thead>
              <tbody>
                {['Engineering', 'Marketing', 'Sales', 'Human Resources'].map((dept, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{dept}</td>
                    <td className="py-3 px-4 text-gray-700">{Math.floor(Math.random() * 5) + 2}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.floor(Math.random() * 30) + 60}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-700">{Math.floor(Math.random() * 30) + 60}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-green-600 font-medium">{Math.floor(Math.random() * 3) + 3}/{Math.floor(Math.random() * 5) + 4}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-700">{(Math.random() * 0.8 + 4).toFixed(1)}/5</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // AI Chatbot Modal
  const ChatbotModal = () => {
    if (!showChatbot) return null;

    return (
      <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border-2 border-purple-200 flex flex-col z-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-6 h-6" />
            <div>
              <h3 className="font-bold">Onboarding Assistant</h3>
              <p className="text-xs text-purple-100">Ask me anything!</p>
            </div>
          </div>
          <button
            onClick={() => setShowChatbot(false)}
            className="text-white hover:text-purple-200 transition-colors"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-line">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Questions */}
        <div className="p-2 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {['Employee handbook?', 'Request time off?', 'IT support?', 'Benefits?'].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleChatMessage(q)}
                className="text-xs px-2 py-1 bg-white border border-gray-300 rounded-full hover:bg-purple-50 hover:border-purple-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (chatInput.trim()) {
                handleChatMessage(chatInput);
              }
            }}
            className="flex space-x-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    );
  };

  // New Template Modal
  const NewTemplateModal = () => {
    if (!showNewTemplateModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Template</h2>
            <button
              onClick={() => {
                setShowNewTemplateModal(false);
                setNewTemplateName('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-3xl">×</span>
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name
            </label>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder='e.g., "Sales", "Operations", "Customer Success"'
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newTemplateName.trim()) {
                  createNewTemplate(newTemplateName);
                }
              }}
            />
            <p className="text-sm text-gray-600 mt-2">
              This will create a new department template. You can add tasks to it after creation.
            </p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>💡 Tip:</strong> Name it after a department or role type. Examples: "Sales", "Engineering - Senior", "Marketing - Remote"
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowNewTemplateModal(false);
                setNewTemplateName('');
              }}
              className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => createNewTemplate(newTemplateName)}
              disabled={!newTemplateName.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Create Template
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Template Editor Modal
  const TemplateEditorModal = () => {
    if (!showTemplateEditor || !editingTemplate) return null;

    const currentTasks = taskTemplates[editingTemplate] || [];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit Template: {editingTemplate}</h2>
              <button
                onClick={() => {
                  setShowTemplateEditor(false);
                  setEditingTemplate(null);
                  setNewTaskForm({ title: '', category: '', duration: '', priority: 'medium' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-3xl">×</span>
              </button>
            </div>

            {/* Add New Task Form */}
            <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Add New Task</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Task title"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({...newTaskForm, title: e.target.value})}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={newTaskForm.category}
                    onChange={(e) => setNewTaskForm({...newTaskForm, category: e.target.value})}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    <option value="HR">HR</option>
                    <option value="IT">IT</option>
                    <option value="Role Training">Role Training</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Manager">Manager</option>
                  </select>
                  
                  <input
                    type="text"
                    placeholder="Duration (e.g., '2 hours')"
                    value={newTaskForm.duration}
                    onChange={(e) => setNewTaskForm({...newTaskForm, duration: e.target.value})}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm({...newTaskForm, priority: e.target.value})}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                {/* Document Upload Section */}
                <div className="border-2 border-gray-300 rounded-lg p-3 bg-white">
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="checkbox"
                      id="requiresUpload"
                      checked={newTaskForm.requiresUpload}
                      onChange={(e) => setNewTaskForm({...newTaskForm, requiresUpload: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="requiresUpload" className="font-medium text-gray-900 cursor-pointer">
                      This task requires document upload/review
                    </label>
                  </div>

                  {newTaskForm.requiresUpload && (
                    <div className="space-y-2 pl-6">
                      <input
                        type="text"
                        placeholder="Document name (e.g., 'Employee Handbook')"
                        value={newTaskForm.documentName}
                        onChange={(e) => setNewTaskForm({...newTaskForm, documentName: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Document URL (optional - e.g., 'https://company.com/handbook.pdf')"
                        value={newTaskForm.documentUrl}
                        onChange={(e) => setNewTaskForm({...newTaskForm, documentUrl: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <p className="text-xs text-gray-600">
                        📄 Employees will be prompted to upload/acknowledge this document when completing the task
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (newTaskForm.title && newTaskForm.category && newTaskForm.duration) {
                      if (newTaskForm.requiresUpload && !newTaskForm.documentName) {
                        alert('Please enter a document name');
                        return;
                      }
                      addTaskToTemplate(editingTemplate, newTaskForm);
                    } else {
                      alert('Please fill in title, category, and duration');
                    }
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Add Task
                </button>
              </div>
            </div>

            {/* Current Tasks List */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 mb-3">Current Tasks ({currentTasks.length})</h3>
              {currentTasks.map((task, index) => (
                <div key={index} className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{task.title}</p>
                      <div className="flex items-center flex-wrap gap-2 mt-2 text-sm text-gray-600">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{task.category}</span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {task.duration}
                        </span>
                        <span className={getPriorityColor(task.priority)}>{task.priority}</span>
                        {task.requiresUpload && (
                          <span className="flex items-center text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            <FileText className="w-3 h-3 mr-1" />
                            Document: {task.documentName}
                          </span>
                        )}
                      </div>
                      {task.documentUrl && (
                        <a 
                          href={task.documentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block"
                        >
                          View Document →
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => removeTaskFromTemplate(editingTemplate, index)}
                      className="ml-4 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {currentTasks.length === 0 && (
                <p className="text-center text-gray-500 py-8">No tasks yet. Add tasks using the form above.</p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowTemplateEditor(false);
                  setEditingTemplate(null);
                  setNewTaskForm({ title: '', category: '', duration: '', priority: 'medium' });
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // New Employee Modal
  const NewEmployeeModal = () => {
    if (!showNewEmployeeModal) return null;

    const previewTasks = newEmployeeForm.department 
      ? [...(taskTemplates['Common'] || []), ...(taskTemplates[newEmployeeForm.department] || [])]
      : [];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add New Employee</h2>
              <button
                onClick={() => {
                  setShowNewEmployeeModal(false);
                  setNewEmployeeForm({ name: '', role: '', department: '', startDate: '', manager: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-3xl">×</span>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newEmployeeForm.name}
                  onChange={(e) => setNewEmployeeForm({...newEmployeeForm, name: e.target.value})}
                  placeholder="e.g., John Smith"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role/Title</label>
                <input
                  type="text"
                  value={newEmployeeForm.role}
                  onChange={(e) => setNewEmployeeForm({...newEmployeeForm, role: e.target.value})}
                  placeholder="e.g., Senior Software Engineer"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={newEmployeeForm.department}
                  onChange={(e) => setNewEmployeeForm({...newEmployeeForm, department: e.target.value})}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select department</option>
                  {Object.keys(taskTemplates).filter(dept => dept !== 'Common').map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newEmployeeForm.startDate}
                    onChange={(e) => setNewEmployeeForm({...newEmployeeForm, startDate: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                  <input
                    type="text"
                    value={newEmployeeForm.manager}
                    onChange={(e) => setNewEmployeeForm({...newEmployeeForm, manager: e.target.value})}
                    placeholder="e.g., Sarah Johnson"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Task Preview */}
            {newEmployeeForm.department && (
              <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                  Tasks That Will Be Auto-Assigned ({previewTasks.length})
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {previewTasks.map((task, index) => (
                    <div key={index} className="text-sm text-gray-700 flex items-center">
                      <Circle className="w-3 h-3 mr-2 text-gray-400" />
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowNewEmployeeModal(false);
                  setNewEmployeeForm({ name: '', role: '', department: '', startDate: '', manager: '' });
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newEmployeeForm.name && newEmployeeForm.role && newEmployeeForm.department && newEmployeeForm.startDate) {
                    createNewEmployee(newEmployeeForm);
                  } else {
                    alert('Please fill in all required fields');
                  }
                }}
                disabled={!newEmployeeForm.name || !newEmployeeForm.department}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Create Employee & Auto-Assign Tasks
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // FAQ Bot Modal
  const FAQBotModal = () => {
    if (!showFAQBot) return null;

    return (
      <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-2xl border-2 border-blue-500 z-50 flex flex-col" style={{ height: '500px' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-6 h-6" />
            <div>
              <h3 className="font-bold">Onboarding Assistant</h3>
              <p className="text-xs text-blue-100">Ask me anything!</p>
            </div>
          </div>
          <button
            onClick={() => setShowFAQBot(false)}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {chatMessages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white border-2 border-gray-200 text-gray-900 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-line">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t-2 border-gray-200 bg-white rounded-b-lg">
          <div className="flex space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && chatInput.trim()) {
                  handleFAQBotMessage(chatInput);
                }
              }}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <button
              onClick={() => {
                if (chatInput.trim()) {
                  handleFAQBotMessage(chatInput);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Send
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {['Where is handbook?', 'How do I request PTO?', 'When do I get paid?'].map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setChatInput(suggestion);
                  handleFAQBotMessage(suggestion);
                }}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Confirmation Modal
  const ConfirmationModal = () => {
    if (!showConfirmModal || !confirmAction) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              confirmAction.type === 'complete' ? 'bg-green-100' : 'bg-orange-100'
            }`}>
              {confirmAction.type === 'complete' ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-orange-600" />
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {confirmAction.type === 'complete' ? 'Complete Task?' : 'Undo Completion?'}
            </h3>
          </div>
          
          <p className="text-gray-700 mb-6">{confirmAction.message}</p>

          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowConfirmModal(false);
                setConfirmAction(null);
              }}
              className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={executeConfirmedAction}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium text-white ${
                confirmAction.type === 'complete'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {confirmAction.type === 'complete' ? 'Yes, Complete' : 'Yes, Undo'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Task Detail Modal
  const TaskDetailModal = () => {
    if (!showTaskDetailModal || !selectedTask) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                {selectedTask.status === 'completed' ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : selectedTask.status === 'in-progress' ? (
                  <Play className="w-8 h-8 text-blue-600" />
                ) : (
                  <Circle className="w-8 h-8 text-gray-400" />
                )}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedTask.status === 'completed' ? 'bg-green-100 text-green-700' :
                  selectedTask.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {selectedTask.status === 'completed' ? 'Completed' :
                   selectedTask.status === 'in-progress' ? 'In Progress' :
                   'Not Started'}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedTask.title}</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Briefcase className="w-4 h-4 mr-1" />
                  {selectedTask.category}
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Due: {selectedTask.dueDate}
                </span>
                <span className={`font-medium ${getPriorityColor(selectedTask.priority)}`}>
                  {selectedTask.priority.toUpperCase()} Priority
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowTaskDetailModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Task Description</h3>
              <p className="text-gray-700">
                This task is part of your onboarding journey. Complete it by the due date to stay on track.
                If you need help or have questions, reach out to your manager or HR team.
              </p>
            </div>

            <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Employee Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{selectedTask.employee.name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Role</p>
                  <p className="font-medium text-gray-900">{selectedTask.employee.role}</p>
                </div>
                <div>
                  <p className="text-gray-600">Department</p>
                  <p className="font-medium text-gray-900">{selectedTask.employee.department}</p>
                </div>
                <div>
                  <p className="text-gray-600">Days in Role</p>
                  <p className="font-medium text-gray-900">Day {selectedTask.employee.daysInRole}</p>
                </div>
              </div>
            </div>

            {selectedTask.status === 'completed' && (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Completed!</h3>
                </div>
                <p className="text-sm text-gray-700">
                  Great job completing this task! If you completed it by mistake, you can undo it below.
                </p>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4 border-t-2 border-gray-200">
            <button
              onClick={() => setShowTaskDetailModal(false)}
              className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>
            {selectedTask.status === 'completed' && (
              <button
                onClick={() => {
                  setShowTaskDetailModal(false);
                  revertTask(selectedTask.employee.id, selectedTask.id);
                }}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Undo Completion
              </button>
            )}
            {selectedTask.status === 'in-progress' && (
              <button
                onClick={() => {
                  setShowTaskDetailModal(false);
                  completeTask(selectedTask.employee.id, selectedTask.id);
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Mark as Complete
              </button>
            )}
            {selectedTask.status === 'pending' && (
              <button
                onClick={() => {
                  setShowTaskDetailModal(false);
                  startTask(selectedTask.employee.id, selectedTask.id);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start Task
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Feedback Modal
  const FeedbackModal = () => {
    if (!showFeedbackModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Milestone Feedback</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How confident do you feel in your role?
            </label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Award
                  key={star}
                  className="w-8 h-8 text-gray-300 hover:text-yellow-500 cursor-pointer transition-colors"
                />
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Any comments or feedback?
            </label>
            <textarea
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="4"
              placeholder="Share your thoughts..."
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setShowFeedbackModal(false)}
              className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowFeedbackModal(false)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Submit Feedback
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`px-6 py-4 rounded-lg shadow-lg border-2 ${
            notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-900' :
            notification.type === 'info' ? 'bg-blue-50 border-blue-500 text-blue-900' :
            'bg-red-50 border-red-500 text-red-900'
          }`}>
            <div className="flex items-center space-x-3">
              {notification.type === 'success' && <CheckCircle className="w-6 h-6" />}
              {notification.type === 'info' && <Clock className="w-6 h-6" />}
              <p className="font-medium">{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Onboarding Navigator</h1>
                <p className="text-xs text-gray-600">Guide every new hire to success</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
              >
                <option value="employee">Employee View</option>
                <option value="manager">Manager View</option>
                <option value="hr">HR View</option>
              </select>

              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'tasks', label: 'Tasks', icon: CheckCircle },
              { id: 'timeline', label: 'Timeline', icon: Calendar },
              { id: 'documents', label: 'Documents', icon: FileText },
              // Only show Automation, Templates, and Analytics for HR
              ...(userRole === 'hr' ? [
                { id: 'automation', label: 'Automation', icon: Settings },
                { id: 'templates', label: 'Templates', icon: Settings },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 }
              ] : [])
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center space-x-2 py-4 px-3 border-b-2 transition-colors ${
                    activeView === item.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'tasks' && renderTasks()}
        {activeView === 'timeline' && renderTimeline()}
        {activeView === 'documents' && renderDocuments()}
        {activeView === 'automation' && renderAutomation()}
        {activeView === 'templates' && renderTemplates()}
        {activeView === 'analytics' && renderAnalytics()}
        {activeView === 'employee-detail' && userRole === 'hr' && (
          <div>
            <button
              onClick={() => setActiveView('dashboard')}
              className="mb-4 flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Dashboard
            </button>
            {renderDashboard()}
          </div>
        )}
      </div>

      {/* Modals */}
      <FAQBotModal />
      <ConfirmationModal />
      <TaskDetailModal />
      <FeedbackModal />
      <NewTemplateModal />
      <TemplateEditorModal />
      <NewEmployeeModal />

      {/* Floating FAQ Bot Button */}
      {!showFAQBot && (
        <button
          onClick={() => setShowFAQBot(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-40"
          title="Ask the Onboarding Assistant"
        >
          <MessageSquare className="w-8 h-8" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
            ?
          </span>
        </button>
      )}

      {/* Footer Note */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900 mb-1">✅ Automation Features Active!</p>
              <p className="text-sm text-gray-700 mb-2">
                This app includes 6 high-impact automation features that demonstrate clear ROI:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>✅ Automated Email Sequences</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>✅ Auto Task Assignment by Role</span>
                </div>
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span>✅ Auto-Escalation for Overdue Tasks</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>✅ Document Collection Reminders</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-red-600" />
                  <span>✅ Compliance Tracking & Alerts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>✅ Self-Service FAQ Bot (AI)</span>
                </div>
              </div>
              <p className="text-sm text-green-700 font-semibold mt-3">
                💰 Result: 91% time reduction per employee • $10,875+ annual savings (50 employees)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingNavigator;