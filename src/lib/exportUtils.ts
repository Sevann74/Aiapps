import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

// ============================================
// Types for SOP Change Impact & Delta Training
// ============================================

export interface Role {
  id: string;
  name: string;
  department: string;
  description?: string;
  sopIds: string[];
  trainingModules: string[];
  certificationRequired: boolean;
}

export interface TrainingCurriculum {
  id: string;
  roleId: string;
  moduleName: string;
  sopIds: string[];
  certificationRequired: boolean;
  recertificationMonths?: number;
}

export interface SOPRoleMapping {
  sopId: string;
  roleId: string;
  relevantSections: string[];
  isMandatory: boolean;
}

export interface ImpactMapResult {
  affectedRoles: Array<{
    role: Role;
    impactedSections: string[];
    trainingRequired: boolean;
    priority: 'high' | 'medium' | 'low';
  }>;
  affectedCurricula: Array<{
    curriculum: TrainingCurriculum;
    updateRequired: boolean;
    changedModules: string[];
  }>;
  trainingGaps: string[];
  recommendations: string[];
}

export interface DeltaMicroModule {
  id: string;
  generatedAt: string;
  generatedBy: string;
  sopHeader: {
    title: string;
    documentId: string;
    oldVersion: string;
    newVersion: string;
    effectiveDate: string;
    department: string;
    author: string;
  };
  changedSections: Array<{
    sectionNumber: string;
    sectionTitle: string;
    changeType: 'modified' | 'new' | 'removed';
    oldContent: string | null;
    newContent: string | null;
    trainingNotes: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  summary: {
    totalChanges: number;
    criticalChanges: number;
    trainingTimeEstimate: string;
  };
}

export interface AuditEvidencePack {
  id: string;
  generatedAt: string;
  generatedBy: string;
  comparisonDetails: {
    sop1: { id: string; title: string; version: string };
    sop2: { id: string; title: string; version: string };
    comparedAt: string;
  };
  changeSummary: {
    totalSections: number;
    identicalSections: number;
    modifiedSections: number;
    newSections: number;
    removedSections: number;
  };
  differences: Array<{
    section: string;
    type: string;
    severity: string;
    oldText: string | null;
    newText: string | null;
    impact: string;
  }>;
  criticalChanges: string[];
  approvalLog: Array<{
    action: string;
    user: string;
    timestamp: string;
    comments?: string;
  }>;
  auditTrail: Array<{
    action: string;
    user: string;
    timestamp: string;
    details: any;
  }>;
}

// ============================================
// Excel/CSV Parsing for Role Mappings
// ============================================

export async function parseRoleMappingFile(file: File): Promise<{
  roles: Role[];
  mappings: SOPRoleMapping[];
  curricula: TrainingCurriculum[];
  errors: string[];
}> {
  const errors: string[] = [];
  const roles: Role[] = [];
  const mappings: SOPRoleMapping[] = [];
  const curricula: TrainingCurriculum[] = [];

  try {
    const XLSX = await import('xlsx');
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    // Parse Roles sheet
    const rolesSheet = workbook.Sheets['Roles'] || workbook.Sheets[workbook.SheetNames[0]];
    if (rolesSheet) {
      const rolesData = XLSX.utils.sheet_to_json(rolesSheet) as any[];
      rolesData.forEach((row, idx) => {
        if (!row['Role Name']) {
          errors.push(`Row ${idx + 2}: Missing Role Name`);
          return;
        }
        roles.push({
          id: `role-${Date.now()}-${idx}`,
          name: row['Role Name'] || '',
          department: row['Department'] || '',
          description: row['Description'] || '',
          sopIds: (row['SOP IDs'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
          trainingModules: (row['Training Modules'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
          certificationRequired: row['Certification Required']?.toLowerCase() === 'yes'
        });
      });
    }

    // Parse Mappings sheet if exists
    const mappingsSheet = workbook.Sheets['Mappings'];
    if (mappingsSheet) {
      const mappingsData = XLSX.utils.sheet_to_json(mappingsSheet) as any[];
      mappingsData.forEach((row, idx) => {
        if (!row['SOP ID'] || !row['Role Name']) {
          errors.push(`Mappings Row ${idx + 2}: Missing SOP ID or Role Name`);
          return;
        }
        const role = roles.find(r => r.name === row['Role Name']);
        if (role) {
          mappings.push({
            sopId: row['SOP ID'],
            roleId: role.id,
            relevantSections: (row['Relevant Sections'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
            isMandatory: row['Mandatory']?.toLowerCase() !== 'no'
          });
        }
      });
    }

    // Parse Curricula sheet if exists
    const curriculaSheet = workbook.Sheets['Curricula'];
    if (curriculaSheet) {
      const curriculaData = XLSX.utils.sheet_to_json(curriculaSheet) as any[];
      curriculaData.forEach((row, idx) => {
        if (!row['Module Name'] || !row['Role Name']) {
          errors.push(`Curricula Row ${idx + 2}: Missing Module Name or Role Name`);
          return;
        }
        const role = roles.find(r => r.name === row['Role Name']);
        if (role) {
          curricula.push({
            id: `curriculum-${Date.now()}-${idx}`,
            roleId: role.id,
            moduleName: row['Module Name'],
            sopIds: (row['SOP IDs'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
            certificationRequired: row['Certification Required']?.toLowerCase() === 'yes',
            recertificationMonths: parseInt(row['Recertification Months']) || undefined
          });
        }
      });
    }

  } catch (error) {
    errors.push(`Failed to parse file: ${error}`);
  }

  return { roles, mappings, curricula, errors };
}

// ============================================
// Impact Map Analysis
// ============================================

export function analyzeImpact(
  comparisonResult: any,
  roles: Role[],
  mappings: SOPRoleMapping[],
  curricula: TrainingCurriculum[]
): ImpactMapResult {
  const affectedRoles: ImpactMapResult['affectedRoles'] = [];
  const affectedCurricula: ImpactMapResult['affectedCurricula'] = [];
  const trainingGaps: string[] = [];
  const recommendations: string[] = [];

  const sop1Id = comparisonResult.sop1Details?.id;
  const sop2Id = comparisonResult.sop2Details?.id;
  const differences = comparisonResult.differences || [];

  // Find roles affected by the changed SOP
  roles.forEach(role => {
    const isAffected = role.sopIds.some(id => 
      id === sop1Id || id === sop2Id || 
      id.includes(sop1Id?.split('-')[1] || '') // Partial match for versioned SOPs
    );

    if (isAffected) {
      const relevantMapping = mappings.find(m => m.roleId === role.id);
      const impactedSections = differences
        .filter((d: any) => {
          if (!relevantMapping?.relevantSections.length) return true;
          return relevantMapping.relevantSections.some(s => d.section?.includes(s));
        })
        .map((d: any) => d.section);

      const hasHighSeverity = differences.some((d: any) => 
        d.severity === 'high' && impactedSections.includes(d.section)
      );

      affectedRoles.push({
        role,
        impactedSections,
        trainingRequired: impactedSections.length > 0,
        priority: hasHighSeverity ? 'high' : impactedSections.length > 2 ? 'medium' : 'low'
      });
    }
  });

  // Find affected curricula
  curricula.forEach(curriculum => {
    const isAffected = curriculum.sopIds.some(id => 
      id === sop1Id || id === sop2Id
    );

    if (isAffected) {
      affectedCurricula.push({
        curriculum,
        updateRequired: true,
        changedModules: [curriculum.moduleName]
      });
    }
  });

  // Identify training gaps
  if (affectedRoles.length === 0 && differences.length > 0) {
    trainingGaps.push('No roles are mapped to this SOP - consider updating role mappings');
  }

  affectedRoles.forEach(ar => {
    if (ar.priority === 'high' && !ar.role.certificationRequired) {
      trainingGaps.push(`Role "${ar.role.name}" has high-impact changes but no certification requirement`);
    }
  });

  // Generate recommendations
  if (affectedRoles.some(ar => ar.priority === 'high')) {
    recommendations.push('Schedule immediate training sessions for high-priority roles');
  }
  if (affectedCurricula.length > 0) {
    recommendations.push('Update training curricula to reflect SOP changes');
  }
  if (comparisonResult.criticalChanges?.length > 0) {
    recommendations.push('Document critical changes in change control system');
    recommendations.push('Obtain management approval before implementation');
  }

  return { affectedRoles, affectedCurricula, trainingGaps, recommendations };
}

// ============================================
// Delta Micro-Module Generator
// ============================================

export function generateDeltaMicroModule(
  comparisonResult: any,
  user: string = 'system'
): DeltaMicroModule {
  const differences = comparisonResult.differences || [];
  const criticalCount = differences.filter((d: any) => d.severity === 'high').length;

  return {
    id: `delta-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    generatedBy: user,
    sopHeader: {
      title: comparisonResult.sop2Details?.title || 'SOP Update',
      documentId: comparisonResult.sop2Details?.id || '',
      oldVersion: comparisonResult.sop1Details?.version || '1.0',
      newVersion: comparisonResult.sop2Details?.version || '2.0',
      effectiveDate: new Date().toISOString().split('T')[0],
      department: comparisonResult.sop2Details?.department || '',
      author: comparisonResult.sop2Details?.author || ''
    },
    changedSections: differences.map((diff: any, idx: number) => ({
      sectionNumber: `${idx + 1}`,
      sectionTitle: diff.section || `Section ${idx + 1}`,
      changeType: diff.type as 'modified' | 'new' | 'removed',
      oldContent: diff.sop1Text,
      newContent: diff.sop2Text,
      trainingNotes: diff.impact || '',
      severity: diff.severity || 'medium'
    })),
    summary: {
      totalChanges: differences.length,
      criticalChanges: criticalCount,
      trainingTimeEstimate: criticalCount > 3 ? '2-4 hours' : criticalCount > 0 ? '1-2 hours' : '30 minutes'
    }
  };
}

// ============================================
// Export to Word (.docx)
// ============================================

export async function exportDeltaModuleToWord(deltaModule: DeltaMicroModule): Promise<void> {
  const doc = new DocxDocument({
    sections: [{
      properties: {},
      children: [
        // Header
        new Paragraph({
          children: [
            new TextRun({ text: 'DELTA TRAINING MODULE', bold: true, size: 32 })
          ],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'SOP Change Summary & Training Requirements', italics: true, size: 24 })
          ],
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({ text: '' }),

        // SOP Header Info
        new Paragraph({
          children: [new TextRun({ text: 'Document Information', bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Title:', bold: true })] })] }),
                new TableCell({ children: [new Paragraph(deltaModule.sopHeader.title)] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Document ID:', bold: true })] })] }),
                new TableCell({ children: [new Paragraph(deltaModule.sopHeader.documentId)] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Version Change:', bold: true })] })] }),
                new TableCell({ children: [new Paragraph(`${deltaModule.sopHeader.oldVersion} → ${deltaModule.sopHeader.newVersion}`)] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Department:', bold: true })] })] }),
                new TableCell({ children: [new Paragraph(deltaModule.sopHeader.department)] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Effective Date:', bold: true })] })] }),
                new TableCell({ children: [new Paragraph(deltaModule.sopHeader.effectiveDate)] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Estimated Training Time:', bold: true })] })] }),
                new TableCell({ children: [new Paragraph(deltaModule.summary.trainingTimeEstimate)] })
              ]
            })
          ]
        }),
        new Paragraph({ text: '' }),

        // Summary
        new Paragraph({
          children: [new TextRun({ text: 'Change Summary', bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Total Changes: ${deltaModule.summary.totalChanges}` }),
            new TextRun({ text: ` | Critical Changes: ${deltaModule.summary.criticalChanges}`, bold: deltaModule.summary.criticalChanges > 0 })
          ]
        }),
        new Paragraph({ text: '' }),

        // Changed Sections
        new Paragraph({
          children: [new TextRun({ text: 'Changed Sections (Training Required)', bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1
        }),
        ...deltaModule.changedSections.flatMap((section, idx) => [
          new Paragraph({
            children: [
              new TextRun({ text: `${idx + 1}. ${section.sectionTitle}`, bold: true, size: 24 }),
              new TextRun({ text: ` [${section.changeType.toUpperCase()}]`, color: section.changeType === 'removed' ? 'FF0000' : section.changeType === 'new' ? '00AA00' : 'FFA500' }),
              new TextRun({ text: ` - ${section.severity.toUpperCase()} PRIORITY`, bold: true, color: section.severity === 'high' ? 'FF0000' : section.severity === 'medium' ? 'FFA500' : '0000FF' })
            ],
            heading: HeadingLevel.HEADING_2
          }),
          ...(section.oldContent ? [
            new Paragraph({
              children: [new TextRun({ text: 'Previous Version:', bold: true })]
            }),
            new Paragraph({
              children: [new TextRun({ text: section.oldContent, italics: true })],
              indent: { left: 720 }
            })
          ] : []),
          ...(section.newContent ? [
            new Paragraph({
              children: [new TextRun({ text: 'New Version:', bold: true })]
            }),
            new Paragraph({
              children: [new TextRun({ text: section.newContent })],
              indent: { left: 720 }
            })
          ] : []),
          new Paragraph({
            children: [new TextRun({ text: 'Training Notes: ', bold: true }), new TextRun({ text: section.trainingNotes })]
          }),
          new Paragraph({ text: '' })
        ]),

        // Footer
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: `Generated: ${new Date(deltaModule.generatedAt).toLocaleString()}`, size: 18, color: '666666' }),
            new TextRun({ text: ` | By: ${deltaModule.generatedBy}`, size: 18, color: '666666' })
          ],
          alignment: AlignmentType.CENTER
        })
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Delta_Module_${deltaModule.sopHeader.documentId}_${deltaModule.sopHeader.newVersion}.docx`);
}

// ============================================
// Export to PDF
// ============================================

export function exportDeltaModuleToPDF(deltaModule: DeltaMicroModule): void {
  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DELTA TRAINING MODULE', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
  yPos += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'italic');
  doc.text('SOP Change Summary & Training Requirements', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
  yPos += 15;

  // Document Info Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Document Information', 14, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      ['Title:', deltaModule.sopHeader.title],
      ['Document ID:', deltaModule.sopHeader.documentId],
      ['Version Change:', `${deltaModule.sopHeader.oldVersion} → ${deltaModule.sopHeader.newVersion}`],
      ['Department:', deltaModule.sopHeader.department],
      ['Effective Date:', deltaModule.sopHeader.effectiveDate],
      ['Est. Training Time:', deltaModule.summary.trainingTimeEstimate]
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Change Summary', 14, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Total Changes: ${deltaModule.summary.totalChanges} | Critical Changes: ${deltaModule.summary.criticalChanges}`, 14, yPos);
  yPos += 10;

  // Changed Sections
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Changed Sections', 14, yPos);
  yPos += 5;

  const sectionsData = deltaModule.changedSections.map((section, idx) => [
    `${idx + 1}. ${section.sectionTitle}`,
    section.changeType.toUpperCase(),
    section.severity.toUpperCase(),
    section.oldContent?.substring(0, 50) + (section.oldContent && section.oldContent.length > 50 ? '...' : '') || 'N/A',
    section.newContent?.substring(0, 50) + (section.newContent && section.newContent.length > 50 ? '...' : '') || 'N/A'
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Section', 'Type', 'Priority', 'Previous', 'New']],
    body: sectionsData,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [100, 100, 200] }
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated: ${new Date(deltaModule.generatedAt).toLocaleString()} | By: ${deltaModule.generatedBy} | Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  doc.save(`Delta_Module_${deltaModule.sopHeader.documentId}_${deltaModule.sopHeader.newVersion}.pdf`);
}

// ============================================
// Audit Evidence Pack Export
// ============================================

export function generateAuditEvidencePack(
  comparisonResult: any,
  auditTrail: any[],
  user: string = 'system'
): AuditEvidencePack {
  return {
    id: `audit-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    generatedBy: user,
    comparisonDetails: {
      sop1: {
        id: comparisonResult.sop1Details?.id || '',
        title: comparisonResult.sop1Details?.title || '',
        version: comparisonResult.sop1Details?.version || ''
      },
      sop2: {
        id: comparisonResult.sop2Details?.id || '',
        title: comparisonResult.sop2Details?.title || '',
        version: comparisonResult.sop2Details?.version || ''
      },
      comparedAt: new Date().toISOString()
    },
    changeSummary: comparisonResult.summary || {
      totalSections: 0,
      identicalSections: 0,
      modifiedSections: 0,
      newSections: 0,
      removedSections: 0
    },
    differences: (comparisonResult.differences || []).map((d: any) => ({
      section: d.section,
      type: d.type,
      severity: d.severity,
      oldText: d.sop1Text,
      newText: d.sop2Text,
      impact: d.impact
    })),
    criticalChanges: comparisonResult.criticalChanges || [],
    approvalLog: [
      {
        action: 'COMPARISON_INITIATED',
        user: user,
        timestamp: new Date().toISOString(),
        comments: 'Automated comparison initiated'
      }
    ],
    auditTrail: auditTrail.filter(entry => 
      entry.action?.includes('SOP') || entry.action?.includes('COMPARISON')
    ).slice(0, 50)
  };
}

export function exportAuditEvidencePackToJSON(pack: AuditEvidencePack): void {
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  saveAs(blob, `Audit_Evidence_Pack_${pack.id}.json`);
}

export function exportAuditEvidencePackToPDF(pack: AuditEvidencePack): void {
  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('AUDIT EVIDENCE PACK', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
  yPos += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'italic');
  doc.text('SOP Comparison & Change Control Documentation', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
  yPos += 15;

  // Pack Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Pack ID: ${pack.id}`, 14, yPos);
  yPos += 5;
  doc.text(`Generated: ${new Date(pack.generatedAt).toLocaleString()}`, 14, yPos);
  yPos += 5;
  doc.text(`Generated By: ${pack.generatedBy}`, 14, yPos);
  yPos += 10;

  // Comparison Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Comparison Details', 14, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      ['SOP 1 (Baseline):', `${pack.comparisonDetails.sop1.title} (v${pack.comparisonDetails.sop1.version})`],
      ['SOP 2 (Comparison):', `${pack.comparisonDetails.sop2.title} (v${pack.comparisonDetails.sop2.version})`],
      ['Compared At:', new Date(pack.comparisonDetails.comparedAt).toLocaleString()]
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Change Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Change Summary', 14, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Count']],
    body: [
      ['Total Sections', pack.changeSummary.totalSections.toString()],
      ['Identical', pack.changeSummary.identicalSections.toString()],
      ['Modified', pack.changeSummary.modifiedSections.toString()],
      ['New', pack.changeSummary.newSections.toString()],
      ['Removed', pack.changeSummary.removedSections.toString()]
    ],
    theme: 'striped',
    styles: { fontSize: 10 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Critical Changes
  if (pack.criticalChanges.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(200, 0, 0);
    doc.text('Critical Changes', 14, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Critical Change']],
      body: pack.criticalChanges.map(c => [c]),
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [200, 50, 50] }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Add new page for audit trail
  doc.addPage();
  yPos = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Audit Trail', 14, yPos);
  yPos += 5;

  const auditData = pack.auditTrail.slice(0, 20).map(entry => [
    entry.action,
    entry.user,
    new Date(entry.timestamp).toLocaleString()
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Action', 'User', 'Timestamp']],
    body: auditData,
    theme: 'striped',
    styles: { fontSize: 8 }
  });

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Audit Evidence Pack ${pack.id} | Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  doc.save(`Audit_Evidence_Pack_${pack.id}.pdf`);
}

// ============================================
// Template Download for Role Mapping
// ============================================

export async function downloadRoleMappingTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  
  const workbook = XLSX.utils.book_new();

  // Roles sheet
  const rolesData = [
    ['Role Name', 'Department', 'Description', 'SOP IDs', 'Training Modules', 'Certification Required'],
    ['QC Analyst', 'Quality Control', 'Performs quality control testing', 'SOP-QC-001,SOP-QC-002', 'QC Basics,Lab Safety', 'Yes'],
    ['Lab Technician', 'R&D', 'Supports research activities', 'SOP-RD-001,SOP-RD-002', 'Lab Safety,Equipment Training', 'No'],
    ['Production Operator', 'Manufacturing', 'Operates production equipment', 'SOP-MFG-001,SOP-MFG-002', 'GMP Training,Equipment Operation', 'Yes']
  ];
  const rolesSheet = XLSX.utils.aoa_to_sheet(rolesData);
  XLSX.utils.book_append_sheet(workbook, rolesSheet, 'Roles');

  // Mappings sheet
  const mappingsData = [
    ['SOP ID', 'Role Name', 'Relevant Sections', 'Mandatory'],
    ['SOP-QC-001', 'QC Analyst', '3.1,3.2,4.1', 'Yes'],
    ['SOP-QC-002', 'QC Analyst', '2.1,2.2', 'Yes'],
    ['SOP-RD-001', 'Lab Technician', '1.1,2.1,3.1', 'Yes']
  ];
  const mappingsSheet = XLSX.utils.aoa_to_sheet(mappingsData);
  XLSX.utils.book_append_sheet(workbook, mappingsSheet, 'Mappings');

  // Curricula sheet
  const curriculaData = [
    ['Module Name', 'Role Name', 'SOP IDs', 'Certification Required', 'Recertification Months'],
    ['QC Basics', 'QC Analyst', 'SOP-QC-001,SOP-QC-002', 'Yes', '12'],
    ['Lab Safety', 'QC Analyst', 'SOP-SAFETY-001', 'Yes', '24'],
    ['Lab Safety', 'Lab Technician', 'SOP-SAFETY-001', 'Yes', '24']
  ];
  const curriculaSheet = XLSX.utils.aoa_to_sheet(curriculaData);
  XLSX.utils.book_append_sheet(workbook, curriculaSheet, 'Curricula');

  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'Role_Mapping_Template.xlsx');
}
