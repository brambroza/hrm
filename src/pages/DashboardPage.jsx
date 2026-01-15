
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Helmet } from 'react-helmet';
import { Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermission } from '@/hooks/usePermission';

// Components
import StatCard from '@/components/dashboard/StatCard';
import DailyAttendanceChart from '@/components/dashboard/DailyAttendanceChart';
import LeaveApplicationTable from '@/components/dashboard/LeaveApplicationTable';
import NoticeBoard from '@/components/dashboard/NoticeBoard';
import ManagementDecision from '@/components/dashboard/ManagementDecision';
import EmployeeAwardList from '@/components/dashboard/EmployeeAwardList';

const DashboardPage = () => {
  const { t } = useTranslation();
  const { canView } = usePermission();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    present: 0,
    absent: 0,
    leave: 0,
  });
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (canView('dashboard')) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // 1. Fetch Employees Count
      const { count: totalEmp, error: empError } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      if (empError) throw empError;

      // 2. Fetch Today's Attendance
      const { data: attendance, error: attError } = await supabase
        .from('attendance_logs')
        .select('status')
        .eq('log_date', today);

      if (attError) throw attError;

      const presentCount = attendance?.filter(a => a.status === 'normal' || a.status === 'late').length || 0;
      const leaveCount = attendance?.filter(a => a.status === 'early_leave').length || 0; 
      
      const absentCount = (totalEmp || 0) - presentCount - leaveCount;

      setStats({
        totalEmployees: totalEmp || 0,
        present: presentCount,
        absent: Math.max(0, absentCount),
        leave: leaveCount
      });

      // 3. Fetch Pending Leaves for Table
      const { data: leaveData, error: leaveError } = await supabase
        .from('leaves')
        .select('*, employees(name)')
        .limit(5)
        .order('created_at', { ascending: false });
        
      if (!leaveError) {
         setLeaves(leaveData || []);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (val, total) => {
    if (!total) return 0;
    return Math.round((val / total) * 100);
  };

  if (!canView('dashboard')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
        <p className="text-slate-500">You do not have permission to view the dashboard.</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('common.dashboard')} -HRM System</title>
      </Helmet>
      
      <div className="space-y-6">
        {/* Row 1: Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title={t('dashboard.totalEmployees')}
            value={stats.totalEmployees}
            percentage={100}
            subtitle={t('dashboard.employeeCountGrows')}
            color="green"
            icon={Users}
            trend="up"
          />
          <StatCard
            title={t('dashboard.todayPresents')}
            value={stats.present}
            percentage={calculatePercentage(stats.present, stats.totalEmployees)}
            subtitle={t('dashboard.employeesPresent')}
            color="green"
            icon={CheckCircle}
            trend="up"
          />
          <StatCard
            title={t('dashboard.todayAbsents')}
            value={stats.absent}
            percentage={calculatePercentage(stats.absent, stats.totalEmployees)}
            subtitle={t('dashboard.employeesAbsent')}
            color="yellow"
            icon={AlertCircle}
            trend="down"
          />
          <StatCard
            title={t('dashboard.todayLeave')}
            value={stats.leave}
            percentage={calculatePercentage(stats.leave, stats.totalEmployees)}
            subtitle={t('dashboard.employeesOnLeave')}
            color="red"
            icon={XCircle}
            trend="down"
          />
        </div>

        {/* Row 2: Charts & Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
          <DailyAttendanceChart />
          <LeaveApplicationTable leaves={leaves} loading={loading} />
        </div>

        {/* Row 3: Bottom Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <NoticeBoard />
           <ManagementDecision />
           <EmployeeAwardList />
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
