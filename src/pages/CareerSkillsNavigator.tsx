import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, TrendingUp, Target, Award, BookOpen, Layers, CheckCircle, Clock, Download, Users, Briefcase, BarChart3, Map, Send, GraduationCap, X } from 'lucide-react';

// ============================================
// DATA MODEL: Career Skills Navigator
// ============================================

// 1. DEPARTMENTS (Functions)
const DEPARTMENTS = {
  engineering: {
    id: 'engineering',
    name: 'Engineering',
    description: 'Build and scale products',
    color: 'from-blue-500 to-purple-600'
  },
  hr: {
    id: 'hr',
    name: 'Human Resources',
    description: 'Talent & organizational development',
    color: 'from-purple-500 to-pink-600'
  },
  sales: {
    id: 'sales',
    name: 'Sales',
    description: 'Revenue generation & growth',
    color: 'from-green-500 to-emerald-600'
  },
  product: {
    id: 'product',
    name: 'Product',
    description: 'Product strategy & delivery',
    color: 'from-orange-500 to-red-600'
  }
};

// 2. ROLES (By Department)
const ROLES = {
  // Engineering Roles
  eng_ic1: {
    id: 'eng_ic1',
    departmentId: 'engineering',
    title: 'Software Engineer I',
    level: 'IC1',
    seniority: 1,
    yearsExperience: '0-2 years',
    nextRoles: ['eng_ic2']
  },
  eng_ic2: {
    id: 'eng_ic2',
    departmentId: 'engineering',
    title: 'Software Engineer II',
    level: 'IC2',
    seniority: 2,
    yearsExperience: '2-4 years',
    nextRoles: ['eng_ic3', 'eng_m1']
  },
  eng_ic3: {
    id: 'eng_ic3',
    departmentId: 'engineering',
    title: 'Senior Software Engineer',
    level: 'IC3',
    seniority: 3,
    yearsExperience: '4-7 years',
    nextRoles: ['eng_ic4', 'eng_m1']
  },
  eng_ic4: {
    id: 'eng_ic4',
    departmentId: 'engineering',
    title: 'Staff Engineer',
    level: 'IC4',
    seniority: 4,
    yearsExperience: '7-10 years',
    nextRoles: ['eng_ic5']
  },
  eng_ic5: {
    id: 'eng_ic5',
    departmentId: 'engineering',
    title: 'Principal Engineer',
    level: 'IC5',
    seniority: 5,
    yearsExperience: '10+ years',
    nextRoles: []
  },
  eng_m1: {
    id: 'eng_m1',
    departmentId: 'engineering',
    title: 'Engineering Manager',
    level: 'M1',
    seniority: 3,
    yearsExperience: '5-8 years',
    nextRoles: ['eng_m2']
  },
  eng_m2: {
    id: 'eng_m2',
    departmentId: 'engineering',
    title: 'Senior Engineering Manager',
    level: 'M2',
    seniority: 4,
    yearsExperience: '8-12 years',
    nextRoles: ['eng_m3']
  },
  eng_m3: {
    id: 'eng_m3',
    departmentId: 'engineering',
    title: 'Director of Engineering',
    level: 'M3',
    seniority: 5,
    yearsExperience: '12+ years',
    nextRoles: []
  },

  // HR Roles
  hr_ic1: {
    id: 'hr_ic1',
    departmentId: 'hr',
    title: 'HR Coordinator',
    level: 'IC1',
    seniority: 1,
    yearsExperience: '0-2 years',
    nextRoles: ['hr_ic2']
  },
  hr_ic2: {
    id: 'hr_ic2',
    departmentId: 'hr',
    title: 'HR Generalist',
    level: 'IC2',
    seniority: 2,
    yearsExperience: '2-4 years',
    nextRoles: ['hr_ic3', 'hr_specialist']
  },
  hr_ic3: {
    id: 'hr_ic3',
    departmentId: 'hr',
    title: 'Senior HR Business Partner',
    level: 'IC3',
    seniority: 3,
    yearsExperience: '4-7 years',
    nextRoles: ['hr_m1']
  },
  hr_specialist: {
    id: 'hr_specialist',
    departmentId: 'hr',
    title: 'Learning & Development Specialist',
    level: 'IC2',
    seniority: 2,
    yearsExperience: '2-5 years',
    nextRoles: ['hr_lead_specialist', 'hr_m1']
  },
  hr_lead_specialist: {
    id: 'hr_lead_specialist',
    departmentId: 'hr',
    title: 'Lead L&D Specialist',
    level: 'IC3',
    seniority: 3,
    yearsExperience: '5-8 years',
    nextRoles: ['hr_m1']
  },
  hr_m1: {
    id: 'hr_m1',
    departmentId: 'hr',
    title: 'HR Manager',
    level: 'M1',
    seniority: 3,
    yearsExperience: '6-9 years',
    nextRoles: ['hr_m2']
  },
  hr_m2: {
    id: 'hr_m2',
    departmentId: 'hr',
    title: 'Senior HR Manager',
    level: 'M2',
    seniority: 4,
    yearsExperience: '9-12 years',
    nextRoles: ['hr_m3']
  },
  hr_m3: {
    id: 'hr_m3',
    departmentId: 'hr',
    title: 'Director of HR',
    level: 'M3',
    seniority: 5,
    yearsExperience: '12+ years',
    nextRoles: []
  },

  // Sales Roles
  sales_ic1: {
    id: 'sales_ic1',
    departmentId: 'sales',
    title: 'Sales Development Rep',
    level: 'IC1',
    seniority: 1,
    yearsExperience: '0-1 years',
    nextRoles: ['sales_ic2']
  },
  sales_ic2: {
    id: 'sales_ic2',
    departmentId: 'sales',
    title: 'Account Executive',
    level: 'IC2',
    seniority: 2,
    yearsExperience: '1-3 years',
    nextRoles: ['sales_ic3', 'sales_m1']
  },
  sales_ic3: {
    id: 'sales_ic3',
    departmentId: 'sales',
    title: 'Senior Account Executive',
    level: 'IC3',
    seniority: 3,
    yearsExperience: '3-6 years',
    nextRoles: ['sales_ic4', 'sales_m1']
  },
  sales_ic4: {
    id: 'sales_ic4',
    departmentId: 'sales',
    title: 'Enterprise Account Executive',
    level: 'IC4',
    seniority: 4,
    yearsExperience: '6+ years',
    nextRoles: []
  },
  sales_m1: {
    id: 'sales_m1',
    departmentId: 'sales',
    title: 'Sales Manager',
    level: 'M1',
    seniority: 3,
    yearsExperience: '4-7 years',
    nextRoles: ['sales_m2']
  },
  sales_m2: {
    id: 'sales_m2',
    departmentId: 'sales',
    title: 'Senior Sales Manager',
    level: 'M2',
    seniority: 4,
    yearsExperience: '7-10 years',
    nextRoles: ['sales_m3']
  },
  sales_m3: {
    id: 'sales_m3',
    departmentId: 'sales',
    title: 'Director of Sales',
    level: 'M3',
    seniority: 5,
    yearsExperience: '10+ years',
    nextRoles: []
  },

  // Product Roles
  product_ic1: {
    id: 'product_ic1',
    departmentId: 'product',
    title: 'Associate Product Manager',
    level: 'IC1',
    seniority: 1,
    yearsExperience: '0-2 years',
    nextRoles: ['product_ic2']
  },
  product_ic2: {
    id: 'product_ic2',
    departmentId: 'product',
    title: 'Product Manager',
    level: 'IC2',
    seniority: 2,
    yearsExperience: '2-5 years',
    nextRoles: ['product_ic3', 'product_m1']
  },
  product_ic3: {
    id: 'product_ic3',
    departmentId: 'product',
    title: 'Senior Product Manager',
    level: 'IC3',
    seniority: 3,
    yearsExperience: '5-8 years',
    nextRoles: ['product_ic4', 'product_m1']
  },
  product_ic4: {
    id: 'product_ic4',
    departmentId: 'product',
    title: 'Principal Product Manager',
    level: 'IC4',
    seniority: 4,
    yearsExperience: '8+ years',
    nextRoles: []
  },
  product_m1: {
    id: 'product_m1',
    departmentId: 'product',
    title: 'Group Product Manager',
    level: 'M1',
    seniority: 3,
    yearsExperience: '6-9 years',
    nextRoles: ['product_m2']
  },
  product_m2: {
    id: 'product_m2',
    departmentId: 'product',
    title: 'Director of Product',
    level: 'M2',
    seniority: 4,
    yearsExperience: '9+ years',
    nextRoles: []
  }
};

