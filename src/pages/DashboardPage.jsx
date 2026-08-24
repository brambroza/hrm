
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Helmet } from 'react-helmet';
import { Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermission } from '@/hooks/usePermission';
import { getThaiISODate, getDocumentExpiryAlerts } from '@/utils/helpers';
import AccessDenied from '@/components/AccessDenied';

// Components
import StatCard from '@/components/dashboard/StatCard';
import DailyAttendanceChart from '@/components/dashboard/DailyAttendanceChart';
import LeaveApplicationTable from '@/components/dashboard/LeaveApplicationTable';
import PendingApprovals from '@/components/dashboard/PendingApprovals';
import DocumentExpiryAlerts from '@/components/dashboard/DocumentExpiryAlerts';
import TeamMilestones from '@/components/dashboard/TeamMilestones';

/** How many days of history the attendance chart covers. */
const CHART_DAYS = 7;

/** Attendance statuses that mean the person actually turned up. */
const PRESENT_STATUSES = new Set(['normal', 'late', 'early_leave', 'missing_punch']);

/**
 * Shift a yyyy-mm-dd string by a number of days, staying in Bangkok time.
 *
 * @param {string} isoDate
 * @param {number} days
 * @returns {string} yyyy-mm-dd
 */
const shiftDate = (isoDate, days) => {
  const d = new Date(`${isoDate}T00:00:00+07:00`);
  d.setDate(d.getDate() + days);
  return getThaiISODate(d);
};

/**
 * Whether a leave record covers a given day.
 *
 * @param {{start_date: string, end_date: string}} leave
 * @param {string} isoDate
 */
const leaveCoversDate = (leave, isoDate) =>
  leave.start_date <= isoDate && leave.end_date >= isoDate;

