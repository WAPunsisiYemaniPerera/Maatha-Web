import { jsPDF } from 'jspdf';
import autoTable, { applyPlugin } from 'jspdf-autotable';
import { isHighRiskMother } from './securityValidators';

// Apply plugin if available
try {
  if (typeof applyPlugin === 'function') {
    applyPlugin(jsPDF);
  }
} catch (e) {
  console.warn('Could not applyPlugin on jsPDF:', e);
}

/**
 * Universal autoTable wrapper to support both plugin and functional invocation
 */
const renderAutoTable = (doc, options) => {
  try {
    if (typeof autoTable === 'function') {
      autoTable(doc, options);
    } else if (autoTable && typeof autoTable.default === 'function') {
      autoTable.default(doc, options);
    } else if (typeof doc.autoTable === 'function') {
      doc.autoTable(options);
    } else {
      console.error('No valid autoTable function found.');
    }
  } catch (err) {
    console.error('Error running autoTable:', err);
    throw err;
  }
};

/**
 * Safe text formatter for jsPDF standard fonts
 */
const cleanText = (val, fallback = '—') => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'object') {
    if (val.seconds !== undefined) {
      try {
        return new Date(val.seconds * 1000).toLocaleDateString('en-GB');
      } catch (e) {
        return fallback;
      }
    }
    return fallback;
  }
  return String(val);
};

// Helper to format date nicely
const getFormattedDateTime = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return { dateStr, timeStr, fullStr: `${dateStr} | ${timeStr}` };
};

// Draw official header on jsPDF document
const drawOfficialHeader = (doc, title, subtitle, refNumber) => {
  const { fullStr } = getFormattedDateTime();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Navy Blue Bar
  doc.setFillColor(15, 23, 42); // slate-900 / navy
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Sky Blue Accent Stripe
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 6, pageWidth, 2, 'F');

  // Header Box Background
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(10, 12, pageWidth - 20, 28, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.rect(10, 12, pageWidth - 20, 28, 'S');

  // Title Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('MAATHA - NATIONAL MATERNAL & CHILD HEALTH PORTAL', 15, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(String(title).toUpperCase(), 15, 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(subtitle || 'Official Administrative & Healthcare Intelligence Registry', 15, 33);

  // Reference & Metadata Box (Right Side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`DOC REF: ${refNumber || 'REF-MTH-' + Date.now().toString().slice(-6)}`, pageWidth - 15, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`ISSUED: ${fullStr}`, pageWidth - 15, 25, { align: 'right' });
  doc.text(`ISSUED BY: Super Administrator`, pageWidth - 15, 30, { align: 'right' });
  doc.text(`SECURITY: OFFICIAL / CONFIDENTIAL`, pageWidth - 15, 35, { align: 'right' });

  return 46; // Next Y-position
};

// Draw summary statistics cards in PDF
const drawSummaryStats = (doc, stats, startY) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardWidth = (pageWidth - 20 - (stats.length - 1) * 4) / stats.length;
  let curX = 10;

  stats.forEach((st) => {
    // Card background
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(curX, startY, cardWidth, 14, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    doc.roundedRect(curX, startY, cardWidth, 14, 2, 2, 'S');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(st.label.toUpperCase(), curX + cardWidth / 2, startY + 5, { align: 'center' });

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(st.color === 'red' ? 220 : st.color === 'blue' ? 37 : 15, st.color === 'red' ? 38 : st.color === 'blue' ? 99 : 23, st.color === 'red' ? 38 : st.color === 'blue' ? 235 : 42);
    doc.text(String(st.value), curX + cardWidth / 2, startY + 11, { align: 'center' });

    curX += cardWidth + 4;
  });

  return startY + 18;
};

// Draw Page Footer with page numbering
const setupPageFooters = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(10, pageHeight - 12, pageWidth - 10, pageHeight - 12);

    // Footer texts
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Ministry of Health, Sri Lanka • Family Health Bureau • Maatha Maternal System', 10, pageHeight - 7);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 10, pageHeight - 7, { align: 'right' });
  }
};

