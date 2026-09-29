
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Helmet } from 'react-helmet';
import ShiftSetupTab from '@/components/ShiftSetupTab';
import AttendanceLogTab from '@/components/AttendanceLogTab';
import ShiftAssignmentTab from '@/components/ShiftAssignmentTab';
import { useTranslation } from 'react-i18next';
import { usePermission } from '@/hooks/usePermission';
import PermissionGuard from '@/components/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';
import AccessDenied from '@/components/AccessDenied';

const TimeAttendancePage = () => {
  const { t } = useTranslation();
  const { canView } = usePermission();

  if (!canView('time_attendance')) {
    return <AccessDenied />;
  }

  return (
    <>
      <Helmet>
        <title>{t('common.attendance')} - GoAlong HR</title>
        <meta name="description" content="Time and Attendance Management" />
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('common.attendance')}</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage shifts, attendance logs, and assignments</p>
          </div>
          <div className="flex gap-2">
          </div>
        </div>

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1">
            <TabsTrigger value="attendance" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">{t('attendance.attendanceLog')}</TabsTrigger>
            <TabsTrigger value="shifts" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">{t('attendance.shiftSetup')}</TabsTrigger>
            <TabsTrigger value="assignments" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">{t('attendance.shiftAssignment')}</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
            <AttendanceLogTab />
          </TabsContent>

          <TabsContent value="shifts">
            <ShiftSetupTab />
          </TabsContent>

          <TabsContent value="assignments">
            <ShiftAssignmentTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default TimeAttendancePage;