// 3. COMPETENCY AREAS
const COMPETENCIES = {
  technical: { id: 'technical', name: 'Technical Excellence', color: 'blue' },
  leadership: { id: 'leadership', name: 'Leadership & Influence', color: 'purple' },
  execution: { id: 'execution', name: 'Execution & Delivery', color: 'green' },
  strategy: { id: 'strategy', name: 'Strategic Thinking', color: 'orange' },
  people: { id: 'people', name: 'People Development', color: 'pink' },
  business: { id: 'business', name: 'Business Acumen', color: 'red' }
};

// 4. SKILLS (Atomic capabilities)
const SKILLS = {
  // Technical Skills
  coding: { id: 'coding', name: 'Code Implementation', competencyId: 'technical' },
  architecture: { id: 'architecture', name: 'System Architecture', competencyId: 'technical' },
  debugging: { id: 'debugging', name: 'Debugging & Testing', competencyId: 'technical' },
  technical_writing: { id: 'technical_writing', name: 'Technical Documentation', competencyId: 'technical' },
  
  // Leadership Skills
  influence: { id: 'influence', name: 'Influence & Persuasion', competencyId: 'leadership' },
  decision_making: { id: 'decision_making', name: 'Decision Making', competencyId: 'leadership' },
  conflict_resolution: { id: 'conflict_resolution', name: 'Conflict Resolution', competencyId: 'leadership' },
  
  // Execution Skills
  project_management: { id: 'project_management', name: 'Project Management', competencyId: 'execution' },
  prioritization: { id: 'prioritization', name: 'Prioritization', competencyId: 'execution' },
  stakeholder_mgmt: { id: 'stakeholder_mgmt', name: 'Stakeholder Management', competencyId: 'execution' },
  
  // Strategy Skills
  strategic_thinking: { id: 'strategic_thinking', name: 'Strategic Thinking', competencyId: 'strategy' },
  market_analysis: { id: 'market_analysis', name: 'Market Analysis', competencyId: 'strategy' },
  
  // People Skills
  coaching: { id: 'coaching', name: 'Coaching & Mentoring', competencyId: 'people' },
  hiring: { id: 'hiring', name: 'Hiring & Onboarding', competencyId: 'people' },
  performance_mgmt: { id: 'performance_mgmt', name: 'Performance Management', competencyId: 'people' },
  
  // Business Skills
  financial_acumen: { id: 'financial_acumen', name: 'Financial Acumen', competencyId: 'business' },
  customer_focus: { id: 'customer_focus', name: 'Customer Focus', competencyId: 'business' },
  data_analysis: { id: 'data_analysis', name: 'Data Analysis', competencyId: 'business' },

  // HR Specific
  employee_relations: { id: 'employee_relations', name: 'Employee Relations', competencyId: 'people' },
  talent_strategy: { id: 'talent_strategy', name: 'Talent Strategy', competencyId: 'strategy' },
  change_management: { id: 'change_management', name: 'Change Management', competencyId: 'leadership' },
  learning_design: { id: 'learning_design', name: 'Learning Design', competencyId: 'technical' },
  hr_analytics: { id: 'hr_analytics', name: 'HR Analytics', competencyId: 'business' },

  // Sales Specific
  prospecting: { id: 'prospecting', name: 'Lead Prospecting', competencyId: 'execution' },
  negotiation: { id: 'negotiation', name: 'Negotiation', competencyId: 'leadership' },
  relationship_building: { id: 'relationship_building', name: 'Relationship Building', competencyId: 'people' },
  deal_strategy: { id: 'deal_strategy', name: 'Deal Strategy', competencyId: 'strategy' },
  sales_forecasting: { id: 'sales_forecasting', name: 'Sales Forecasting', competencyId: 'business' },

  // Product Specific
  product_strategy: { id: 'product_strategy', name: 'Product Strategy', competencyId: 'strategy' },
  user_research: { id: 'user_research', name: 'User Research', competencyId: 'technical' },
  roadmap_planning: { id: 'roadmap_planning', name: 'Roadmap Planning', competencyId: 'execution' },
  metrics_analysis: { id: 'metrics_analysis', name: 'Metrics Analysis', competencyId: 'business' },
  technical_fluency: { id: 'technical_fluency', name: 'Technical Fluency', competencyId: 'technical' }
};