// ==========================================
// 1. NATIONAL MATERNAL STRATEGIC REPORT
// ==========================================
export const generateNationalSummaryPDF = ({ totalMOH, totalHospitals, totalMidwives, totalMothers, highRiskCount, districtCounts, trimesterCounts }) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = drawOfficialHeader(
    doc,
    'National Maternal Health Strategic Summary Report',
    'Comprehensive Healthcare Infrastructure, Clinical Registries & High-Risk Case Summary',
    'REF-MTH-NAT-' + Date.now().toString().slice(-6)
  );

  const stats = [
    { label: 'MOH Areas', value: totalMOH, color: 'blue' },
    { label: 'Hospitals', value: totalHospitals, color: 'blue' },
    { label: 'Midwives (PHM)', value: totalMidwives, color: 'blue' },
    { label: 'Reg. Mothers', value: totalMothers, color: 'blue' },
    { label: 'High-Risk Cases', value: highRiskCount, color: highRiskCount > 0 ? 'red' : 'blue' }
  ];

  const tableStartY = drawSummaryStats(doc, stats, startY);

  // Section 1: District-wise Breakdown Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text('1. DISTRICT-WISE HEALTHCARE DISTRIBUTION', 10, tableStartY + 4);

  const districtTableData = Object.entries(districtCounts || {}).map(([dist, count]) => {
    const pct = totalMothers > 0 ? ((count / totalMothers) * 100).toFixed(1) + '%' : '0%';
    return [cleanText(dist), String(count), pct];
  });

  renderAutoTable(doc, {
    startY: tableStartY + 7,
    head: [['District Name', 'Total Registered Mothers', 'National Percentage (%)']],
    body: districtTableData.length > 0 ? districtTableData : [['No District Data Available', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 10, right: 10 }
  });

  // Section 2: Trimester Distribution
  const trimStartY = (doc.lastAutoTable?.finalY || 120) + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text('2. PREGNANCY TRIMESTER & GESTATIONAL STAGES', 10, trimStartY);

  const trimData = [
    ['1st Trimester (1 - 12 Weeks)', String(trimesterCounts?.first || 0), totalMothers > 0 ? (((trimesterCounts?.first || 0) / totalMothers) * 100).toFixed(1) + '%' : '0%'],
    ['2nd Trimester (13 - 27 Weeks)', String(trimesterCounts?.second || 0), totalMothers > 0 ? (((trimesterCounts?.second || 0) / totalMothers) * 100).toFixed(1) + '%' : '0%'],
    ['3rd Trimester (28 - 40+ Weeks)', String(trimesterCounts?.third || 0), totalMothers > 0 ? (((trimesterCounts?.third || 0) / totalMothers) * 100).toFixed(1) + '%' : '0%']
  ];

  renderAutoTable(doc, {
    startY: trimStartY + 3,
    head: [['Gestational Phase', 'Active Mothers Count', 'National Proportion']],
    body: trimData,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 10, right: 10 }
  });

  setupPageFooters(doc);
  doc.save(`Maatha_National_Maternal_Health_Report_${Date.now().toString().slice(-6)}.pdf`);
};

// ==========================================
// 2. MOH ADMINS & AREAS DIRECTORY PDF
// ==========================================
export const generateMOHAdminsPDF = (admins, filterInfo = {}) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = drawOfficialHeader(
    doc,
    'MOH Administrative Officers & Areas Directory',
    `Official Registry of Medical Officers of Health & Area Divisions • Filters: District (${filterInfo.district || 'All'})`,
    'REF-MTH-MOH-' + Date.now().toString().slice(-6)
  );

  const stats = [
    { label: 'Total MOH Offices', value: admins.length, color: 'blue' },
    { label: 'Active Admins', value: admins.filter(a => (a.status || 'Active').toLowerCase() === 'active').length, color: 'blue' },
    { label: 'Districts Covered', value: new Set(admins.map(a => a.district).filter(Boolean)).size, color: 'blue' }
  ];

  const tableStartY = drawSummaryStats(doc, stats, startY);

  const tableRows = admins.map((adm, idx) => [
    idx + 1,
    cleanText(adm.fullName),
    cleanText(adm.nic),
    cleanText(adm.slmcNumber),
    cleanText(adm.mohArea),
    cleanText(adm.district),
    cleanText(adm.email),
    cleanText(adm.phone || adm.officePhone),
    cleanText(adm.status, 'Active')
  ]);

  renderAutoTable(doc, {
    startY: tableStartY + 2,
    head: [['#', 'Officer Name', 'NIC No', 'SLMC Reg', 'MOH Area', 'District', 'Official Email', 'Phone', 'Status']],
    body: tableRows.length > 0 ? tableRows : [['-', 'No Records Found', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 24 },
      3: { cellWidth: 22 },
      4: { cellWidth: 32 },
      5: { cellWidth: 24 },
      6: { cellWidth: 48 },
      7: { cellWidth: 28 },
      8: { cellWidth: 20, halign: 'center' }
    },
    margin: { left: 10, right: 10 }
  });

  setupPageFooters(doc);
  doc.save(`Maatha_MOH_Admins_Registry_${Date.now().toString().slice(-6)}.pdf`);
};

