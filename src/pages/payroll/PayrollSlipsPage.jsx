
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, Search, Download, Send, RefreshCw, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getPayrollPeriods } from '@/services/payrollPeriods';
import { getPayrollCalculations } from '@/services/payroll';
import { companyService } from '@/services/companies';
import { useAuth } from '@/contexts/AuthContext';
import { formatBaht } from '@/lib/money';
import { generatePayrollSlipPdf } from '@/services/payrollPdfService';

const PayrollSlipsPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { organizationId } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [slips, setSlips] = useState([]);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const loadPeriods = async () => {
        try {
            const { data, error } = await getPayrollPeriods();
            if (error) throw error;
            if (data && data.length > 0) {
                setPeriods(data);
                setSelectedPeriod(data[0].id);
            }
        } catch (err) {
            console.error("Error fetching periods:", err);
            toast({ variant: "destructive", title: t('common.error'), description: err.message });
        }
    };
    loadPeriods();
  }, []);

  const loadSlips = async () => {
      if (!selectedPeriod) return;
      setLoading(true);
      setError(null);
      console.log("Loading slips for period:", selectedPeriod);
      try {
          // A slip is a view of a calculation. Nothing ever wrote to the
          // payroll_slips table, so reading it always gave an empty list.
          const { data, error } = await getPayrollCalculations(selectedPeriod);
          if (error) throw error;
          setSlips((data || []).map((calculation) => ({ id: calculation.id, calculation })));
      } catch (err) {
          console.error("Error fetching slips:", err);
          setError("Failed to load payroll slips.");
          toast({ variant: "destructive", title: "Error", description: err.message });
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      if (selectedPeriod) loadSlips();
  }, [selectedPeriod]);

  // Handle PDF Generation
  const handleGeneratePdf = async (slip) => {
      try {
          if (!slip.calculation || !slip.calculation.employee) {
              throw new Error("Missing calculation or employee data");
          }

          toast({ title: "Generating PDF...", description: "Please wait." });
          
          const payrollData = {
              basic_salary: slip.calculation.basic_salary,
              total_income: slip.calculation.total_income,
              total_deductions: slip.calculation.total_deductions,
              net_salary: slip.calculation.net_salary,
              periodName: slip.calculation.period ? slip.calculation.period.name : "N/A",
              allowances: [], // Would normally pass detailed data here if available in jsonb
              deductions: []
          };
          
          const employeeData = {
              name: slip.calculation.employee.name,
              employee_id: slip.calculation.employee.employee_id,
              department: slip.calculation.employee.department || "N/A",
              position: slip.calculation.employee.position || "N/A"
          };
          
          // The employer printed on the slip is the organization on record.
          const company = await companyService.getCompany(organizationId);
          const companyData = {
              name: company?.name,
              address: company?.address,
              phone: company?.phone,
              email: company?.email
          };

          await generatePayrollSlipPdf(payrollData, employeeData, companyData);
          toast({ title: t('common.success'), description: t('payroll.slipDownloaded') });
      } catch (err) {
          console.error("Error generating PDF:", err);
          toast({ variant: "destructive", title: t('common.error'), description: err.message });
      }
  };

  // Filter Logic
  const filteredSlips = slips.filter(slip => {
      const empName = slip.calculation?.employee?.name?.toLowerCase() || '';
      const matchesSearch = empName.includes(searchTerm.toLowerCase());
      // Status filter mock - assuming we might have a status on slip or calculation
      const matchesStatus = statusFilter === 'all' || (slip.status || 'Generated') === statusFilter;
      return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-600" />
            {t('common.payroll')}: {t('payroll.slips')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View and distribute employee payslips</p>
        </div>
      </div>

      <Card>
          <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-end">
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-end sm:items-center">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Select Period" /></SelectTrigger>
                        <SelectContent>
                            {periods.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                        placeholder="Search employee..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <Button variant="outline" onClick={loadSlips} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[720px] text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs font-semibold">
                          <tr>
                              <th className="px-6 py-4">Employee</th>
                              <th className="px-6 py-4">Period</th>
                              <th className="px-6 py-4 text-right">Net Salary</th>
                              <th className="px-6 py-4 text-center">Status</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {loading ? (
                               Array.from({ length: 5 }).map((_, i) => (
                                  <tr key={i}>
                                      <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                                      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                                      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                                      <td className="px-6 py-4"><Skeleton className="h-8 w-16 ml-auto" /></td>
                                  </tr>
                              ))
                          ) : error ? (
                              <tr>
                                  <td colSpan="5" className="px-6 py-8 text-center text-red-500">
                                      <div className="flex flex-col items-center gap-2">
                                          <AlertCircle className="w-6 h-6" />
                                          <p>{error}</p>
                                          <Button variant="outline" size="sm" onClick={loadSlips} className="mt-2">Retry</Button>
                                      </div>
                                  </td>
                              </tr>
                          ) : filteredSlips.length === 0 ? (
                              <tr>
                                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                      No slips found.
                                  </td>
                              </tr>
                          ) : (
                              filteredSlips.map((slip) => (
                                  <tr key={slip.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                      <td className="px-6 py-4 font-medium">
                                          <div>{slip.calculation?.employee?.name || 'Unknown'}</div>
                                          <div className="text-xs text-slate-500">{slip.calculation?.employee?.employee_id || '-'}</div>
                                      </td>
                                      <td className="px-6 py-4">{slip.calculation?.period?.name || '-'}</td>
                                      <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                          {formatBaht(slip.calculation?.net_salary)}
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <Badge className="bg-green-100 text-green-800 border-green-200">{t('payroll.calculated')}</Badge>
                                      </td>
                                      <td className="px-6 py-4 text-right space-x-2">
                                          <Button variant="ghost" size="sm" onClick={() => handleGeneratePdf(slip)} title="Download PDF">
                                              <Download className="w-4 h-4 text-slate-600" />
                                          </Button>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </CardContent>
      </Card>
    </div>
  );
};

export default PayrollSlipsPage;