// 5. ROLE-SKILL BENCHMARKS (Target proficiency by role)
const ROLE_SKILL_BENCHMARKS = {
  // Engineering IC1
  eng_ic1: [
    { skillId: 'coding', targetLevel: 3.0, weight: 'critical', required: true },
    { skillId: 'debugging', targetLevel: 2.8, weight: 'critical', required: true },
    { skillId: 'technical_writing', targetLevel: 2.5, weight: 'important', required: false },
    { skillId: 'stakeholder_mgmt', targetLevel: 2.3, weight: 'helpful', required: false }
  ],
  // Engineering IC2
  eng_ic2: [
    { skillId: 'coding', targetLevel: 3.8, weight: 'critical', required: true },
    { skillId: 'debugging', targetLevel: 3.6, weight: 'critical', required: true },
    { skillId: 'architecture', targetLevel: 3.0, weight: 'important', required: true },
    { skillId: 'technical_writing', targetLevel: 3.2, weight: 'important', required: false },
    { skillId: 'coaching', targetLevel: 2.5, weight: 'helpful', required: false }
  ],
  // Engineering IC3
  eng_ic3: [
    { skillId: 'coding', targetLevel: 4.2, weight: 'critical', required: true },
    { skillId: 'architecture', targetLevel: 4.0, weight: 'critical', required: true },
    { skillId: 'debugging', targetLevel: 4.3, weight: 'critical', required: true },
    { skillId: 'coaching', targetLevel: 3.8, weight: 'important', required: true },
    { skillId: 'influence', targetLevel: 3.5, weight: 'important', required: false },
    { skillId: 'technical_writing', targetLevel: 3.8, weight: 'important', required: false }
  ],
  // Engineering M1
  eng_m1: [
    { skillId: 'coaching', targetLevel: 4.0, weight: 'critical', required: true },
    { skillId: 'hiring', targetLevel: 3.8, weight: 'critical', required: true },
    { skillId: 'performance_mgmt', targetLevel: 3.9, weight: 'critical', required: true },
    { skillId: 'project_management', targetLevel: 4.0, weight: 'important', required: true },
    { skillId: 'stakeholder_mgmt', targetLevel: 3.7, weight: 'important', required: true },
    { skillId: 'architecture', targetLevel: 3.5, weight: 'helpful', required: false }
  ],

  // HR IC1
  hr_ic1: [
    { skillId: 'employee_relations', targetLevel: 3.0, weight: 'critical', required: true },
    { skillId: 'data_analysis', targetLevel: 2.5, weight: 'important', required: true },
    { skillId: 'stakeholder_mgmt', targetLevel: 2.8, weight: 'important', required: false },
    { skillId: 'project_management', targetLevel: 2.5, weight: 'helpful', required: false }
  ],
  // HR IC2
  hr_ic2: [
    { skillId: 'employee_relations', targetLevel: 3.8, weight: 'critical', required: true },
    { skillId: 'coaching', targetLevel: 3.5, weight: 'important', required: true },
    { skillId: 'data_analysis', targetLevel: 3.3, weight: 'important', required: true },
    { skillId: 'stakeholder_mgmt', targetLevel: 3.6, weight: 'important', required: true },
    { skillId: 'change_management', targetLevel: 3.0, weight: 'helpful', required: false }
  ],
  // HR IC3
  hr_ic3: [
    { skillId: 'talent_strategy', targetLevel: 4.0, weight: 'critical', required: true },
    { skillId: 'coaching', targetLevel: 4.2, weight: 'critical', required: true },
    { skillId: 'influence', targetLevel: 4.0, weight: 'critical', required: true },
    { skillId: 'hr_analytics', targetLevel: 3.8, weight: 'important', required: true },
    { skillId: 'change_management', targetLevel: 3.8, weight: 'important', required: false }
  ],
  // HR Specialist
  hr_specialist: [
    { skillId: 'learning_design', targetLevel: 3.8, weight: 'critical', required: true },
    { skillId: 'coaching', targetLevel: 3.5, weight: 'important', required: true },
    { skillId: 'stakeholder_mgmt', targetLevel: 3.3, weight: 'important', required: true },
    { skillId: 'data_analysis', targetLevel: 3.0, weight: 'helpful', required: false }
  ],
  // HR M1
  hr_m1: [
    { skillId: 'coaching', targetLevel: 4.3, weight: 'critical', required: true },
    { skillId: 'hiring', targetLevel: 4.0, weight: 'critical', required: true },
    { skillId: 'talent_strategy', targetLevel: 4.2, weight: 'critical', required: true },
    { skillId: 'performance_mgmt', targetLevel: 4.0, weight: 'important', required: true },
    { skillId: 'hr_analytics', targetLevel: 3.8, weight: 'important', required: true },
    { skillId: 'influence', targetLevel: 4.0, weight: 'important', required: false }
  ],

  // Sales IC1
  sales_ic1: [
    { skillId: 'prospecting', targetLevel: 3.5, weight: 'critical', required: true },
    { skillId: 'relationship_building', targetLevel: 3.3, weight: 'critical', required: true },
    { skillId: 'customer_focus', targetLevel: 3.8, weight: 'important', required: true },
    { skillId: 'data_analysis', targetLevel: 2.8, weight: 'helpful', required: false }
  ],
  // Sales IC2
  sales_ic2: [
    { skillId: 'prospecting', targetLevel: 4.0, weight: 'critical', required: true },
    { skillId: 'negotiation', targetLevel: 3.8, weight: 'critical', required: true },
    { skillId: 'relationship_building', targetLevel: 4.0, weight: 'critical', required: true },
    { skillId: 'deal_strategy', targetLevel: 3.5, weight: 'important', required: true },
    { skillId: 'customer_focus', targetLevel: 4.2, weight: 'important', required: false }
  ],
  // Sales IC3
  sales_ic3: [
    { skillId: 'negotiation', targetLevel: 4.5, weight: 'critical', required: true },
    { skillId: 'relationship_building', targetLevel: 4.5, weight: 'critical', required: true },
    { skillId: 'deal_strategy', targetLevel: 4.3, weight: 'critical', required: true },
    { skillId: 'sales_forecasting', targetLevel: 4.0, weight: 'important', required: true },
    { skillId: 'coaching', targetLevel: 3.5, weight: 'helpful', required: false }
  ],
  // Sales M1
  sales_m1: [
    { skillId: 'coaching', targetLevel: 4.2, weight: 'critical', required: true },
    { skillId: 'hiring', targetLevel: 3.8, weight: 'critical', required: true },
    { skillId: 'sales_forecasting', targetLevel: 4.3, weight: 'critical', required: true },
    { skillId: 'performance_mgmt', targetLevel: 4.0, weight: 'important', required: true },
    { skillId: 'negotiation', targetLevel: 4.0, weight: 'important', required: true },
    { skillId: 'influence', targetLevel: 3.8, weight: 'helpful', required: false }
  ],

  // Product IC1
  product_ic1: [
    { skillId: 'user_research', targetLevel: 3.0, weight: 'critical', required: true },
    { skillId: 'roadmap_planning', targetLevel: 2.8, weight: 'important', required: true },
    { skillId: 'stakeholder_mgmt', targetLevel: 3.0, weight: 'important', required: true },
    { skillId: 'data_analysis', targetLevel: 2.8, weight: 'helpful', required: false }
  ],
  // Product IC2
  product_ic2: [
    { skillId: 'product_strategy', targetLevel: 3.8, weight: 'critical', required: true },
    { skillId: 'user_research', targetLevel: 3.5, weight: 'critical', required: true },
    { skillId: 'roadmap_planning', targetLevel: 4.0, weight: 'critical', required: true },
    { skillId: 'stakeholder_mgmt', targetLevel: 3.8, weight: 'important', required: true },
    { skillId: 'technical_fluency', targetLevel: 3.5, weight: 'important', required: false }
  ],
  // Product IC3
  product_ic3: [
    { skillId: 'product_strategy', targetLevel: 4.5, weight: 'critical', required: true },
    { skillId: 'strategic_thinking', targetLevel: 4.2, weight: 'critical', required: true },
    { skillId: 'roadmap_planning', targetLevel: 4.5, weight: 'critical', required: true },
    { skillId: 'influence', targetLevel: 4.3, weight: 'important', required: true },
    { skillId: 'metrics_analysis', targetLevel: 4.2, weight: 'important', required: false }
  ],
  // Product M1
  product_m1: [
    { skillId: 'coaching', targetLevel: 4.0, weight: 'critical', required: true },
    { skillId: 'product_strategy', targetLevel: 4.3, weight: 'critical', required: true },
    { skillId: 'hiring', targetLevel: 3.8, weight: 'critical', required: true },
    { skillId: 'strategic_thinking', targetLevel: 4.2, weight: 'important', required: true },
    { skillId: 'stakeholder_mgmt', targetLevel: 4.3, weight: 'important', required: true }
  ],

  // Engineering IC4 (Staff Engineer)
  eng_ic4: [
    { skillId: 'architecture', targetLevel: 4.7, weight: 'critical', required: true },
    { skillId: 'coding', targetLevel: 4.5, weight: 'critical', required: true },
    { skillId: 'strategic_thinking', targetLevel: 4.3, weight: 'critical', required: true },
    { skillId: 'influence', targetLevel: 4.5, weight: 'important', required: true },
    { skillId: 'coaching', targetLevel: 4.2, weight: 'important', required: false },
    { skillId: 'technical_writing', targetLevel: 4.5, weight: 'important', required: false }
  ],

  // Engineering IC5 (Principal Engineer)
  eng_ic5: [
    { skillId: 'architecture', targetLevel: 4.9, weight: 'critical', required: true },
    { skillId: 'strategic_thinking', targetLevel: 4.8, weight: 'critical', required: true },
    { skillId: 'influence', targetLevel: 4.8, weight: 'critical', required: true },
    { skillId: 'coaching', targetLevel: 4.7, weight: 'important', required: true },
    { skillId: 'decision_making', targetLevel: 4.8, weight: 'important', required: true },
    { skillId: 'technical_writing', targetLevel: 4.7, weight: 'helpful', required: false }
  ],

  // Engineering M2 (Senior Engineering Manager)
  eng_m2: [
    { skillId: 'coaching', targetLevel: 4.5, weight: 'critical', required: true },
    { skillId: 'hiring', targetLevel: 4.3, weight: 'critical', required: true },
    { skillId: 'strategic_thinking', targetLevel: 4.4, weight: 'critical', required: true },
    { skillId: 'performance_mgmt', targetLevel: 4.5, weight: 'critical', required: true },
    { skillId: 'influence', targetLevel: 4.4, weight: 'important', required: true },
    { skillId: 'stakeholder_mgmt', targetLevel: 4.5, weight: 'important', required: false }
  ],

  // Engineering M3 (Director of Engineering)
  eng_m3: [
    { skillId: 'strategic_thinking', targetLevel: 4.8, weight: 'critical', required: true },
    { skillId: 'coaching', targetLevel: 4.7, weight: 'critical', required: true },
    { skillId: 'hiring', targetLevel: 4.6, weight: 'critical', required: true },
    { skillId: 'influence', targetLevel: 4.8, weight: 'critical', required: true },
    { skillId: 'financial_acumen', targetLevel: 4.3, weight: 'important', required: true },
    { skillId: 'performance_mgmt', targetLevel: 4.7, weight: 'important', required: false }
  ],

  // HR Lead Specialist
  hr_lead_specialist: [
    { skillId: 'learning_design', targetLevel: 4.3, weight: 'critical', required: true },
    { skillId: 'coaching', targetLevel: 4.0, weight: 'critical', required: true },
    { skillId: 'influence', targetLevel: 4.0, weight: 'important', required: true },
    { skillId: 'strategic_thinking', targetLevel: 3.8, weight: 'important', required: true },
    { skillId: 'stakeholder_mgmt', targetLevel: 4.0, weight: 'important', required: false }
  ],

  // HR M2 (Senior HR Manager)
  hr_m2: [
    { skillId: 'talent_strategy', targetLevel: 4.5, weight: 'critical', required: true },
    { skillId: 'coaching', targetLevel: 4.5, weight: 'critical', required: true },
    { skillId: 'hiring', targetLevel: 4.3, weight: 'critical', required: true },
    { skillId: 'influence', targetLevel: 4.5, weight: 'important', required: true },
    { skillId: 'change_management', targetLevel: 4.3, weight: 'important', required: true },
    { skillId: 'hr_analytics', targetLevel: 4.2, weight: 'helpful', required: false }
  ],

  // HR M3 (Director of HR)
  hr_m3: [
    { skillId: 'strategic_thinking', targetLevel: 4.8, weight: 'critical', required: true },
    { skillId: 'talent_strategy', targetLevel: 4.8, weight: 'critical', required: true },
    { skillId: 'influence', targetLevel: 4.8, weight: 'critical', required: true },
    { skillId: 'coaching', targetLevel: 4.7, weight: 'important', required: true },
    { skillId: 'change_management', targetLevel: 4.6, weight: 'important', required: true },
    { skillId: 'financial_acumen', targetLevel: 4.2, weight: 'helpful', required: false }
  ],

  // Sales IC4 (Enterprise Account Executive)
  sales_ic4: [
    { skillId: 'negotiation', targetLevel: 4.7, weight: 'critical', required: true },
    { skillId: 'relationship_building', targetLevel: 4.8, weight: 'critical', required: true },
    { skillId: 'deal_strategy', targetLevel: 4.7, weight: 'critical', required: true },
    { skillId: 'strategic_thinking', targetLevel: 4.3, weight: 'important', required: true },
    { skillId: 'sales_forecasting', targetLevel: 4.5, weight: 'important', required: false }
  ],

  // Sales M2 (Senior Sales Manager)
  sales_m2: [
    { skillId: 'coaching', targetLevel: 4.5, weight: 'critical', required: true },
    { skillId: 'hiring', targetLevel: 4.3, weight: 'critical', required: true },
    { skillId: 'strategic_thinking', targetLevel: 4.4, weight: 'critical', required: true },
    { skillId: 'sales_forecasting', targetLevel: 4.6, weight: 'critical', required: true },
    { skillId: 'influence', targetLevel: 4.3, weight: 'important', required: true },
    { skillId: 'performance_mgmt', targetLevel: 4.4, weight: 'important', required: false }
  ],

  // Sales M3 (Director of Sales)
  sales_m3: [
    { skillId: 'strategic_thinking', targetLevel: 4.8, weight: 'critical', required: true },
    { skillId: 'coaching', targetLevel: 4.7, weight: 'critical', required: true },
    { skillId: 'sales_forecasting', targetLevel: 4.8, weight: 'critical', required: true },
    { skillId: 'influence', targetLevel: 4.7, weight: 'critical', required: true },
    { skillId: 'financial_acumen', targetLevel: 4.5, weight: 'important', required: true },
    { skillId: 'hiring', targetLevel: 4.6, weight: 'important', required: false }
  ],

  // Product IC4 (Principal Product Manager)
  product_ic4: [
    { skillId: 'product_strategy', targetLevel: 4.8, weight: 'critical', required: true },
    { skillId: 'strategic_thinking', targetLevel: 4.7, weight: 'critical', required: true },
    { skillId: 'influence', targetLevel: 4.7, weight: 'critical', required: true },
    { skillId: 'roadmap_planning', targetLevel: 4.8, weight: 'important', required: true },
    { skillId: 'metrics_analysis', targetLevel: 4.5, weight: 'important', required: false }
  ],

  // Product M2 (Director of Product)
  product_m2: [
    { skillId: 'strategic_thinking', targetLevel: 4.8, weight: 'critical', required: true },
    { skillId: 'product_strategy', targetLevel: 4.8, weight: 'critical', required: true },
    { skillId: 'coaching', targetLevel: 4.5, weight: 'critical', required: true },
    { skillId: 'hiring', targetLevel: 4.3, weight: 'critical', required: true },
    { skillId: 'influence', targetLevel: 4.7, weight: 'important', required: true },
    { skillId: 'stakeholder_mgmt', targetLevel: 4.7, weight: 'important', required: false }
  ]
};

