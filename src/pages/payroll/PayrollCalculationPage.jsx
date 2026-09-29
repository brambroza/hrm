
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Calculator, Search, Filter, RefreshCw, Eye, Play, Trash2, CheckSquare, Square, X, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getPayrollPeriods } from '@/services/payrollPeriods';
import { getPayrollCalculations, calculatePayroll, addPayrollCalculation, updatePayrollCalculation, deletePayrollCalculation } from '@/services/payroll';
import { isPeriodClosed as isClosedStatus, getStatusLabel } from '@/utils/statusValidator';
import ConfirmationModal from '@/components/ConfirmationModal';
import { supabase } from '@/lib/customSupabaseClient';

const PayrollCalculationPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [calculationsMap, setCalculationsMap] = useState({}); // Map employee_id -> calculation object
  
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // Fetch Periods
  useEffect(() => {
    const loadPeriods = async () => {
        const { data, error } = await getPayrollPeriods();
        if (data && data.length > 0) {
            setPeriods(data);
            setSelectedPeriod(data[0].id); // Select latest
        } else if (error) {
            console.error("Error loading periods:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load payroll periods" });
        }
    };
    loadPeriods();
  }, []);

  // Fetch Employees and their calculations for selected period
  const fetchEmployeesAndCalculations = async () => {
      if (!selectedPeriod) return;
      setLoading(true);
      console.log("Fetching employees and calculations for period:", selectedPeriod);
      try {
          // 1. Fetch all active employees
          const { data: empData, error: empError } = await supabase
              .from('employees')
              .select('id, name, employee_id, department, position, salary, status')
              // 'active' lowercase is what the employee form and the schema
              // default write. Filtering on 'Active' matched nothing, so this
              // page always showed an empty employee list.
              .eq('status', 'active')
              .order('name');
          
          if (empError) throw empError;

          // 2. Fetch calculations for this period
          const { data: calcData, error: calcError } = await getPayrollCalculations(selectedPeriod);
          if (calcError) throw calcError;

          // 3. Map calculations by employee_id for easy lookup
          const calcMap = {};
          if (calcData) {
              calcData.forEach(c => {
                  calcMap[c.employee_id] = c;
              });
          }
          setCalculationsMap(calcMap);
          setEmployees(empData || []);
          setSelectedEmployees([]); // Reset selection

      } catch (err) {
          console.error("Error fetching data:", err);
          toast({ variant: "destructive", title: "Error", description: err.message || "Failed to load data" });
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      if (selectedPeriod) {
          fetchEmployeesAndCalculations();
      }
  }, [selectedPeriod]);

  // Handle Calculate Logic
  const performCalculation = async (employee) => {
      try {
          const calcResult = await calculatePayroll(employee.id, selectedPeriod, employee.salary || 0);
          
          // Check if already exists to update or insert
          const existingCalc = calculationsMap[employee.id];
          
          if (existingCalc) {
              const { employee_id, payroll_period_id, ...figures } = calcResult;
              const { error } = await updatePayrollCalculation(existingCalc.id, figures);
              if (error) throw error;
          } else {
              const { error } = await addPayrollCalculation(calcResult);
              if (error) throw error;
          }
          return { ok: true };
      } catch (err) {
          console.error(`Error calculating for ${employee.name}:`, err);
          return { ok: false, message: err.message };
      }
  };

  /**
   * Tell the user how a batch really went. A batch where every row failed used
   * to be announced as a success for 0 employees.
   * @param {Array<{ok: boolean, message?: string}>} results - One entry per employee attempted.
   * @param {number} skipped - Employees left alone because they were already calculated.
   */
  const reportBatch = (results, skipped = 0) => {
      const done = results.filter(r => r.ok).length;
      const failed = results.filter(r => !r.ok);
      const parts = [t('payroll.batchDone', { count: done })];
      if (skipped > 0) parts.push(t('payroll.batchSkipped', { count: skipped }));
      if (failed.length > 0) parts.push(t('payroll.batchFailed', { count: failed.length }));

      toast({
          variant: failed.length > 0 ? 'destructive' : 'default',
          title: failed.length > 0 ? t('payroll.batchHadErrors') : t('common.success'),
          description: failed.length > 0 ? `${parts.join(' · ')} — ${failed[0].message}` : parts.join(' · '),
      });
  };

  const handleCalculateAll = async () => {
      if (!selectedPeriod) return;
      setLoading(true);
      const results = [];
      let skipped = 0;

      for (const emp of employees) {
          if (calculationsMap[emp.id]) {
              skipped++;
          } else {
              results.push(await performCalculation(emp));
          }
      }

      reportBatch(results, skipped);
      await fetchEmployeesAndCalculations();
      setLoading(false);
  };

  const handleCalculateSelected = async () => {
      if (selectedEmployees.length === 0) return;
      setLoading(true);
      const results = [];

      const selectedEmps = employees.filter(e => selectedEmployees.includes(e.id));
      for (const emp of selectedEmps) {
          results.push(await performCalculation(emp));
      }

      reportBatch(results);
      await fetchEmployeesAndCalculations();
      setLoading(false);
  };

  const handleDeleteCalculation = (calcId) => {
      if (!calcId) return;
      // Every other destructive action in the app uses ConfirmationModal; a raw
      // window.confirm here was the one English browser dialog left in the UI.
      setPendingDeleteId(calcId);
  };

  const confirmDeleteCalculation = async () => {
      const calcId = pendingDeleteId;
      setPendingDeleteId(null);
      if (!calcId) return;

      const { error } = await deletePayrollCalculation(calcId);
      if (error) {
          toast({ variant: "destructive", title: t('common.error'), description: error.message });
      } else {
          toast({ title: t('common.success') });
          fetchEmployeesAndCalculations();
      }
  };

  // Selection Logic
  const handleSelectAll = (checked) => {
      if (checked) {
          setSelectedEmployees(employees.map(e => e.id));
      } else {
          setSelectedEmployees([]);
      }
  };

  const handleSelectEmployee = (empId, checked) => {
      if (checked) {
          setSelectedEmployees(prev => [...prev, empId]);
      } else {
          setSelectedEmployees(prev => prev.filter(id => id !== empId));
      }
  };

  const selectedPeriodObj = periods.find(p => p.id === selectedPeriod);
  const isPeriodClosed = isClosedStatus(selectedPeriodObj?.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-600" />
            {t('common.payroll')}: {t('payroll.calculate')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Calculate monthly salaries for employees</p>
        </div>
      </div>

      <Card>
          <CardContent className="p-6 space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-end bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="space-y-2 w-full sm:w-64">
                      <label className="text-sm font-medium">Payroll Period</label>
                      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                          <SelectTrigger><SelectValue placeholder="Select Period" /></SelectTrigger>
                          <SelectContent>
                              {periods.map(p => (
                                  <SelectItem key={p.id} value={p.id}>{p.name} ({getStatusLabel(p.status)})</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                    onClick={handleCalculateAll}
                    disabled={loading || !selectedPeriod || isPeriodClosed}
                  >
                      <Play className="w-4 h-4 mr-2" /> Calculate All
                  </Button>
                  <Button variant="outline" onClick={fetchEmployeesAndCalculations} disabled={loading}>
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
              </div>

              {isPeriodClosed && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>{t('payroll.closedBanner')}</span>
                  </div>
              )}

              {/* Bulk Actions */}
              {selectedEmployees.length > 0 && !isPeriodClosed && (
                  <div className="flex items-center gap-4 p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                      <span className="font-medium text-sm ml-2">{selectedEmployees.length} selected</span>
                      <Button size="sm" variant="ghost" onClick={handleCalculateSelected} className="hover:bg-blue-100">
                          <Calculator className="w-4 h-4 mr-1" /> Calculate Selected
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedEmployees([])}>
                          <X className="w-4 h-4 mr-1" /> Deselect
                      </Button>
                  </div>
              )}

              {/* Employees Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[720px] text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs font-semibold">
                          <tr>
                              <th className="px-4 py-4 w-10">
                                  <Checkbox 
                                      checked={employees.length > 0 && selectedEmployees.length === employees.length}
                                      onCheckedChange={handleSelectAll}
                                      disabled={isPeriodClosed}
                                  />
                              </th>
                              <th className="px-4 py-4">Employee</th>
                              <th className="px-4 py-4">Department</th>
                              <th className="px-4 py-4 text-right">Base Salary</th>
                              <th className="px-4 py-4 text-center">Status</th>
                              <th className="px-4 py-4 text-right">Net Salary</th>
                              <th className="px-4 py-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {loading && employees.length === 0 ? (
                               Array.from({ length: 5 }).map((_, i) => (
                                  <tr key={i}>
                                      <td className="px-4 py-4"><Skeleton className="h-4 w-4" /></td>
                                      <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                                      <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                                      <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                                      <td className="px-4 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                                      <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                                      <td className="px-4 py-4"><Skeleton className="h-8 w-8 ml-auto" /></td>
                                  </tr>
                              ))
                          ) : employees.length === 0 ? (
                              <tr>
                                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                                      No employees found.
                                  </td>
                              </tr>
                          ) : (
                              employees.map((emp) => {
                                  const calc = calculationsMap[emp.id];
                                  const isCalculated = !!calc;
                                  return (
                                      <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                          <td className="px-4 py-4">
                                              <Checkbox 
                                                  checked={selectedEmployees.includes(emp.id)}
                                                  onCheckedChange={(checked) => handleSelectEmployee(emp.id, checked)}
                                                  disabled={isPeriodClosed}
                                              />
                                          </td>
                                          <td className="px-4 py-4 font-medium">
                                              <div>{emp.name}</div>
                                              <div className="text-xs text-slate-500">{emp.employee_id}</div>
                                          </td>
                                          <td className="px-4 py-4">{emp.department}</td>
                                          <td className="px-4 py-4 text-right">{emp.salary ? parseFloat(emp.salary).toLocaleString() : '-'}</td>
                                          <td className="px-4 py-4 text-center">
                                              {isCalculated ? (
                                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Calculated</Badge>
                                              ) : (
                                                  <Badge variant="outline" className="text-slate-500">Not Calculated</Badge>
                                              )}
                                          </td>
                                          <td className="px-4 py-4 text-right font-bold text-emerald-600">
                                              {isCalculated ? parseFloat(calc.net_salary).toLocaleString() : '-'}
                                          </td>
                                          <td className="px-4 py-4 text-right space-x-2">
                                              {isCalculated ? (
                                                  <>
                                                      {!isPeriodClosed && (
                                                          <Button variant="ghost" size="sm" onClick={() => handleDeleteCalculation(calc.id)} title="Delete Calculation">
                                                              <Trash2 className="w-4 h-4 text-red-500" />
                                                          </Button>
                                                      )}
                                                  </>
                                              ) : (
                                                  !isPeriodClosed && (
                                                      <Button variant="ghost" size="sm" onClick={() => performCalculation(emp).then((result) => { reportBatch([result]); return fetchEmployeesAndCalculations(); })}>
                                                          <Play className="w-4 h-4 text-emerald-600" /> Calculate
                                                      </Button>
                                                  )
                                              )}
                                          </td>
                                      </tr>
                                  );
                              })
                          )}
                      </tbody>
                  </table>
              </div>
          </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={confirmDeleteCalculation}
        title={t('common.delete')}
        description={t('payroll.confirmDeleteCalculation')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />
    </div>
  );
};

export default PayrollCalculationPage;
