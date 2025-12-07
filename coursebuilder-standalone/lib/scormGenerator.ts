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
    // Check for JSON table format first: {"columns":[...],"rows":[...]}
    const trimmedText = text.trim();
    if (trimmedText.startsWith('{"columns":') || trimmedText.startsWith('{"columns" :')) {
      try {
        const tableData = JSON.parse(trimmedText);
        if (tableData.columns && tableData.rows) {
          let html = '<table class="content-table"><thead><tr>';
          tableData.columns.forEach((col: string) => {
            html += `<th>${escapeHtml(col)}</th>`;
          });
          html += '</tr></thead><tbody>';
          tableData.rows.forEach((row: Record<string, any>) => {
            html += '<tr>';
            tableData.columns.forEach((col: string) => {
              const value = row[col];
              html += `<td>${value !== null && value !== undefined ? escapeHtml(String(value)) : ''}</td>`;
            });
            html += '</tr>';
          });
          html += '</tbody></table>';
          return html;
        }
      } catch (e) {
        // Not valid JSON, continue with other formats
      }
    }

    // Check for definition list format (Term: Definition with double newlines)
    // If text contains double newlines, treat as paragraph-separated content
    if (text.includes('\\n\\n') || text.includes('\n\n')) {
      const paragraphs = text.split(/\\n\\n|\n\n/).filter(p => p.trim());
      if (paragraphs.length > 1) {
        return paragraphs.map(p => {
          const trimmed = p.trim().replace(/\\n/g, ' ').replace(/\n/g, ' ');
          // Check if it's a definition (Term: Definition)
          const defMatch = trimmed.match(/^([^:]+):\s*(.+)$/);
          if (defMatch) {
            return `<p><strong>${escapeHtml(defMatch[1])}:</strong> ${escapeHtml(defMatch[2])}</p>`;
          }
          return `<p>${escapeHtml(trimmed)}</p>`;
        }).join('\n');
      }
    }

    // Convert inline bullets to proper line-separated bullets
    // Matches patterns like "• Item 1 • Item 2 • Item 3"
    let processedText = text;
    // Check if text has any bullet points
    const bulletCount = (text.match(/•/g) || []).length;
    if (bulletCount >= 1) {
      // Split on bullet character, putting each bullet on its own line
      // This handles: "Intro text: • Item 1 • Item 2" -> "Intro text:\n• Item 1\n• Item 2"
      processedText = text.replace(/\s*•\s*/g, '\n• ');
      // Clean up any leading newline
      if (processedText.startsWith('\n')) {
        processedText = processedText.substring(1);
      }
    }

    // Filter out separator lines (---, --, etc.) and empty lines
    const lines = processedText.split(/\\n|\n/)
      .filter(line => line.trim())
      .filter(line => !line.trim().match(/^-{2,}$/));  // Remove --- separators
    const bulletPattern = /^[•\-\*]\s*/;

    // Detect repeating record format (like Audit ID:, Department:, etc.)
    const isRepeatingRecordFormat = (recordLines: string[]): boolean => {
      const kvPattern = /^([^:]+):\s*(.+)$/;
      const kvMatches = recordLines.filter(line => kvPattern.test(line.trim()));
      if (kvMatches.length < 4) return false;
      
      const firstMatch = recordLines[0]?.trim().match(kvPattern);
      if (!firstMatch) return false;
      const firstKey = firstMatch[1].trim().toLowerCase();
      const repeatCount = recordLines.filter(line => {
        const m = line.trim().match(kvPattern);
        return m && m[1].trim().toLowerCase() === firstKey;
      }).length;
      return repeatCount >= 2;
    };

    // Format repeating records as cards
    const formatAsRecordCards = (recordLines: string[]): string => {
      const kvPattern = /^([^:]+):\s*(.+)$/;
      const records: Array<Array<{key: string, value: string}>> = [];
      let currentRecord: Array<{key: string, value: string}> = [];
      let firstKey = '';
      
      for (const line of recordLines) {
        const match = line.trim().match(kvPattern);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          
          if (!firstKey) firstKey = key.toLowerCase();
          
          if (key.toLowerCase() === firstKey && currentRecord.length > 0) {
            records.push(currentRecord);
            currentRecord = [];
          }
          currentRecord.push({ key, value });
        }
      }
      if (currentRecord.length > 0) records.push(currentRecord);
      
      if (records.length === 0) return '';
      
      let html = '<div class="record-cards">';
      records.forEach((record) => {
        html += '<div class="record-card">';
        record.forEach((field, idx) => {
          if (idx === 0) {
            html += `<div class="record-title">${escapeHtml(field.value)}</div>`;
          } else {
            html += `<div class="record-field"><span class="field-label">${escapeHtml(field.key)}:</span> ${escapeHtml(field.value)}</div>`;
          }
        });
        html += '</div>';
      });
      html += '</div>';
      return html;
    };

    // Check for repeating record format first
    if (isRepeatingRecordFormat(lines)) {
      return formatAsRecordCards(lines);
    }

    // Detect space-aligned table format (columns separated by 2+ spaces)
    const isSpaceAlignedTable = (tableLines: string[]): boolean => {
      if (tableLines.length < 2) return false;
      const linesWithMultiSpace = tableLines.filter(line => /\s{2,}/.test(line.trim()));
      return linesWithMultiSpace.length >= 2;
    };

    // Format space-aligned table
    const formatSpaceAlignedTable = (tableLines: string[]): string => {
      const rows = tableLines.map(line => 
        line.trim().split(/\s{2,}/).map(cell => cell.trim()).filter(cell => cell)
      ).filter(row => row.length >= 2);
      
      if (rows.length < 2) return '';
      
      const headers = rows[0];
      const dataRows = rows.slice(1);
      
      let html = '<table class="content-table"><thead><tr>';
      headers.forEach(h => { html += `<th>${escapeHtml(h)}</th>`; });
      html += '</tr></thead><tbody>';
      
      dataRows.forEach(row => {
        html += '<tr>';
        headers.forEach((_, idx) => {
          html += `<td>${escapeHtml(row[idx] || '')}</td>`;
        });
        html += '</tr>';
      });
      
      html += '</tbody></table>';
      return html;
    };

    // Check for space-aligned table
    if (isSpaceAlignedTable(lines)) {
      const tableHtml = formatSpaceAlignedTable(lines);
      if (tableHtml) return tableHtml;
    }

    // Detect pipe-separated table format: lines with | separators (at least 2 columns)
    // Require at least 3 non-separator pipe lines (header + 2 data rows) to be a real table
    const isTableFormat = (tableLines: string[]): boolean => {
      const pipeLines = tableLines.filter(line => line.includes('|') && line.split('|').length >= 2);
      // Filter out separator lines (|---|---|)
      const nonSeparatorLines = pipeLines.filter(line => {
        const cells = line.split('|').map(c => c.trim());
        return !cells.every(c => c === '' || /^[\-:]+$/.test(c));
      });
      // Need at least 3 non-separator lines (header + at least 2 data rows) to be a real table
      return nonSeparatorLines.length >= 3;
    };

    // Detect key-value format: *Key:** Value or **Key:** Value pattern
    const isKeyValueFormat = (kvLines: string[]): boolean => {
      const kvPattern = /^[•\-\*]?\s*\*?\*?([^:*]+)\*?\*?:\*?\*?\s*.+/;
      const kvMatches = kvLines.filter(line => kvPattern.test(line.trim()));
      return kvMatches.length >= 2 && kvMatches.some(line => 
        /responsibility|step|action|role|task|description/i.test(line)
      );
    };

    // Convert key-value format to table
    const formatKeyValueAsTable = (kvLines: string[]): string => {
      const kvPattern = /^[•\-\*]?\s*\*?\*?([^:*]+)\*?\*?:\*?\*?\s*(.+)/;
      const rows: { key: string; value: string }[] = [];
      
      for (const line of kvLines) {
        const match = line.trim().match(kvPattern);
        if (match) {
          rows.push({ key: match[1].trim(), value: match[2].trim() });
        }
      }

      if (rows.length < 2) return '';

      const headers = ['Responsibility', 'Step', 'Action'];
      const tableRows: string[][] = [];
      let currentRow: Record<string, string> = {};

      for (const row of rows) {
        const keyLower = row.key.toLowerCase();
        if (keyLower.includes('responsibility') || keyLower.includes('role')) {
          if (Object.keys(currentRow).length > 0) {
            tableRows.push([currentRow['responsibility'] || '', currentRow['step'] || '', currentRow['action'] || '']);
          }
          currentRow = { responsibility: row.value };
        } else if (keyLower.includes('step')) {
          currentRow['step'] = row.value;
        } else if (keyLower.includes('action')) {
          currentRow['action'] = row.value;
        }
      }
      
      if (Object.keys(currentRow).length > 0) {
        tableRows.push([currentRow['responsibility'] || '', currentRow['step'] || '', currentRow['action'] || '']);
      }

      if (tableRows.length === 0) return '';

      let tableHtml = '<table class="content-table"><thead><tr>';
      headers.forEach(h => { tableHtml += `<th>${escapeHtml(h)}</th>`; });
      tableHtml += '</tr></thead><tbody>';

      tableRows.forEach(row => {
        tableHtml += '<tr>';
        row.forEach(cell => { tableHtml += `<td>${escapeHtml(cell)}</td>`; });
        tableHtml += '</tr>';
      });

      tableHtml += '</tbody></table>';
      return tableHtml;
    };

    // Format pipe-separated table content into HTML table
    const formatTable = (tableLines: string[]): string => {
      const pipedLines = tableLines.filter(line => line.includes('|'));
      if (pipedLines.length === 0) return '';

      // Clean line: remove bullet prefix and markdown asterisks
      const cleanLine = (line: string): string => {
        return line.trim()
          .replace(/^[•·●○\-\*]\s*/, '')  // Remove bullet prefix
          .replace(/\*\*/g, '')            // Remove markdown bold **
          .replace(/^\*/, '');             // Remove leading single asterisk
      };

      // Clean header cell: remove prefixes like "COLUMN HEADERS:" or "Column Headers:"
      const cleanHeaderCell = (cell: string): string => {
        return cell.trim()
          .replace(/^\*?column\s*headers?\s*:?\s*/i, '')  // Remove "COLUMN HEADERS:" prefix
          .replace(/^\*+\s*/, '')                          // Remove leading asterisks
          .replace(/\*+$/, '')                             // Remove trailing asterisks
          .trim();
      };

      // Parse cells from a pipe-separated line, preserving ALL cells including empty ones
      const parseCells = (line: string): string[] => {
        const cleaned = cleanLine(line);
        // Split by pipe - keep all cells
        const cells = cleaned.split('|');
        // Remove first empty cell if line starts with |
        if (cells.length > 0 && cells[0].trim() === '') {
          cells.shift();
        }
        // Remove last empty cell if line ends with |
        if (cells.length > 0 && cells[cells.length - 1].trim() === '') {
          cells.pop();
        }
        return cells.map(cell => cell.trim());
      };

      const headerCells = parseCells(pipedLines[0]);
      const headers = headerCells
        .map(h => cleanHeaderCell(h))
        .filter(h => !h.match(/^[\-\s]*$/));  // Only filter separator-only cells

      const numColumns = headers.length;

      // Skip separator lines (like |---|---|---|)
      const dataRows = pipedLines.slice(1)
        .filter(line => {
          // Skip lines that are ONLY separators
          const cells = line.split('|').map(c => c.trim());
          return !cells.every(c => c === '' || /^[\-:]+$/.test(c));
        })
        .map(line => {
          const cells = parseCells(line);
          // Pad row to match header count if needed
          while (cells.length < numColumns) {
            cells.push('');
          }
          return cells;
        });

      let tableHtml = '<table class="content-table"><thead><tr>';
      headers.forEach(h => { tableHtml += `<th>${escapeHtml(h)}</th>`; });
      tableHtml += '</tr></thead><tbody>';

      dataRows.forEach(row => {
        tableHtml += '<tr>';
        for (let i = 0; i < numColumns; i++) {
          tableHtml += `<td>${escapeHtml(row[i] || '')}</td>`;
        }
        tableHtml += '</tr>';
      });

      tableHtml += '</tbody></table>';
      return tableHtml;
    };

    // Check for pipe-separated table format first
    if (isTableFormat(lines)) {
      return formatTable(lines);
    }

    // DISABLED: This was incorrectly converting definition lists to tables
    // Key-value format detection removed - definitions should stay as text
    // if (isKeyValueFormat(lines)) {
    //   const tableHtml = formatKeyValueAsTable(lines);
    //   if (tableHtml) return tableHtml;
    // }

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
        const formatted: string[] = [];
        let currentList: string[] = [];

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
  }

  // Track checkboxes per slide for interaction requirement
  let checkboxCounter = 0;

  // Check if content looks like a table (has pipe separators)
  const isTableContent = (text: string): boolean => {
    const lines = text.split(/\\n|\n/).filter(line => line.trim());
    const pipeLines = lines.filter(line => line.includes('|') && line.split('|').length >= 2);
    return pipeLines.length >= 2;
  };
  
  // Get icon and color theme based on section type and heading
  const getSectionStyle = (type: string, heading: string): { icon: string; colorClass: string } => {
    const headingLower = (heading || '').toLowerCase();
    
    // Check heading keywords first for more specific icons
    if (headingLower.includes('related') || headingLower.includes('document') || headingLower.includes('reference')) {
      return { icon: '📄', colorClass: 'card-documents' };
    }
    if (headingLower.includes('definition') || headingLower.includes('glossary') || headingLower.includes('term')) {
      return { icon: '📚', colorClass: 'card-definition' };
    }
    if (headingLower.includes('procedure') || headingLower.includes('step') || headingLower.includes('process')) {
      return { icon: '📋', colorClass: 'card-procedure' };
    }
    if (headingLower.includes('scope') || headingLower.includes('objective') || headingLower.includes('purpose')) {
      return { icon: '🎯', colorClass: 'card-objectives' };
    }
    if (headingLower.includes('note') || headingLower.includes('tip') || headingLower.includes('hint')) {
      return { icon: '💡', colorClass: 'card-note' };
    }
    if (headingLower.includes('warning') || headingLower.includes('caution') || headingLower.includes('alert')) {
      return { icon: '⚠️', colorClass: 'card-warning' };
    }
    if (headingLower.includes('important') || headingLower.includes('critical') || headingLower.includes('key')) {
      return { icon: '❗', colorClass: 'card-important' };
    }
    if (headingLower.includes('summary') || headingLower.includes('overview') || headingLower.includes('conclusion')) {
      return { icon: '📝', colorClass: 'card-summary' };
    }
    if (headingLower.includes('responsibility') || headingLower.includes('role') || headingLower.includes('accountab')) {
      return { icon: '👥', colorClass: 'card-roles' };
    }
    
    // Fall back to type-based styling
    switch (type) {
      case 'procedure': return { icon: '📋', colorClass: 'card-procedure' };
      case 'callout-important': return { icon: '❗', colorClass: 'card-important' };
      case 'callout-key': return { icon: '💡', colorClass: 'card-note' };
      case 'definition': return { icon: '📚', colorClass: 'card-definition' };
      case 'note': return { icon: '💡', colorClass: 'card-note' };
      case 'warning': return { icon: '⚠️', colorClass: 'card-warning' };
      case 'table': return { icon: '📊', colorClass: 'card-table' };
      default: return { icon: '📄', colorClass: 'card-text' };
    }
  };

  const moduleSlidesHTML = modules.map((module, index) => {
    const sectionsHTML = module.content.map((section) => {
      const isInteractive = section.type === 'callout-important' || section.type === 'callout-key';
      const checkboxId = isInteractive ? `checkbox-${index}-${checkboxCounter++}` : null;
      const isTable = section.type === 'table' || isTableContent(section.body);
      const { icon } = getSectionStyle(section.type || 'text', section.heading || '');
      const headingLower = (section.heading || '').toLowerCase();
      
      // Determine card style based on heading keywords
      let cardClass = 'card-text';
      let titleClass = 'card-title-gray';
      let iconClass = 'icon-gray';
      
      if (headingLower.includes('purpose') || headingLower.includes('scope') || headingLower.includes('objective')) {
        cardClass = 'card-objectives';
        titleClass = 'card-title-blue';
        iconClass = 'icon-blue';
      } else if (headingLower.includes('definition') || headingLower.includes('glossary') || headingLower.includes('term')) {
        cardClass = 'card-definition';
        titleClass = 'card-title-green';
        iconClass = 'icon-green';
      } else if (headingLower.includes('procedure') || headingLower.includes('step') || headingLower.includes('process')) {
        cardClass = 'card-procedure';
        titleClass = 'card-title-emerald';
        iconClass = 'icon-emerald';
      } else if (headingLower.includes('responsibility') || headingLower.includes('role') || headingLower.includes('applicable') || headingLower.includes('group')) {
        cardClass = 'card-roles';
        titleClass = 'card-title-purple';
        iconClass = 'icon-purple';
      } else if (headingLower.includes('reference') || headingLower.includes('document') || headingLower.includes('related')) {
        cardClass = 'card-documents';
        titleClass = 'card-title-slate';
        iconClass = 'icon-slate';
      }

      // Tables get special styling
      if (isTable) {
        return `
      <div class="content-card card-table">
        <div class="card-header card-title-blue">
          <span class="title-icon icon-blue">📊</span>
          <h3>${section.heading ? escapeHtml(section.heading) : 'Reference Table'}</h3>
        </div>
        <div class="table-wrapper">
          ${formatContent(section.body)}
        </div>
      </div>
        `;
      }

      // Important callouts get highlighted
      if (isInteractive) {
        return `
      <div class="content-card card-important" ${checkboxId ? `data-checkbox-id="${checkboxId}"` : ''}>
        <div class="card-header card-title-red">
          <span class="title-icon icon-red">${icon}</span>
          <h3>${section.heading ? escapeHtml(section.heading) : 'Important'}</h3>
        </div>
        <div class="card-content">
          ${formatContent(section.body)}
        </div>
        <label class="acknowledge-checkbox" for="${checkboxId}">
          <input type="checkbox" id="${checkboxId}" onchange="markAcknowledged('${checkboxId}', ${index})">
          <span class="checkbox-label">I have read and understood this ${section.type === 'callout-important' ? 'important information' : 'key point'}</span>
        </label>
      </div>
        `;
      }
      
      // Regular sections with card design
      return `
      <div class="content-card ${cardClass}">
        <div class="card-header ${titleClass}">
          <span class="title-icon ${iconClass}">${icon}</span>
          <h3>${section.heading ? escapeHtml(section.heading) : ''}</h3>
        </div>
        <div class="card-content">
          ${formatContent(section.body)}
        </div>
      </div>
    `;
    }).join('\n');

    return `
      <section class="slide" id="slide-${index}" style="${index === 0 ? 'display: block;' : 'display: none;'}">
        ${logo ? `<img src="shared/logo.png" alt="Logo" class="module-logo" />` : ''}
        <h2>${escapeHtml(module.title)}</h2>

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

    /* Content Cards - Professional Card Design */
    .content-card {
      background: white;
      border-radius: 16px;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      animation: fadeIn 0.5s ease-out;
      position: relative;
      z-index: 1;
    }
    .content-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
    }
    
    /* Card Header with Icon */
    .card-header {
      display: flex;
      align-items: center;
      padding: 18px 24px;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }
    .card-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    
    /* Title Icon Box */
    .title-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      margin-right: 14px;
      font-size: 1.2rem;
      flex-shrink: 0;
    }
    
    /* Icon Background Colors */
    .icon-blue { background: linear-gradient(135deg, #dbeafe, #bfdbfe); }
    .icon-green { background: linear-gradient(135deg, #dcfce7, #bbf7d0); }
    .icon-emerald { background: linear-gradient(135deg, #d1fae5, #a7f3d0); }
    .icon-purple { background: linear-gradient(135deg, #f3e8ff, #e9d5ff); }
    .icon-red { background: linear-gradient(135deg, #fee2e2, #fecaca); }
    .icon-amber { background: linear-gradient(135deg, #fef3c7, #fde68a); }
    .icon-slate { background: linear-gradient(135deg, #e2e8f0, #cbd5e1); }
    .icon-gray { background: linear-gradient(135deg, #f1f5f9, #e2e8f0); }
    
    /* Title Header Colors */
    .card-title-blue { background: linear-gradient(135deg, #eff6ff, #dbeafe); }
    .card-title-blue h3 { color: #1e40af; }
    .card-title-green { background: linear-gradient(135deg, #f0fdf4, #dcfce7); }
    .card-title-green h3 { color: #166534; }
    .card-title-emerald { background: linear-gradient(135deg, #ecfdf5, #d1fae5); }
    .card-title-emerald h3 { color: #065f46; }
    .card-title-purple { background: linear-gradient(135deg, #faf5ff, #f3e8ff); }
    .card-title-purple h3 { color: #6b21a8; }
    .card-title-red { background: linear-gradient(135deg, #fef2f2, #fee2e2); }
    .card-title-red h3 { color: #991b1b; }
    .card-title-amber { background: linear-gradient(135deg, #fffbeb, #fef3c7); }
    .card-title-amber h3 { color: #92400e; }
    .card-title-slate { background: linear-gradient(135deg, #f8fafc, #f1f5f9); }
    .card-title-slate h3 { color: #334155; }
    .card-title-gray { background: linear-gradient(135deg, #f9fafb, #f3f4f6); }
    .card-title-gray h3 { color: #374151; }
    
    /* Card Content */
    .card-content {
      padding: 20px 24px;
    }
    .card-content p {
      color: #475569;
      font-size: 1rem;
      line-height: 1.8;
      margin-bottom: 12px;
    }
    .card-content p:last-child {
      margin-bottom: 0;
    }
    .card-content ul {
      margin: 12px 0 12px 24px;
      list-style-type: disc;
    }
    .card-content li {
      color: #475569;
      line-height: 1.8;
      margin-bottom: 8px;
    }
    
    /* Card Type Variations */
    .card-text { background: linear-gradient(135deg, #ffffff, #f8fafc); }
    .card-objectives { background: linear-gradient(135deg, #ffffff, #eff6ff); }
    .card-definition { background: linear-gradient(135deg, #ffffff, #f0fdf4); }
    .card-procedure { background: linear-gradient(135deg, #ffffff, #ecfdf5); }
    .card-roles { background: linear-gradient(135deg, #ffffff, #faf5ff); }
    .card-documents { background: linear-gradient(135deg, #ffffff, #f8fafc); }
    .card-table { background: linear-gradient(135deg, #f8fafc, #f1f5f9); }
    .card-important { background: linear-gradient(135deg, #fff5f5, #fed7d7); border-left: 4px solid #e53e3e; }
    .card-important .card-content p { color: #742a2a; font-weight: 500; }
    
    /* Table Wrapper in Cards */
    .table-wrapper {
      padding: 16px 24px 24px 24px;
      overflow-x: auto;
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

    /* HTML Table styling */
    .content-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      font-size: 0.95rem;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .content-table thead {
      background: linear-gradient(135deg, #0284c7, #0369a1);
    }

    .content-table th {
      color: white;
      padding: 14px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border: none;
    }

    .content-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
      color: #374151;
    }

    .content-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    .content-table tbody tr:hover {
      background: #eff6ff;
    }

    .content-table tbody tr:last-child td {
      border-bottom: none;
    }

    /* Clean Section Styles */
    .content-section {
      margin-bottom: 2rem;
    }

    .section-heading {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.3rem;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e5e7eb;
    }

    .heading-icon {
      font-size: 1.25rem;
    }

    .section-body {
      color: #374151;
      line-height: 1.8;
      padding-left: 0.5rem;
    }

    .section-body p {
      margin-bottom: 0.75rem;
    }

    .section-body ul {
      margin: 0.75rem 0;
      padding-left: 1.5rem;
    }

    .section-body li {
      margin-bottom: 0.5rem;
      color: #4b5563;
    }

    /* Record Cards - for table data displayed as cards */
    .record-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }
    .record-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-left: 4px solid #3b82f6;
      border-radius: 8px;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .record-title {
      font-weight: 700;
      color: #1e40af;
      font-size: 1.05rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #cbd5e1;
    }
    .record-field {
      margin: 0.4rem 0;
      font-size: 0.9rem;
      color: #334155;
    }
    .field-label {
      color: #64748b;
      font-weight: 600;
    }

    /* Callout sections - only these get special styling */
    .callout-section {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border-left: 4px solid #ef4444;
      padding: 1.25rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }

    .callout-heading {
      color: #991b1b;
      border-bottom-color: #fecaca;
    }

    .callout-section .section-body {
      color: #7f1d1d;
    }

    /* Table wrapper */
    .table-wrapper {
      overflow-x: auto;
      margin: 0.5rem 0;
      border-radius: 8px;
    }
    /* Acknowledgment Checkbox Styles */
    .acknowledge-checkbox {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 1rem;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.8);
      border: 2px solid #d1d5db;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      user-select: none;
    }

    .acknowledge-checkbox:hover {
      border-color: var(--brand-cyan);
      background: rgba(255, 255, 255, 0.95);
    }

    .acknowledge-checkbox input[type="checkbox"] {
      width: 22px;
      height: 22px;
      accent-color: var(--brand-cyan);
      cursor: pointer;
      flex-shrink: 0;
    }

    .acknowledge-checkbox .checkbox-label {
      font-size: 0.95rem;
      font-weight: 600;
      color: #374151;
    }

    .acknowledge-checkbox:has(input:checked) {
      border-color: #10b981;
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    }

    .acknowledge-checkbox:has(input:checked) .checkbox-label {
      color: #065f46;
    }

    .acknowledge-checkbox:has(input:checked)::after {
      content: ' ✓';
      color: #10b981;
      font-weight: bold;
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
    
    // Track acknowledged checkboxes per slide
    const acknowledgedItems = {};
    
    function markAcknowledged(checkboxId, slideIndex) {
      if (!acknowledgedItems[slideIndex]) {
        acknowledgedItems[slideIndex] = new Set();
      }
      const checkbox = document.getElementById(checkboxId);
      if (checkbox && checkbox.checked) {
        acknowledgedItems[slideIndex].add(checkboxId);
      } else {
        acknowledgedItems[slideIndex].delete(checkboxId);
      }
      updateNavigation();
    }
    
    function areAllCheckboxesAcknowledged(slideIndex) {
      const slide = document.getElementById('slide-' + slideIndex);
      if (!slide) return true;
      const checkboxes = slide.querySelectorAll('.acknowledge-checkbox input[type="checkbox"]');
      if (checkboxes.length === 0) return true;
      return Array.from(checkboxes).every(cb => cb.checked);
    }

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
      // Check if all checkboxes on current slide are acknowledged
      if (!areAllCheckboxesAcknowledged(currentSlide)) {
        alert('Please acknowledge all important points before continuing.');
        return;
      }
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
      const navContainer = document.querySelector('.slide-navigation');

      prevBtn.disabled = (currentSlide === 0);

      // Hide entire navigation on quiz slide - user must use quiz buttons to proceed
      if (currentSlide === NUM_MODULES && HAS_QUIZ) {
        navContainer.style.display = 'none';
      } else if (currentSlide === TOTAL_SLIDES - 1) {
        // Last slide (acknowledgment) - hide next, show prev
        navContainer.style.display = 'flex';
        nextBtn.style.display = 'none';
      } else {
        navContainer.style.display = 'flex';
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
