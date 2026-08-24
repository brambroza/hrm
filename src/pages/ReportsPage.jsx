import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { ensureSession, exportToExcel, formatThaiDate, formatThaiTime } from '@/utils/helpers';
import AccessDenied from '@/components/AccessDenied';
import { fetchAllRows } from '@/services/queries';

const ReportsPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canView, canExport, role } = usePermission();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [truncated, setTruncated] = useState(false);

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    department: 'all',
    shiftId: 'all',
    employeeId: 'all',
    status: 'all',
    otType: 'all',
    missingStatus: 'all'
  });

  useEffect(() => {
    if (canView('reports')) {
      loadBaseData();
    } else {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (canView('reports')) {
      loadAttendanceData();
    }
  }, [filters.dateFrom, filters.dateTo, role]);

  const loadBaseData = async () => {
    setLoading(true);
    try {
      await ensureSession(supabase);
      const [employeeRes, shiftRes, assignRes] = await Promise.all([
        fetchAllRows(() =>
          supabase
            .from('employees')
            .select('id, employee_id, name, name_th, department, position')
            .eq('status', 'active')
            .order('id')
        ),
        supabase.from('shifts').select('*'),
        fetchAllRows(() => supabase.from('shift_assignments').select('*').order('id'))
      ]);

      if (employeeRes.error) throw employeeRes.error;
      if (shiftRes.error) throw shiftRes.error;
      if (assignRes.error) throw assignRes.error;

      setEmployees(employeeRes.data || []);
      setShifts(shiftRes.data || []);
      setAssignments(assignRes.data || []);

      await loadAttendanceData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message
      });
      setLoading(false);
    }
  };

  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      await ensureSession(supabase);
      // Attendance, leave and holidays are all read page by page. Without it
      // PostgREST returned at most 1000 rows and said nothing, so a report over
      // any sizeable period silently described only part of the period.
      const buildAttendanceQuery = () => {
        let query = supabase
          .from('attendance_logs')
          .select('*, employees(id, employee_id, name, name_th, department, position)')
          .order('log_date', { ascending: false })
          .order('id');

        if (filters.dateFrom) query = query.gte('log_date', filters.dateFrom);
        if (filters.dateTo) query = query.lte('log_date', filters.dateTo);
        return query;
      };

      const buildLeaveQuery = () => {
        let query = supabase
          .from('leaves')
          .select('employee_id, start_date, end_date, status, reason')
          .order('id');

        // Any leave overlapping the window matters, not only leave starting in it.
        if (filters.dateTo) query = query.lte('start_date', filters.dateTo);
        if (filters.dateFrom) query = query.gte('end_date', filters.dateFrom);
        return query;
      };

      const buildHolidayQuery = () => {
        let query = supabase
          .from('holidays')
          .select('holiday_date, name, holiday_type')
          .order('holiday_date');

        if (filters.dateFrom) query = query.gte('holiday_date', filters.dateFrom);
        if (filters.dateTo) query = query.lte('holiday_date', filters.dateTo);
        return query;
      };

      const [attendanceRes, leaveRes, holidayRes] = await Promise.all([
        fetchAllRows(buildAttendanceQuery),
        fetchAllRows(buildLeaveQuery),
        fetchAllRows(buildHolidayQuery)
      ]);

      if (attendanceRes.error) throw attendanceRes.error;
      if (leaveRes.error) throw leaveRes.error;
      if (holidayRes.error) throw holidayRes.error;

      setTruncated(Boolean(attendanceRes.truncated || leaveRes.truncated));
      setAttendanceLogs(attendanceRes.data || []);
      setLeaves(leaveRes.data || []);
      setHolidays(holidayRes.data || []);
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const shiftMap = useMemo(() => {
    const map = new Map();
    shifts.forEach((shift) => map.set(shift.id, shift));
    return map;
  }, [shifts]);

  const assignmentMap = useMemo(() => {
    const map = new Map();
    assignments.forEach((assignment) => {
      if (!map.has(assignment.employee_id)) {
        map.set(assignment.employee_id, []);
      }
      map.get(assignment.employee_id).push(assignment);
    });
    return map;
  }, [assignments]);

  const holidaySet = useMemo(() => {
    return new Set(holidays.map((holiday) => holiday.holiday_date));
  }, [holidays]);

  const getShiftName = (employeeId, logDate) => {
    const entries = assignmentMap.get(employeeId) || [];
    const target = entries.find((assignment) => {
      const start = assignment.start_date;
      const end = assignment.end_date || '9999-12-31';
      return logDate >= start && logDate <= end;
    });
    const shift = target ? shiftMap.get(target.shift_id) : null;
    return shift?.shift_name || '-';
  };

  const getLeaveStatus = (employeeId, logDate) => {
    const leave = leaves.find((item) => {
      if (item.employee_id !== employeeId) return false;
      return logDate >= item.start_date && logDate <= item.end_date && item.status === 'approved';
    });
    return leave ? leave.reason || 'Leave' : null;
  };

  const filterByCommon = (rows) => {
    return rows.filter((row) => {
      if (filters.department !== 'all' && row.department !== filters.department) return false;
      if (filters.employeeId !== 'all' && row.employeeId !== filters.employeeId) return false;
      if (filters.shiftId !== 'all' && row.shiftId !== filters.shiftId) return false;
      return true;
    });
  };

  const dailyRows = useMemo(() => {
    const rows = attendanceLogs.map((log) => {
      const employee = log.employees || {};
      const shiftName = getShiftName(log.employee_id, log.log_date);
      const leaveNote = getLeaveStatus(log.employee_id, log.log_date);
      const isHoliday = holidaySet.has(log.log_date);
      const status = leaveNote ? 'leave' : isHoliday ? 'holiday' : log.missing_punch || !log.check_in || !log.check_out ? 'missing_punch' : log.status || 'normal';

      return {
        date: formatThaiDate(log.log_date),
        employeeId: employee.employee_id || log.employee_id,
        name: employee.name || '-',
        department: employee.department || '-',
        position: employee.position || '-',
        shift: shiftName,
        checkIn: log.check_in ? formatThaiTime(log.check_in) : '-',
        checkOut: log.check_out ? formatThaiTime(log.check_out) : '-',
        workHours: log.hours_worked ?? '-',
        lateMinutes: log.late_minutes ?? 0,
        otMinutes: log.ot_minutes ?? 0,
        status,
        note: leaveNote || ''
      };
    });

    const filtered = filterByCommon(rows).filter((row) => {
      if (filters.status !== 'all' && row.status !== filters.status) return false;
      return true;
    });

    return filtered;
  }, [attendanceLogs, filters, holidaySet, leaves]);

  const lateRows = useMemo(() => {
    const entries = attendanceLogs.filter((log) => log.status === 'late');
    const map = new Map();

    entries.forEach((log) => {
      const employee = log.employees || {};
      const key = employee.id || log.employee_id;
      if (!map.has(key)) {
        map.set(key, {
          employeeId: employee.employee_id || log.employee_id,
          name: employee.name || '-',
          department: employee.department || '-',
          count: 0,
          totalMinutes: 0,
          details: []
        });
      }
      const row = map.get(key);
      row.count += 1;
      row.totalMinutes += Number(log.late_minutes || 0);
      row.details.push(`${log.log_date} (${log.late_minutes || 0} min)`);
    });

    const rows = Array.from(map.values());
    return filterByCommon(rows);
  }, [attendanceLogs, filters]);

  const overtimeRows = useMemo(() => {
    const rows = attendanceLogs
      .filter((log) => Number(log.ot_minutes || 0) > 0)
      .map((log) => {
        const employee = log.employees || {};
        const shiftName = getShiftName(log.employee_id, log.log_date);
        const holiday = holidays.find((h) => h.holiday_date === log.log_date);
        const otType = holiday ? (holiday.holiday_type === 'public' ? 'holiday' : 'special') : 'normal';
        return {
          date: formatThaiDate(log.log_date),
          employeeId: employee.employee_id || log.employee_id,
          name: employee.name || '-',
          department: employee.department || '-',
          shift: shiftName,
          otMinutes: log.ot_minutes ?? 0,
          otHours: log.ot_minutes ? (Number(log.ot_minutes) / 60).toFixed(2) : '0.00',
          otType,
          note: ''
        };
      });

    const filtered = filterByCommon(rows).filter((row) => {
      if (filters.otType !== 'all' && row.otType !== filters.otType) return false;
      return true;
    });

    return filtered;
  }, [attendanceLogs, filters, holidays]);

  const absentRows = useMemo(() => {
    const rows = attendanceLogs
      .filter((log) => ['absent', 'absent_by_late'].includes(log.status))
      .map((log) => {
        const employee = log.employees || {};
        return {
          date: formatThaiDate(log.log_date),
          employeeId: employee.employee_id || log.employee_id,
          name: employee.name || '-',
          department: employee.department || '-',
          absentStatus: log.status === 'absent_by_late' ? 'absent_by_late' : 'absent',
          note: log.missing_punch ? 'missing_punch' : ''
        };
      });

    return filterByCommon(rows);
  }, [attendanceLogs, filters]);

  const missingRows = useMemo(() => {
    const rows = attendanceLogs
      .filter((log) => log.missing_punch || !log.check_in || !log.check_out)
      .map((log) => {
        const employee = log.employees || {};
        const pattern = !log.check_in && log.check_out
          ? 'missing_in'
          : log.check_in && !log.check_out
          ? 'missing_out'
          : 'missing_both';
        return {
          date: formatThaiDate(log.log_date),
          employeeId: employee.employee_id || log.employee_id,
          name: employee.name || '-',
          department: employee.department || '-',
          pattern,
          checkIn: log.check_in ? formatThaiTime(log.check_in) : '-',
          checkOut: log.check_out ? formatThaiTime(log.check_out) : '-',
          resolveStatus: log.status || 'pending',
          note: ''
        };
      });

    const filtered = filterByCommon(rows).filter((row) => {
      if (filters.missingStatus !== 'all' && row.resolveStatus !== filters.missingStatus) return false;
      return true;
    });

    return filtered;
  }, [attendanceLogs, filters]);

  const departments = useMemo(() => {
    return Array.from(new Set(employees.map((emp) => emp.department).filter(Boolean)));
  }, [employees]);

  const reportConfig = {
    daily: {
      label: 'Daily Attendance Report',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'employeeId', label: 'Employee ID' },
        { key: 'name', label: 'Name' },
        { key: 'department', label: 'Department' },
        { key: 'position', label: 'Position' },
        { key: 'shift', label: 'Shift' },
        { key: 'checkIn', label: 'Check In' },
        { key: 'checkOut', label: 'Check Out' },
        { key: 'workHours', label: 'Work Hours' },
        { key: 'lateMinutes', label: 'Late (min)' },
        { key: 'otMinutes', label: 'OT (min)' },
        { key: 'status', label: 'Status' },
        { key: 'note', label: 'Note' }
      ],
      data: dailyRows
    },
    late: {
      label: 'Late Report',
      columns: [
        { key: 'employeeId', label: 'Employee ID' },
        { key: 'name', label: 'Name' },
        { key: 'department', label: 'Department' },
        { key: 'count', label: 'Late Count' },
        { key: 'totalMinutes', label: 'Late Minutes' },
        { key: 'details', label: 'Details' }
      ],
      data: lateRows.map((row) => ({ ...row, details: row.details.join(', ') }))
    },
    overtime: {
      label: 'Overtime Report',
      columns: [
        { key: 'employeeId', label: 'Employee ID' },
        { key: 'name', label: 'Name' },
        { key: 'department', label: 'Department' },
        { key: 'date', label: 'Date' },
        { key: 'shift', label: 'Shift' },
        { key: 'otMinutes', label: 'OT (min)' },
        { key: 'otHours', label: 'OT (hours)' },
        { key: 'otType', label: 'OT Type' },
        { key: 'note', label: 'Note' }
      ],
      data: overtimeRows
    },
    absent: {
      label: 'Absent Report',
      columns: [
        { key: 'employeeId', label: 'Employee ID' },
        { key: 'name', label: 'Name' },
        { key: 'department', label: 'Department' },
        { key: 'date', label: 'Date' },
        { key: 'absentStatus', label: 'Absent Status' },
        { key: 'note', label: 'Note' }
      ],
      data: absentRows
    },
    missing: {
      label: 'Missing Scan Report',
      columns: [
        { key: 'employeeId', label: 'Employee ID' },
        { key: 'name', label: 'Name' },
        { key: 'department', label: 'Department' },
        { key: 'date', label: 'Date' },
        { key: 'pattern', label: 'Pattern' },
        { key: 'checkIn', label: 'Check In' },
        { key: 'checkOut', label: 'Check Out' },
        { key: 'resolveStatus', label: 'Resolve Status' },
        { key: 'note', label: 'Note' }
      ],
      data: missingRows
    }
  };

  const handleExportExcel = () => {
    const config = reportConfig[activeTab];
    if (!config) return;
    exportToExcel(config.data, config.label.replace(/\s+/g, '_'));
  };

  const handleExportCsv = () => {
    const config = reportConfig[activeTab];
    if (!config) return;
    const csv = toCsv(config.columns, config.data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.label.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toCsv = (columns, rows) => {
    const header = columns.map((col) => `"${col.label}"`).join(',');
    const lines = rows.map((row) => {
      return columns.map((col) => {
        const value = row[col.key] ?? '';
        const safe = String(value).replace(/"/g, '""');
        return `"${safe}"`;
      }).join(',');
    });
    return [header, ...lines].join('\n');
  };

  const showStatusFilter = activeTab === 'daily';
  const showOtTypeFilter = activeTab === 'overtime';
  const showMissingStatusFilter = activeTab === 'missing';

  if (!canView('reports')) {
    return <AccessDenied />;
  }

  return (
    <>
      <Helmet>
        <title>{t('reports.title')} - HRM System</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('reports.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400">{t('reports.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCsv} disabled={!canExport('reports')}>
              {t('common.export')} CSV
            </Button>
            <Button onClick={handleExportExcel} disabled={!canExport('reports')} className="bg-blue-600 hover:bg-blue-700">
              {t('common.export')} Excel
            </Button>
          </div>
        </div>

        {truncated && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            {t('reports.truncated', { shown: attendanceLogs.length, total: attendanceLogs.length })}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Shift</label>
              <select
                name="shiftId"
                value={filters.shiftId}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">{t('common.all')}</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>{shift.shift_name}</option>
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
                <option value="all">{t('common.all')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.employee_id}>{emp.employee_id} - {emp.name}</option>
                ))}
              </select>
            </div>
            {showStatusFilter && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">{t('common.status')}</label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="all">{t('common.all')}</option>
                  <option value="normal">Normal</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="absent_by_late">Absent by Late</option>
                  <option value="missing_punch">Missing Punch</option>
                  <option value="leave">Leave</option>
                  <option value="holiday">Holiday</option>
                </select>
              </div>
            )}
            {showOtTypeFilter && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">OT Type</label>
                <select
                  name="otType"
                  value={filters.otType}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="all">{t('common.all')}</option>
                  <option value="normal">Normal</option>
                  <option value="holiday">Holiday</option>
                  <option value="special">Special</option>
                </select>
              </div>
            )}
            {showMissingStatusFilter && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Resolve Status</label>
                <select
                  name="missingStatus"
                  value={filters.missingStatus}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="all">{t('common.all')}</option>
                  <option value="normal">Normal</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="daily" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1">
            <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
            <TabsTrigger value="late">Late</TabsTrigger>
            <TabsTrigger value="overtime">Overtime</TabsTrigger>
            <TabsTrigger value="absent">Absent</TabsTrigger>
            <TabsTrigger value="missing">Missing Scan</TabsTrigger>
          </TabsList>

          {Object.entries(reportConfig).map(([key, config]) => (
            <TabsContent key={key} value={key}>
              <ReportTable
                title={config.label}
                columns={config.columns}
                data={config.data}
                loading={loading}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
};

const ReportTable = ({ title, columns, data, loading }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-6 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-6 text-center text-slate-500">
                  No records found
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {row[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsPage;
