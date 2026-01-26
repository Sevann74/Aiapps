import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export interface SOPChange {
  section: string;
  changeType: 'modified' | 'added' | 'removed';
  previousText: string;
  newText: string;
  trainingFlag: string;
}

export interface TrainingIndicators {
  proceduralSteps: boolean;
  safetyWarnings: boolean;
  limitsSpecifications: boolean;
  frequencyTiming: boolean;
  requiredDocumentation: boolean;
  roleResponsibilities: boolean;
}

export interface ComparisonMetadata {
  sopTitle: string;
  sopId: string;
  previousVersion: string;
  newVersion: string;
  effectiveDate: string;
  comparisonDate: string;
  department?: string;
}

export interface TrainingImpactReportData {
  metadata: ComparisonMetadata;
  changes: SOPChange[];
  indicators: TrainingIndicators;
  summary: {
    totalSectionsChanged: number;
    added: number;
    modified: number;
    removed: number;
  };
}

function detectTrainingFlag(oldText: string, newText: string): string {
  const lowerOld = oldText.toLowerCase();
  const lowerNew = newText.toLowerCase();
  
  // Frequency patterns
  const frequencyTerms = ['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'hourly', 'every', 'per day', 'per week', 'per month'];
  for (const term of frequencyTerms) {
    if ((lowerOld.includes(term) || lowerNew.includes(term)) && lowerOld !== lowerNew) {
      return 'Frequency change';
    }
  }
  
  // Documentation patterns
  const docTerms = ['document', 'record', 'log', 'form', 'report', 'signature', 'sign-off'];
  for (const term of docTerms) {
    if (lowerNew.includes(term) && !lowerOld.includes(term)) {
      return 'Documentation requirement';
    }
  }
  
  // Safety patterns
  const safetyTerms = ['warning', 'caution', 'danger', 'safety', 'ppe', 'protective', 'hazard'];
  for (const term of safetyTerms) {
    if (lowerNew.includes(term) || lowerOld.includes(term)) {
      return 'Safety-related';
    }
  }
  
  // Limit patterns
  const limitTerms = ['minimum', 'maximum', 'limit', 'threshold', 'range', 'specification', 'tolerance', '°c', '°f', '%', 'mg', 'ml'];
  for (const term of limitTerms) {
    if (lowerOld.includes(term) || lowerNew.includes(term)) {
      return 'Limit/specification change';
    }
  }
  
  // Role patterns
  const roleTerms = ['responsible', 'operator', 'supervisor', 'manager', 'qa', 'qc', 'technician', 'analyst'];
  for (const term of roleTerms) {
    if ((lowerOld.includes(term) || lowerNew.includes(term)) && lowerOld !== lowerNew) {
      return 'Role/responsibility change';
    }
  }
  
  return 'Procedural change';
}

export function detectTrainingIndicators(changes: SOPChange[]): TrainingIndicators {
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

export async function generateTrainingImpactReport(data: TrainingImpactReportData): Promise<void> {
  const { metadata, changes, indicators, summary } = data;
  
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
          text: 'SOP Revision Analysis Report',
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        
        // Header table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            createHeaderRow('SOP Title', metadata.sopTitle),
            createHeaderRow('SOP ID', metadata.sopId),
            createHeaderRow('Previous Version', metadata.previousVersion),
            createHeaderRow('New Version', metadata.newVersion),
            createHeaderRow('Effective Date', metadata.effectiveDate),
            createHeaderRow('Comparison Date', metadata.comparisonDate),
            createHeaderRow('Department', metadata.department || 'N/A'),
            createHeaderRow('Tool Used', 'SOP Compare – AI-assisted text comparison'),
          ]
        }),
        
        new Paragraph({ text: '', spacing: { after: 400 } }),
        
        // SECTION 2: Executive Summary
        new Paragraph({
          text: 'SECTION 2 — EXECUTIVE SUMMARY',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: 'Total Sections Changed: ', bold: true }),
            new TextRun({ text: String(summary.totalSectionsChanged) })
          ],
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          text: 'Types of Changes Detected:',
          bold: true,
          spacing: { before: 200, after: 100 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: `• Added: ${summary.added} section(s)` })
          ],
          indent: { left: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `• Modified: ${summary.modified} section(s)` })
          ],
          indent: { left: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `• Removed: ${summary.removed} section(s)` })
          ],
          indent: { left: 400 },
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ 
              text: 'DISCLAIMER: ',
              bold: true,
              color: '666666'
            }),
            new TextRun({ 
              text: 'This report identifies textual changes only. No regulatory interpretation or recommendations are provided. Training decisions remain the responsibility of Quality, L&D, and Process Owners.',
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
        
        // SECTION 3: Structured Change Table
        new Paragraph({
          text: 'SECTION 3 — STRUCTURED CHANGE TABLE',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        
        createChangeTable(changes),
        
        new Paragraph({ text: '', spacing: { after: 400 } }),
        
        // SECTION 4: Training Relevance Indicators
        new Paragraph({
          text: 'SECTION 4 — TRAINING RELEVANCE INDICATORS',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        
        new Paragraph({
          text: 'The following objective indicators have been identified based on the textual analysis:',
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
        
        // SECTION 5: Sign-off Section
        new Paragraph({
          text: 'SECTION 5 — SIGN-OFF',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        
        createSignOffTable(),
        
        new Paragraph({ text: '', spacing: { after: 400 } }),
        
        // Footer
        new Paragraph({
          children: [
            new TextRun({ 
              text: `Generated: ${new Date().toISOString().split('T')[0]} | SOP Compare – CapNorth Hub`,
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
  const filename = `Training_Impact_Report_${metadata.sopId}_v${metadata.newVersion}_${new Date().toISOString().split('T')[0]}.docx`;
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
          text: value,
          spacing: { before: 50, after: 50 }
        })]
      })
    ]
  });
}

function createChangeTable(changes: SOPChange[]): Table {
  const headerRow = new TableRow({
    children: [
      createTableHeaderCell('Section', 15),
      createTableHeaderCell('Change Type', 12),
      createTableHeaderCell('Previous Text (verbatim)', 30),
      createTableHeaderCell('New Text (verbatim)', 30),
      createTableHeaderCell('Training Flag', 13)
    ],
    tableHeader: true
  });
  
  const dataRows = changes.map(change => new TableRow({
    children: [
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ text: change.section, spacing: { before: 50, after: 50 } })]
      }),
      new TableCell({
        width: { size: 12, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ 
          children: [new TextRun({ 
            text: change.changeType.toUpperCase(),
            bold: true,
            color: change.changeType === 'added' ? '228B22' : change.changeType === 'removed' ? 'CC0000' : 'CC7700'
          })],
          spacing: { before: 50, after: 50 }
        })]
      }),
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ 
          text: change.previousText || '—',
          spacing: { before: 50, after: 50 }
        })]
      }),
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ 
          text: change.newText || '—',
          spacing: { before: 50, after: 50 }
        })]
      }),
      new TableCell({
        width: { size: 13, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ 
          children: [new TextRun({ text: change.trainingFlag, italics: true })],
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
