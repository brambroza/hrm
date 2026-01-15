
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// Note: In a real app, you'd import a Thai font like THSarabunNew-normal.js here. 
// For this environment, we'll use default fonts or simulate the structure.
// If actual Thai font support is strictly required, we'd need to add the font file and register it.
// Assuming basic English for structure or standard font fallback.

export const generatePayrollSlipPdf = (payrollData, employeeData, companyData) => {
  const doc = new jsPDF();
  
  // -- Setup Font (Mocking Thai font setup if file available, else use standard) --
  // doc.addFileToVFS('THSarabunNew-normal.ttf', fontBase64);
  // doc.addFont('THSarabunNew-normal.ttf', 'THSarabunNew', 'normal');
  // doc.setFont('THSarabunNew'); 

  // Header
  doc.setFontSize(22);
  doc.text(companyData?.name || "Company Name", 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(companyData?.address || "Company Address", 105, 30, { align: 'center' });
  doc.text(`Phone: ${companyData?.phone || '-'} | Email: ${companyData?.email || '-'}`, 105, 38, { align: 'center' });

  doc.line(15, 45, 195, 45);

  // Title
  doc.setFontSize(18);
  doc.text("PAYROLL SLIP / สลิปเงินเดือน", 105, 55, { align: 'center' });
  
  // Period Info
  doc.setFontSize(12);
  doc.text(`Period: ${payrollData?.periodName || '-'}`, 105, 63, { align: 'center' });

  // Employee Details
  doc.setFontSize(11);
  const leftColX = 15;
  const rightColX = 110;
  let startY = 75;

  doc.text(`Employee Name: ${employeeData?.name || '-'}`, leftColX, startY);
  doc.text(`Employee ID: ${employeeData?.employee_id || '-'}`, rightColX, startY);
  
  startY += 8;
  doc.text(`Department: ${employeeData?.department || '-'}`, leftColX, startY);
  doc.text(`Position: ${employeeData?.position || '-'}`, rightColX, startY);
  
  // Tables
  // Earnings
  const earnings = [
    ['Base Salary', parseFloat(payrollData?.basic_salary || 0).toFixed(2)],
    ...((payrollData?.allowances || []).map(a => [a.name, parseFloat(a.amount).toFixed(2)])),
    ['Total Earnings', parseFloat(payrollData?.total_income || 0).toFixed(2)]
  ];

  doc.autoTable({
    startY: startY + 15,
    head: [['Earnings / รายได้', 'Amount (THB)']],
    body: earnings,
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74] }, // Green-600
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 15, right: 110 } // Left side table
  });

  // Deductions
  const deductions = [
    ...((payrollData?.deductions || []).map(d => [d.name, parseFloat(d.amount).toFixed(2)])),
    ['Total Deductions', parseFloat(payrollData?.total_deductions || 0).toFixed(2)]
  ];

  doc.autoTable({
    startY: startY + 15,
    head: [['Deductions / รายหัก', 'Amount (THB)']],
    body: deductions,
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38] }, // Red-600
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 110, right: 15 } // Right side table
  });

  // Net Pay
  const finalY = Math.max(doc.lastAutoTable.finalY, startY + 15 + (earnings.length * 10)) + 20;
  
  doc.setFillColor(240, 253, 244); // Light green bg
  doc.rect(15, finalY - 10, 180, 20, 'F');
  doc.setFontSize(14);
  doc.setTextColor(22, 163, 74);
  doc.text("NET SALARY / เงินเดือนสุทธิ", 20, finalY + 3);
  doc.setFontSize(16);
  doc.text(`${parseFloat(payrollData?.net_salary || 0).toFixed(2)} THB`, 190, finalY + 3, { align: 'right' });
  
  doc.setTextColor(0,0,0);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 280);
  doc.text("Authorized Signature", 150, 270, { align: 'center' });
  doc.line(130, 265, 170, 265);

  doc.save(`payroll_slip_${employeeData?.employee_id}_${payrollData?.periodName}.pdf`);
};

export const generatePayrollReportPdf = (reportData, periodName) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text("PAYROLL REPORT / รายงานสรุปเงินเดือน", 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Period: ${periodName}`, 105, 30, { align: 'center' });
    doc.text(`Generated Date: ${new Date().toLocaleDateString('th-TH')}`, 105, 38, { align: 'center' });

    // Summary Section
    doc.setFontSize(14);
    doc.text("Summary / สรุปภาพรวม", 15, 50);
    
    const summaryData = [
        ['Total Employees', reportData.summary.totalEmployees.toString()],
        ['Total Base Salary', new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(reportData.summary.totalBaseSalary)],
        ['Total Income', new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(reportData.summary.totalIncome)],
        ['Total Deductions', new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(reportData.summary.totalDeductions)],
        ['Total Net Salary', new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(reportData.summary.totalNetSalary)]
    ];

    doc.autoTable({
        startY: 55,
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 2 },
        columnStyles: { 1: { fontStyle: 'bold', halign: 'right' } }
    });

    // Department Table
    let startY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("By Department / แยกตามแผนก", 15, startY);

    const deptBody = Object.entries(reportData.byDepartment).map(([dept, data]) => [
        dept,
        data.count,
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(data.totalSalary),
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(data.totalDeductions),
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(data.totalNet)
    ]);

    doc.autoTable({
        startY: startY + 5,
        head: [['Department', 'Count', 'Total Income', 'Deductions', 'Net Salary']],
        body: deptBody,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }, // Blue
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
    });

    // Employee Type Table
    startY = doc.lastAutoTable.finalY + 15;
    
    // Check if new page is needed
    if (startY > 250) {
        doc.addPage();
        startY = 20;
    }

    doc.setFontSize(14);
    doc.text("By Type / แยกตามประเภท", 15, startY);

    const typeBody = Object.entries(reportData.byType).map(([type, data]) => [
        type,
        data.count,
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(data.totalSalary),
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(data.totalDeductions),
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(data.totalNet)
    ]);

    doc.autoTable({
        startY: startY + 5,
        head: [['Type', 'Count', 'Total Income', 'Deductions', 'Net Salary']],
        body: typeBody,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }, // Emerald
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
    });

    doc.save(`payroll_report_${new Date().toISOString().split('T')[0]}.pdf`);
};