// ==========================================
// 3. HOSPITALS & CLINICAL FACILITIES PDF
// ==========================================
export const generateHospitalsPDF = (hospitals, filterInfo = {}) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = drawOfficialHeader(
    doc,
    'National Hospital Network & Clinical Facilities Directory',
    `Hospital Administration, Maternity Ward Capacities & Emergency Features • Filters: District (${filterInfo.district || 'All'})`,
    'REF-MTH-HSP-' + Date.now().toString().slice(-6)
  );

  const stats = [
    { label: 'Total Hospitals', value: hospitals.length, color: 'blue' },
    { label: 'With Labour Rooms', value: hospitals.filter(h => (h.hasLabourRoom || 'Yes') === 'Yes').length, color: 'blue' },
    { label: 'With NICU Units', value: hospitals.filter(h => (h.hasNicu || 'Yes') === 'Yes').length, color: 'blue' },
    { label: 'With Blood Banks', value: hospitals.filter(h => (h.hasBloodBank || 'Yes') === 'Yes').length, color: 'blue' }
  ];

  const tableStartY = drawSummaryStats(doc, stats, startY);

  const tableRows = hospitals.map((hsp, idx) => [
    idx + 1,
    cleanText(hsp.hospitalName),
    cleanText(hsp.hospitalType ? hsp.hospitalType.split('(')[0].trim() : '—'),
    cleanText(hsp.district),
    cleanText(hsp.adminName),
    cleanText(hsp.email),
    cleanText(hsp.hospitalPhone || hsp.adminPhone),
    `${cleanText(hsp.maternityWardCapacity, '0')} Beds`,
    `LR: ${cleanText(hsp.hasLabourRoom, 'Yes')} | NICU: ${cleanText(hsp.hasNicu, 'Yes')} | Blood: ${cleanText(hsp.hasBloodBank, 'Yes')}`
  ]);

  renderAutoTable(doc, {
    startY: tableStartY + 2,
    head: [['#', 'Hospital Name', 'Category / Type', 'District', 'Medical Superintendent', 'Email', 'Hotline', 'Capacity', 'Critical Facilities']],
    body: tableRows.length > 0 ? tableRows : [['-', 'No Records Found', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 44, fontStyle: 'bold' },
      2: { cellWidth: 32 },
      3: { cellWidth: 22 },
      4: { cellWidth: 36 },
      5: { cellWidth: 44 },
      6: { cellWidth: 26 },
      7: { cellWidth: 20, halign: 'center' },
      8: { cellWidth: 45 }
    },
    margin: { left: 10, right: 10 }
  });

  setupPageFooters(doc);
  doc.save(`Maatha_Hospital_Network_Directory_${Date.now().toString().slice(-6)}.pdf`);
};

// ==========================================
// 4. PUBLIC HEALTH MIDWIVES (PHM) PDF
// ==========================================
export const generateMidwivesPDF = (midwives, filterInfo = {}) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = drawOfficialHeader(
    doc,
    'Public Health Midwives (PHM) Field Staff Registry',
    `Field Healthcare Personnel, Assigned MOH Divisions & GN Coverage • Filters: District (${filterInfo.district || 'All'}), MOH (${filterInfo.mohArea || 'All'})`,
    'REF-MTH-MID-' + Date.now().toString().slice(-6)
  );

  const stats = [
    { label: 'Total Midwives', value: midwives.length, color: 'blue' },
    { label: 'Active Field Duty', value: midwives.filter(m => (m.status || 'Active').toLowerCase() === 'active').length, color: 'blue' },
    { label: 'MOH Areas Covered', value: new Set(midwives.map(m => m.mohArea).filter(Boolean)).size, color: 'blue' },
    { label: 'Districts', value: new Set(midwives.map(m => m.district).filter(Boolean)).size, color: 'blue' }
  ];

  const tableStartY = drawSummaryStats(doc, stats, startY);

  const tableRows = midwives.map((mid, idx) => [
    idx + 1,
    cleanText(mid.fullName),
    cleanText(mid.nic),
    cleanText(mid.employeeId),
    cleanText(mid.mohArea),
    cleanText(mid.district),
    cleanText(mid.serviceArea || mid.gnDivisions),
    cleanText(mid.phone),
    cleanText(mid.email),
    cleanText(mid.status, 'Active')
  ]);

  renderAutoTable(doc, {
    startY: tableStartY + 2,
    head: [['#', 'Midwife Name', 'NIC No', 'Emp ID / SLMC', 'MOH Area', 'District', 'Service Division / GN', 'Phone', 'Email', 'Duty Status']],
    body: tableRows.length > 0 ? tableRows : [['-', 'No Records Found', '-', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 40, fontStyle: 'bold' },
      2: { cellWidth: 24 },
      3: { cellWidth: 22 },
      4: { cellWidth: 30 },
      5: { cellWidth: 22 },
      6: { cellWidth: 40 },
      7: { cellWidth: 26 },
      8: { cellWidth: 45 },
      9: { cellWidth: 20, halign: 'center' }
    },
    margin: { left: 10, right: 10 }
  });

  setupPageFooters(doc);
  doc.save(`Maatha_Midwives_Registry_${Date.now().toString().slice(-6)}.pdf`);
};