// 6. LEARNING CURRICULUM (Training courses mapped to skills)
const LEARNING_CURRICULUM = {
  coding: [
    { title: 'Advanced Programming Fundamentals', provider: 'Pluralsight', duration: '8h', type: 'Online Course', level: 'beginner' },
    { title: 'Clean Code Principles', provider: 'Udemy', duration: '6h', type: 'Online Course', level: 'intermediate' },
    { title: 'Design Patterns Masterclass', provider: 'Frontend Masters', duration: '12h', type: 'Online Course', level: 'advanced' }
  ],
  architecture: [
    { title: 'System Design Fundamentals', provider: 'Educative', duration: '10h', type: 'Online Course', level: 'beginner' },
    { title: 'Microservices Architecture', provider: 'Coursera', duration: '15h', type: 'Online Course', level: 'intermediate' },
    { title: 'Distributed Systems Design', provider: 'MIT OpenCourseWare', duration: '40h', type: 'University Course', level: 'advanced' }
  ],
  debugging: [
    { title: 'Debugging Techniques', provider: 'LinkedIn Learning', duration: '4h', type: 'Online Course', level: 'beginner' },
    { title: 'Advanced Testing Strategies', provider: 'Pluralsight', duration: '8h', type: 'Online Course', level: 'intermediate' }
  ],
  coaching: [
    { title: 'Coaching Fundamentals', provider: 'LinkedIn Learning', duration: '3h', type: 'Online Course', level: 'beginner' },
    { title: 'Effective Mentoring', provider: 'Coursera', duration: '6h', type: 'Online Course', level: 'intermediate' },
    { title: 'Executive Coaching Certification', provider: 'ICF', duration: '60h', type: 'Certification', level: 'advanced' }
  ],
  influence: [
    { title: 'Influence Without Authority', provider: 'LinkedIn Learning', duration: '4h', type: 'Online Course', level: 'beginner' },
    { title: 'Strategic Influence', provider: 'Harvard ManageMentor', duration: '8h', type: 'Online Course', level: 'intermediate' },
    { title: 'Organizational Influence', provider: 'Wharton Executive Education', duration: '20h', type: 'Executive Program', level: 'advanced' }
  ],
  strategic_thinking: [
    { title: 'Strategic Thinking Basics', provider: 'LinkedIn Learning', duration: '3h', type: 'Online Course', level: 'beginner' },
    { title: 'Business Strategy', provider: 'Coursera', duration: '12h', type: 'Online Course', level: 'intermediate' },
    { title: 'Strategic Leadership', provider: 'Harvard Business School Online', duration: '30h', type: 'Executive Program', level: 'advanced' }
  ],
  hiring: [
    { title: 'Effective Interviewing', provider: 'LinkedIn Learning', duration: '2h', type: 'Online Course', level: 'beginner' },
    { title: 'Structured Hiring', provider: 'SHRM', duration: '6h', type: 'Online Course', level: 'intermediate' },
    { title: 'Building High-Performance Teams', provider: 'Reforge', duration: '12h', type: 'Workshop', level: 'advanced' }
  ],
  performance_mgmt: [
    { title: 'Performance Management Basics', provider: 'LinkedIn Learning', duration: '3h', type: 'Online Course', level: 'beginner' },
    { title: 'Giving Effective Feedback', provider: 'Coursera', duration: '5h', type: 'Online Course', level: 'intermediate' },
    { title: 'Performance Coaching Mastery', provider: 'SHRM', duration: '10h', type: 'Certification', level: 'advanced' }
  ],
  talent_strategy: [
    { title: 'Talent Management Fundamentals', provider: 'SHRM', duration: '6h', type: 'Online Course', level: 'beginner' },
    { title: 'Workforce Planning', provider: 'Coursera', duration: '10h', type: 'Online Course', level: 'intermediate' },
    { title: 'Strategic Talent Leadership', provider: 'Cornell ILR', duration: '30h', type: 'Executive Program', level: 'advanced' }
  ],
  learning_design: [
    { title: 'Instructional Design Basics', provider: 'Coursera', duration: '8h', type: 'Online Course', level: 'beginner' },
    { title: 'Adult Learning Principles', provider: 'ATD', duration: '12h', type: 'Workshop', level: 'intermediate' },
    { title: 'Learning Experience Design', provider: 'IDOL Academy', duration: '40h', type: 'Certification', level: 'advanced' }
  ],
  hr_analytics: [
    { title: 'HR Metrics Fundamentals', provider: 'LinkedIn Learning', duration: '4h', type: 'Online Course', level: 'beginner' },
    { title: 'People Analytics', provider: 'Wharton', duration: '15h', type: 'Online Course', level: 'intermediate' },
    { title: 'Strategic Workforce Analytics', provider: 'MIT Sloan', duration: '25h', type: 'Executive Program', level: 'advanced' }
  ],
  negotiation: [
    { title: 'Negotiation Fundamentals', provider: 'LinkedIn Learning', duration: '3h', type: 'Online Course', level: 'beginner' },
    { title: 'Advanced Negotiation', provider: 'Coursera', duration: '10h', type: 'Online Course', level: 'intermediate' },
    { title: 'Strategic Negotiation', provider: 'Harvard Law School', duration: '20h', type: 'Executive Program', level: 'advanced' }
  ],
  prospecting: [
    { title: 'Sales Prospecting Basics', provider: 'HubSpot Academy', duration: '4h', type: 'Online Course', level: 'beginner' },
    { title: 'Modern Prospecting', provider: 'LinkedIn Learning', duration: '6h', type: 'Online Course', level: 'intermediate' },
    { title: 'Enterprise Prospecting', provider: 'Salesforce Trailhead', duration: '10h', type: 'Certification', level: 'advanced' }
  ],
  relationship_building: [
    { title: 'Building Client Relationships', provider: 'LinkedIn Learning', duration: '3h', type: 'Online Course', level: 'beginner' },
    { title: 'Strategic Account Management', provider: 'Coursera', duration: '8h', type: 'Online Course', level: 'intermediate' },
    { title: 'Executive Relationship Building', provider: 'RAIN Group', duration: '15h', type: 'Workshop', level: 'advanced' }
  ],
  deal_strategy: [
    { title: 'Deal Management Basics', provider: 'HubSpot Academy', duration: '5h', type: 'Online Course', level: 'beginner' },
    { title: 'Complex Sales Strategies', provider: 'LinkedIn Learning', duration: '8h', type: 'Online Course', level: 'intermediate' },
    { title: 'Enterprise Deal Strategy', provider: 'Miller Heiman', duration: '20h', type: 'Workshop', level: 'advanced' }
  ],
  sales_forecasting: [
    { title: 'Sales Forecasting Fundamentals', provider: 'Salesforce Trailhead', duration: '4h', type: 'Online Course', level: 'beginner' },
    { title: 'Pipeline Management', provider: 'LinkedIn Learning', duration: '6h', type: 'Online Course', level: 'intermediate' },
    { title: 'Strategic Revenue Planning', provider: 'SaaStr', duration: '12h', type: 'Workshop', level: 'advanced' }
  ],
  product_strategy: [
    { title: 'Product Strategy Basics', provider: 'Product School', duration: '8h', type: 'Online Course', level: 'beginner' },
    { title: 'Strategic Product Management', provider: 'Reforge', duration: '15h', type: 'Online Course', level: 'intermediate' },
    { title: 'Product Leadership', provider: 'Stanford GSB', duration: '30h', type: 'Executive Program', level: 'advanced' }
  ],
  user_research: [
    { title: 'User Research Fundamentals', provider: 'Coursera', duration: '6h', type: 'Online Course', level: 'beginner' },
    { title: 'Advanced Research Methods', provider: 'Nielsen Norman Group', duration: '12h', type: 'Workshop', level: 'intermediate' },
    { title: 'Research Leadership', provider: 'IDEO U', duration: '20h', type: 'Certification', level: 'advanced' }
  ],
  roadmap_planning: [
    { title: 'Product Roadmapping', provider: 'Product School', duration: '5h', type: 'Online Course', level: 'beginner' },
    { title: 'Strategic Roadmapping', provider: 'Reforge', duration: '10h', type: 'Online Course', level: 'intermediate' },
    { title: 'Portfolio Planning', provider: 'Pragmatic Institute', duration: '15h', type: 'Certification', level: 'advanced' }
  ],
  // Add defaults for other skills
  technical_writing: [
    { title: 'Technical Writing Fundamentals', provider: 'Udemy', duration: '4h', type: 'Online Course', level: 'beginner' }
  ],
  stakeholder_mgmt: [
    { title: 'Stakeholder Management', provider: 'LinkedIn Learning', duration: '3h', type: 'Online Course', level: 'beginner' }
  ],
  project_management: [
    { title: 'Project Management Basics', provider: 'PMI', duration: '8h', type: 'Online Course', level: 'beginner' }
  ],
  data_analysis: [
    { title: 'Data Analysis Fundamentals', provider: 'Coursera', duration: '10h', type: 'Online Course', level: 'beginner' }
  ],
  employee_relations: [
    { title: 'Employee Relations', provider: 'SHRM', duration: '6h', type: 'Online Course', level: 'beginner' }
  ],
  change_management: [
    { title: 'Change Management', provider: 'Prosci', duration: '8h', type: 'Online Course', level: 'beginner' }
  ],
  customer_focus: [
    { title: 'Customer-Centric Thinking', provider: 'LinkedIn Learning', duration: '3h', type: 'Online Course', level: 'beginner' }
  ],
  metrics_analysis: [
    { title: 'Metrics & Analytics', provider: 'Reforge', duration: '8h', type: 'Online Course', level: 'intermediate' }
  ],
  technical_fluency: [
    { title: 'Technical Fluency for PMs', provider: 'Product School', duration: '6h', type: 'Online Course', level: 'beginner' }
  ]
};

