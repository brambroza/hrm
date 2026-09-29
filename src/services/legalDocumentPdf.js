/**
 * @file PDF rendering of statutory documents. The contents come from
 * src/lib/legalDocuments/builders; this file only lays them out.
 */
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { THAI_FONT, useThaiFont } from '@/lib/pdfThaiFont';
import { wrapThai } from '@/lib/legalDocuments/builders';

const tableFont = {
  styles: { font: THAI_FONT, fontStyle: 'normal', fontSize: 9, cellPadding: 1.5, overflow: 'linebreak' },
  headStyles: { font: THAI_FONT, fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.1 },
  footStyles: { font: THAI_FONT, fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.1 },
};

/**
 * Strip characters that are not safe in a file name.
 * @param {string} value - Text to use in a file name.
 * @returns {string} Safe text.
 */
export const fileSafe = (value) => String(value ?? '').replace(/[\\/:*?"<>|\s]+/g, '_');

/**
 * Print the heading shared by the tabular documents.
 * @param {import('jspdf').jsPDF} doc - Document.
 * @param {string} title - Document title.
 * @param {string[]} lines - Lines under the title.
 * @returns {number} Y position where the body starts.
 */
const heading = (doc, title, lines) => {
  const centre = doc.internal.pageSize.getWidth() / 2;
  doc.setFont(THAI_FONT, 'bold');
  doc.setFontSize(15);
  doc.text(title, centre, 15, { align: 'center', maxWidth: doc.internal.pageSize.getWidth() - 30 });
  doc.setFont(THAI_FONT, 'normal');
  doc.setFontSize(11);
  let y = 23;
  lines.filter(Boolean).forEach((line) => {
    doc.text(line, centre, y, { align: 'center' });
    y += 6;
  });
  return y + 1;
};

/**
 * Number every page.
 * @param {import('jspdf').jsPDF} doc - Document.
 * @returns {void}
 */
const numberPages = (doc) => {
  const total = doc.internal.getNumberOfPages();
  const { width, height } = { width: doc.internal.pageSize.getWidth(), height: doc.internal.pageSize.getHeight() };
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setFont(THAI_FONT, 'normal');
    doc.setFontSize(9);
    doc.text(`หน้า ${page} / ${total}`, width - 12, height - 8, { align: 'right' });
  }
};

/**
 * Employee register as a landscape A4 table.
 * @param {import('@/lib/legalDocuments/builders').EmployeeRegister} register - Built register.
 * @param {(file: string) => Promise<ArrayBuffer>} [loadFont] - Custom font reader, used by tests.
 * @returns {Promise<import('jspdf').jsPDF>} The document.
 */
export const buildEmployeeRegisterPdf = async (register, loadFont) => {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
  await useThaiFont(doc, loadFont);
  const startY = heading(doc, register.title, [register.company, `ข้อมูล ณ วันที่ ${register.asOf}`]);

  doc.autoTable({
    startY,
    head: [register.columns.map((column) => column.label)],
    body: register.rows.map((row) => register.columns.map((column) => row[column.key])),
    theme: 'grid',
    ...tableFont,
    columnStyles: { 0: { halign: 'center', cellWidth: 14 }, 9: { halign: 'right' } },
    margin: { left: 10, right: 10, bottom: 14 },
  });
  numberPages(doc);
  return doc;
};

/**
 * Wage payment record as a landscape A4 table with a signature column.
 * @param {import('@/lib/legalDocuments/builders').WageRecord} record - Built record.
 * @param {(file: string) => Promise<ArrayBuffer>} [loadFont] - Custom font reader, used by tests.
 * @returns {Promise<import('jspdf').jsPDF>} The document.
 */
export const buildWageRecordPdf = async (record, loadFont) => {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
  await useThaiFont(doc, loadFont);
  const startY = heading(doc, record.title, [record.company, `งวด ${record.period}`]);
  const right = { halign: 'right' };

  doc.autoTable({
    startY,
    head: [record.columns.map((column) => column.label)],
    body: record.rows.map((row) => record.columns.map((column) => row[column.key])),
    foot: [['', '', 'รวม', '', record.totals.wage, '', '', record.totals.other, record.totals.deductions, record.totals.net, '']],
    showFoot: 'lastPage',
    theme: 'grid',
    ...tableFont,
    bodyStyles: { minCellHeight: 9, valign: 'middle' },
    // Column styles do not reach the footer, so totals are aligned here.
    didParseCell: (cell) => {
      if (cell.section === 'foot' && cell.column.index >= 4) cell.cell.styles.halign = 'right';
    },
    columnStyles: { 0: { halign: 'center', cellWidth: 14 }, 4: right, 5: right, 6: right, 7: right, 8: right, 9: right, 10: { cellWidth: 38 } },
    margin: { left: 10, right: 10, bottom: 14 },
  });

  doc.setFont(THAI_FONT, 'normal');
  doc.setFontSize(9);
  doc.text(
    `ช่อง ${record.unavailable.join(' ')} ให้กรอกเพิ่มหากมีการจ่าย ระบบยังไม่คำนวณรายการเหล่านี้`,
    10,
    Math.min(doc.lastAutoTable.finalY + 7, doc.internal.pageSize.getHeight() - 10),
  );
  numberPages(doc);
  return doc;
};

/**
 * Certificate of employment as a portrait A4 letter.
 * @param {import('@/lib/legalDocuments/builders').WorkCertificate} certificate - Built certificate.
 * @param {{ address?: string, phone?: string }} [company] - Letterhead details.
 * @param {(file: string) => Promise<ArrayBuffer>} [loadFont] - Custom font reader, used by tests.
 * @returns {Promise<import('jspdf').jsPDF>} The document.
 * @throws {Error} When the certificate has problems that stop it being issued.
 */
export const buildWorkCertificatePdf = async (certificate, company = {}, loadFont) => {
  if (certificate.problems.length) throw new Error(certificate.problems.join(' / '));

  const doc = new jsPDF({ format: 'a4' });
  await useThaiFont(doc, loadFont);
  const left = 25;
  const width = 160;

  doc.setFont(THAI_FONT, 'bold');
  doc.setFontSize(16);
  doc.text(certificate.signatory.company, 105, 25, { align: 'center' });
  doc.setFont(THAI_FONT, 'normal');
  doc.setFontSize(10);
  const letterhead = [company.address, company.phone && `โทร ${company.phone}`].filter(Boolean);
  letterhead.forEach((line, index) => doc.text(line, 105, 32 + index * 5, { align: 'center', maxWidth: width }));
  doc.line(left, 45, left + width, 45);

  doc.setFont(THAI_FONT, 'bold');
  doc.setFontSize(18);
  doc.text(certificate.title, 105, 62, { align: 'center' });

  doc.setFont(THAI_FONT, 'normal');
  doc.setFontSize(14);
  let y = 80;
  const measure = (piece) => doc.getTextWidth(piece);
  certificate.paragraphs.forEach((paragraph) => {
    // First line indented, as Thai letters are written.
    const indent = 15;
    const lines = wrapThai(paragraph, width - indent, measure);
    const rest = lines.length > 1 ? wrapThai(lines.slice(1).join(''), width, measure) : [];
    doc.text(lines[0] || '', left + indent, y);
    y += 9;
    rest.forEach((line) => {
      doc.text(line, left, y);
      y += 9;
    });
    y += 4;
  });

  y += 25;
  const centre = 140;
  doc.text('ลงชื่อ ......................................................', centre, y, { align: 'center' });
  doc.text(`( ${certificate.signatory.name || '......................................................'} )`, centre, y + 9, { align: 'center' });
  doc.text(certificate.signatory.title, centre, y + 18, { align: 'center' });
  doc.text(certificate.signatory.company, centre, y + 27, { align: 'center' });
  return doc;
};