// ==========================================
// 5. MATERNAL REGISTRY & HIGH RISK REPORT PDF
// ==========================================
export const generateMothersPDF = (mothers, filterInfo = {}) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const isHighRiskOnly = filterInfo.riskStatus === 'High Risk' || filterInfo.riskStatus === 'High-Risk';
  const reportTitle = isHighRiskOnly 
    ? 'High-Risk Critical Pregnancies Emergency Monitoring Report'
    : 'National Maternal Healthcare & Antenatal Registry';

  const startY = drawOfficialHeader(
    doc,
    reportTitle,
    `Clinical Status, Gestational Age, Assigned Caregivers & Emergency Information • Filters: District (${filterInfo.district || 'All'}), Risk (${filterInfo.riskStatus || 'All'})`,
    'REF-MTH-MTR-' + Date.now().toString().slice(-6)
  );

  const highRiskCount = mothers.filter(m => isHighRiskMother(m) || (m.riskStatus || '').toLowerCase().includes('high')).length;

  const stats = [
    { label: 'Total Mothers', value: mothers.length, color: 'blue' },
    { label: 'High-Risk Cases', value: highRiskCount, color: highRiskCount > 0 ? 'red' : 'blue' },
    { label: 'Normal / Low Risk', value: mothers.length - highRiskCount, color: 'blue' },
    { label: 'Districts Filtered', value: new Set(mothers.map(m => m.district).filter(Boolean)).size, color: 'blue' }
  ];

  const tableStartY = drawSummaryStats(doc, stats, startY);

  const tableRows = mothers.map((m, idx) => {
    const isHigh = isHighRiskMother(m) || (m.riskStatus || '').toLowerCase().includes('high');
    return [
      idx + 1,
      cleanText(m.fullName),
      cleanText(m.nic),
      m.age ? `${cleanText(m.age)} Yrs` : '—',
      cleanText(m.bloodGroup),
      m.gestationalAge ? `${cleanText(m.gestationalAge)} Wks` : '—',
      cleanText(m.edd),
      cleanText(m.district),
      cleanText(m.mohArea),
      cleanText(m.midwifeName),
      cleanText(m.phone || m.emergencyPhone),
      isHigh ? 'HIGH RISK' : 'NORMAL'
    ];
  });

  renderAutoTable(doc, {
    startY: tableStartY + 2,
    head: [['#', 'Mother Name', 'NIC No', 'Age', 'Blood', 'GA', 'EDD', 'District', 'MOH Area', 'Assigned Midwife', 'Emergency Tel', 'Risk Level']],
    body: tableRows.length > 0 ? tableRows : [['-', 'No Records Found', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { 
      fillColor: isHighRiskOnly ? [185, 28, 28] : [30, 58, 138], 
      textColor: 255, 
      fontStyle: 'bold', 
      fontSize: 8 
    },
    styles: { fontSize: 7.2, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 23 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 22 },
      7: { cellWidth: 20 },
      8: { cellWidth: 26 },
      9: { cellWidth: 32 },
      10: { cellWidth: 25 },
      11: { cellWidth: 23, halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 11) {
        if (data.cell.raw === 'HIGH RISK') {
          data.cell.styles.textColor = [220, 38, 38]; // Red
          data.cell.styles.fillColor = [254, 242, 242]; // Light red bg
        } else {
          data.cell.styles.textColor = [22, 101, 52]; // Green
        }
      }
    },
    margin: { left: 10, right: 10 }
  });

  setupPageFooters(doc);
  doc.save(`Maatha_${isHighRiskOnly ? 'High_Risk_Alert_List' : 'Maternal_Registry'}_${Date.now().toString().slice(-6)}.pdf`);
};

// ==========================================
// 6. CSV / EXCEL EXPORTER UTILITY
// ==========================================
export const exportToCSV = (filename, rows, headers) => {
  if (!rows || !rows.length) {
    alert("No data available to export to CSV.");
    return;
  }

  const escapeCSV = (str) => {
    if (str === null || str === undefined) return '""';
    const stringified = String(str).replace(/"/g, '""');
    return `"${stringified}"`;
  };

  const headerLine = headers.map(h => escapeCSV(h.label)).join(',');
  const rowLines = rows.map(row => {
    return headers.map(h => escapeCSV(row[h.key])).join(',');
  });

  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${Date.now().toString().slice(-6)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