// 7. SKILL ASSESSMENT QUESTIONS
const SKILL_QUESTIONS = {
  coding: [
    'Can you write production-ready code with minimal guidance?',
    'Do you consistently follow coding standards and best practices?',
    'Can you debug complex issues independently?'
  ],
  architecture: [
    'Can you design system architectures that scale?',
    'Do you evaluate trade-offs between different technical approaches?',
    'Can you document architectural decisions effectively?'
  ],
  coaching: [
    'Can you provide constructive feedback that drives improvement?',
    'Do you help others develop their skills effectively?',
    'Can you have difficult performance conversations?'
  ],
  influence: [
    'Can you influence decisions without formal authority?',
    'Do you build strong cross-functional relationships?',
    'Can you drive consensus among diverse stakeholders?'
  ],
  talent_strategy: [
    'Can you develop talent strategies aligned to business goals?',
    'Do you identify capability gaps and succession needs?',
    'Can you design workforce planning solutions?'
  ],
  learning_design: [
    'Can you design effective learning experiences?',
    'Do you apply adult learning principles?',
    'Can you measure learning impact?'
  ],
  negotiation: [
    'Can you negotiate complex deals effectively?',
    'Do you handle objections and resistance well?',
    'Can you find win-win solutions?'
  ],
  product_strategy: [
    'Can you define compelling product vision and strategy?',
    'Do you align product decisions with business goals?',
    'Can you prioritize ruthlessly based on impact?'
  ],
  // Simplified questions for other skills
  debugging: ['Rate your debugging capabilities', 'Rate your testing practices', 'Rate your quality standards'],
  technical_writing: ['Rate your documentation skills', 'Rate your technical communication', 'Rate your clarity'],
  decision_making: ['Rate your decision quality', 'Rate your decision speed', 'Rate your decision transparency'],
  project_management: ['Rate your project planning', 'Rate your execution', 'Rate your delivery track record'],
  stakeholder_mgmt: ['Rate stakeholder communication', 'Rate stakeholder alignment', 'Rate managing expectations'],
  strategic_thinking: ['Rate your strategic thinking', 'Rate your long-term planning', 'Rate your vision setting'],
  hiring: ['Rate your hiring quality', 'Rate your interviewing', 'Rate your onboarding'],
  performance_mgmt: ['Rate your performance coaching', 'Rate your feedback quality', 'Rate your development planning'],
  employee_relations: ['Rate your conflict resolution', 'Rate your employee advocacy', 'Rate your relationship building'],
  data_analysis: ['Rate your analytical skills', 'Rate your data interpretation', 'Rate your insights generation'],
  change_management: ['Rate your change leadership', 'Rate your change communication', 'Rate your adoption success'],
  hr_analytics: ['Rate your HR metrics', 'Rate your people analytics', 'Rate your data storytelling'],
  prospecting: ['Rate your lead generation', 'Rate your qualification', 'Rate your pipeline building'],
  relationship_building: ['Rate your rapport building', 'Rate your trust development', 'Rate your long-term relationships'],
  customer_focus: ['Rate your customer understanding', 'Rate your customer advocacy', 'Rate your customer satisfaction'],
  deal_strategy: ['Rate your deal planning', 'Rate your deal execution', 'Rate your win rate'],
  sales_forecasting: ['Rate your forecast accuracy', 'Rate your pipeline management', 'Rate your planning'],
  user_research: ['Rate your research skills', 'Rate your insight synthesis', 'Rate your validation methods'],
  roadmap_planning: ['Rate your roadmap clarity', 'Rate your prioritization', 'Rate your delivery'],
  metrics_analysis: ['Rate your metrics definition', 'Rate your analysis', 'Rate your action on insights'],
  technical_fluency: ['Rate your technical understanding', 'Rate your technical conversations', 'Rate your technical decisions'],
  financial_acumen: ['Rate your financial literacy', 'Rate your budget management', 'Rate your ROI thinking'],
  conflict_resolution: ['Rate your conflict handling', 'Rate your mediation', 'Rate your resolution outcomes'],
  prioritization: ['Rate your prioritization framework', 'Rate your execution', 'Rate your trade-off decisions'],
  market_analysis: ['Rate your market research', 'Rate your competitive analysis', 'Rate your opportunity identification']
};

