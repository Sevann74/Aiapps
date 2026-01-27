export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: string;
}

export function validateSCORMStructure(
  courseData: any,
  config: any
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!courseData) {
    errors.push('Course data is missing');
    return {
      valid: false,
      errors,
      warnings,
      summary: 'Cannot validate: course data is missing'
    };
  }

  if (!courseData.title || courseData.title.trim().length === 0) {
    errors.push('Course title is required');
  }

  if (!courseData.modules || courseData.modules.length === 0) {
    errors.push('At least one module is required');
  } else {
    courseData.modules.forEach((module: any, idx: number) => {
      if (!module.title || module.title.trim().length === 0) {
        errors.push(`Module ${idx + 1} is missing a title`);
      }
      if (!module.content || module.content.length === 0) {
        warnings.push(`Module ${idx + 1} has no content sections`);
      }
    });
  }

  // Only validate quiz if it's included in the course
  if (courseData.includeQuiz !== false) {
    if (!courseData.quiz || !courseData.quiz.questions || courseData.quiz.questions.length === 0) {
      errors.push('At least one quiz question is required');
    } else {
      courseData.quiz.questions.forEach((q: any, idx: number) => {
        if (!q.question || q.question.trim().length === 0) {
          errors.push(`Question ${idx + 1} is missing question text`);
        }
        if (!q.options || q.options.length < 2) {
          errors.push(`Question ${idx + 1} must have at least 2 answer options`);
        }
        if (q.correctAnswer === undefined || q.correctAnswer === null) {
          errors.push(`Question ${idx + 1} is missing correct answer designation`);
        }
        if (q.correctAnswer >= q.options.length) {
          errors.push(`Question ${idx + 1} has invalid correct answer index`);
        }
      });
    }
  }

  if (!config) {
    errors.push('Configuration is missing');
  } else {
    if (config.passingScore < 0 || config.passingScore > 100) {
      errors.push('Passing score must be between 0 and 100');
    }

    if (config.maxAttempts < 1) {
      errors.push('Max attempts must be at least 1');
    }

    if (config.scormVersion !== '1.2' && config.scormVersion !== '2004') {
      errors.push('SCORM version must be either 1.2 or 2004');
    }
  }

  if (courseData.title && courseData.title.length > 200) {
    warnings.push('Course title is very long (>200 chars), some LMS may truncate it');
  }

  if (courseData.modules && courseData.modules.length > 20) {
    warnings.push('Course has many modules (>20), consider splitting into multiple courses');
  }

  if (courseData.includeQuiz !== false && courseData.quiz && courseData.quiz.questions && courseData.quiz.questions.length < 5) {
    warnings.push('Quiz has few questions (<5), consider adding more for better assessment');
  }

  const valid = errors.length === 0;
  let summary = '';

  if (valid) {
    summary = `✅ SCORM package structure is valid. ${warnings.length > 0 ? `${warnings.length} warnings found.` : 'No issues found.'}`;
  } else {
    summary = `❌ SCORM package has ${errors.length} error(s) that must be fixed before export.`;
  }

  return {
    valid,
    errors,
    warnings,
    summary
  };
}

export function getSCORMCompatibilityInfo(version: '1.2' | '2004'): {
  title: string;
  description: string;
  compatibility: string[];
  features: string[];
  limitations: string[];
} {
  if (version === '1.2') {
    return {
      title: 'SCORM 1.2',
      description: 'The most widely supported SCORM standard, ideal for maximum compatibility.',
      compatibility: [
        'Moodle (all versions)',
        'Canvas',
        'Blackboard Learn',
        'Adobe Captivate Prime',
        'SAP SuccessFactors',
        'Cornerstone OnDemand',
        'TalentLMS',
        'Docebo',
        '99%+ of LMS platforms'
      ],
      features: [
        'Basic completion tracking',
        'Score reporting (0-100)',
        'Pass/fail status',
        'Session time tracking',
        'Suspend/resume support',
        'Simple navigation'
      ],
      limitations: [
        'No complex sequencing rules',
        'Limited data model',
        'Basic objective tracking',
        'No adaptive learning support'
      ]
    };
  } else {
    return {
      title: 'SCORM 2004 (3rd Edition)',
      description: 'Advanced SCORM standard with enhanced tracking and sequencing capabilities.',
      compatibility: [
        'Moodle 2.0+',
        'Canvas (modern versions)',
        'Blackboard Learn Ultra',
        'Adobe Captivate Prime',
        'SAP SuccessFactors',
        'Modern LMS platforms',
        '~80% of current LMS platforms'
      ],
      features: [
        'Advanced completion tracking',
        'Scaled scoring (0.0-1.0)',
        'Complex sequencing rules',
        'Multiple learning objectives',
        'Advanced navigation controls',
        'Rich data model',
        'Rollup rules for aggregation'
      ],
      limitations: [
        'Not supported by older LMS',
        'More complex implementation',
        'Some LMS have partial support',
        'May require LMS configuration'
      ]
    };
  }
}
