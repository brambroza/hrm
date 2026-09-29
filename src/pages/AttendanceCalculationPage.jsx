import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { exportToExcel, formatThaiDate, getThaiISODate } from '@/utils/helpers';
import AccessDenied from '@/components/AccessDenied';
import { fetchAllRows } from '@/services/queries';
import { buildDateRange } from '@/lib/thaiTime';
import { weekdayOf } from '@/lib/setup/setupPlan';
import {
  DEFAULT_POLICY, calculateDaily, findLeave, findOtRequest, getShiftByEmployee,
} from '@/lib/attendance/dailyCalculation';

const AttendanceCalculationPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canView, canCalculate, canExport } = usePermission();
  const [loading, setLoading] = useState(false);
  const [calculated, setCalculated] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: getThaiISODate(),
    dateTo: getThaiISODate(),
    department: 'all',
    employeeId: 'all'
  });

  const [employees, setEmployees] = useState([]);
  const [truncated, setTruncated] = useState(false);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleCalculate = async () => {
    if (!filters.dateFrom || !filters.dateTo || filters.dateTo < filters.dateFrom) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('reports.selectRangeFirst')
      });
      return;
    }

    setLoading(true);
    try {
      // Attendance and leave are read page by page: a month of scans for even a
      // mid-sized company exceeds the 1000-row cap PostgREST applies, and it
      // truncates without raising an error.
      const [employeeRes, shiftRes, assignmentRes, policyRes, holidayRes, leaveRes, attendanceRes, otRequestRes, weekOffRes] = await Promise.all([
        // Paged reads need a stable sort, otherwise PostgREST is free to return
        // the same row on two pages and drop another entirely.
        fetchAllRows(() => supabase.from('employees').select('id, employee_id, name, name_th, department, position').eq('status', 'active').order('id')),
        supabase.from('shifts').select('*'),
        fetchAllRows(() => supabase.from('shift_assignments').select('*').order('id')),
        supabase.from('attendance_policies').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('holidays').select('holiday_date, name, holiday_type').gte('holiday_date', filters.dateFrom).lte('holiday_date', filters.dateTo),
        fetchAllRows(() =>
          supabase
            .from('leaves')
            .select('employee_id, start_date, end_date, status, reason')
            .lte('start_date', filters.dateTo)
            .gte('end_date', filters.dateFrom)
            .order('id')
        ),
        fetchAllRows(() =>
          supabase
            .from('attendance_logs')
            .select('*')
            .gte('log_date', filters.dateFrom)
            .lte('log_date', filters.dateTo)
            .order('log_date')
            .order('employee_id')
        ),
        fetchAllRows(() =>
          supabase
            .from('ot_requests')
            .select('employee_id, request_date, minutes, status')
            .eq('status', 'approved')
            .gte('request_date', filters.dateFrom)
            .lte('request_date', filters.dateTo)
            .order('id')
        ),
        supabase.from('week_offs').select('weekday, department, employee_group')
      ]);

      if (weekOffRes.error) throw weekOffRes.error;
      if (employeeRes.error) throw employeeRes.error;
      if (shiftRes.error) throw shiftRes.error;
      if (assignmentRes.error) throw assignmentRes.error;
      if (policyRes.error) throw policyRes.error;
      if (holidayRes.error) throw holidayRes.error;
      if (leaveRes.error) throw leaveRes.error;
      if (attendanceRes.error) throw attendanceRes.error;
      if (otRequestRes.error) throw otRequestRes.error;

      const policy = policyRes.data || DEFAULT_POLICY;

      const allEmployees = employeeRes.data || [];
      setEmployees(allEmployees);

      const filteredEmployees = allEmployees.filter((emp) => {
        if (filters.department !== 'all' && emp.department !== filters.department) return false;
        if (filters.employeeId !== 'all' && emp.employee_id !== filters.employeeId) return false;
        return true;
      });

      const shifts = shiftRes.data || [];
      const assignments = assignmentRes.data || [];
      const holidays = holidayRes.data || [];
      const leaves = leaveRes.data || [];
      const attendanceLogs = attendanceRes.data || [];
      const otRequests = otRequestRes.data || [];

      const shiftMap = new Map();
      shifts.forEach((shift) => shiftMap.set(shift.id, shift));

      const assignmentMap = new Map();
      assignments.forEach((assignment) => {
        if (!assignmentMap.has(assignment.employee_id)) {
          assignmentMap.set(assignment.employee_id, []);
        }
        assignmentMap.get(assignment.employee_id).push(assignment);
      });

      const attendanceMap = new Map();
      attendanceLogs.forEach((log) => {
        const key = `${log.employee_id}_${log.log_date}`;
        attendanceMap.set(key, log);
      });

      const holidaySet = new Set(holidays.map((holiday) => holiday.holiday_date));

      // Days off set for the whole organization, plus those of one department.
      const weekOffs = weekOffRes.data || [];
      const isWeeklyOff = (employee, date) => {
        const weekday = weekdayOf(date);
        return weekOffs.some(
          (row) => row.weekday === weekday && !row.employee_group && (!row.department || row.department === employee.department)
        );
      };

      const dateRange = buildDateRange(filters.dateFrom, filters.dateTo);

      const rows = [];
      dateRange.forEach((date) => {
        filteredEmployees.forEach((employee) => {
          const logKey = `${employee.id}_${date}`;
          const log = attendanceMap.get(logKey);
          const shiftName = getShiftName(employee.id, date, assignmentMap, shiftMap);
          const shift = getShiftByEmployee(employee.id, date, assignmentMap, shiftMap);
          const holiday = holidaySet.has(date);
          const leave = findLeave(leaves, employee.id, date);
          const otRequest = findOtRequest(otRequests, employee.id, date);

          const calculation = calculateDaily({
            log,
            date,
            shift,
            policy,
            holiday,
            weeklyOff: isWeeklyOff(employee, date),
            leave,
            otRequest
          });

          rows.push({
            date,
            employeeId: employee.employee_id,
            name: employee.name,
            department: employee.department || '-',
            position: employee.position || '-',
            shift: shiftName,
            checkIn: calculation.checkIn,
            checkOut: calculation.checkOut,
            workHours: calculation.workHours,
            lateMinutes: calculation.lateMinutes,
            otMinutes: calculation.otMinutes,
            status: calculation.status,
            note: calculation.note
          });
        });
      });

      // Say so when the row cap stopped the read, rather than presenting a
      // partial month as if it were the whole month.
      setTruncated(Boolean(attendanceRes.truncated || leaveRes.truncated || otRequestRes.truncated));
      setCalculated(rows);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (calculated.length === 0) return;
    exportToExcel(calculated, 'attendance_calculation');
  };

  const departments = useMemo(() => {
    return Array.from(new Set(employees.map((emp) => emp.department).filter(Boolean)));
  }, [employees]);

  if (!canView('time_attendance')) {
    return <AccessDenied />;
  }

  return (
    <>
      <Helmet>
        <title>{t('attendanceCalc.title')} - HRM System</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('attendanceCalc.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400">{t('attendanceCalc.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={!canExport('time_attendance') || calculated.length === 0}>
              {t('common.export')}
            </Button>
            <Button onClick={handleCalculate} disabled={!canCalculate('time_attendance') || loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? t('common.loading') : t('attendanceCalc.calculate')}
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">{t('common.from')}</label>
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">{t('common.to')}</label>
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">{t('common.department')}</label>
              <select
                name="department"
                value={filters.department}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">{t('common.all')}</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">{t('common.employee')}</label>
              <select
                name="employeeId"
                value={filters.employeeId}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">All</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.employee_id}>{emp.employee_id} - {emp.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {truncated && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            {t('attendanceCalc.truncated')}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('common.date')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('common.employee')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('common.department')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('attendance.shiftSetup')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('attendanceCalc.checkIn')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('attendanceCalc.checkOut')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('attendanceCalc.workHours')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('attendanceCalc.lateMinutes')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('attendanceCalc.otMinutes')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {calculated.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-slate-500">
                      {t('attendanceCalc.noRecords')}
                    </td>
                  </tr>
                ) : (
                  calculated.map((row, index) => (
                    <tr key={`${row.employeeId}-${row.date}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-3 text-sm text-slate-700 dark:text-slate-300">{formatThaiDate(row.date)}</td>
                      <td className="px-6 py-3 text-sm text-slate-900 dark:text-white">
                        {row.employeeId} - {row.name}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{row.department}</td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{row.shift}</td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{row.checkIn}</td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{row.checkOut}</td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{row.workHours}</td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{row.lateMinutes}</td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{row.otMinutes}</td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{t(`attendanceCalc.status.${row.status}`, row.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Display name of the shift an employee works on a date.
 * @param {string} employeeId - Employee row id.
 * @param {string} date - Work date, YYYY-MM-DD.
 * @param {Map<string, Array<object>>} assignmentMap - Assignments grouped by employee id.
 * @param {Map<string, object>} shiftMap - Shifts by id.
 * @returns {string} Shift name, or '-' when none is assigned.
 */
const getShiftName = (employeeId, date, assignmentMap, shiftMap) => {
  const shift = getShiftByEmployee(employeeId, date, assignmentMap, shiftMap);
  return shift?.shift_name || '-';
};

export default AttendanceCalculationPage;
