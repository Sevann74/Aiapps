import JSZip from 'jszip';

interface CourseConfig {
  passingScore: number;
  maxAttempts: number;
  scormVersion: '1.2' | '2004';
  includeQuiz?: boolean;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  exactQuote?: string;
  sourceReference?: string;
}

interface Module {
  id: string;
  title: string;
  duration: string;
  content: Array<{
    type: string;
    heading: string;
    body: string;
  }>;
}

interface CourseData {
  title: string;
  logo: string | null;
  modules: Module[];
  quiz: { questions: Question[] };
  images?: Array<{ moduleId: string; imageUrl: string; altText: string }>;
  includeQuiz?: boolean;
}

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function generateSingleSCOHTML(
  courseData: CourseData,
  config: CourseConfig
): string {
  const { title, modules, quiz, logo, includeQuiz = true } = courseData;
  const { passingScore, maxAttempts } = config;

  const totalSlides = modules.length + (includeQuiz ? 1 : 0) + 1;

  function formatContent(text: string): string {
    const originalText = text;
    text = escapeHtml(text);

    // Convert inline bullets to proper line-separated bullets
    const bulletCount = (text.match(/�/g) || []).length;
    if (bulletCount >= 1) {
      text = text.replace(/\\s*�\\s*/g, '\n� ');
      if (text.startsWith('\n')) { text = text.substring(1); }
    }

    const lines = text.split(/\\n|\n/);
    const bulletPattern = /^[•\-\*]\s*/;
    const hasListItems = lines.some(line => bulletPattern.test(line.trim()));

    if (hasListItems) {
      const listItems = lines
        .filter(line => line.trim().length > 0)
        .map(line => {
          const trimmed = line.trim();
          if (bulletPattern.test(trimmed)) {
            const cleanText = trimmed.replace(bulletPattern, '');
            return `<li>${cleanText}</li>`;
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
            formatted.push(`<p>${item}</p>`);
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
        .map(line => `<p>${line.trim()}</p>`)
        .join('');
    }
  }

  const moduleSlidesHTML = modules.map((module, index) => {
    const sectionsHTML = module.content.map((section) => `
      <div class="content-section section-${section.type || 'text'}">
        ${section.heading ? `<h3>${escapeHtml(section.heading)}</h3>` : ''}
        ${formatContent(section.body)}
      </div>
    `).join('\n');

    return `
      <section class="slide" id="slide-${index}" style="${index === 0 ? 'display: block;' : 'display: none;'}">
        ${logo ? `<img src="shared/logo.png" alt="Logo" class="module-logo" />` : ''}
        <h2>${escapeHtml(module.title)}</h2>
        <p class="duration"><span class="duration-icon">📚</span> Duration: ${escapeHtml(module.duration || '10-15 mins')}</p>

        <div class="module-content">
          ${sectionsHTML}
        </div>
      </section>
    `;
  }).join('\n');

  const quizSlideHTML = includeQuiz ? `
    <section class="slide quiz-slide" id="slide-${modules.length}" style="display: none;">
      ${logo ? `<img src="shared/logo.png" alt="Logo" class="module-logo" />` : ''}
      <h2><span class="section-icon">📝</span> Final Assessment</h2>
      <p class="quiz-info"><span class="info-icon">ℹ️</span> Passing Score: ${passingScore}% | Maximum Attempts: ${maxAttempts}</p>

      <div id="quiz-container">
        ${quiz.questions.map((q, qIndex) => `
          <div class="quiz-question" id="question-${qIndex}" style="${qIndex === 0 ? 'display: block;' : 'display: none;'}">
            <div class="question-header">
              <span class="question-number">❓ Question ${qIndex + 1} of ${quiz.questions.length}</span>
            </div>
            <p class="question-text">${escapeHtml(q.question)}</p>
            ${q.sourceReference ? `<p class="source-reference">📌 Source: ${escapeHtml(q.sourceReference)}</p>` : ''}
            <div class="options">
              ${q.options.map((opt, optIndex) => `
                <label class="option-label">
                  <input type="radio" name="q${qIndex}" value="${optIndex}" onchange="selectAnswer(${qIndex}, ${optIndex})">
                  <span>${escapeHtml(opt)}</span>
                </label>
              `).join('\n')}
            </div>
            <div class="quiz-navigation">
              ${qIndex > 0 ? `<button onclick="showQuestion(${qIndex - 1})" class="btn btn-secondary">← Previous</button>` : '<div></div>'}
              ${qIndex < quiz.questions.length - 1
                ? `<button onclick="showQuestion(${qIndex + 1})" class="btn btn-primary">Next →</button>`
                : `<button onclick="submitQuiz()" class="btn btn-submit">✓ Submit Quiz</button>`
              }
            </div>
          </div>
        `).join('\n')}
      </div>

      <div id="quiz-results" style="display: none;">
        <div class="results-summary">
          <h3>📊 Quiz Results</h3>
          <div class="score-display">
            <span class="score" id="finalScore">0</span>
            <span class="score-label">%</span>
          </div>
          <p id="passFailMessage"></p>
          <div id="retrySection"></div>
        </div>
      </div>
    </section>
  ` : '';

  const acknowledgmentSlideHTML = `
    <section class="slide acknowledgment-slide" id="slide-${totalSlides - 1}" style="display: none;">
      ${logo ? `<img src="shared/logo.png" alt="Logo" class="module-logo" />` : ''}
      <h2>🎓 Course Completion Acknowledgment</h2>

      <div class="congratulations">
        <h3>🎉 Congratulations!</h3>
        <p>You have successfully completed all modules for this training course.</p>
      </div>

      <div class="acknowledgment-box">
        <h3>📜 Certification Statement</h3>
        <p>By checking the box below, you certify that you have:</p>
        <ul>
          <li>✓ Completed all training modules</li>
          ${includeQuiz ? '<li>✓ Passed the final assessment</li>' : ''}
          <li>✓ Read and understood all course content</li>
          <li>✓ Reviewed all important information</li>
        </ul>

        <label class="checkbox-label">
          <input type="checkbox" id="ackCheckbox" onchange="toggleComplete()">
          <span>I certify that I have read, understood, and completed all content in this training course.</span>
        </label>

        <div id="timestampDisplay" style="display: none;">
          <p><strong>📅 Acknowledged on:</strong> <span id="timestamp"></span></p>
        </div>
      </div>

      <button id="completeBtn" class="btn btn-complete" onclick="completeCourse()" disabled>
        ✓ Complete Course
      </button>
    </section>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --brand-navy: #2E3192;
      --brand-cyan: #00C5B8;
      --brand-dark-blue: #1a1f5c;
      --shadow-sm: 0 4px 6px rgba(46, 49, 146, 0.1);
      --shadow-md: 0 10px 30px rgba(46, 49, 146, 0.15);
      --shadow-lg: 0 20px 60px rgba(46, 49, 146, 0.2);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #111827;
      background: linear-gradient(135deg, #f8f9fc 0%, #e8eef5 100%);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }

    .course-header {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: 1.5rem 2rem;
      box-shadow: 0 4px 20px rgba(46, 49, 146, 0.1);
      position: sticky;
      top: 0;
      z-index: 100;
      border-bottom: 2px solid transparent;
      border-image: linear-gradient(90deg, var(--brand-navy), var(--brand-cyan)) 1;
      animation: fadeIn 0.5s ease-out;
    }

    .course-header h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, var(--brand-navy), var(--brand-cyan));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .progress-container {
      position: relative;
      width: 100%;
      height: 12px;
      background: #e5e7eb;
      border-radius: 12px;
      margin: 1rem 0 0.5rem 0;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--brand-navy), var(--brand-cyan));
      border-radius: 12px;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      width: 0%;
      position: relative;
      box-shadow: 0 0 20px rgba(0, 197, 184, 0.4);
    }

    .progress-bar::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    }

    .progress-text {
      font-size: 0.875rem;
      font-weight: 600;
      color: #4b5563;
      animation: fadeIn 0.3s ease-out;
    }

    .module-indicator {
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
    }

    .course-content {
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 2rem;
    }

    .slide {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border-radius: 20px;
      padding: 3rem;
      box-shadow: var(--shadow-lg);
      min-height: 500px;
      position: relative;
      overflow: hidden;
      animation: fadeIn 0.6s ease-out;
    }

    .slide::before {
      content: '';
      position: absolute;
      top: -100px;
      right: -100px;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(0, 197, 184, 0.08) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
    }

    .slide::after {
      content: '';
      position: absolute;
      bottom: -100px;
      left: -100px;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(46, 49, 146, 0.08) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
    }

    .module-logo {
      height: 56px;
      margin-bottom: 1.5rem;
      object-fit: contain;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
      animation: slideIn 0.5s ease-out;
    }

    .slide h2 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, var(--brand-navy), var(--brand-cyan));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.2;
      animation: slideIn 0.6s ease-out;
      position: relative;
      z-index: 1;
    }

    .duration {
      color: #6b7280;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .duration-icon {
      font-size: 1.2rem;
    }

    .section-icon,
    .info-icon {
      margin-right: 0.5rem;
    }

    .module-content {
      margin-top: 2rem;
    }

    .content-section {
      margin-bottom: 2rem;
      animation: fadeIn 0.5s ease-out;
      position: relative;
      z-index: 1;
    }

    .content-section h3 {
      color: #1f2937;
      margin-bottom: 1rem;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .content-section p {
      color: #4b5563;
      line-height: 1.8;
      font-size: 1.05rem;
    }

    .content-section ul {
      list-style-type: disc;
      margin-left: 1.5rem;
      margin-top: 0.75rem;
      margin-bottom: 0.75rem;
      color: #4b5563;
    }

    .content-section li {
      line-height: 1.8;
      font-size: 1.05rem;
      margin-bottom: 0.5rem;
      padding-left: 0.5rem;
    }

    .section-objectives {
      background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
      border-left: 5px solid var(--brand-navy);
      padding: 2rem;
      border-radius: 16px;
      box-shadow: var(--shadow-md);
      position: relative;
      overflow: hidden;
    }

    .section-objectives::before {
      content: '🎯';
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 120px;
      opacity: 0.08;
    }

    .section-objectives h3 {
      color: var(--brand-navy);
      font-weight: 800;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-objectives h3::before {
      content: '🎯';
      font-size: 1.5rem;
    }

    .section-objectives p {
      color: #1e40af;
      font-weight: 500;
    }

    .section-key-point {
      background: linear-gradient(135deg, #fef3c7 0%, #fef9e6 100%);
      border-left: 5px solid #f59e0b;
      padding: 1.5rem;
      border-radius: 16px;
      box-shadow: var(--shadow-md);
      position: relative;
      overflow: hidden;
    }

    .section-key-point::before {
      content: '💡';
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 80px;
      opacity: 0.08;
    }

    .section-key-point h3,
    .section-key-point h4 {
      color: #92400e;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-key-point h3::before,
    .section-key-point h4::before {
      content: '💡';
      font-size: 1.3rem;
    }

    .section-key-point p {
      color: #78350f;
      font-weight: 500;
    }

    .section-definition {
      background: linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%);
      border-left: 5px solid #10b981;
      padding: 1.5rem;
      border-radius: 16px;
      box-shadow: var(--shadow-md);
      position: relative;
      overflow: hidden;
    }

    .section-definition::before {
      content: '📖';
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 80px;
      opacity: 0.08;
    }

    .section-definition h3,
    .section-definition h4 {
      color: #065f46;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-definition h3::before,
    .section-definition h4::before {
      content: '📖';
      font-size: 1.3rem;
    }

    .section-definition p {
      color: #047857;
      font-weight: 500;
    }

    .section-warning {
      background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%);
      border-left: 5px solid #ef4444;
      padding: 1.5rem;
      border-radius: 16px;
      box-shadow: var(--shadow-md);
      position: relative;
      overflow: hidden;
    }

    .section-warning::before {
      content: '⚠️';
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 80px;
      opacity: 0.08;
    }

    .section-warning h3,
    .section-warning h4 {
      color: #991b1b;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-warning h3::before,
    .section-warning h4::before {
      content: '⚠️';
      font-size: 1.3rem;
    }

    .section-warning p {
      color: #7f1d1d;
      font-weight: 500;
    }

    .section-summary {
      background: linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%);
      border-left: 5px solid #6b7280;
      padding: 1.5rem;
      border-radius: 16px;
      box-shadow: var(--shadow-md);
      border: 2px solid #e5e7eb;
      position: relative;
      overflow: hidden;
    }

    .section-summary::before {
      content: '📝';
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 80px;
      opacity: 0.08;
    }

    .section-summary h3,
    .section-summary h4 {
      color: #374151;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-summary h3::before,
    .section-summary h4::before {
      content: '📝';
      font-size: 1.3rem;
    }

    .section-summary p {
      color: #4b5563;
      font-weight: 500;
    }

    .section-callout-important {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border-left: 5px solid #dc2626;
      padding: 1.5rem;
      border-radius: 16px;
      box-shadow: var(--shadow-md);
      position: relative;
      overflow: hidden;
    }

    .section-callout-important::before {
      content: '❗';
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 80px;
      opacity: 0.08;
    }

    .section-callout-important h3,
    .section-callout-important h4 {
      color: #991b1b;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-callout-important h3::before,
    .section-callout-important h4::before {
      content: '❗';
      font-size: 1.3rem;
    }

    .section-callout-important p {
      color: #7f1d1d;
      font-weight: 500;
    }

    .slide-navigation {
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    .btn {
      padding: 1rem 2rem;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }

    .btn::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }

    .btn:active::before {
      width: 300px;
      height: 300px;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--brand-navy), var(--brand-cyan));
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0, 197, 184, 0.4);
    }

    .btn-secondary {
      background: linear-gradient(135deg, #6b7280, #4b5563);
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }

    .quiz-slide {
      background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
    }

    .quiz-question {
      margin-bottom: 2rem;
      padding: 2rem;
      background: white;
      border-radius: 16px;
      box-shadow: var(--shadow-md);
      border-left: 5px solid var(--brand-navy);
      animation: slideIn 0.5s ease-out;
    }

    .question-header {
      font-size: 0.875rem;
      color: var(--brand-cyan);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 1rem;
    }

    .question-text {
      font-size: 1.35rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      color: #1f2937;
      line-height: 1.6;
    }

    .source-reference {
      font-size: 0.875rem;
      color: var(--brand-navy);
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      padding: 0.75rem 1.25rem;
      border-radius: 10px;
      margin-bottom: 1.5rem;
      display: inline-block;
      font-weight: 600;
      border: 1px solid #bfdbfe;
    }

    .options {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .option-label {
      display: flex;
      align-items: center;
      padding: 1.25rem;
      background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .option-label:hover {
      border-color: var(--brand-cyan);
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      transform: translateX(4px);
      box-shadow: var(--shadow-sm);
    }

    .option-label input {
      margin-right: 1rem;
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .quiz-navigation {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 2px solid #e5e7eb;
    }

    .btn-submit {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
    }

    .quiz-info {
      font-size: 1rem;
      color: #4b5563;
      font-weight: 600;
      margin-bottom: 2rem;
      padding: 1rem;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-radius: 12px;
      border-left: 4px solid var(--brand-cyan);
    }

    .results-summary {
      text-align: center;
      padding: 3rem;
      background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
      border-radius: 20px;
      box-shadow: var(--shadow-lg);
      animation: fadeIn 0.8s ease-out;
    }

    .results-summary h3 {
      font-size: 2rem;
      font-weight: 800;
      color: var(--brand-navy);
      margin-bottom: 1.5rem;
    }

    .score-display {
      font-size: 5rem;
      font-weight: 900;
      background: linear-gradient(135deg, var(--brand-navy), var(--brand-cyan));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 1.5rem 0;
      animation: pulse 2s ease-in-out infinite;
    }

    #passFailMessage {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 1.5rem 0;
      padding: 1rem 2rem;
      border-radius: 12px;
    }

    #passFailMessage.pass {
      color: #065f46;
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border: 2px solid #10b981;
    }

    #passFailMessage.fail {
      color: #991b1b;
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      border: 2px solid #ef4444;
    }

    .acknowledgment-box {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 3px solid #10b981;
      border-radius: 16px;
      padding: 2.5rem;
      margin: 2rem 0;
      box-shadow: var(--shadow-md);
      animation: fadeIn 0.6s ease-out;
    }

    .congratulations {
      text-align: center;
      margin-bottom: 2rem;
      animation: fadeIn 0.8s ease-out;
    }

    .congratulations h3 {
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #059669, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
    }

    .acknowledgment-box h3 {
      color: #065f46;
      margin-bottom: 1rem;
    }

    .acknowledgment-box ul {
      margin: 1rem 0 1rem 0;
      color: #065f46;
      list-style: none;
      padding: 0;
    }

    .acknowledgment-box ul li {
      padding: 0.5rem 0;
      font-size: 1.05rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .checkbox-label {
      display: flex;
      align-items: start;
      gap: 1rem;
      font-size: 1.1rem;
      line-height: 1.6;
      padding: 1.5rem;
      background: white;
      border-radius: 12px;
      margin-top: 1.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid #d1fae5;
    }

    .checkbox-label:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
      border-color: #10b981;
    }

    .checkbox-label input {
      width: 24px;
      height: 24px;
      margin-top: 2px;
      flex-shrink: 0;
      cursor: pointer;
    }

    #timestampDisplay {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #10b981;
      font-size: 0.9rem;
      color: #065f46;
    }

    .btn-complete {
      width: 100%;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 1.25rem;
      font-size: 1.25rem;
      margin-top: 2rem;
    }

    .btn-complete:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.5);
    }

    .btn-complete:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .course-header h1 {
        font-size: 1.5rem;
      }

      .slide {
        padding: 1.5rem;
        border-radius: 16px;
      }

      .slide h2 {
        font-size: 1.75rem;
      }

      .slide::before,
      .slide::after {
        width: 200px;
        height: 200px;
      }

      .slide-navigation {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }

      .score-display {
        font-size: 3.5rem;
      }

      .progress-bar {
        height: 10px;
      }
    }
  </style>
  <script src="scorm.js"></script>
</head>
<body>
  <header class="course-header">
    <h1>${escapeHtml(title)}</h1>
    <div class="progress-container">
      <div class="progress-bar" id="progressBar"></div>
    </div>
    <p class="progress-text" id="progressText">0% Complete</p>
    <p class="module-indicator" id="moduleIndicator">Slide 1 of ${totalSlides}</p>
  </header>

  <main class="course-content">
    ${moduleSlidesHTML}
    ${quizSlideHTML}
    ${acknowledgmentSlideHTML}
  </main>

  <nav class="slide-navigation">
    <button id="prevBtn" class="btn btn-secondary" onclick="previousSlide()" disabled>← Previous</button>
    <button id="nextBtn" class="btn btn-primary" onclick="nextSlide()">Next →</button>
  </nav>

  <script>
    const TOTAL_SLIDES = ${totalSlides};
    const HAS_QUIZ = ${includeQuiz};
    const NUM_MODULES = ${modules.length};
    const PASSING_SCORE = ${passingScore};
    const MAX_ATTEMPTS = ${maxAttempts};

    let currentSlide = 0;
    let quizAnswers = [];
    let quizAttempts = 0;
    const correctAnswers = ${includeQuiz ? JSON.stringify(quiz.questions.map(q => q.correctAnswer)) : '[]'};

    window.onload = function() {
      initializeSCORM();
      checkBookmark();
      updateProgress();
      updateNavigation();
    };

    function goToSlide(slideIndex) {
      if (slideIndex < 0 || slideIndex >= TOTAL_SLIDES) return;

      document.getElementById('slide-' + currentSlide).style.display = 'none';
      currentSlide = slideIndex;
      document.getElementById('slide-' + currentSlide).style.display = 'block';

      window.scrollTo({ top: 0, behavior: 'smooth' });

      updateProgress();
      updateNavigation();
      setBookmark('slide-' + currentSlide);
      commitSCORM();
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
      } else if (currentSlide === NUM_MODULES && HAS_QUIZ && quizAttempts >= MAX_ATTEMPTS && !checkQuizPassed()) {
        nextBtn.style.display = 'none';
      } else {
        nextBtn.style.display = 'block';
      }
    }

    function checkQuizPassed() {
      if (quizAnswers.length === 0) return false;
      const score = (quizAnswers.filter((a, i) => a === correctAnswers[i]).length / correctAnswers.length) * 100;
      return score >= PASSING_SCORE;
    }

    function checkBookmark() {
      const bookmark = getBookmark();
      if (bookmark && bookmark !== '') {
        const slideNum = parseInt(bookmark.replace('slide-', ''));
        if (slideNum > 0 && confirm('Would you like to resume from where you left off?')) {
          goToSlide(slideNum);
        }
      }
    }

    ${includeQuiz ? `
    function selectAnswer(questionIndex, optionIndex) {
      quizAnswers[questionIndex] = optionIndex;
    }

    function showQuestion(index) {
      const questions = document.querySelectorAll('.quiz-question');
      questions.forEach(q => q.style.display = 'none');
      document.getElementById('question-' + index).style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function submitQuiz() {
      let score = 0;

      correctAnswers.forEach((correct, index) => {
        if (quizAnswers[index] === correct) score++;
      });

      const percentScore = Math.round((score / correctAnswers.length) * 100);

      document.getElementById('quiz-container').style.display = 'none';
      document.getElementById('quiz-results').style.display = 'block';
      document.getElementById('finalScore').textContent = percentScore;

      setScore(percentScore, 100, 0);

      const passed = percentScore >= PASSING_SCORE;
      const messageEl = document.getElementById('passFailMessage');
      messageEl.textContent = passed
        ? '✓ Congratulations! You passed the quiz.'
        : '⚠️ You did not pass. Please review the content and try again.';
      messageEl.className = passed ? 'pass' : 'fail';

      quizAttempts++;

      const retrySection = document.getElementById('retrySection');
      if (!passed && quizAttempts < MAX_ATTEMPTS) {
        retrySection.innerHTML = '<button onclick="retryQuiz()" class="btn btn-submit" style="margin-top: 1rem;">🔄 Retry Quiz</button>';
      } else if (passed) {
        retrySection.innerHTML = '<button onclick="nextSlide()" class="btn btn-primary" style="margin-top: 1rem;">Continue to Acknowledgment →</button>';
      } else {
        retrySection.innerHTML = '<div style="margin-top: 1rem;"><p style="color: #ef4444; margin-bottom: 1rem; font-weight: bold;">⚠️ You did not pass. Please review the content and try again.</p><button onclick="retryFromBeginning()" class="btn btn-primary" style="background: #2563eb;">🔄 Review Content and Retry</button></div>';
      }

      updateNavigation();
      commitSCORM();
    }

    function retryQuiz() {
      quizAnswers = [];
      document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
      document.getElementById('quiz-container').style.display = 'block';
      document.getElementById('quiz-results').style.display = 'none';
      showQuestion(0);
    }

    function retryFromBeginning() {
      quizAttempts = 0;
      quizAnswers = [];
      document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
      document.getElementById('quiz-container').style.display = 'block';
      document.getElementById('quiz-results').style.display = 'none';
      goToSlide(0);
    }
    ` : ''}

    function toggleComplete() {
      const checkbox = document.getElementById('ackCheckbox');
      const completeBtn = document.getElementById('completeBtn');
      const timestampDisplay = document.getElementById('timestampDisplay');

      if (checkbox.checked) {
        const now = new Date();
        document.getElementById('timestamp').textContent = now.toLocaleString();
        timestampDisplay.style.display = 'block';
        completeBtn.disabled = false;
      } else {
        timestampDisplay.style.display = 'none';
        completeBtn.disabled = true;
      }
    }

    function completeCourse() {
      const checkbox = document.getElementById('ackCheckbox');
      if (!checkbox.checked) {
        alert('Please check the acknowledgment box to complete the course.');
        return;
      }

      setComplete();
      setPassed();
      commitSCORM();

      alert('Course completed successfully! You may now close this window.');
    }

    window.onbeforeunload = function() {
      terminateSCORM();
    };
  </script>
</body>
</html>`;
}

export function generateSCORMJS(): string {
  return `var API = null;
var findAPITries = 0;

function findAPI(win) {
  while ((win.API == null) && (win.parent != null) && (win.parent != win)) {
    findAPITries++;
    if (findAPITries > 7) return null;
    win = win.parent;
  }
  return win.API;
}

function getAPI() {
  var theAPI = findAPI(window);
  if ((theAPI == null) && (window.opener != null) && (typeof(window.opener) != "undefined")) {
    theAPI = findAPI(window.opener);
  }
  if (theAPI == null) {
    console.log("Unable to find SCORM API adapter");
  }
  return theAPI;
}

function initializeSCORM() {
  API = getAPI();
  if (API == null) {
    console.log("ERROR - Cannot find API adapter");
    return false;
  }

  var result = API.LMSInitialize("");
  if (result == "false") {
    var errorCode = API.LMSGetLastError();
    console.log("LMSInitialize failed with error: " + errorCode);
    return false;
  }

  setValue("cmi.core.lesson_status", "incomplete");
  commitSCORM();

  return true;
}

function terminateSCORM() {
  if (API == null) return false;
  var result = API.LMSFinish("");
  if (result == "false") {
    var errorCode = API.LMSGetLastError();
    console.log("LMSFinish failed with error: " + errorCode);
    return false;
  }
  return true;
}

function setValue(parameter, value) {
  if (API == null) return false;
  var result = API.LMSSetValue(parameter, value);
  if (result == "false") {
    var errorCode = API.LMSGetLastError();
    console.log("LMSSetValue(" + parameter + ", " + value + ") failed with error: " + errorCode);
    return false;
  }
  return true;
}

function getValue(parameter) {
  if (API == null) return "";
  var value = API.LMSGetValue(parameter);
  var errorCode = API.LMSGetLastError();
  if (errorCode != "0") {
    console.log("LMSGetValue(" + parameter + ") failed with error: " + errorCode);
    return "";
  }
  return value;
}

function commitSCORM() {
  if (API == null) return false;
  var result = API.LMSCommit("");
  if (result == "false") {
    var errorCode = API.LMSGetLastError();
    console.log("LMSCommit failed with error: " + errorCode);
    return false;
  }
  return true;
}

function setComplete() {
  setValue("cmi.core.lesson_status", "completed");
}

function setPassed() {
  setValue("cmi.core.lesson_status", "passed");
}

function setFailed() {
  setValue("cmi.core.lesson_status", "failed");
}

function setScore(score, maxScore, minScore) {
  setValue("cmi.core.score.raw", score);
  setValue("cmi.core.score.max", maxScore);
  setValue("cmi.core.score.min", minScore);
}

function setBookmark(location) {
  setValue("cmi.core.lesson_location", location);
}

function getBookmark() {
  return getValue("cmi.core.lesson_location");
}`;
}

export function generateSingleSCOManifest(
  courseData: CourseData,
  config: CourseConfig
): string {
  const { title } = courseData;
  const { passingScore, scormVersion } = config;
  const identifier = `COURSE_${Date.now()}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${identifier}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>${scormVersion === '2004' ? '2004 3rd Edition' : '1.2'}</schemaversion>
  </metadata>
  <organizations default="ORG-${identifier}">
    <organization identifier="ORG-${identifier}">
      <title>${escapeXml(title)}</title>

      <item identifier="ITEM-001" identifierref="RES-001">
        <title>${escapeXml(title)}</title>
        <adlcp:masteryscore>${passingScore}</adlcp:masteryscore>
      </item>

    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-001" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm.js"/>
      ${courseData.logo ? '<file href="shared/logo.png"/>' : ''}
    </resource>
  </resources>
</manifest>`;
}

export async function generateSCORMPackage(
  courseData: CourseData,
  config: CourseConfig
): Promise<Blob> {
  const zip = new JSZip();

  const indexHTML = generateSingleSCOHTML(courseData, config);
  zip.file('index.html', indexHTML);

  const scormJS = generateSCORMJS();
  zip.file('scorm.js', scormJS);

  const manifest = generateSingleSCOManifest(courseData, config);
  zip.file('imsmanifest.xml', manifest);

  if (courseData.logo) {
    const sharedFolder = zip.folder('shared');
    if (sharedFolder) {
      const logoData = courseData.logo.split(',')[1];
      sharedFolder.file('logo.png', logoData, { base64: true });
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}
