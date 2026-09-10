import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Collection, RecordItem, FieldDef } from '../types';

interface PDFExportOptions {
  collection: Collection;
  tabId: string;
  records: RecordItem[];
  type: 'simplified' | 'detailed';
}

export function generateCollectionPDF({ collection, tabId, records, type }: PDFExportOptions) {
  const currentTab = collection.tabs?.find(t => t.id === tabId);
  const tabRecords = records
    .filter(r => r.collectionId === collection.id && r.tabId === tabId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Determine fields to include
  let fieldsToInclude: FieldDef[] = [];

  if (type === 'simplified') {
    if (collection.simplifiedViewFieldIds && collection.simplifiedViewFieldIds.length > 0) {
      fieldsToInclude = collection.fields.filter(f => collection.simplifiedViewFieldIds?.includes(f.id));
    } else {
      fieldsToInclude = collection.fields;
    }
  } else {
    // Detailed exports all fields
    fieldsToInclude = collection.fields;
  }

  // If no fields found, fallback to all
  if (fieldsToInclude.length === 0) {
    fieldsToInclude = collection.fields;
  }

  // Determine orientation
  const isLandscape = fieldsToInclude.length > 5 || type === 'detailed';
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Main Document Title (Bold & Centered)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39); // #111827
  const titleText = `${collection.name} - ${currentTab?.name || 'Preference Form'}`;
  doc.text(titleText, pageWidth / 2, 20, { align: 'center' });

  // 2. Subtitle / Metadata (Refined Gray & Centered) - Tab name already in title, so not repeated in subtext
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // #6b7280

  const subtitleParts: string[] = [];
  if (collection.description) {
    subtitleParts.push(collection.description);
  }
  subtitleParts.push(`Total: ${tabRecords.length} Items`);
  if (type === 'simplified') {
    subtitleParts.push('Simplified Summary');
  }

  const subtitleText = subtitleParts.join('  |  ');
  doc.text(subtitleText, pageWidth / 2, 27, { align: 'center' });

  // 3. Prepare Table Headers and Body Data
  const head = [
    [
      'No.',
      ...fieldsToInclude.map(f => f.name)
    ]
  ];

  const body = tabRecords.map((rec, index) => {
    const rowCells: any[] = [`#${index + 1}`];

    fieldsToInclude.forEach(field => {
      const val = rec.data[field.id];
      if (field.type === 'checkbox' || field.type === 'tag') {
        if (val) {
          rowCells.push(field.type === 'tag' ? field.name : 'Yes');
        } else {
          rowCells.push('-');
        }
      } else if (field.type === 'date') {
        rowCells.push(val ? new Date(val).toLocaleDateString() : '-');
      } else {
        rowCells.push(val !== undefined && val !== null && val !== '' ? String(val) : '-');
      }
    });

    return rowCells;
  });

  // Calculate dynamic column styles
  const columnStyles: { [key: number]: any } = {
    0: {
      fontStyle: 'bold',
      halign: 'left',
      cellWidth: 16,
      textColor: [17, 24, 39],
    }
  };

  // Give the first data column (often Name/Title) more width if portrait
  if (fieldsToInclude.length <= 4) {
    columnStyles[1] = { cellWidth: 'auto', fontStyle: 'normal' };
  }

  // 4. Generate AutoTable with Reference Design (Crisp borders, generous padding, clean white rows)
  autoTable(doc, {
    startY: 34,
    head: head,
    body: body,
    theme: 'plain',
    margin: { left: 14, right: 14, top: 14, bottom: 20 },
    styles: {
      font: 'helvetica',
      fontSize: 9.5,
      textColor: [31, 41, 55], // #1f2937
      cellPadding: { top: 7, bottom: 7, left: 5, right: 5 },
      overflow: 'linebreak',
      valign: 'top',
      fillColor: [255, 255, 255],
    },
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 10,
      textColor: [17, 24, 39], // #111827
      cellPadding: { top: 6, bottom: 6, left: 5, right: 5 },
      fillColor: [255, 255, 255],
    },
    columnStyles: columnStyles,
    didDrawCell: (data) => {
      // Draw thick solid dark line right under header row
      if (data.section === 'head' && data.row.index === 0) {
        doc.setDrawColor(17, 24, 39);
        doc.setLineWidth(1.2);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }

      // Draw thin subtle light-gray separator line under each body row
      if (data.section === 'body') {
        doc.setDrawColor(229, 231, 235); // #e5e7eb
        doc.setLineWidth(0.4);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }
    },
    didDrawPage: (data) => {
      // Page number footer
      const pageStr = `Page ${doc.getNumberOfPages()}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(156, 163, 175); // #9ca3af
      doc.text(pageStr, pageWidth - 16, pageHeight - 10, { align: 'right' });
    }
  });

  // Save the generated PDF
  const sanitizedCollection = collection.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedTab = (currentTab?.name || 'export').replace(/[^a-zA-Z0-9_-]/g, '_');
  const typeLabel = type === 'simplified' ? 'Simplified' : 'Detailed';

  doc.save(`${sanitizedCollection}_${sanitizedTab}_${typeLabel}.pdf`);
}
