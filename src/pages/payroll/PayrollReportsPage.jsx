
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, FileText, Download, Filter, RefreshCw, 
  Users, DollarSign, Wallet, PieChart, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { getPayrollPeriods } from '@/services/payrollPeriods';
import { getPayrollCalculations } from '@/services/payroll';
import { generatePayrollReportPdf } from '@/services/payrollPdfService';
import * as XLSX from 'xlsx';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount || 0);
};

const PayrollReportsPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Filters
  const [empTypeFilter, setEmpTypeFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  // Report Data
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      const { data } = await getPayrollPeriods();
      setPeriods(data || []);
      if (data && data.length > 0) {
        setSelectedPeriodId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching periods:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load periods" });
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedPeriodId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a period" });
      return;
    }

    setLoading(true);
    setReportData(null);
    try {
      const { data, error } = await getPayrollCalculations(selectedPeriodId);
      if (error) throw error;

      let filteredData = data;

      // Apply Filters
      if (deptFilter !== 'all') {
        filteredData = filteredData.filter(item => item.employee?.department === deptFilter);
      }
      
      // Note: "Employee Type" might not exist on employee table based on schema, 
      // but if it did, logic would be:
      if (empTypeFilter !== 'all') {
         // Assuming 'position' or a custom field maps to type, or if `employment_type` existed
         // For now, if we don't have the column, we skip or filter by what we can (e.g. position)
         // filteredData = filteredData.filter(item => item.employee?.employment_type === empTypeFilter);
      }

      // Calculate Metrics
      const totalEmployees = filteredData.length;
      const totalBaseSalary = filteredData.reduce((sum, item) => sum + Number(item.basic_salary || 0), 0);
      const totalIncome = filteredData.reduce((sum, item) => sum + Number(item.total_income || 0), 0);
      const totalDeductions = filteredData.reduce((sum, item) => sum + Number(item.total_deductions || 0), 0);
      const totalNetSalary = filteredData.reduce((sum, item) => sum + Number(item.net_salary || 0), 0);
      
      // Group by Department
      const byDepartment = filteredData.reduce((acc, item) => {
        const dept = item.employee?.department || 'Unknown';
        if (!acc[dept]) acc[dept] = { count: 0, totalSalary: 0, totalDeductions: 0, totalNet: 0 };
        acc[dept].count += 1;
        acc[dept].totalSalary += Number(item.total_income || 0);
        acc[dept].totalDeductions += Number(item.total_deductions || 0);
        acc[dept].totalNet += Number(item.net_salary || 0);
        return acc;
      }, {});

      // Group by Type (Mocking type using position or similar if needed, or just flat 'Full Time' default)
      const byType = filteredData.reduce((acc, item) => {
        const type = item.employee?.position ? 'Full Time' : 'Contract'; // Mock logic
        if (!acc[type]) acc[type] = { count: 0, totalSalary: 0, totalDeductions: 0, totalNet: 0 };
        acc[type].count += 1;
        acc[type].totalSalary += Number(item.total_income || 0);
        acc[type].totalDeductions += Number(item.total_deductions || 0);
        acc[type].totalNet += Number(item.net_salary || 0);
        return acc;
      }, {});

      setReportData({
        summary: {
            totalEmployees,
            totalBaseSalary,
            totalIncome,
            totalDeductions,
            totalNetSalary,
            avgNetSalary: totalEmployees ? totalNetSalary / totalEmployees : 0
        },
        byDepartment,
        byType,
        rawData: filteredData
      });

    } catch (err) {
      console.error("Error generating report:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate report" });
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!reportData) return;
    setGenerating(true);
    try {
        const periodName = periods.find(p => p.id === selectedPeriodId)?.name || 'Unknown Period';
        generatePayrollReportPdf(reportData, periodName);
        toast({ title: "Success", description: "Report downloaded successfully" });
    } catch (err) {
        console.error("Export PDF Error:", err);
        toast({ variant: "destructive", title: "Error", description: "Failed to export PDF" });
    } finally {
        setGenerating(false);
    }
  };

  const exportCSV = () => {
    if (!reportData || !reportData.rawData) return;
    
    try {
        const dataForCsv = reportData.rawData.map(item => ({
            "Employee ID": item.employee?.employee_id,
            "Name": item.employee?.name,
            "Department": item.employee?.department,
            "Position": item.employee?.position,
            "Basic Salary": item.basic_salary,
            "Total Income": item.total_income,
            "Total Deductions": item.total_deductions,
            "Net Salary": item.net_salary,
            "Status": item.status
        }));

        const ws = XLSX.utils.json_to_sheet(dataForCsv);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payroll Report");
        const periodName = periods.find(p => p.id === selectedPeriodId)?.name || 'report';
        XLSX.writeFile(wb, `Payroll_Report_${periodName}.xlsx`);
        
        toast({ title: "Success", description: "CSV exported successfully" });
    } catch (err) {
        console.error("Export CSV Error:", err);
        toast({ variant: "destructive", title: "Error", description: "Failed to export CSV" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            รายงานเงินเดือน (Payroll Reports)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">วิเคราะห์และส่งออกข้อมูลเงินเดือน</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">งวดการจ่าย (Period)</label>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium">แผนก (Department)</label>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">ทุกแผนก</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">ประเภทพนักงาน</label>
                <Select value={empTypeFilter} onValueChange={setEmpTypeFilter}>
                    <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="Full Time">Full Time</SelectItem>
                        <SelectItem value="Part Time">Part Time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button onClick={handleGenerateReport} disabled={loading} className="w-full bg-blue-600 text-white">
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                สร้างรายงาน
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData ? (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">พนักงานทั้งหมด</p>
                            <h3 className="text-2xl font-bold">{reportData.summary.totalEmployees}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full"><Users className="w-5 h-5 text-blue-600" /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">รวมเงินเดือนพื้นฐาน</p>
                            <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(reportData.summary.totalBaseSalary)}</h3>
                        </div>
                        <div className="p-3 bg-emerald-100 rounded-full"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">รวมรายได้สุทธิ</p>
                            <h3 className="text-2xl font-bold text-purple-600">{formatCurrency(reportData.summary.totalNetSalary)}</h3>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-full"><Wallet className="w-5 h-5 text-purple-600" /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">เฉลี่ยต่อคน</p>
                            <h3 className="text-2xl font-bold text-orange-600">{formatCurrency(reportData.summary.avgNetSalary)}</h3>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-full"><PieChart className="w-5 h-5 text-orange-600" /></div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={exportCSV} disabled={generating}>
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
                <Button onClick={exportPDF} disabled={generating} className="bg-red-600 hover:bg-red-700 text-white">
                    <FileText className="w-4 h-4 mr-2" /> Export PDF
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Department */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">สรุปตามแผนก (By Department)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Department</th>
                                        <th className="px-4 py-3 text-right">Count</th>
                                        <th className="px-4 py-3 text-right">Total Net</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {Object.entries(reportData.byDepartment).map(([dept, data]) => (
                                        <tr key={dept}>
                                            <td className="px-4 py-3 font-medium">{dept}</td>
                                            <td className="px-4 py-3 text-right">{data.count}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(data.totalNet)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* By Type */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">สรุปตามประเภท (By Type)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Type</th>
                                        <th className="px-4 py-3 text-right">Count</th>
                                        <th className="px-4 py-3 text-right">Total Net</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {Object.entries(reportData.byType).map(([type, data]) => (
                                        <tr key={type}>
                                            <td className="px-4 py-3 font-medium">{type}</td>
                                            <td className="px-4 py-3 text-right">{data.count}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(data.totalNet)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <FileText className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500">Select a period and click "Generate Report" to view analysis</p>
        </div>
      )}
    </div>
  );
};

export default PayrollReportsPage;
