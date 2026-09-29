import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatThaiDateTime, getThaiISODate } from '@/utils/helpers';
import { THAI_FONT, useThaiFont } from '@/lib/pdfThaiFont';
import { formatBaht } from '@/lib/money';

/** Table styling shared by every table so Thai text renders in the body and the header. */
const tableFont = {
  styles: { font: THAI_FONT, fontStyle: 'normal' },
  headStyles: { font: THAI_FONT, fontStyle: 'bold' },
};

/**
 * Strip characters that are not safe in a file name.
 * @param {string} value - Text to use in a file name.
 * @returns {string} Safe text.
 */
const fileSafe = (value) => String(value ?? '').replace(/[\\/:*?"<>|\s]+/g, '_');

/**
 * Build a payslip document.
 * @param {object} payrollData - Figures: basic_salary, total_income, total_deductions, net_salary, periodName, allowances, deductions.
 * @param {object} employeeData - name, employee_id, department, position.
 * @param {object} companyData - name, address, phone, email of the employer.
 * @param {(file: string) => Promise<ArrayBuffer>} [loadFont] - Custom font reader, used by tests.
 * @returns {Promise<import('jspdf').jsPDF>} The finished document.
 */
export const buildPayrollSlipPdf = async (payrollData, employeeData, companyData, loadFont) => {
  const doc = new jsPDF();
  await useThaiFont(doc, loadFont);

  doc.setFont(THAI_FONT, 'bold');
  doc.setFontSize(20);
  doc.text(companyData?.name || '-', 105, 20, { align: 'center' });

  doc.setFont(THAI_FONT, 'normal');
  doc.setFontSize(11);
  if (companyData?.address) doc.text(companyData.address, 105, 29, { align: 'center' });
  const contact = [companyData?.phone && `โทร ${companyData.phone}`, companyData?.email].filter(Boolean).join(' · ');
  if (contact) doc.text(contact, 105, 36, { align: 'center' });

  doc.line(15, 43, 195, 43);

  doc.setFont(THAI_FONT, 'bold');
  doc.setFontSize(17);
  doc.text('สลิปเงินเดือน', 105, 54, { align: 'center' });

  doc.setFont(THAI_FONT, 'normal');
  doc.setFontSize(12);
  doc.text(`งวด ${payrollData?.periodName || '-'}`, 105, 62, { align: 'center' });

  doc.setFontSize(11);
  const leftColX = 15;
  const rightColX = 110;
  let startY = 75;

  doc.text(`ชื่อ-สกุล: ${employeeData?.name || '-'}`, leftColX, startY);
  doc.text(`รหัสพนักงาน: ${employeeData?.employee_id || '-'}`, rightColX, startY);

  startY += 8;
  doc.text(`แผนก: ${employeeData?.department || '-'}`, leftColX, startY);
  doc.text(`ตำแหน่ง: ${employeeData?.position || '-'}`, rightColX, startY);

  const earnings = [
    ['เงินเดือน', formatBaht(payrollData?.basic_salary)],
    ...(payrollData?.allowances || []).map((a) => [a.name, formatBaht(a.amount)]),
    ['รวมรายได้', formatBaht(payrollData?.total_income)],
  ];

  doc.autoTable({
    startY: startY + 15,
    head: [['รายได้', 'บาท']],
    body: earnings,
    theme: 'grid',
    ...tableFont,
    headStyles: { ...tableFont.headStyles, fillColor: [21, 128, 61] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 15, right: 110 },
  });
  const earningsEnd = doc.lastAutoTable.finalY;

  const deductions = [
    ...(payrollData?.deductions || []).map((d) => [d.name, formatBaht(d.amount)]),
    ['รวมรายการหัก', formatBaht(payrollData?.total_deductions)],
  ];

  doc.autoTable({
    startY: startY + 15,
    head: [['รายการหัก', 'บาท']],
    body: deductions,
    theme: 'grid',
    ...tableFont,
    headStyles: { ...tableFont.headStyles, fillColor: [185, 28, 28] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 110, right: 15 },
  });

  const finalY = Math.max(earningsEnd, doc.lastAutoTable.finalY) + 20;

  doc.setFillColor(240, 253, 244);
  doc.rect(15, finalY - 10, 180, 20, 'F');
  doc.setFont(THAI_FONT, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(21, 128, 61);
  doc.text('เงินได้สุทธิ', 20, finalY + 3);
  doc.setFontSize(16);
  doc.text(`${formatBaht(payrollData?.net_salary)} บาท`, 190, finalY + 3, { align: 'right' });

  doc.setFont(THAI_FONT, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`ออกเอกสารเมื่อ ${formatThaiDateTime(new Date())}`, 15, 280);
  doc.line(130, 265, 170, 265);
  doc.text('ผู้มีอำนาจลงนาม', 150, 270, { align: 'center' });

  return doc;
};

/**
 * Build a payslip and download it.
 * @param {object} payrollData - See buildPayrollSlipPdf.
 * @param {object} employeeData - See buildPayrollSlipPdf.
 * @param {object} companyData - See buildPayrollSlipPdf.
 * @returns {Promise<void>}
 */
export const generatePayrollSlipPdf = async (payrollData, employeeData, companyData) => {
  const doc = await buildPayrollSlipPdf(payrollData, employeeData, companyData);
  doc.save(`payroll_slip_${fileSafe(employeeData?.employee_id)}_${fileSafe(payrollData?.periodName)}.pdf`);
};

/**
 * Build the payroll summary report.
 * @param {{summary: object, byDepartment: object, byType: object}} reportData - Aggregated figures.
 * @param {string} periodName - Name of the payroll period.
 * @param {(file: string) => Promise<ArrayBuffer>} [loadFont] - Custom font reader, used by tests.
 * @returns {Promise<import('jspdf').jsPDF>} The finished document.
 */
export const buildPayrollReportPdf = async (reportData, periodName, loadFont) => {
  const doc = new jsPDF();
  await useThaiFont(doc, loadFont);

  doc.setFont(THAI_FONT, 'bold');
  doc.setFontSize(19);
  doc.text('รายงานสรุปเงินเดือน', 105, 20, { align: 'center' });

  doc.setFont(THAI_FONT, 'normal');
  doc.setFontSize(12);
  doc.text(`งวด ${periodName || '-'}`, 105, 30, { align: 'center' });
  doc.text(`ออกเอกสารเมื่อ ${formatThaiDateTime(new Date())}`, 105, 38, { align: 'center' });

  doc.setFont(THAI_FONT, 'bold');
  doc.setFontSize(14);
  doc.text('สรุปภาพรวม', 15, 50);

  const summary = reportData.summary;
  doc.autoTable({
    startY: 55,
    body: [
      ['จำนวนพนักงาน', String(summary.totalEmployees)],
      ['รวมเงินเดือน', formatBaht(summary.totalBaseSalary)],
      ['รวมรายได้', formatBaht(summary.totalIncome)],
      ['รวมรายการหัก', formatBaht(summary.totalDeductions)],
      ['รวมเงินได้สุทธิ', formatBaht(summary.totalNetSalary)],
    ],
    theme: 'plain',
    styles: { ...tableFont.styles, fontSize: 11, cellPadding: 2 },
    columnStyles: { 1: { fontStyle: 'bold', halign: 'right' } },
  });

  /**
   * Draw one grouped table, starting a new page when little room is left.
   * @param {string} title - Section heading.
   * @param {string} firstColumn - Heading of the grouping column.
   * @param {object} groups - Figures keyed by group name.
   * @param {number[]} color - RGB fill of the header row.
   */
  const groupedTable = (title, firstColumn, groups, color) => {
    let startY = doc.lastAutoTable.finalY + 15;
    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }

    doc.setFont(THAI_FONT, 'bold');
    doc.setFontSize(14);
    doc.text(title, 15, startY);

    doc.autoTable({
      startY: startY + 5,
      head: [[firstColumn, 'จำนวนคน', 'รวมรายได้', 'รายการหัก', 'เงินได้สุทธิ']],
      body: Object.entries(groups || {}).map(([name, data]) => [
        name,
        data.count,
        formatBaht(data.totalSalary),
        formatBaht(data.totalDeductions),
        formatBaht(data.totalNet),
      ]),
      theme: 'grid',
      ...tableFont,
      headStyles: { ...tableFont.headStyles, fillColor: color },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    });
  };

  groupedTable('แยกตามแผนก', 'แผนก', reportData.byDepartment, [29, 78, 216]);
  groupedTable('แยกตามประเภท', 'ประเภท', reportData.byType, [4, 120, 87]);

  return doc;
};

/**
 * Build the payroll summary report and download it.
 * @param {{summary: object, byDepartment: object, byType: object}} reportData - Aggregated figures.
 * @param {string} periodName - Name of the payroll period.
 * @returns {Promise<void>}
 */
export const generatePayrollReportPdf = async (reportData, periodName) => {
  const doc = await buildPayrollReportPdf(reportData, periodName);
  doc.save(`payroll_report_${getThaiISODate()}.pdf`);
};