export default function CareerSkillsNavigator() {
  const [step, setStep] = useState('home');
  const [name, setName] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [viewingNextRole, setViewingNextRole] = useState(null);
  const [responses, setResponses] = useState({});
  const [skillIndex, setSkillIndex] = useState(0);
  const [results, setResults] = useState(null);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [managerEmail, setManagerEmail] = useState('');
  const [notes, setNotes] = useState('');

  const startAssessment = (roleId) => {
    setViewingNextRole(roleId);
    setSkillIndex(0);
    setResponses({});
    setStep('assessment');
  };

  const getRoleBenchmarks = (roleId) => {
    return ROLE_SKILL_BENCHMARKS[roleId] || [];
  };

  const next = () => {
    const benchmarks = getRoleBenchmarks(viewingNextRole);
    if (skillIndex < benchmarks.length - 1) {
      setSkillIndex(skillIndex + 1);
    } else {
      calculateResults();
    }
  };

  const prev = () => {
    if (skillIndex > 0) {
      setSkillIndex(skillIndex - 1);
    }
  };

  const complete = () => {
    const benchmarks = getRoleBenchmarks(viewingNextRole);
    const benchmark = benchmarks[skillIndex];
    const skill = SKILLS[benchmark.skillId];
    const questions = SKILL_QUESTIONS[skill.id] || [];
    return questions.every(q => responses[`${skill.id}-${q}`] !== undefined);
  };

  const calculateResults = () => {
    const benchmarks = getRoleBenchmarks(viewingNextRole);
    
    const skillResults = benchmarks.map(benchmark => {
      const skill = SKILLS[benchmark.skillId];
      const userScore = responses[skill.id] || 0;
      const gap = benchmark.targetLevel - userScore;
      
      // Determine which courses to recommend based on gap
      const courses = LEARNING_CURRICULUM[skill.id] || [];
      let recommendedCourses = [];
      
      if (gap > 1.5) {
        // High gap - recommend beginner and intermediate
        recommendedCourses = courses.filter(c => c.level === 'beginner' || c.level === 'intermediate');
      } else if (gap > 0.5) {
        // Medium gap - recommend intermediate
        recommendedCourses = courses.filter(c => c.level === 'intermediate');
      } else if (gap > 0) {
        // Small gap - recommend advanced for excellence
        recommendedCourses = courses.filter(c => c.level === 'advanced');
      }
      
      return {
        ...skill,
        ...benchmark,
        userScore,
        gap,
        priority: gap > 1.5 ? 'high' : gap > 0.5 ? 'medium' : 'low',
        competency: COMPETENCIES[skill.competencyId],
        recommendedCourses
      };
    });

    const overall = skillResults.reduce((sum, s) => sum + s.userScore, 0) / skillResults.length;
    const target = skillResults.reduce((sum, s) => sum + s.targetLevel, 0) / skillResults.length;
    
    // Calculate readiness score (weighted by skill importance)
    const weightValues = { critical: 3, important: 2, helpful: 1 };
    const totalWeight = skillResults.reduce((sum, s) => sum + weightValues[s.weight], 0);
    const weightedScore = skillResults.reduce((sum, s) => {
      const progress = Math.min(1, s.userScore / s.targetLevel);
      return sum + (progress * weightValues[s.weight]);
    }, 0);
    const readinessPercent = Math.round((weightedScore / totalWeight) * 100);

    // Calculate total training hours
    const totalTrainingHours = skillResults.reduce((sum, s) => {
      return sum + s.recommendedCourses.reduce((courseSum, c) => {
        return courseSum + parseInt(c.duration);
      }, 0);
    }, 0);

    setResults({
      skills: skillResults.sort((a, b) => {
        const weightOrder = { critical: 3, important: 2, helpful: 1 };
        const weightDiff = weightOrder[b.weight] - weightOrder[a.weight];
        return weightDiff !== 0 ? weightDiff : b.gap - a.gap;
      }),
      overall,
      target,
      readinessPercent,
      totalTrainingHours
    });
    
    setStep('results');
  };

  const sendToManager = () => {
    // In a real app, this would send an email or create a notification
    alert(`Development plan sent to ${managerEmail}\n\nNotes: ${notes}\n\nThis would integrate with your email system in production.`);
    setShowManagerModal(false);
    setManagerEmail('');
    setNotes('');
  };

  const exportToPDF = () => {
    alert('Export to PDF functionality would be implemented here - generating comprehensive development plan document');
  };

  if (step === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-7xl mx-auto py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Layers className="w-12 h-12 text-blue-600" />
              <h1 className="text-5xl font-bold text-gray-900">Career Skills Navigator</h1>
            </div>
            <p className="text-xl text-gray-600 mb-2">Skills Intelligence & Development Framework</p>
            <p className="text-sm text-gray-500">Structured capability mapping • Role-based benchmarks • Career progression</p>
          </div>

          {/* Name Input */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <label className="block text-gray-700 font-semibold mb-3 text-lg">Your Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Department Selection */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">1. Select Your Department</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.values(DEPARTMENTS).map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDepartment(selectedDepartment === dept.id ? null : dept.id)}
                  disabled={!name}
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    selectedDepartment === dept.id
                      ? `border-blue-500 bg-gradient-to-br ${dept.color} bg-opacity-10 shadow-lg`
                      : name
                      ? 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                      : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Briefcase className="w-10 h-10 mb-4 text-blue-600 mx-auto" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{dept.name}</h3>
                  <p className="text-sm text-gray-600">{dept.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Role Selection */}
          {selectedDepartment && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                2. Select Your Current Role in {DEPARTMENTS[selectedDepartment].name}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(ROLES)
                  .filter(role => role.departmentId === selectedDepartment)
                  .map((role) => (
                    <button
                      key={role.id}
                      onClick={() => {
                        setCurrentRole(role);
                        setStep('career_map');
                      }}
                      className={`p-5 rounded-xl border-2 text-left transition-all ${
                        currentRole?.id === role.id
                          ? `border-blue-500 bg-gradient-to-br ${DEPARTMENTS[selectedDepartment].color} bg-opacity-10`
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-3 py-1 rounded text-xs font-bold ${
                          currentRole?.id === role.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {role.level}
                        </span>
                        <span className="text-xs text-gray-500">{role.yearsExperience}</span>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-1 text-sm">{role.title}</h4>
                      <p className="text-xs text-gray-600">
                        {getRoleBenchmarks(role.id).length} skills
                      </p>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'career_map') {
    const dept = DEPARTMENTS[selectedDepartment];
    const nextRoles = currentRole.nextRoles.map(id => ROLES[id]);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-6xl mx-auto py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Career Progression Map</h1>
            <p className="text-xl text-gray-600">{name} • {currentRole.title}</p>
          </div>

          {/* Current Role Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-8 h-8 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Your Current Role</h2>
            </div>
            
            <div className={`p-6 rounded-xl bg-gradient-to-br ${dept.color} bg-opacity-10 border-2 border-blue-200 mb-6`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-bold inline-block mb-2">
                    {currentRole.level}
                  </span>
                  <h3 className="text-2xl font-bold text-gray-900">{currentRole.title}</h3>
                  <p className="text-gray-600">{dept.name} • {currentRole.yearsExperience}</p>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-bold text-gray-900 mb-3">Required Skills ({getRoleBenchmarks(currentRole.id).length})</h4>
                <div className="grid md:grid-cols-2 gap-2">
                  {getRoleBenchmarks(currentRole.id).map((benchmark) => {
                    const skill = SKILLS[benchmark.skillId];
                    return (
                      <div key={skill.id} className="flex items-center justify-between p-2 bg-white rounded text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            benchmark.weight === 'critical' ? 'bg-red-500' :
                            benchmark.weight === 'important' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`} />
                          <span className="font-medium text-gray-900">{skill.name}</span>
                        </div>
                        <span className="text-gray-500">{benchmark.targetLevel.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Next Roles */}
          {nextRoles.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Map className="w-8 h-8 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900">Your Next Role Options</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {nextRoles.map((role) => (
                  <div key={role.id} className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="px-3 py-1 rounded bg-purple-100 text-purple-700 text-sm font-bold inline-block mb-2">
                          {role.level}
                        </span>
                        <h3 className="text-xl font-bold text-gray-900">{role.title}</h3>
                        <p className="text-gray-600 text-sm">{role.yearsExperience}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">
                        {getRoleBenchmarks(role.id).length} skills required
                      </p>
                    </div>

                    <button
                      onClick={() => startAssessment(role.id)}
                      className={`w-full px-4 py-3 rounded-lg font-bold text-white shadow-md bg-gradient-to-r ${dept.color} hover:shadow-lg transition-all flex items-center justify-center gap-2`}
                    >
                      Assess for This Role
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {nextRoles.length === 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">You're at the top!</h3>
              <p className="text-gray-600">You've reached the highest level in this career track.</p>
            </div>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={() => setStep('home')}
              className="px-6 py-3 rounded-lg bg-white text-gray-700 font-semibold hover:bg-gray-100 shadow-md"
            >
              ← Back to Department Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'assessment') {
    const dept = DEPARTMENTS[selectedDepartment];
    const targetRole = ROLES[viewingNextRole];
    const benchmarks = getRoleBenchmarks(viewingNextRole);
    const benchmark = benchmarks[skillIndex];
    const skill = SKILLS[benchmark.skillId];
    const questions = SKILL_QUESTIONS[skill.id] || [];
    const competency = COMPETENCIES[skill.competencyId];

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-3xl mx-auto py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Progress Header */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-semibold text-gray-500">
                  SKILL {skillIndex + 1} OF {benchmarks.length}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${
                    benchmark.weight === 'critical' ? 'bg-red-500' :
                    benchmark.weight === 'important' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />
                  <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium uppercase">
                    {benchmark.weight}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold bg-${competency.color}-100 text-${competency.color}-700`}>
                    {competency.name}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                <div
                  className={`h-3 rounded-full bg-gradient-to-r ${dept.color} transition-all`}
                  style={{ width: `${((skillIndex + 1) / benchmarks.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Skill Info */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">{skill.name}</h2>
              <div className="flex gap-3">
                <div className="flex-1 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium mb-1">Target for {targetRole.title}</p>
                  <p className="text-2xl font-bold text-blue-900">{benchmark.targetLevel.toFixed(1)}/5.0</p>
                </div>
                <div className={`flex-1 p-4 rounded-lg ${
                  benchmark.required ? 'bg-red-50' : 'bg-gray-50'
                }`}>
                  <p className={`text-sm font-medium mb-1 ${
                    benchmark.required ? 'text-red-700' : 'text-gray-700'
                  }`}>
                    Status
                  </p>
                  <p className={`text-lg font-bold ${
                    benchmark.required ? 'text-red-900' : 'text-gray-900'
                  }`}>
                    {benchmark.required ? '✓ Required' : 'Optional'}
                  </p>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-6 mb-8">
              {questions.map((q, i) => (
                <div key={i} className="border-2 border-gray-100 rounded-xl p-6">
                  <p className="text-gray-900 font-medium mb-4">{q}</p>
                  <div className="flex gap-3">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        onClick={() => {
                          const newResponses = { ...responses };
                          newResponses[`${skill.id}-${q}`] = rating;
                          
                          const allRatings = questions.map(question => 
                            newResponses[`${skill.id}-${question}`] || 0
                          ).filter(r => r > 0);
                          
                          if (allRatings.length === questions.length) {
                            const avg = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;
                            newResponses[skill.id] = avg;
                          }
                          
                          setResponses(newResponses);
                        }}
                        className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                          responses[`${skill.id}-${q}`] === rating
                            ? `bg-gradient-to-r ${dept.color} text-white shadow-lg scale-110`
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-gray-500">
                    <span>1 = Beginner</span>
                    <span>5 = Expert</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={prev}
                disabled={skillIndex === 0}
                className="px-6 py-3 rounded-lg bg-white text-gray-700 font-semibold hover:bg-gray-100 shadow-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Previous
              </button>
              <button
                onClick={next}
                disabled={!complete()}
                className={`px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${dept.color} text-white shadow-md flex items-center`}
              >
                {skillIndex < benchmarks.length - 1 ? (
                  <>Next <ChevronRight className="w-5 h-5 ml-1" /></>
                ) : (
                  <>View Results <Award className="w-5 h-5 ml-2" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'results') {
    const dept = DEPARTMENTS[selectedDepartment];
    const targetRole = ROLES[viewingNextRole];

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-6xl mx-auto py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Skills Gap Analysis</h1>
            <p className="text-xl text-gray-600">{name}</p>
            <p className="text-lg text-gray-500">
              {currentRole.title} → {targetRole.title}
            </p>
          </div>

          {/* Summary Metrics */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <BarChart3 className="w-6 h-6 text-gray-600 mr-2" />
                  <p className="text-gray-600 font-medium">Your Score</p>
                </div>
                <p className="text-5xl font-bold text-gray-900">{results.overall.toFixed(1)}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Target className="w-6 h-6 text-blue-600 mr-2" />
                  <p className="text-gray-600 font-medium">Target</p>
                </div>
                <p className="text-5xl font-bold text-blue-600">{results.target.toFixed(1)}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-6 h-6 text-orange-600 mr-2" />
                  <p className="text-gray-600 font-medium">Gap</p>
                </div>
                <p className="text-5xl font-bold text-orange-600">{(results.target - results.overall).toFixed(1)}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Award className="w-6 h-6 text-purple-600 mr-2" />
                  <p className="text-gray-600 font-medium">Readiness</p>
                </div>
                <p className="text-5xl font-bold text-purple-600">{results.readinessPercent}%</p>
              </div>
            </div>
          </div>

          {/* Readiness Indicator */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Role Readiness</h2>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress to {targetRole.title}</span>
                <span className="font-bold">{results.readinessPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full bg-gradient-to-r ${dept.color} transition-all`}
                  style={{ width: `${results.readinessPercent}%` }}
                />
              </div>
            </div>
            <p className="text-gray-700">
              {results.readinessPercent >= 90 && "🎉 You're highly ready for this role!"}
              {results.readinessPercent >= 70 && results.readinessPercent < 90 && "👍 You're on track! Focus on closing key gaps."}
              {results.readinessPercent >= 50 && results.readinessPercent < 70 && "📈 Good progress! Continue developing critical skills."}
              {results.readinessPercent < 50 && "💪 Significant development needed. Focus on critical skills first."}
            </p>
          </div>

          {/* Training Curriculum Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <GraduationCap className="w-8 h-8 text-green-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Recommended Training Curriculum</h2>
                <p className="text-gray-600">Personalized learning path based on your skills gaps</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Total Training Investment</p>
                  <p className="text-3xl font-bold text-green-900">{results.totalTrainingHours} hours</p>
                </div>
                <Clock className="w-12 h-12 text-green-600" />
              </div>
            </div>

            <div className="space-y-6">
              {results.skills
                .filter(s => s.gap > 0 && s.recommendedCourses.length > 0)
                .map((s) => (
                  <div key={s.id} className="border-2 border-gray-100 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${
                          s.priority === 'high' ? 'bg-red-500' :
                          s.priority === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        <h3 className="text-xl font-bold text-gray-900">{s.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          s.priority === 'high' ? 'bg-red-100 text-red-700' :
                          s.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {s.priority === 'high' ? '🔥 High Priority' : s.priority === 'medium' ? '⚠️ Medium' : '✓ Optional'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Gap</p>
                        <p className="text-xl font-bold text-orange-600">+{s.gap.toFixed(1)}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {s.recommendedCourses.map((course, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:shadow-md transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{course.title}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-gray-600">{course.provider}</span>
                                <span className="text-xs px-2 py-1 rounded bg-white text-gray-700 font-medium">
                                  {course.type}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded font-medium ${
                                  course.level === 'beginner' ? 'bg-green-100 text-green-700' :
                                  course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {course.level}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Duration</p>
                              <p className="text-lg font-bold text-gray-900">{course.duration}</p>
                            </div>
                            <CheckCircle className="w-6 h-6 text-gray-300" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Skills Breakdown */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Detailed Skills Analysis</h2>
            <div className="space-y-6">
              {results.skills.map((s) => (
                <div key={s.id} className="border-2 border-gray-100 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`w-3 h-3 rounded-full ${
                          s.weight === 'critical' ? 'bg-red-500' :
                          s.weight === 'important' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        <h3 className="text-xl font-bold text-gray-900">{s.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded bg-${s.competency.color}-100 text-${s.competency.color}-700 font-medium`}>
                          {s.competency.name}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 font-medium uppercase">
                          {s.weight}
                        </span>
                        {s.required && (
                          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-bold">
                            REQUIRED
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ml-4 ${
                      s.priority === 'high' ? 'bg-red-100 text-red-700' :
                      s.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {s.priority === 'high' ? '🔥 High Priority' : s.priority === 'medium' ? '⚠️ Medium' : '✅ On Track'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600 mb-1">Your Level</p>
                      <p className="text-2xl font-bold text-gray-900">{s.userScore.toFixed(1)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-blue-600 mb-1">Target</p>
                      <p className="text-2xl font-bold text-blue-600">{s.targetLevel.toFixed(1)}</p>
                    </div>
                    <div className={`rounded-lg p-3 ${s.gap > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                      <p className={`text-sm mb-1 ${s.gap > 0 ? 'text-orange-600' : 'text-green-600'}`}>Gap</p>
                      <p className={`text-2xl font-bold ${s.gap > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {s.gap > 0 ? '+' : ''}{s.gap.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span className="font-medium">Progress</span>
                      <span className="font-bold">{Math.min(100, (s.userScore / s.targetLevel * 100)).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full bg-gradient-to-r ${dept.color} transition-all`}
                        style={{ width: `${Math.min(100, (s.userScore / s.targetLevel * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4 flex-wrap">
            <button
              onClick={() => setShowManagerModal(true)}
              className="px-8 py-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send to Manager for Review
            </button>
            <button
              onClick={exportToPDF}
              className="px-8 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export Development Plan
            </button>
            <button
              onClick={() => {
                setStep('career_map');
                setResponses({});
                setResults(null);
              }}
              className="px-8 py-4 rounded-lg bg-white text-gray-700 font-semibold hover:bg-gray-100 shadow-lg"
            >
              ← Back to Career Map
            </button>
          </div>
        </div>

        {/* Manager Review Modal */}
        {showManagerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Send className="w-8 h-8 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Send to Manager</h2>
                </div>
                <button
                  onClick={() => setShowManagerModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Manager's Email</label>
                <input
                  type="email"
                  placeholder="manager@company.com"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Notes for Manager (Optional)</label>
                <textarea
                  placeholder="Add any context or goals you'd like to share..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="bg-purple-50 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-gray-900 mb-2">What will be sent:</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✓ Current role: {currentRole.title}</li>
                  <li>✓ Target role: {targetRole.title}</li>
                  <li>✓ Skills gap analysis with priorities</li>
                  <li>✓ Recommended training curriculum ({results.totalTrainingHours} hours)</li>
                  <li>✓ Overall readiness score: {results.readinessPercent}%</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={sendToManager}
                  disabled={!managerEmail}
                  className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send for Review
                </button>
                <button
                  onClick={() => setShowManagerModal(false)}
                  className="px-6 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}