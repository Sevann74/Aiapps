import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

// Renamed from SOPChange to DocumentChange - all SOP references removed
export interface DocumentChange {
  section: string;
  sectionNumber: string;
  sectionTitle: string;
  changeType: 'modified' | 'added' | 'removed';
  previousText: string;
  newText: string;
  trainingFlag: string;
  badges: string[];
  descriptor: string;
}

// Legacy alias for compatibility
export type SOPChange = DocumentChange;

export interface TrainingIndicators {
  proceduralSteps: boolean;
  safetyWarnings: boolean;
  limitsSpecifications: boolean;
  frequencyTiming: boolean;
  requiredDocumentation: boolean;
  roleResponsibilities: boolean;
}

export interface ComparisonMetadata {
  documentTitle: string;
  documentId: string;
  previousVersion: string;
  newVersion: string;
  effectiveDate: string;
  comparisonDate: string;
  department?: string;
}

export interface TrainingImpactReportData {
  metadata: ComparisonMetadata;
  changes: DocumentChange[];
  indicators: TrainingIndicators;
  summary: {
    totalSectionsChanged: number;
    added: number;
    modified: number;
    removed: number;
    impactedAreas?: string[];
    changeCategories?: string[];
  };
}

// Detect change category badges (deterministic, rule-based)
export function detectChangeBadges(oldText: string, newText: string): string[] {
  const badges: string[] = [];
  const lowerOld = oldText.toLowerCase();
  const lowerNew = newText.toLowerCase();
  const combined = lowerOld + ' ' + lowerNew;
  
  // Documentation patterns
  const docTerms = ['document', 'record', 'log', 'form', 'report', 'signature', 'sign-off', 'file', 'attach'];
  if (docTerms.some(term => combined.includes(term))) {
    badges.push('documentation');
  }
  
  // Role patterns
  const roleTerms = ['responsible', 'operator', 'supervisor', 'manager', 'qa', 'qc', 'technician', 'analyst', 'personnel', 'staff', 'employee'];
  if (roleTerms.some(term => combined.includes(term))) {
    badges.push('roles');
  }
  
  // Frequency patterns
  const frequencyTerms = ['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'hourly', 'every', 'per day', 'per week', 'per month', 'frequency', 'interval'];
  if (frequencyTerms.some(term => combined.includes(term))) {
    badges.push('frequency');
  }
  
  // Procedure patterns (default if nothing else matches or has procedural keywords)
  const procedureTerms = ['step', 'procedure', 'process', 'method', 'perform', 'execute', 'complete', 'verify', 'check', 'ensure'];
  if (procedureTerms.some(term => combined.includes(term)) || badges.length === 0) {
    badges.push('procedure');
  }
  
  return badges;
}

// Generate a 1-line mechanical change descriptor (no AI interpretation)
export function generateChangeDescriptor(oldText: string, newText: string, changeType: string): string {
  if (changeType === 'added') {
    return 'New content added to this section';
  }
  if (changeType === 'removed') {
    return 'Content retired from this section';
  }
  
  const lowerOld = oldText.toLowerCase();
  const lowerNew = newText.toLowerCase();
  
  // Frequency change detection
  const frequencyTerms = ['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'hourly'];
  for (const term of frequencyTerms) {
    if (lowerOld.includes(term) || lowerNew.includes(term)) {
      const oldFreq = frequencyTerms.find(t => lowerOld.includes(t));
      const newFreq = frequencyTerms.find(t => lowerNew.includes(t));
      if (oldFreq && newFreq && oldFreq !== newFreq) {
        return `Frequency wording modified (${oldFreq} → ${newFreq})`;
      }
    }
  }
  
  // Role change detection
  const roleTerms = ['operator', 'supervisor', 'manager', 'technician', 'analyst', 'qa', 'qc'];
  for (const term of roleTerms) {
    if ((lowerOld.includes(term) && !lowerNew.includes(term)) || 
        (!lowerOld.includes(term) && lowerNew.includes(term))) {
      return `Role or responsibility wording updated`;
    }
  }
  
  // Documentation change detection
  const docTerms = ['document', 'record', 'log', 'form', 'report', 'signature'];
  if (docTerms.some(term => lowerNew.includes(term) && !lowerOld.includes(term))) {
    return 'Wording updated related to documentation requirements';
  }
  if (docTerms.some(term => lowerOld.includes(term) || lowerNew.includes(term))) {
    return 'Documentation wording revised';
  }
  
  // Safety change detection
  const safetyTerms = ['warning', 'caution', 'danger', 'safety', 'ppe', 'hazard'];
  if (safetyTerms.some(term => lowerOld.includes(term) || lowerNew.includes(term))) {
    return 'Safety-related wording updated';
  }
  
  // Limit/specification detection
  const limitTerms = ['minimum', 'maximum', 'limit', 'threshold', 'range', 'specification'];
  if (limitTerms.some(term => lowerOld.includes(term) || lowerNew.includes(term))) {
    return 'Limit or specification wording modified';
  }
  
  // Default descriptor
  return 'Section wording revised';
}

function detectTrainingFlag(oldText: string, newText: string): string {
  const lowerOld = oldText.toLowerCase();
  const lowerNew = newText.toLowerCase();
  
  const frequencyTerms = ['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'hourly', 'every', 'per day', 'per week', 'per month'];
  for (const term of frequencyTerms) {
    if ((lowerOld.includes(term) || lowerNew.includes(term)) && lowerOld !== lowerNew) {
      return 'Frequency change';
    }
  }
  
  const docTerms = ['document', 'record', 'log', 'form', 'report', 'signature', 'sign-off'];
  for (const term of docTerms) {
    if (lowerNew.includes(term) && !lowerOld.includes(term)) {
      return 'Documentation requirement';
    }
  }
  
  const safetyTerms = ['warning', 'caution', 'danger', 'safety', 'ppe', 'protective', 'hazard'];
  for (const term of safetyTerms) {
    if (lowerNew.includes(term) || lowerOld.includes(term)) {
      return 'Safety-related';
    }
  }
  
  const limitTerms = ['minimum', 'maximum', 'limit', 'threshold', 'range', 'specification', 'tolerance', '°c', '°f', '%', 'mg', 'ml'];
  for (const term of limitTerms) {
    if (lowerOld.includes(term) || lowerNew.includes(term)) {
      return 'Limit/specification change';
    }
  }
  
  const roleTerms = ['responsible', 'operator', 'supervisor', 'manager', 'qa', 'qc', 'technician', 'analyst'];
  for (const term of roleTerms) {
    if ((lowerOld.includes(term) || lowerNew.includes(term)) && lowerOld !== lowerNew) {
      return 'Role/responsibility change';
    }
  }
  
  return 'Procedural change';
}

export function detectTrainingIndicators(changes: DocumentChange[]): TrainingIndicators {
  const indicators: TrainingIndicators = {
    proceduralSteps: false,
    safetyWarnings: false,
    limitsSpecifications: false,
    frequencyTiming: false,
    requiredDocumentation: false,
    roleResponsibilities: false
  };
  
  for (const change of changes) {
    const flag = change.trainingFlag.toLowerCase();
    if (flag.includes('procedural')) indicators.proceduralSteps = true;
    if (flag.includes('safety')) indicators.safetyWarnings = true;
    if (flag.includes('limit') || flag.includes('specification')) indicators.limitsSpecifications = true;
    if (flag.includes('frequency')) indicators.frequencyTiming = true;
    if (flag.includes('documentation')) indicators.requiredDocumentation = true;
    if (flag.includes('role') || flag.includes('responsibility')) indicators.roleResponsibilities = true;
  }
  
  return indicators;
}

export function categorizeChange(oldText: string, newText: string): { changeType: 'modified' | 'added' | 'removed'; trainingFlag: string } {
  if (!oldText || oldText.trim() === '') {
    return { changeType: 'added', trainingFlag: 'New content' };
  }
  if (!newText || newText.trim() === '') {
    return { changeType: 'removed', trainingFlag: 'Content removed' };
  }
  return { changeType: 'modified', trainingFlag: detectTrainingFlag(oldText, newText) };
}

// Map change categories to readable labels
function getCategoryLabel(badge: string): string {
  const labels: Record<string, string> = {
    documentation: 'Documentation requirements',
    roles: 'Role responsibilities',
    frequency: 'Timing/frequency',
    procedure: 'Procedural steps'
  };
  return labels[badge] || badge;
}

export async function generateTrainingImpactReport(data: TrainingImpactReportData): Promise<void> {
  const { metadata, changes, indicators, summary } = data;
  
  // Build impacted areas text for executive summary
  const impactedAreasText = summary.impactedAreas && summary.impactedAreas.length > 0
    ? summary.impactedAreas.join(', ')
    : changes.map(c => c.sectionTitle).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).join(', ');
  
  // Build change categories text
  const allBadges = [...new Set(changes.flatMap(c => c.badges || []))];
  const categoriesText = allBadges.map(getCategoryLabel).join(' and ');
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // SECTION 1: Administrative Header
        new Paragraph({
          text: 'TRAINING IMPACT ASSESSMENT',
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: 'Document Revision Analysis',
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        
        // Header table - Document Revision Context
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            createHeaderRow('Document Title', metadata.documentTitle),
            createHeaderRow('Document ID', metadata.documentId),
            createHeaderRow('Previous Version', metadata.previousVersion),
            createHeaderRow('New Version', metadata.newVersion),
            createHeaderRow('Effective Date', metadata.effectiveDate),
            createHeaderRow('Assessment Date', metadata.comparisonDate),
            createHeaderRow('Department', metadata.department || 'N/A'),
            createHeaderRow('Assessment Method', 'Document Revision Impact Review – Textual comparison'),
          ]
        }),
        
        new Paragraph({ text: '', spacing: { after: 400 } }),
        
        // SECTION 2: Executive Summary (improved per requirements)
        new Paragraph({
          text: 'EXECUTIVE SUMMARY',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        
        new Paragraph({
          text: 'This Training Impact Assessment evaluates changes between the previous and current versions of the document identified above.',
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: `A total of `, }),
            new TextRun({ text: `${summary.totalSectionsChanged} section(s)`, bold: true }),
            new TextRun({ text: ` were impacted in this revision. Changes were identified in the following areas:` })
          ],
          spacing: { after: 150 }
        }),
        
        // List impacted areas
        ...impactedAreasText.split(', ').map(area => new Paragraph({
          children: [new TextRun({ text: `• ${area}` })],
          indent: { left: 400 },
          spacing: { after: 50 }
        })),
        
        new Paragraph({
          children: [
            new TextRun({ text: `The majority of changes relate to ` }),
            new TextRun({ text: categoriesText || 'procedural content', bold: true }),
            new TextRun({ text: `. ` }),
            new TextRun({ text: indicators.safetyWarnings 
              ? 'Safety-related content was identified in this revision.' 
              : 'No changes were identified affecting safety warnings or operational limits.' 
            })
          ],
          spacing: { before: 150, after: 200 }
        }),
        
        // Disclaimer box
        new Paragraph({
          children: [
            new TextRun({ 
              text: 'This assessment identifies textual changes only. It does not provide regulatory interpretation or training recommendations. The determination of whether retraining is required remains the responsibility of Quality, Learning & Development, and the Process Owner.',
              italics: true,
              color: '666666'
            })
          ],
          spacing: { before: 200, after: 400 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
          },
          shading: { fill: 'F5F5F5' }
        }),
        
        // SECTION 3: Training Relevance Indicators (moved up per requirements)
        new Paragraph({
          text: 'TRAINING RELEVANCE INDICATORS',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        
        new Paragraph({
          text: 'Objective training relevance indicators identified in this revision:',
          spacing: { after: 200 }
        }),
        
        createIndicatorCheckbox('Procedural steps', indicators.proceduralSteps),
        createIndicatorCheckbox('Safety / warnings', indicators.safetyWarnings),
        createIndicatorCheckbox('Limits or specifications', indicators.limitsSpecifications),
        createIndicatorCheckbox('Frequency or timing', indicators.frequencyTiming),
        createIndicatorCheckbox('Required documentation', indicators.requiredDocumentation),
        createIndicatorCheckbox('Role responsibilities', indicators.roleResponsibilities),
        
        new Paragraph({
          children: [
            new TextRun({ 
              text: 'Note: ',
              bold: true
            }),
            new TextRun({ 
              text: 'These indicators are provided to support the training decision. The determination of whether retraining is required remains with Quality, L&D, and the Process Owner.',
              italics: true
            })
          ],
          spacing: { before: 300, after: 400 }
        }),
        
        // Summary Bar (Quality-native labels)
        new Paragraph({
          text: 'REVISION SUMMARY',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createSummaryCell('Sections Impacted', String(summary.totalSectionsChanged)),
                createSummaryCell('New Content', String(summary.added)),
                createSummaryCell('Revised Content', String(summary.modified)),
                createSummaryCell('Retired Content', String(summary.removed))
              ]
            })
          ]
        }),
        
        new Paragraph({ text: '', spacing: { after: 400 } }),
        
        // SECTION 4: Structured Change Table
        new Paragraph({
          text: 'STRUCTURED CHANGE TABLE',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        
        createChangeTable(changes),
        
        new Paragraph({ text: '', spacing: { after: 400 } }),
        
        // SECTION 5: Sign-off Section
        new Paragraph({
          text: 'SIGN-OFF',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        
        createSignOffTable(),
        
        new Paragraph({ text: '', spacing: { after: 400 } }),
        
        // Footer
        new Paragraph({
          children: [
            new TextRun({ 
              text: `Generated: ${new Date().toISOString().split('T')[0]} | Document Revision Impact Review – CapNorth Hub`,
              size: 18,
              color: '999999'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 }
        })
      ]
    }]
  });
  
  const blob = await Packer.toBlob(doc);
  const filename = `Training_Impact_Assessment_${metadata.documentId}_v${metadata.newVersion}_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, filename);
}

function createHeaderRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ 
          children: [new TextRun({ text: label, bold: true })],
          spacing: { before: 50, after: 50 }
        })],
        shading: { fill: 'F0F0F0' }
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ 
          text: value || 'N/A',
          spacing: { before: 50, after: 50 }
        })]
      })
    ]
  });
}

function createSummaryCell(label: string, value: string): TableCell {
  return new TableCell({
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text: value, bold: true, size: 32 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 50 }
      }),
      new Paragraph({
        children: [new TextRun({ text: label, size: 18, color: '666666' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      })
    ],
    shading: { fill: 'F8F8F8' }
  });
}

function createChangeTable(changes: DocumentChange[]): Table {
  const headerRow = new TableRow({
    children: [
      createTableHeaderCell('Section', 18),
      createTableHeaderCell('Type', 10),
      createTableHeaderCell('Change Summary', 20),
      createTableHeaderCell('Previous Text', 24),
      createTableHeaderCell('Current Text', 24),
      createTableHeaderCell('Flag', 4)
    ],
    tableHeader: true
  });
  
  const dataRows = changes.map(change => new TableRow({
    children: [
      // Section column - bold section name
      new TableCell({
        width: { size: 18, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ 
          children: [new TextRun({ text: change.section, bold: true })],
          spacing: { before: 50, after: 50 } 
        })]
      }),
      // Change type column - colored badge
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ 
          children: [new TextRun({ 
            text: change.changeType === 'added' ? 'NEW' : change.changeType === 'removed' ? 'RETIRED' : 'REVISED',
            bold: true,
            color: change.changeType === 'added' ? '228B22' : change.changeType === 'removed' ? 'CC0000' : 'CC7700'
          })],
          spacing: { before: 50, after: 50 }
        })]
      }),
      // Change summary column - bold descriptor (the key insight)
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ 
          children: [new TextRun({ text: change.descriptor || change.trainingFlag, bold: true, size: 20 })],
          spacing: { before: 50, after: 50 }
        })]
      }),
      // Previous text column - normal weight, smaller font
      new TableCell({
        width: { size: 24, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ 
          children: [new TextRun({ 
            text: change.previousText ? (change.previousText.substring(0, 300) + (change.previousText.length > 300 ? '...' : '')) : '—',
            size: 18,
            color: '444444'
          })],
          spacing: { before: 50, after: 50 }
        })]
      }),
      // Current text column - normal weight, smaller font
      new TableCell({
        width: { size: 24, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ 
          children: [new TextRun({ 
            text: change.newText ? (change.newText.substring(0, 300) + (change.newText.length > 300 ? '...' : '')) : '—',
            size: 18,
            color: '444444'
          })],
          spacing: { before: 50, after: 50 }
        })]
      }),
      // Training flag column - compact indicator
      new TableCell({
        width: { size: 4, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ 
          children: [new TextRun({ text: '●', color: change.trainingFlag.includes('Safety') ? 'CC0000' : '2E5090' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 50, after: 50 }
        })]
      })
    ]
  }));
  
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows]
  });
}

function createTableHeaderCell(text: string, widthPercent: number): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ 
      children: [new TextRun({ text, bold: true, color: 'FFFFFF' })],
      spacing: { before: 50, after: 50 }
    })],
    shading: { fill: '2E5090' }
  });
}

function createIndicatorCheckbox(label: string, checked: boolean): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: checked ? '☑' : '☐', size: 28 }),
      new TextRun({ text: `  ${label}` })
    ],
    spacing: { after: 100 },
    indent: { left: 400 }
  });
}

function createSignOffTable(): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createTableHeaderCell('Role', 25),
          createTableHeaderCell('Name', 25),
          createTableHeaderCell('Decision', 30),
          createTableHeaderCell('Date', 20)
        ],
        tableHeader: true
      }),
      createSignOffRow('Process Owner', 'Retraining required / Not required'),
      createSignOffRow('Quality', 'Approved / Not approved'),
      createSignOffRow('L&D', 'Actioned / Pending')
    ]
  });
}

function createSignOffRow(role: string, decisionPlaceholder: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ 
          children: [new TextRun({ text: role, bold: true })],
          spacing: { before: 100, after: 100 }
        })]
      }),
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ text: '', spacing: { before: 100, after: 100 } })]
      }),
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ 
          children: [new TextRun({ text: decisionPlaceholder, italics: true, color: '999999' })],
          spacing: { before: 100, after: 100 }
        })]
      }),
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ text: '', spacing: { before: 100, after: 100 } })]
      })
    ]
  });
}