const DashboardPage = () => {
  const { t, i18n } = useTranslation();
  const { canView } = usePermission();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalEmployees: 0, present: 0, absent: 0, onLeave: 0 });
  const [chartData, setChartData] = useState([]);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [pending, setPending] = useState({ leave: 0, ot: 0 });
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [isHoliday, setIsHoliday] = useState(false);

  const allowed = canView('dashboard');

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = getThaiISODate();
      const chartStart = shiftDate(today, -(CHART_DAYS - 1));
      const monthStart = `${today.slice(0, 7)}-01`;
      const monthEnd = `${today.slice(0, 7)}-31`;

      const [employeeRes, attendanceRes, leaveRes, recentLeaveRes, pendingLeaveRes, pendingOtRes, holidayRes] =
        await Promise.all([
          // Everything below is derived from this one employee list, so it is
          // fetched in full rather than counted, and reused several times.
          supabase
            .from('employees')
            .select('id, name, name_th, department, photo_url, start_date, work_permit_expiry')
            .eq('status', 'active'),

          supabase
            .from('attendance_logs')
            .select('employee_id, log_date, status')
            .gte('log_date', chartStart)
            .lte('log_date', today),

          supabase
            .from('leaves')
            .select('employee_id, start_date, end_date')
            .eq('status', 'approved')
            .lte('start_date', today)
            .gte('end_date', chartStart),

          supabase
            .from('leaves')
            .select('id, leave_type, start_date, status, employees(name, name_th, photo_url)')
            .order('created_at', { ascending: false })
            .limit(5),

          supabase
            .from('leaves')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),

          supabase
            .from('ot_requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),

          supabase
            .from('holidays')
            .select('holiday_date')
            .eq('holiday_date', today)
            .eq('is_working_day', false),
        ]);

      if (employeeRes.error) throw employeeRes.error;

      const employees = employeeRes.data || [];
      const attendance = attendanceRes.data || [];
      const leaves = leaveRes.data || [];
      const todayIsHoliday = (holidayRes.data || []).length > 0;

      setIsHoliday(todayIsHoliday);

      // --- Today's headline numbers -----------------------------------------
      // Counted per employee rather than per row, so an employee with several
      // scans in a day is still one person present.
      const presentToday = new Set(
        attendance
          .filter((log) => log.log_date === today && PRESENT_STATUSES.has(log.status || 'normal'))
          .map((log) => log.employee_id),
      );
      const onLeaveToday = new Set(
        leaves.filter((leave) => leaveCoversDate(leave, today)).map((leave) => leave.employee_id),
      );

      // On a public holiday nobody is absent — the old dashboard subtracted
      // attendance from headcount unconditionally and reported the whole
      // company as absent every weekend and holiday.
      const absentToday = todayIsHoliday
        ? 0
        : Math.max(0, employees.length - presentToday.size - onLeaveToday.size);

      setStats({
        totalEmployees: employees.length,
        present: presentToday.size,
        absent: absentToday,
        onLeave: onLeaveToday.size,
      });

      // --- Last seven days --------------------------------------------------
      const dayFormatter = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-GB' : 'th-TH', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Bangkok',
      });

      const series = [];
      for (let offset = CHART_DAYS - 1; offset >= 0; offset -= 1) {
        const date = shiftDate(today, -offset);
        const present = new Set(
          attendance
            .filter((log) => log.log_date === date && PRESENT_STATUSES.has(log.status || 'normal'))
            .map((log) => log.employee_id),
        ).size;
        const onLeave = new Set(
          leaves.filter((leave) => leaveCoversDate(leave, date)).map((leave) => leave.employee_id),
        ).size;

        series.push({
          name: dayFormatter.format(new Date(`${date}T00:00:00+07:00`)),
          present,
          onLeave,
          leave: onLeave,
          absent: Math.max(0, employees.length - present - onLeave),
        });
      }
      setChartData(series);

      // --- Side panels ------------------------------------------------------
      setRecentLeaves(recentLeaveRes.data || []);
      setPending({ leave: pendingLeaveRes.count || 0, ot: pendingOtRes.count || 0 });
      setExpiryAlerts(getDocumentExpiryAlerts(employees));

      const joinedThisMonth = employees
        .filter((emp) => emp.start_date >= monthStart && emp.start_date <= monthEnd)
        .map((emp) => ({ employee: emp, type: 'new', years: 0, date: emp.start_date }));

      const anniversaries = employees
        .filter((emp) => emp.start_date && emp.start_date < monthStart)
        .filter((emp) => emp.start_date.slice(5, 7) === today.slice(5, 7))
        .map((emp) => ({
          employee: emp,
          type: 'anniversary',
          years: Number(today.slice(0, 4)) - Number(emp.start_date.slice(0, 4)),
          date: emp.start_date,
        }))
        .filter((item) => item.years > 0);

      setMilestones([...joinedThisMonth, ...anniversaries].sort((a, b) => a.date.localeCompare(b.date)));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const percentOf = useMemo(
    () => (value) => (stats.totalEmployees ? Math.round((value / stats.totalEmployees) * 100) : 0),
    [stats.totalEmployees],
  );

  if (!allowed) {
    return <AccessDenied />;
  }

  return (
    <>
      <Helmet>
        <title>{t('common.dashboard')} - HRM System</title>
      </Helmet>

      <div className="space-y-6">
        {isHoliday && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
            {t('dashboard.todayIsHoliday')}
          </div>
        )}

        {/* Row 1: Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title={t('dashboard.totalEmployees')}
            value={stats.totalEmployees}
            percentage={100}
            subtitle={t('dashboard.employeeCountGrows')}
            color="green"
            icon={Users}
            loading={loading}
          />
          <StatCard
            title={t('dashboard.todayPresents')}
            value={stats.present}
            percentage={percentOf(stats.present)}
            subtitle={t('dashboard.employeesPresent')}
            color="green"
            icon={CheckCircle}
            loading={loading}
          />
          <StatCard
            title={t('dashboard.todayAbsents')}
            value={stats.absent}
            percentage={percentOf(stats.absent)}
            subtitle={t('dashboard.employeesAbsent')}
            color="yellow"
            icon={AlertCircle}
            loading={loading}
          />
          <StatCard
            title={t('dashboard.todayLeave')}
            value={stats.onLeave}
            percentage={percentOf(stats.onLeave)}
            subtitle={t('dashboard.employeesOnLeave')}
            color="red"
            icon={XCircle}
            loading={loading}
          />
        </div>

        {/* Row 2: Chart & recent leave */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-[400px]">
          <DailyAttendanceChart data={chartData} loading={loading} />
          <LeaveApplicationTable leaves={recentLeaves} loading={loading} />
        </div>

        {/* Row 3: Action queues */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PendingApprovals leaveCount={pending.leave} otCount={pending.ot} loading={loading} />
          <DocumentExpiryAlerts alerts={expiryAlerts} loading={loading} />
          <TeamMilestones milestones={milestones} loading={loading} />
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
